import { useState, useEffect } from 'react';
import { Text, TouchableOpacity, Alert } from 'react-native';
import { auth, firestore } from '../firebase';
import { formatarDataHoraBR } from '../utils/dataHora';
import TelaBase from '../components/TelaBase';
import CartaoBase from '../components/CartaoBase';
import { useTamanhoFonte } from '../hooks/useTamanhoFonte';
import { syncDoseNotificationsForCurrentUser, syncLinkedDoseNotificationsForCurrentUser } from '../utils/notificacoes';
import { useVinculosIdoso } from '../hooks/useVinculosIdoso';

type DoseItem = {
  id: string;
  medId?: string;
  nomeMed: string;
  previstoPara: number;
  status: 'pendente' | 'tomado' | 'perdido';
  tomadoEm?: number | null;
};

export default function Home() {
  const [lista, setLista] = useState<DoseItem[]>([]);
  const [agora, setAgora] = useState(Date.now());
  const { fontScale } = useTamanhoFonte();
  const { usuarioSelecionadoId, usuarioSelecionadoNome, visualizandoVinculado } = useVinculosIdoso();
  const LIMITE_PROXIMAS = 8;
  const LIMITE_ATRASADAS = 8;
  const JANELA_12H = 12 * 60 * 60 * 1000;
  const JANELA_PERDIDA_MS = 60 * 60 * 1000;
  const LIMITE_PERDIDO_MS = 12 * 60 * 60 * 1000;

  useEffect(() => {
    const uid = usuarioSelecionadoId;
    if (!uid) return;

    const unsubscribe = firestore
      .collection("Usuario")
      .doc(uid)
      .collection("Historico")
      .onSnapshot(async snapshot => {
        const dados: DoseItem[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          const previstoPara = typeof data.previstoPara === 'object' && data.previstoPara?.toMillis 
            ? data.previstoPara.toMillis() 
            : (data.previstoPara ?? 0);
          dados.push({
            id: doc.id,
            ...(data as Omit<DoseItem, 'id'>),
            previstoPara: previstoPara
          });
        });

        const pendentes = dados
          .filter((item) => item.status === 'pendente')
          .sort((a, b) => (a.previstoPara ?? 0) - (b.previstoPara ?? 0));
        
        const dosesPerdidasIds = new Set<string>();
        const dosesPorMed = new Map<string, DoseItem[]>();

        pendentes.forEach((item) => {
          const chaveMed = String(item.medId ?? item.nomeMed ?? '');
          if (!dosesPorMed.has(chaveMed)) {
            dosesPorMed.set(chaveMed, []);
          }
          dosesPorMed.get(chaveMed)?.push(item);
        });

        dosesPorMed.forEach((doses) => {
          const ordenadas = [...doses].sort((a, b) => (a.previstoPara ?? 0) - (b.previstoPara ?? 0));
          for (let i = 0; i < ordenadas.length - 1; i++) {
            const atual = ordenadas[i];
            const proxima = ordenadas[i + 1];
            if (Date.now() >= ((proxima.previstoPara ?? 0) - JANELA_PERDIDA_MS)) {
              dosesPerdidasIds.add(atual.id);
            }
          }
        });

        // Marcar doses pendentes muito antigas como perdidas (mais de 12h após previsto)
        const agoraAtual = Date.now();
        pendentes.forEach(item => {
          const previsto = item.previstoPara ?? 0;
          const atraso = agoraAtual - previsto;
          if (atraso > LIMITE_PERDIDO_MS) {
            console.log(`[Home] Marcando ${item.nomeMed} como perdida (${Math.floor(atraso / 1000 / 60 / 60)}h de atraso)`);
            dosesPerdidasIds.add(item.id);
          }
        });

        if (dosesPerdidasIds.size > 0) {
          try {
            const batch = firestore.batch();
            snapshot.docs.forEach((doc) => {
              if (dosesPerdidasIds.has(doc.id) && doc.data().status === 'pendente') {
                batch.update(doc.ref, { status: 'perdido' });
              }
            });
            await batch.commit();
            console.log(`[Home] ${dosesPerdidasIds.size} dose(s) marcada(s) como perdida`);
          } catch (error) {
            console.error(`[Home] Erro ao marcar doses como perdidas:`, error);
          }
        }

        setLista(dados.sort((a, b) => (a.previstoPara ?? 0) - (b.previstoPara ?? 0)));
      });

    return () => unsubscribe();
  }, [usuarioSelecionadoId]);

  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const marcar = async (item: any) => {
    const uid = usuarioSelecionadoId;
    if (!uid) return;

    try {
      await firestore
        .collection("Usuario")
        .doc(uid)
        .collection("Historico")
        .doc(item.id)
        .update({
          status: "tomado",
          tomadoEm: Date.now()
        });
      const uidLogado = auth.currentUser?.uid;
      if (uidLogado != null && uidLogado === uid) {
        await syncDoseNotificationsForCurrentUser();
      } else if (uidLogado != null) {
        await syncLinkedDoseNotificationsForCurrentUser();
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Erro", "Não foi possível atualizar a dose.");
    }
  };

  const confirmarTomar = (item: any) => {
    Alert.alert(
      "Confirmar dose",
      `Deseja marcar "${item.nomeMed}" como tomada agora?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: () => marcar(item) }
      ]
    );
  };

  const formatarAtraso = (previstoPara: number) => {
    const diffMin = Math.max(1, Math.floor((agora - previstoPara) / 60000));
    if (diffMin < 60) return `${diffMin} min atrasado`;
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `${h}h ${m}min atrasado`;
  };

  const formatarFaltante = (previstoPara: number) => {
    const diffMin = Math.max(1, Math.floor((previstoPara - agora) / 60000));
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return h > 0 ? `em ${h}h ${m}min` : `em ${m}min`;
  };

  const atrasadas = lista
    .filter(item => item.status === 'pendente' && (item.previstoPara ?? 0) < agora)
    .slice(0, LIMITE_ATRASADAS);

  const proximas12h = lista
    .filter(item => {
      if (item.status !== 'pendente') return false;
      const previsto = item.previstoPara ?? 0;
      return previsto >= agora && previsto <= agora + JANELA_12H;
    })
    .slice(0, LIMITE_PROXIMAS);

  return (
    <TelaBase title="Painel de doses" subtitle={visualizandoVinculado ? `Visualizando: ${usuarioSelecionadoNome}` : 'Acompanhe os atrasos e o que vem nas proximas 12 horas.'}>

      <Text style={{ color: '#ffb3b3', marginLeft: 4, marginTop: 4, fontWeight: 'bold', fontSize: fontScale.sectionTitle }}>
        Atrasadas
      </Text>
      {atrasadas.map(item => (
        <CartaoBase key={item.id} style={{
          backgroundColor: '#3c1f2e',
          marginTop: 10,
          borderLeftWidth: 4,
          borderLeftColor: '#ef5350'
        }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: fontScale.body + 1 }}>{item.nomeMed}</Text>
          <Text style={{ color: '#ffd1d1', marginTop: 5, fontSize: fontScale.body }}>
            {formatarDataHoraBR(item.previstoPara)}
          </Text>
          <Text style={{ color: '#ff8a80', marginTop: 4, fontSize: fontScale.body }}>
            {formatarAtraso(item.previstoPara)}
          </Text>
          <TouchableOpacity
            onPress={() => confirmarTomar(item)}
            style={{
              marginTop: 12,
              backgroundColor: '#ef5350',
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center'
            }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: fontScale.button }}>
              Tomar atrasado
            </Text>
          </TouchableOpacity>
        </CartaoBase>
      ))}
      <Text style={{ color: '#9fd2ff', marginLeft: 4, marginTop: 20, fontWeight: 'bold', fontSize: fontScale.sectionTitle }}>
        Próximas 12 horas
      </Text>
      {proximas12h.map(item => (
        <CartaoBase key={item.id} style={{
          backgroundColor: '#00334d',
          marginTop: 10,
        }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: fontScale.body + 1 }}>{item.nomeMed}</Text>
          <Text style={{ color: '#b6dbff', marginTop: 5, fontSize: fontScale.body }}>
            {formatarDataHoraBR(item.previstoPara)}
          </Text>
          <Text style={{ color: '#8fd2ff', marginTop: 4, fontSize: fontScale.body }}>
            {formatarFaltante(item.previstoPara)}
          </Text>
          <TouchableOpacity
            disabled
            style={{
              marginTop: 12,
              backgroundColor: '#335f7c',
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
              opacity: 0.9
            }}>
            <Text style={{ color: '#d9eeff', fontWeight: '700', fontSize: fontScale.button }}>
              Aguardando horário
            </Text>
          </TouchableOpacity>
        </CartaoBase>
      ))}

      {atrasadas.length === 0 && proximas12h.length === 0 && (
        <Text style={{
          color: '#d2e5ef',
          textAlign: 'center',
          marginTop: 40,
          fontSize: fontScale.body
        }}>
          Nenhuma dose atrasada ou nas próximas 12 horas
        </Text>
      )}
    </TelaBase>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { auth, firestore } from '../firebase';
import TelaBase from '../components/TelaBase';
import CartaoBase from '../components/CartaoBase';
import { useTamanhoFonte } from '../hooks/useTamanhoFonte';
import { useVinculosIdoso } from '../hooks/useVinculosIdoso';
import { RootStackParamList } from '../types/navigation';
import { formatarDataHoraBR } from '../utils/dataHora';
import styles, { theme } from '../estilo';

type DoseAgenda = {
  id: string;
  nomeMed: string;
  previstoPara: number;
  status: 'pendente' | 'tomado' | 'perdido';
  tomadoEm?: number | null;
};

const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const NOMES_DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

function gerarChaveDia(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function inicioDoDia(timestamp: number) {
  const data = new Date(timestamp);
  data.setHours(0, 0, 0, 0);
  return data;
}

function normalizarPrevistoPara(valor: unknown) {
  if (typeof valor === 'object' && valor && 'toMillis' in valor && typeof (valor as { toMillis?: unknown }).toMillis === 'function') {
    return (valor as { toMillis: () => number }).toMillis();
  }

  if (typeof valor === 'number') {
    return valor;
  }

  return 0;
}

export default function Agenda() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { fontScale } = useTamanhoFonte();
  const { usuarioSelecionadoId, usuarioSelecionadoNome, visualizandoVinculado } = useVinculosIdoso();

  const hoje = useMemo(() => inicioDoDia(Date.now()), []);
  const [mesVisivel, setMesVisivel] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [diaSelecionado, setDiaSelecionado] = useState(() => gerarChaveDia(hoje));
  const [doses, setDoses] = useState<DoseAgenda[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (auth.currentUser == null || !usuarioSelecionadoId) {
      setDoses([]);
      setCarregando(false);
      return;
    }

    setCarregando(true);

    const unsubscribe = firestore
      .collection('Usuario')
      .doc(usuarioSelecionadoId)
      .collection('Historico')
      .onSnapshot(
        (snapshot) => {
          const lista: DoseAgenda[] = snapshot.docs
            .map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                nomeMed: data.nomeMed ?? data.nome ?? 'Medicamento',
                previstoPara: normalizarPrevistoPara(data.previstoPara),
                status: data.status ?? 'pendente',
                tomadoEm: data.tomadoEm != null ? normalizarPrevistoPara(data.tomadoEm) : null,
              } as DoseAgenda;
            })
            .sort((a, b) => a.previstoPara - b.previstoPara);

          setDoses(lista);
          setCarregando(false);
        },
        () => setCarregando(false)
      );

    return () => unsubscribe();
  }, [usuarioSelecionadoId]);

  const dosesPorDia = useMemo(() => {
    const mapa = new Map<string, DoseAgenda[]>();

    doses.forEach((dose) => {
      const chave = gerarChaveDia(inicioDoDia(dose.previstoPara));
      const atual = mapa.get(chave) ?? [];
      atual.push(dose);
      mapa.set(chave, atual);
    });

    mapa.forEach((lista, chave) => {
      mapa.set(
        chave,
        [...lista].sort((a, b) => a.previstoPara - b.previstoPara)
      );
    });

    return mapa;
  }, [doses]);

  const dosesDiaSelecionado = dosesPorDia.get(diaSelecionado) ?? [];

  const calendarioMes = useMemo(() => {
    const ano = mesVisivel.getFullYear();
    const mes = mesVisivel.getMonth();
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const totalCelulas = Math.ceil((primeiroDiaSemana + totalDias) / 7) * 7;

    return Array.from({ length: totalCelulas }, (_, indice) => {
      const diaNumero = indice - primeiroDiaSemana + 1;
      if (diaNumero < 1 || diaNumero > totalDias) {
        return null;
      }

      const data = new Date(ano, mes, diaNumero);
      const chave = gerarChaveDia(data);
      const itens = dosesPorDia.get(chave) ?? [];

      return {
        chave,
        diaNumero,
        data,
        total: itens.length,
        temPendentes: itens.some((item) => item.status === 'pendente'),
        temPerdidas: itens.some((item) => item.status === 'perdido'),
      };
    });
  }, [dosesPorDia, mesVisivel]);

  const tituloMes = `${NOMES_MESES[mesVisivel.getMonth()]} ${mesVisivel.getFullYear()}`;

  const mudarMes = (deslocamento: number) => {
    setMesVisivel((atual) => {
      const proximoMes = new Date(atual.getFullYear(), atual.getMonth() + deslocamento, 1);
      const diaBase = Number(diaSelecionado.slice(-2)) || 1;
      const ultimoDia = new Date(proximoMes.getFullYear(), proximoMes.getMonth() + 1, 0).getDate();
      const diaSeguro = Math.min(diaBase, ultimoDia);
      setDiaSelecionado(gerarChaveDia(new Date(proximoMes.getFullYear(), proximoMes.getMonth(), diaSeguro)));
      return proximoMes;
    });
  };

  const irParaHoje = () => {
    setMesVisivel(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
    setDiaSelecionado(gerarChaveDia(hoje));
  };

  const subtitulo = visualizandoVinculado
    ? `Agenda de: ${usuarioSelecionadoNome}`
    : 'Veja os dias com doses e toque em uma data para abrir os horarios.';

  return (
    <TelaBase
      onBackPress={() => navigation.goBack()}
      title="Agenda"
      subtitle={subtitulo}
    >
      <CartaoBase style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <TouchableOpacity onPress={() => mudarMes(-1)} style={{ padding: 8 }}>
            <Icon name="chevron-left" size={16} color={theme.colors.primary} iconStyle="solid" />
          </TouchableOpacity>

          <Text style={{ color: theme.colors.text, fontSize: fontScale.sectionTitle + 2, fontWeight: '700' }}>
            {tituloMes}
          </Text>

          <TouchableOpacity onPress={() => mudarMes(1)} style={{ padding: 8 }}>
            <Icon name="chevron-right" size={16} color={theme.colors.primary} iconStyle="solid" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          {NOMES_DIAS.map((dia) => (
            <Text
              key={dia}
              style={{
                width: '14.28%',
                textAlign: 'center',
                color: theme.colors.textMuted,
                fontSize: fontScale.caption,
                fontWeight: '700',
              }}
            >
              {dia}
            </Text>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {calendarioMes.map((item, indice) => {
            if (item == null) {
              return <View key={`vazio-${indice}`} style={{ width: '14.28%', aspectRatio: 1, padding: 4 }} />;
            }

            const selecionado = item.chave === diaSelecionado;
            const ehHoje = item.chave === gerarChaveDia(hoje);
            const temDoses = item.total > 0;

            return (
              <View key={item.chave} style={{ width: '14.28%', padding: 4 }}>
                <TouchableOpacity
                  onPress={() => setDiaSelecionado(item.chave)}
                  style={{
                    minHeight: 60,
                    borderRadius: 16,
                    paddingVertical: 8,
                    paddingHorizontal: 4,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: selecionado ? '#0b3954' : temDoses ? '#eef7fa' : '#ffffff',
                    borderWidth: 1,
                    borderColor: selecionado ? '#0b3954' : ehHoje ? '#7fb3cd' : '#dceaf0',
                  }}
                >
                  <Text
                    style={{
                      color: selecionado ? '#ffffff' : theme.colors.text,
                      fontSize: fontScale.body,
                      fontWeight: ehHoje || selecionado ? '700' : '600',
                    }}
                  >
                    {item.diaNumero}
                  </Text>

                  {temDoses ? (
                    <View style={{ alignItems: 'center' }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: item.temPerdidas ? '#ef5350' : item.temPendentes ? '#1f6b75' : '#2e7d32',
                          marginBottom: 4,
                        }}
                      />
                      <Text
                        style={{
                          color: selecionado ? '#dceef4' : theme.colors.textMuted,
                          fontSize: Math.max(10, fontScale.caption - 2),
                          fontWeight: '700',
                        }}
                      >
                        {item.total}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ height: 18 }} />
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={irParaHoje}
          style={{
            alignSelf: 'flex-start',
            marginTop: 16,
            backgroundColor: '#deedf3',
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: '#c3dce8',
          }}
        >
          <Text style={{ color: theme.colors.primary, fontSize: fontScale.body, fontWeight: '700' }}>
            Ir para hoje
          </Text>
        </TouchableOpacity>
      </CartaoBase>

      <CartaoBase>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: theme.colors.text, fontSize: fontScale.sectionTitle, fontWeight: '700' }}>
              {new Date(`${diaSelecionado}T00:00:00`).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              })}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: fontScale.body, marginTop: 4 }}>
              {dosesDiaSelecionado.length === 0 ? 'Nenhuma dose registrada neste dia.' : `${dosesDiaSelecionado.length} dose(s) neste dia.`}
            </Text>
          </View>

          <View style={styles.summaryIconBubble}>
            <Icon name="calendar-check" size={20} color={theme.colors.primary} iconStyle="solid" />
          </View>
        </View>

        {carregando && (
          <View style={{ alignItems: 'center', paddingVertical: 18 }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 12, color: theme.colors.textMuted, fontSize: fontScale.body }}>
              Carregando agenda...
            </Text>
          </View>
        )}

        {!carregando && dosesDiaSelecionado.map((dose) => {
          const corStatus =
            dose.status === 'tomado'
              ? { fundo: '#e8f5e9', borda: '#cfe8d2', texto: '#1b5e20', rotulo: 'Tomado' }
              : dose.status === 'perdido'
                ? { fundo: '#fff3e0', borda: '#f2d6b1', texto: '#e65100', rotulo: 'Perdido' }
                : { fundo: '#eef7fa', borda: '#dceaf0', texto: '#1f6b75', rotulo: 'Pendente' };

          return (
            <View
              key={dose.id}
              style={{
                backgroundColor: corStatus.fundo,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: corStatus.borda,
                padding: 14,
                marginTop: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ color: theme.colors.text, fontSize: fontScale.body + 1, fontWeight: '700' }}>
                    {dose.nomeMed}
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: fontScale.body, marginTop: 6 }}>
                    Previsto: {formatarDataHoraBR(dose.previstoPara)}
                  </Text>
                  {dose.status === 'tomado' && dose.tomadoEm ? (
                    <Text style={{ color: theme.colors.textMuted, fontSize: fontScale.body, marginTop: 4 }}>
                      Tomado: {formatarDataHoraBR(dose.tomadoEm)}
                    </Text>
                  ) : null}
                </View>

                <View
                  style={{
                    backgroundColor: '#ffffffaa',
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: corStatus.texto, fontSize: fontScale.caption, fontWeight: '700' }}>
                    {corStatus.rotulo}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        {!carregando && dosesDiaSelecionado.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ color: theme.colors.textMuted, textAlign: 'center', fontSize: fontScale.body }}>
              Escolha outro dia no calendário para ver as doses programadas.
            </Text>
          </View>
        )}
      </CartaoBase>
    </TelaBase>
  );
}

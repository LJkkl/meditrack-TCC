import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { auth, firestore } from '../firebase';
import Icon from '@react-native-vector-icons/fontawesome6';
import { formatarDataHoraBR } from '../utils/dataHora';
import { RootStackParamList } from '../types/navigation';
import TelaBase from '../components/TelaBase';
import CartaoBase from '../components/CartaoBase';
import { useTamanhoFonte } from '../hooks/useTamanhoFonte';
import { syncDoseNotificationsForCurrentUser, syncLinkedDoseNotificationsForCurrentUser } from '../utils/notificacoes';
import { useVinculosIdoso } from '../hooks/useVinculosIdoso';

type HistoricoItem = {
  id: string;
  previstoPara: number;
  status: 'pendente' | 'tomado' | 'perdido';
  tomadoEm?: number | null;
};

type ReceituarioItem = {
  dose?: string;
  intervaloHoras?: number;
  quantidadeDoses?: number;
  dataInicio?: number;
};

export default function PerfilMedicamento() {

  const { medicamento } = useRoute<RouteProp<RootStackParamList, 'MedicamentoPer'>>().params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [receituario, setReceituario] = useState<ReceituarioItem | null>(null);
  const [proximasDoses, setProximasDoses] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { fontScale } = useTamanhoFonte();
  const {
    usuarioSelecionadoId,
    usuarioSelecionadoNome,
    visualizandoVinculado,
    tipoUsuario,
  } = useVinculosIdoso();

  const uid = usuarioSelecionadoId;
  const podeEditarExcluir = tipoUsuario !== 'idoso' || medicamento.idosoPodeEditarExcluir === true;

  // 🔥 BUSCAR RECEITUARIO MAIS RECENTE
  useEffect(() => {
    if (!uid) return;

    const unsubscribe = firestore
      .collection("Usuario")
      .doc(uid)
      .collection("Receituario")
      .where("medId", "==", medicamento.id)
      .onSnapshot((snap) => {
        if (!snap.empty) {
          const maisRecente = snap.docs.reduce((anterior, atual) => {
            const dataAnterior = (anterior.data().dataInicio ?? 0) as number;
            const dataAtual = (atual.data().dataInicio ?? 0) as number;
            return dataAtual > dataAnterior ? atual : anterior;
          });
          setReceituario(maisRecente.data());
        } else {
          setReceituario(null);
        }
        setLoading(false);
      });

    return () => unsubscribe();
  }, [medicamento.id, uid]);

  // 🔥 HISTORICO + PRÓXIMAS DOSES REAIS
  useEffect(() => {
    if (!uid) return;

    const unsubscribe = firestore
      .collection("Usuario")
      .doc(uid)
      .collection("Historico")
      .where("medId", "==", medicamento.id)
      .onSnapshot(snapshot => {
        const lista: HistoricoItem[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<HistoricoItem, 'id'>)
        })).sort((a, b) => (a.previstoPara ?? 0) - (b.previstoPara ?? 0));
        setHistorico(lista);

        const agora = Date.now();
        const pendentes = lista
          .filter((item) => item.status === "pendente")
          .sort((a, b) => a.previstoPara - b.previstoPara);

        const futurasOuAgora = pendentes.filter((item) => item.previstoPara >= agora);
        const base = futurasOuAgora.length > 0 ? futurasOuAgora : pendentes;
        setProximasDoses(base.slice(0, 5));
      });

    return () => unsubscribe();
  }, [medicamento.id, uid]);

  // 🗑 APAGAR
  const apagar = async () => {
    if (!uid) return;
    if (!podeEditarExcluir) {
      Alert.alert('Bloqueado', 'A edição e exclusão de medicamentos estão desativadas nesta conta.');
      return;
    }

    Alert.alert(
      "Confirmar",
      "Deseja apagar tudo?",
      [
        { text: "Cancelar" },
        {
          text: "Apagar",
          onPress: async () => {
            try {

              // 🔥 MED
              await firestore
                .collection("Usuario")
                .doc(uid)
                .collection("Med")
                .doc(medicamento.id)
                .delete();

              // 🔥 RECEITUARIO
              const recSnap = await firestore
                .collection("Usuario")
                .doc(uid)
                .collection("Receituario")
                .where("medId", "==", medicamento.id)
                .get();

              const batch = firestore.batch();

              recSnap.docs.forEach(doc => {
                batch.delete(doc.ref);
              });

              // 🔥 HISTORICO
              const histSnap = await firestore
                .collection("Usuario")
                .doc(uid)
                .collection("Historico")
                .where("medId", "==", medicamento.id)
                .get();

              histSnap.docs.forEach(doc => {
                batch.delete(doc.ref);
              });

              await batch.commit();
              const uidLogado = auth.currentUser?.uid;
              if (uidLogado != null && uidLogado === uid) {
                void syncDoseNotificationsForCurrentUser().catch(console.log);
              } else if (uidLogado != null) {
                void syncLinkedDoseNotificationsForCurrentUser().catch(console.log);
              }

              Alert.alert("Sucesso", "Medicamento apagado com sucesso.");
              navigation.goBack();

            } catch (error) {
              console.log(error);
              Alert.alert("Erro", "Erro ao apagar medicamento.");
            }
          }
        }
      ]
    );
  };

  const obterStatusVisual = (status: HistoricoItem['status']) => {
    if (status === 'tomado') {
      return {
        fundo: '#e8f5e9',
        borda: '#2e7d32',
        titulo: '#1b5e20',
        label: 'Tomado'
      };
    }

    if (status === 'perdido') {
      return {
        fundo: '#fff3e0',
        borda: '#ef6c00',
        titulo: '#e65100',
        label: 'Perdido'
      };
    }

    return {
      fundo: '#e3f2fd',
      borda: '#1565c0',
      titulo: '#0d47a1',
      label: 'Pendente'
    };
  };

  if (!uid) {
    return (
      <TelaBase>
        <CartaoBase>
          <Text style={{ color: '#12384c', fontSize: fontScale.sectionTitle, fontWeight: '700' }}>
            Sessão não encontrada
          </Text>
          <Text style={{ color: '#5f7f92', marginTop: 6, fontSize: fontScale.body }}>
            Entre novamente para visualizar os dados do medicamento.
          </Text>
        </CartaoBase>
      </TelaBase>
    );
  }

  if (loading) {
    return (
      <TelaBase>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#dff4fb" />
          <Text style={{ color: '#dff4fb', marginTop: 14, fontSize: fontScale.body }}>
            Carregando perfil do medicamento...
          </Text>
        </View>
      </TelaBase>
    );
  }

  return (
    <TelaBase
      onBackPress={() => navigation.goBack()}
      title="Perfil do medicamento"
      subtitle={visualizandoVinculado ? `Perfil de ${usuarioSelecionadoNome}` : 'Visualize os dados da prescrição, acompanhe as próximas doses e revise o histórico do tratamento.'}
    >
      <CartaoBase style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: '#deedf3',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <Icon name="capsules" size={22} color="#0b3954" iconStyle="solid" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#12384c', fontSize: fontScale.sectionTitle + 1, fontWeight: '700' }}>
              {medicamento.nomeComercial}
            </Text>
            <Text style={{ color: '#5f7f92', marginTop: 4, fontSize: fontScale.body }}>
              {medicamento.tipoApresentacao || 'Apresentação não informada'}
            </Text>
          </View>
        </View>

        {!!medicamento.principioAtivo && (
          <View
            style={{
              marginTop: 18,
              backgroundColor: '#eef7fa',
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor: '#dceaf0',
            }}
          >
            <Text style={{ color: '#5f7f92', fontSize: fontScale.caption, textTransform: 'uppercase', marginBottom: 6 }}>
              Princípio ativo
            </Text>
            <Text style={{ color: '#12384c', fontSize: fontScale.body, fontWeight: '600' }}>
              {medicamento.principioAtivo}
            </Text>
          </View>
        )}
      </CartaoBase>

      <CartaoBase style={{ marginBottom: 14 }}>
        <Text style={{ color: '#12384c', fontSize: fontScale.sectionTitle, fontWeight: '700', marginBottom: 12 }}>
          Receituário atual
        </Text>

        {receituario ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ color: '#5f7f92', fontSize: fontScale.caption, textTransform: 'uppercase' }}>Dose</Text>
                <Text style={{ color: '#12384c', fontSize: fontScale.body, fontWeight: '700', marginTop: 4 }}>{receituario.dose}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={{ color: '#5f7f92', fontSize: fontScale.caption, textTransform: 'uppercase' }}>Intervalo</Text>
                <Text style={{ color: '#12384c', fontSize: fontScale.body, fontWeight: '700', marginTop: 4 }}>{receituario.intervaloHoras}h</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ color: '#5f7f92', fontSize: fontScale.caption, textTransform: 'uppercase' }}>Quantidade</Text>
                <Text style={{ color: '#12384c', fontSize: fontScale.body, fontWeight: '700', marginTop: 4 }}>{receituario.quantidadeDoses}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={{ color: '#5f7f92', fontSize: fontScale.caption, textTransform: 'uppercase' }}>Início</Text>
                <Text style={{ color: '#12384c', fontSize: fontScale.body, fontWeight: '700', marginTop: 4 }}>
                  {receituario.dataInicio ? formatarDataHoraBR(receituario.dataInicio) : '--'}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={{ color: '#5f7f92', fontSize: fontScale.body }}>
            Nenhum receituário ativo encontrado para este medicamento.
          </Text>
        )}
      </CartaoBase>

      <CartaoBase style={{ marginBottom: 14 }}>
        <Text style={{ color: '#12384c', fontSize: fontScale.sectionTitle, fontWeight: '700', marginBottom: 12 }}>
          Próximas doses
        </Text>

        {proximasDoses.length > 0 ? (
          proximasDoses.map((item) => (
            <View
              key={item.id}
              style={{
                backgroundColor: '#eef7fa',
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: '#dceaf0',
                marginBottom: 10,
              }}
            >
              <Text style={{ color: '#12384c', fontWeight: '700', fontSize: fontScale.body }}>
                {formatarDataHoraBR(item.previstoPara)}
              </Text>
              <Text style={{ color: '#5f7f92', marginTop: 4, fontSize: fontScale.body }}>
                Aguardando administração
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ color: '#5f7f92', fontSize: fontScale.body }}>
            Não há doses pendentes para este medicamento no momento.
          </Text>
        )}
      </CartaoBase>

      <CartaoBase>
        <Text style={{ color: '#12384c', fontSize: fontScale.sectionTitle, fontWeight: '700', marginBottom: 12 }}>
          Histórico recente
        </Text>

        {historico.length > 0 ? (
          historico.map((item) => {
            const visual = obterStatusVisual(item.status);
            return (
              <View
                key={item.id}
                style={{
                  backgroundColor: visual.fundo,
                  borderRadius: 16,
                  padding: 14,
                  borderLeftWidth: 4,
                  borderLeftColor: visual.borda,
                  marginBottom: 10,
                }}
              >
                <Text style={{ color: visual.titulo, fontWeight: '700', fontSize: fontScale.body }}>
                  {visual.label}
                </Text>
                <Text style={{ color: '#12384c', marginTop: 6, fontSize: fontScale.body }}>
                  Previsto: {formatarDataHoraBR(item.previstoPara)}
                </Text>
                {item.status === 'tomado' && item.tomadoEm && (
                  <Text style={{ color: '#5f7f92', marginTop: 4, fontSize: fontScale.body }}>
                    Tomado em: {formatarDataHoraBR(item.tomadoEm)}
                  </Text>
                )}
              </View>
            );
          })
        ) : (
          <Text style={{ color: '#5f7f92', fontSize: fontScale.body }}>
            Ainda não há registros no histórico deste medicamento.
          </Text>
        )}
      </CartaoBase>

      {podeEditarExcluir && (
        <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditarMedicamento', { medId: medicamento.id })}
            style={{
              flex: 1,
              backgroundColor: '#0b3954',
              borderRadius: 16,
              paddingVertical: 15,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: fontScale.button }}>
              Editar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={apagar}
            style={{
              flex: 1,
              backgroundColor: '#fdeaea',
              borderRadius: 16,
              paddingVertical: 15,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#f3c7c7',
            }}
          >
            <Text style={{ color: '#b3261e', fontWeight: '700', fontSize: fontScale.button }}>
              Apagar
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TelaBase>
  );
}

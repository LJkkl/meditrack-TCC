import { useState, useEffect } from 'react';
import { Text, View, KeyboardAvoidingView, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { TextInput } from 'react-native-paper';
import { auth, firestore } from '../firebase';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '@react-native-vector-icons/fontawesome6';
import { formatarDataHoraBR } from '../utils/dataHora';
import { RootStackParamList } from '../types/navigation';
import TelaBase from '../components/TelaBase';
import CartaoBase from '../components/CartaoBase';
import DateTimeSelector from '../components/DateTimeSelector';
import { useTamanhoFonte } from '../hooks/useTamanhoFonte';
import { syncDoseNotificationsForCurrentUser, syncLinkedDoseNotificationsForCurrentUser } from '../utils/notificacoes';
import { useVinculosIdoso } from '../hooks/useVinculosIdoso';
import CampoTipoMedicamento from '../components/CampoTipoMedicamento';

export default function EditarMedicamento() {

  const route = useRoute<RouteProp<RootStackParamList, 'EditarMedicamento'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { medId } = route.params;

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [principio, setPrincipio] = useState('');

  const [dose, setDose] = useState('');
  const [quantidadeDoses, setQuantidadeDoses] = useState('');
  const [intervaloHoras, setIntervaloHoras] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState(new Date());

  const [receituarioId, setReceituarioId] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const { fontScale } = useTamanhoFonte();
  const { usuarioSelecionadoId, usuarioSelecionadoNome, visualizandoVinculado } = useVinculosIdoso();

  // 🔥 BUSCAR DADOS CERTOS
  useEffect(() => {
    const uid = usuarioSelecionadoId;
    if (!uid || !medId) return;

    const ref = firestore.collection("Usuario").doc(uid);

    const carregar = async () => {
      try {
        // MED
        const medDoc = await ref.collection("Med").doc(medId).get();
        if (medDoc.exists) {
          const data = medDoc.data();
          setNome(data?.nomeComercial || '');
          setTipo(data?.tipoApresentacao || '');
          setPrincipio(data?.principioAtivo || '');
        }

        // RECEITUARIO
        const recSnap = await ref
          .collection("Receituario")
          .where("medId", "==", medId)
          .get();

        if (!recSnap.empty) {
          const doc = recSnap.docs.reduce((anterior, atual) => {
            const dataAnterior = (anterior.data().dataInicio ?? 0) as number;
            const dataAtual = (atual.data().dataInicio ?? 0) as number;
            return dataAtual > dataAnterior ? atual : anterior;
          });
          const data = doc.data();

          setReceituarioId(doc.id);
          setDose(data?.dose || '');
          setQuantidadeDoses(String(data?.quantidadeDoses || ''));
          setIntervaloHoras(String(data?.intervaloHoras || ''));
        }

        // 🔥 PRÓXIMA DOSE CORRETA (ESSA É A CHAVE)
        const histSnap = await ref
          .collection("Historico")
          .where("medId", "==", medId)
          .where("status", "==", "pendente")
          .get();

        if (!histSnap.empty) {
          const agora = Date.now();
          const docs = [...histSnap.docs].sort((a, b) => {
            const prevA = (a.data().previstoPara ?? 0) as number;
            const prevB = (b.data().previstoPara ?? 0) as number;
            return prevA - prevB;
          });

          const docMaisProximo = docs.reduce((anterior, atual) => {
            const prevAnterior = (anterior.data().previstoPara ?? 0) as number;
            const prevAtual = (atual.data().previstoPara ?? 0) as number;
            const diffAnterior = Math.abs(prevAnterior - agora);
            const diffAtual = Math.abs(prevAtual - agora);
            return diffAtual < diffAnterior ? atual : anterior;
          });

          const prox = docMaisProximo.data();
          setDataSelecionada(new Date(prox.previstoPara));
        }

      } catch (e) {
        console.log(e);
      }

      setLoading(false);
    };

    carregar();
  }, [medId, usuarioSelecionadoId]);

  // 🔥 SALVAR CERTO (SEM QUEBRAR HISTÓRICO)
  const salvar = async () => {
    const uid = usuarioSelecionadoId;
    if (!uid || !medId) return;

    const qtdTotal = parseInt(quantidadeDoses, 10);
    const intervalo = parseInt(intervaloHoras, 10);

    if (!nome.trim() || !dose.trim() || Number.isNaN(qtdTotal) || Number.isNaN(intervalo)) {
      Alert.alert('Erro', 'Preencha os campos obrigatórios corretamente.');
      return;
    }

    if (qtdTotal < 1 || intervalo < 1) {
      Alert.alert('Erro', 'Quantidade de doses e intervalo devem ser maiores que zero.');
      return;
    }

    try {
      setSalvando(true);
      const ref = firestore.collection("Usuario").doc(uid);
      const inicio = dataSelecionada.getTime();

      // 1) Atualiza medicamento
      await ref.collection("Med").doc(medId).update({
        nomeComercial: nome.trim(),
        tipoApresentacao: tipo.trim(),
        principioAtivo: principio.trim()
      });

      // 2) Atualiza ou cria receituário
      const recPayload = {
        medId,
        nomeMed: nome.trim(),
        dose: dose.trim(),
        intervaloHoras: intervalo,
        quantidadeDoses: qtdTotal,
        dataInicio: inicio
      };

      const receituariosSnap = await ref
        .collection("Receituario")
        .where("medId", "==", medId)
        .get();

      const receituarioBatch = firestore.batch();
      const receituarios = receituariosSnap.docs;
      const receituarioPrincipalDoc =
        receituarios.find((doc) => doc.id === receituarioId) ??
        receituarios[0];
      const receituarioPrincipalRef =
        receituarioPrincipalDoc?.ref ?? ref.collection("Receituario").doc();

      receituarios.forEach((doc) => {
        if (doc.id !== receituarioPrincipalRef.id) {
          receituarioBatch.delete(doc.ref);
        }
      });

      receituarioBatch.set(receituarioPrincipalRef, {
        id: receituarioPrincipalRef.id,
        ...recPayload
      });

      await receituarioBatch.commit();

      // 3) Mantém os TOMADOS e recalcula apenas os PENDENTES
      const [tomadosSnap, pendentesSnap] = await Promise.all([
        ref.collection("Historico")
          .where("medId", "==", medId)
          .where("status", "==", "tomado")
          .get(),
        ref.collection("Historico")
          .where("medId", "==", medId)
          .where("status", "==", "pendente")
          .get()
      ]);

      const qtdTomados = tomadosSnap.size;
      const qtdPendentesNova = Math.max(qtdTotal - qtdTomados, 0);
      const pendentesAtuais = [...pendentesSnap.docs].sort((a, b) => {
        const prevA = (a.data().previstoPara ?? 0) as number;
        const prevB = (b.data().previstoPara ?? 0) as number;
        return prevA - prevB;
      });
      const batch = firestore.batch();

      for (let i = 0; i < qtdPendentesNova; i++) {
        const previstoPara = inicio + (intervalo * 3600000 * i);
        const payloadPendente = {
          medId,
          nomeMed: nome.trim(),
          previstoPara,
          status: "pendente",
          tomadoEm: null
        };

        if (i < pendentesAtuais.length) {
          batch.update(pendentesAtuais[i].ref, payloadPendente);
        } else {
          const novoHist = ref.collection("Historico").doc();
          batch.set(novoHist, {
            id: novoHist.id,
            ...payloadPendente
          });
        }
      }

      for (let i = qtdPendentesNova; i < pendentesAtuais.length; i++) {
        batch.delete(pendentesAtuais[i].ref);
      }

      // Mantém nome do medicamento consistente nos itens já tomados (sem alterar status/tomadoEm)
      tomadosSnap.docs.forEach((doc) => {
        batch.update(doc.ref, { nomeMed: nome.trim() });
      });

      await batch.commit();
      const uidLogado = auth.currentUser?.uid;
      if (uidLogado != null && uidLogado === uid) {
        await syncDoseNotificationsForCurrentUser();
      } else if (uidLogado != null) {
        await syncLinkedDoseNotificationsForCurrentUser();
      }

      Alert.alert("Sucesso", "Receituário ajustado com sucesso!");
      navigation.goBack();
    } catch (e) {
      console.log(e);
      Alert.alert("Erro", "Erro ao salvar ajustes.");
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <TelaBase>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#dff4fb" />
          <Text style={{ color: '#dff4fb', marginTop: 14, fontSize: fontScale.body }}>
            Carregando dados do medicamento...
          </Text>
        </View>
      </TelaBase>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}>
      <TelaBase
        onBackPress={() => navigation.goBack()}
        title="Editar medicamento"
        subtitle={visualizandoVinculado ? `Editando medicamento de: ${usuarioSelecionadoNome}` : 'Atualize os dados principais e ajuste a rotina de doses com o mesmo padrão visual do restante do aplicativo.'}
      >
        <CartaoBase style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: '#deedf3',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Icon name="pills" size={Math.max(18, fontScale.body)} color="#0b3954" iconStyle="solid" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#12384c', fontSize: fontScale.sectionTitle, fontWeight: '700' }}>
                Dados do medicamento
              </Text>
              <Text style={{ color: '#5f7f92', marginTop: 2, fontSize: fontScale.caption }}>
                Revise nome, apresentação e princípio ativo.
              </Text>
            </View>
          </View>

          <TextInput label="Nome" value={nome} onChangeText={setNome} style={{ marginBottom: 12, backgroundColor: '#ffffff' }} contentStyle={{ fontSize: fontScale.body }} activeUnderlineColor="#0b3954" />
          <CampoTipoMedicamento
            value={tipo}
            onChange={setTipo}
            accentColor="#0b3954"
            fontSize={{ title: fontScale.sectionTitle, body: fontScale.body, caption: fontScale.caption }}
          />
          <TextInput label="Princípio ativo" value={principio} onChangeText={setPrincipio} style={{ backgroundColor: '#ffffff' }} contentStyle={{ fontSize: fontScale.body }} activeUnderlineColor="#0b3954" />
        </CartaoBase>

        <CartaoBase>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: '#deedf3',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Icon name="clock" size={Math.max(16, fontScale.body)} color="#0b3954" iconStyle="solid" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#12384c', fontSize: fontScale.sectionTitle, fontWeight: '700' }}>
                Receituário
              </Text>
              <Text style={{ color: '#5f7f92', marginTop: 2, fontSize: fontScale.caption }}>
                Ajuste dose, frequência e início do tratamento.
              </Text>
            </View>
          </View>

          <TextInput label="Dose" value={dose} onChangeText={setDose} style={{ marginBottom: 12, backgroundColor: '#ffffff' }} contentStyle={{ fontSize: fontScale.body }} activeUnderlineColor="#0b3954" />
          <TextInput label="Quantidade de doses" value={quantidadeDoses} onChangeText={setQuantidadeDoses} keyboardType="numeric" style={{ marginBottom: 12, backgroundColor: '#ffffff' }} contentStyle={{ fontSize: fontScale.body }} activeUnderlineColor="#0b3954" />
          <TextInput label="Intervalo (h)" value={intervaloHoras} onChangeText={setIntervaloHoras} keyboardType="numeric" style={{ marginBottom: 16, backgroundColor: '#ffffff' }} contentStyle={{ fontSize: fontScale.body }} activeUnderlineColor="#0b3954" />

          <View
            style={{
              backgroundColor: '#eef7fa',
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor: '#dceaf0',
            }}
          >
            <DateTimeSelector
              label="Próximo início programado"
              value={dataSelecionada}
              onChange={setDataSelecionada}
              fontScale={fontScale}
              mode="datetime"
              minimumDate={new Date()}
            />
          </View>
        </CartaoBase>

        <View style={{ marginTop: 16 }}>
          <TouchableOpacity
            onPress={salvar}
            disabled={salvando}
            style={{
              backgroundColor: salvando ? '#6f9bb1' : '#0b3954',
              borderRadius: 16,
              paddingVertical: 15,
              alignItems: 'center',
            }}
          >
            {salvando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: fontScale.button }}>
                Salvar ajustes
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </TelaBase>
    </KeyboardAvoidingView>
  );
}

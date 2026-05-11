import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { auth, firestore } from '../firebase';
import { formatarDataHoraBR } from '../utils/dataHora';
import { RootStackParamList } from '../types/navigation';
import TelaBase from '../components/TelaBase';
import CartaoBase from '../components/CartaoBase';
import { useTamanhoFonte } from '../hooks/useTamanhoFonte';
import { syncDoseNotificationsForCurrentUser, syncLinkedDoseNotificationsForCurrentUser } from '../utils/notificacoes';
import { useVinculosIdoso } from '../hooks/useVinculosIdoso';
import styles, { theme } from '../estilo';

export default function MedicamentoRes() {
  const { medicamento, receituario } = useRoute<RouteProp<RootStackParamList, 'MedicamentoRes'>>().params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { fontScale } = useTamanhoFonte();
  const { usuarioSelecionadoId, usuarioSelecionadoNome, visualizandoVinculado } = useVinculosIdoso();

  const gerarPreview = () => {
    const lista = [];
    const intervalo = parseInt(receituario.intervaloHoras, 10);
    const qtd = parseInt(receituario.quantidadeDoses, 10);

    for (let i = 0; i < Math.min(5, qtd); i++) {
      const horario = receituario.dataInicio + (intervalo * 3600000 * i);
      lista.push(new Date(horario));
    }

    return lista;
  };

  const salvar = async () => {
    const uid = usuarioSelecionadoId;
    if (!uid) return;

    try {
      const ref = firestore.collection('Usuario').doc(uid);

      const receituariosSnap = await ref
        .collection('Receituario')
        .where('medId', '==', medicamento.id)
        .get();

      const receituarioPrincipalRef = receituariosSnap.docs[0]?.ref ?? ref.collection('Receituario').doc();
      const receituarioBatch = firestore.batch();

      receituariosSnap.docs.forEach((doc, index) => {
        if (index > 0) {
          receituarioBatch.delete(doc.ref);
        }
      });

      receituarioBatch.set(receituarioPrincipalRef, {
        id: receituarioPrincipalRef.id,
        medId: medicamento.id,
        nomeMed: medicamento.nome,
        dose: receituario.dose,
        intervaloHoras: parseInt(receituario.intervaloHoras, 10),
        quantidadeDoses: parseInt(receituario.quantidadeDoses, 10),
        dataInicio: receituario.dataInicio,
      });

      await receituarioBatch.commit();

      const historicoSnap = await ref
        .collection('Historico')
        .where('medId', '==', medicamento.id)
        .get();

      const tomadosOuPerdidos = historicoSnap.docs.filter((doc) => {
        const status = doc.data().status;
        return status === 'tomado' || status === 'perdido';
      });

      const pendentes = historicoSnap.docs
        .filter((doc) => doc.data().status === 'pendente')
        .sort((a, b) => (a.data().previstoPara ?? 0) - (b.data().previstoPara ?? 0));

      const qtdTotal = parseInt(receituario.quantidadeDoses, 10);
      const intervalo = parseInt(receituario.intervaloHoras, 10);
      const qtdPendentesNova = Math.max(qtdTotal - tomadosOuPerdidos.length, 0);
      const historicoBatch = firestore.batch();

      for (let i = 0; i < qtdPendentesNova; i++) {
        const previstoPara = receituario.dataInicio + (intervalo * 3600000 * i);
        const payload = {
          medId: medicamento.id,
          nomeMed: medicamento.nome,
          previstoPara,
          status: 'pendente',
          tomadoEm: null,
        };

        if (i < pendentes.length) {
          historicoBatch.update(pendentes[i].ref, payload);
        } else {
          const novoHist = ref.collection('Historico').doc();
          historicoBatch.set(novoHist, {
            id: novoHist.id,
            ...payload,
          });
        }
      }

      for (let i = qtdPendentesNova; i < pendentes.length; i++) {
        historicoBatch.delete(pendentes[i].ref);
      }

      tomadosOuPerdidos.forEach((doc) => {
        historicoBatch.update(doc.ref, { nomeMed: medicamento.nome });
      });

      await historicoBatch.commit();

      const uidLogado = auth.currentUser?.uid;
      if (uidLogado != null && uidLogado === uid) {
        void syncDoseNotificationsForCurrentUser().catch(console.log);
      } else if (uidLogado != null) {
        void syncLinkedDoseNotificationsForCurrentUser().catch(console.log);
      }

      Alert.alert('Sucesso', 'Receituário salvo com sucesso.');
      navigation.navigate('Menu');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o receituário.');
    }
  };

  const preview = gerarPreview();

  return (
    <TelaBase
      onBackPress={() => navigation.goBack()}
      title="Resumo da prescrição"
      subtitle={visualizandoVinculado ? `Salvando para: ${usuarioSelecionadoNome}` : 'Revise os dados antes de salvar o receituário e gerar as próximas doses.'}
    >
      <CartaoBase>
        <Text style={{ color: theme.colors.primary, fontSize: fontScale.sectionTitle, fontWeight: '700' }}>Medicamento</Text>

        <Text style={{ color: theme.colors.text, marginTop: 8, fontSize: fontScale.body }}>
          Nome: {medicamento.nome}
        </Text>

        {medicamento.tipo && (
          <Text style={{ color: theme.colors.text, fontSize: fontScale.body }}>
            Tipo: {medicamento.tipo}
          </Text>
        )}

        {medicamento.principio && (
          <Text style={{ color: theme.colors.text, fontSize: fontScale.body }}>
            Princípio ativo: {medicamento.principio}
          </Text>
        )}

        <Text style={{ color: theme.colors.primary, fontSize: fontScale.sectionTitle, fontWeight: '700', marginTop: 20 }}>
          Receituário
        </Text>

        <Text style={{ color: theme.colors.text, marginTop: 8, fontSize: fontScale.body }}>
          Dose: {receituario.dose}
        </Text>

        <Text style={{ color: theme.colors.text, fontSize: fontScale.body }}>
          Intervalo: {receituario.intervaloHoras} horas
        </Text>

        <Text style={{ color: theme.colors.text, fontSize: fontScale.body }}>
          Total de doses: {receituario.quantidadeDoses}
        </Text>

        <Text style={{ color: theme.colors.text, fontSize: fontScale.body }}>
          Inicio: {formatarDataHoraBR(receituario.dataInicio)}
        </Text>

        <Text style={{ color: theme.colors.primary, fontSize: fontScale.sectionTitle, fontWeight: '700', marginTop: 20 }}>
          Proximas doses
        </Text>

        {preview.map((data, i) => (
          <Text key={i} style={{ color: '#4d7182', marginTop: 6, fontSize: fontScale.body }}>
            {formatarDataHoraBR(data)}
          </Text>
        ))}

        <TouchableOpacity
          onPress={salvar}
          style={[styles.authPrimaryButton, { marginTop: 20 }]}
        >
          <Text style={{ color: theme.colors.textInverse, textAlign: 'center', fontWeight: '700', fontSize: fontScale.button }}>
            Salvar
          </Text>
        </TouchableOpacity>
      </CartaoBase>
    </TelaBase>
  );
}

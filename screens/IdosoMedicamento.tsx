import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { auth, firestore } from '../firebase';
import TelaBaseIdoso from '../components/idoso/TelaBaseIdoso';
import CartaoBase from '../components/CartaoBase';
import DateTimeSelector from '../components/DateTimeSelector';
import { useTamanhoFonte } from '../hooks/useTamanhoFonte';
import { formatarDataHoraBR } from '../utils/dataHora';
import { syncDoseNotificationsForCurrentUser } from '../utils/notificacoes';
import { useVinculosIdoso } from '../hooks/useVinculosIdoso';
import CampoTipoMedicamento from '../components/CampoTipoMedicamento';
import styles, { theme } from '../estilo';

export default function IdosoMedicamento() {
  const { fontScale } = useTamanhoFonte();
  const { idosoPodeGerenciarMedicamentos } = useVinculosIdoso();

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [principio, setPrincipio] = useState('');
  const [dose, setDose] = useState('');
  const [intervaloHoras, setIntervaloHoras] = useState('');
  const [quantidadeDoses, setQuantidadeDoses] = useState('');
  const [dataInicio, setDataInicio] = useState(new Date());
  const [salvando, setSalvando] = useState(false);

  const limpar = () => {
    setNome('');
    setTipo('');
    setPrincipio('');
    setDose('');
    setIntervaloHoras('');
    setQuantidadeDoses('');
    setDataInicio(new Date());
  };

  const salvar = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !idosoPodeGerenciarMedicamentos) return;

    const nomeLimpo = nome.trim();
    const tipoLimpo = tipo.trim();
    const principioLimpo = principio.trim();
    const doseLimpa = dose.trim();
    const intervalo = parseInt(intervaloHoras, 10);
    const quantidade = parseInt(quantidadeDoses, 10);

    if (!nomeLimpo || !doseLimpa || Number.isNaN(intervalo) || Number.isNaN(quantidade)) {
      Alert.alert('Erro', 'Preencha nome, dose, intervalo e quantidade.');
      return;
    }

    if (intervalo < 1 || quantidade < 1) {
      Alert.alert('Erro', 'Intervalo e quantidade precisam ser maiores que zero.');
      return;
    }

    try {
      setSalvando(true);
      const refUsuario = firestore.collection('Usuario').doc(uid);

      const medExistenteSnap = await refUsuario
        .collection('Med')
        .where('nomeComercial', '==', nomeLimpo)
        .limit(1)
        .get();

      const medRef = medExistenteSnap.empty
        ? refUsuario.collection('Med').doc()
        : medExistenteSnap.docs[0].ref;

      await medRef.set(
        {
          id: medRef.id,
          nomeComercial: nomeLimpo,
          tipoApresentacao: tipoLimpo,
          principioAtivo: principioLimpo,
          idosoPodeEditarExcluir: true,
          criadoEm: medExistenteSnap.empty ? Date.now() : (medExistenteSnap.docs[0].data().criadoEm ?? Date.now()),
        },
        { merge: true }
      );

      const [historicoAntigo, receituariosAntigos] = await Promise.all([
        refUsuario.collection('Historico').where('medId', '==', medRef.id).get(),
        refUsuario.collection('Receituario').where('medId', '==', medRef.id).get(),
      ]);

      const limpezaBatch = firestore.batch();
      historicoAntigo.docs.forEach((doc) => limpezaBatch.delete(doc.ref));
      receituariosAntigos.docs.forEach((doc) => limpezaBatch.delete(doc.ref));
      await limpezaBatch.commit();

      const receituarioRef = refUsuario.collection('Receituario').doc();
      await receituarioRef.set({
        id: receituarioRef.id,
        medId: medRef.id,
        nomeMed: nomeLimpo,
        dose: doseLimpa,
        intervaloHoras: intervalo,
        quantidadeDoses: quantidade,
        dataInicio: dataInicio.getTime(),
      });

      const historicoBatch = firestore.batch();
      for (let i = 0; i < quantidade; i++) {
        const doc = refUsuario.collection('Historico').doc();
        historicoBatch.set(doc, {
          id: doc.id,
          medId: medRef.id,
          nomeMed: nomeLimpo,
          previstoPara: dataInicio.getTime() + intervalo * 3600000 * i,
          status: 'pendente',
          tomadoEm: null,
        });
      }
      await historicoBatch.commit();
      void syncDoseNotificationsForCurrentUser().catch(console.log);

      Alert.alert('Sucesso', 'Medicamento e receituário salvos.');
      limpar();
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Não foi possível salvar esse remédio.');
    } finally {
      setSalvando(false);
    }
  };

  if (!idosoPodeGerenciarMedicamentos) {
    return (
      <TelaBaseIdoso title="Adicionar remédio" subtitle="Essa opção está desativada nesta conta.">
        <CartaoBase style={styles.idosoCard}>
          <Text style={{ color: theme.colors.text, fontSize: fontScale.sectionTitle, fontWeight: '700' }}>
            Liberação necessária
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: fontScale.body, marginTop: 8, lineHeight: 24 }}>
            Ative nas configurações se quiser cadastrar medicamento e receituário por aqui.
          </Text>
        </CartaoBase>
      </TelaBaseIdoso>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screenKeyboard}>
      <TelaBaseIdoso title="Novo remédio" subtitle="Cadastro simples para você mesmo adicionar o tratamento.">
        <CartaoBase style={[styles.idosoCard, { marginBottom: 14 }]}>
          <Text style={{ color: theme.colors.text, fontSize: fontScale.sectionTitle, fontWeight: '700', marginBottom: 12 }}>
            Medicamento
          </Text>

          <TextInput label="Nome do remédio" value={nome} onChangeText={setNome} style={[styles.inputSurface, { marginBottom: 12 }]} contentStyle={{ fontSize: fontScale.body }} activeUnderlineColor={theme.colors.accent} />
          <CampoTipoMedicamento
            value={tipo}
            onChange={setTipo}
            accentColor="#1f6b75"
            fontSize={{ title: fontScale.sectionTitle, body: fontScale.body, caption: fontScale.caption }}
          />
          <TextInput label="Princípio ativo" value={principio} onChangeText={setPrincipio} style={styles.inputSurface} contentStyle={{ fontSize: fontScale.body }} activeUnderlineColor={theme.colors.accent} />
        </CartaoBase>

        <CartaoBase style={styles.idosoCard}>
          <Text style={{ color: theme.colors.text, fontSize: fontScale.sectionTitle, fontWeight: '700', marginBottom: 12 }}>
            Receituário básico
          </Text>

          <TextInput label="Dose" value={dose} onChangeText={setDose} style={[styles.inputSurface, { marginBottom: 12 }]} contentStyle={{ fontSize: fontScale.body }} activeUnderlineColor={theme.colors.accent} />
          <TextInput label="Intervalo em horas" value={intervaloHoras} onChangeText={setIntervaloHoras} keyboardType="numeric" style={[styles.inputSurface, { marginBottom: 12 }]} contentStyle={{ fontSize: fontScale.body }} activeUnderlineColor={theme.colors.accent} />
          <TextInput label="Quantidade de doses" value={quantidadeDoses} onChangeText={setQuantidadeDoses} keyboardType="numeric" style={[styles.inputSurface, { marginBottom: 14 }]} contentStyle={{ fontSize: fontScale.body }} activeUnderlineColor={theme.colors.accent} />

          <DateTimeSelector
            label="Início do tratamento"
            value={dataInicio}
            onChange={setDataInicio}
            fontScale={fontScale}
            mode="datetime"
            minimumDate={new Date()}
          />

          <TouchableOpacity
            disabled={salvando}
            onPress={salvar}
            style={[styles.idosoPrimaryButton, { marginTop: 18, backgroundColor: salvando ? '#7aa7a4' : theme.colors.accent }]}
          >
            <Text style={{ color: theme.colors.textInverse, fontSize: fontScale.button, fontWeight: '700' }}>
              {salvando ? 'Salvando...' : 'Salvar remédio'}
            </Text>
          </TouchableOpacity>
        </CartaoBase>
      </TelaBaseIdoso>
    </KeyboardAvoidingView>
  );
}

import { useState } from 'react';
import { Text, TouchableOpacity, Alert, KeyboardAvoidingView, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { auth, firestore } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import TelaBase from '../components/TelaBase';
import CartaoBase from '../components/CartaoBase';
import { useTamanhoFonte } from '../hooks/useTamanhoFonte';
import { useVinculosIdoso } from '../hooks/useVinculosIdoso';
import CampoTipoMedicamento from '../components/CampoTipoMedicamento';

export default function Medicamento() {

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [principio, setPrincipio] = useState('');
  const [idosoPodeEditarExcluir, setIdosoPodeEditarExcluir] = useState(false);
  const { fontScale } = useTamanhoFonte();
  const { usuarioSelecionadoId, usuarioSelecionadoNome, visualizandoVinculado } = useVinculosIdoso();

  const navigation = useNavigation();

  const salvar = async () => {
    const uid = usuarioSelecionadoId;
    if (!uid) return;

    if (!nome.trim()) {
      Alert.alert("Erro", "Informe o nome do medicamento.");
      return;
    }

    const ref = firestore
      .collection('Usuario')
      .doc(uid)
      .collection('Med')
      .doc();

    await ref.set({
      id: ref.id,
      nomeComercial: nome,
      tipoApresentacao: tipo,
      principioAtivo: principio,
      idosoPodeEditarExcluir: visualizandoVinculado ? idosoPodeEditarExcluir : true,
      criadoEm: Date.now()
    });

    alert("Medicamento salvo!");
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}>
      <TelaBase
        onBackPress={() => navigation.goBack()}
        title="Novo medicamento"
        subtitle={visualizandoVinculado ? `Cadastrando para: ${usuarioSelecionadoNome}` : 'Cadastre os dados principais para usar nas prescricoes e no acompanhamento.'}
      >
        <CartaoBase>
          <TextInput label="Nome" value={nome} onChangeText={setNome} style={{ marginBottom: 12, backgroundColor: '#ffffff' }} contentStyle={{ fontSize: fontScale.body }} activeUnderlineColor="#0b3954" />
          <CampoTipoMedicamento
            value={tipo}
            onChange={setTipo}
            accentColor="#0b3954"
            fontSize={{ title: fontScale.sectionTitle, body: fontScale.body, caption: fontScale.caption }}
          />
          <TextInput label="Principio ativo" value={principio} onChangeText={setPrincipio} style={{ marginBottom: 18, backgroundColor: '#ffffff' }} contentStyle={{ fontSize: fontScale.body }} activeUnderlineColor="#0b3954" />

          {visualizandoVinculado && (
            <View style={{ marginBottom: 18, backgroundColor: '#eef7fa', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#dceaf0' }}>
              <Text style={{ color: '#12384c', fontSize: fontScale.body, fontWeight: '700' }}>
                Idoso pode editar ou excluir?
              </Text>
              <Text style={{ color: '#5f7f92', fontSize: fontScale.caption, marginTop: 6 }}>
                Use com cuidado para evitar alterações acidentais em remédios cadastrados pelo cuidador.
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 12, backgroundColor: '#dceef4', borderRadius: 12, padding: 5 }}>
                <TouchableOpacity
                  onPress={() => setIdosoPodeEditarExcluir(true)}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9, backgroundColor: idosoPodeEditarExcluir ? '#0b3954' : 'transparent' }}
                >
                  <Text style={{ color: idosoPodeEditarExcluir ? '#fff' : '#29576d', fontSize: fontScale.button, fontWeight: '700' }}>
                    Permitir
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIdosoPodeEditarExcluir(false)}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9, backgroundColor: !idosoPodeEditarExcluir ? '#0b3954' : 'transparent' }}
                >
                  <Text style={{ color: !idosoPodeEditarExcluir ? '#fff' : '#29576d', fontSize: fontScale.button, fontWeight: '700' }}>
                    Bloquear
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={salvar}
            style={{ backgroundColor: '#0b3954', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700', fontSize: fontScale.button }}>
              Salvar medicamento
            </Text>
          </TouchableOpacity>
        </CartaoBase>
      </TelaBase>
    </KeyboardAvoidingView>
  );
}

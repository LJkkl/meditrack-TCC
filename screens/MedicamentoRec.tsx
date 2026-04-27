import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, KeyboardAvoidingView } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { auth, firestore } from '../firebase';
import { formatarDataHoraBR } from '../utils/dataHora';
import { MedicamentoBuscaItem, RootStackParamList } from '../types/navigation';
import TelaBase from '../components/TelaBase';
import CartaoBase from '../components/CartaoBase';
import DateTimeSelector from '../components/DateTimeSelector';
import { useTamanhoFonte } from '../hooks/useTamanhoFonte';
import { useVinculosIdoso } from '../hooks/useVinculosIdoso';

export default function MedicamentoRec() {

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { fontScale } = useTamanhoFonte();
  const { usuarioSelecionadoId, usuarioSelecionadoNome, visualizandoVinculado } = useVinculosIdoso();

  const [dose, setDose] = useState('');
  const [intervaloHoras, setIntervaloHoras] = useState('');
  const [quantidadeDoses, setQuantidadeDoses] = useState('');
  const [data, setData] = useState(new Date());

  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<MedicamentoBuscaItem[]>([]);
  const [mostrarLista, setMostrarLista] = useState(false);

  const [medSelecionado, setMedSelecionado] = useState<MedicamentoBuscaItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // 🔎 BUSCA FIREBASE (CORRIGIDO)
  useEffect(() => {
    const uid = usuarioSelecionadoId;

    if (!uid || busca.length === 0) {
      setResultados([]);
      return;
    }

    const unsubscribe = firestore
      .collection('Usuario')
      .doc(uid)
      .collection('Med')
      .orderBy('nomeComercial') // 🔥 corrigido
      .startAt(busca)
      .endAt(busca + '\uf8ff')
      .onSnapshot(snapshot => {

        const lista = snapshot.docs.map(doc => {
          const data = doc.data();

          return {
            id: doc.id,
            nome: data.nomeComercial, // 🔥 padroniza
            tipo: data.tipoApresentacao,
            principio: data.principioAtivo,
            foto: data.foto
          };
        });

        setResultados(lista);
      });

    return () => unsubscribe();
  }, [busca, usuarioSelecionadoId]);

  // 🚀 AVANÇAR
  const avancar = () => {
    if (!medSelecionado || !dose || !intervaloHoras || !quantidadeDoses) {
      alert("Preencha tudo");
      return;
    }

    navigation.navigate('MedicamentoRes', {
      medicamento: medSelecionado,
      receituario: {
        dose,
        intervaloHoras,
        quantidadeDoses,
        dataInicio: data.getTime()
      }
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}>
      <TelaBase
        onBackPress={() => navigation.goBack()}
        title="Novo receituário"
        subtitle={visualizandoVinculado ? `Montando receituário para: ${usuarioSelecionadoNome}` : 'Escolha o medicamento, defina as doses e prepare a rotina de administração.'}
      >
        <CartaoBase>

      {/* 🔍 INPUT */}
      <TextInput
        label="Buscar medicamento"
        value={busca}
        onChangeText={(text) => {
          setBusca(text);
          setMostrarLista(true);
          setMedSelecionado(null);
        }}
        right={
          medSelecionado && (
            <TextInput.Icon
              icon="help-circle"
              color="#00e5ff"
              onPress={() => setModalVisible(true)}
            />
          )
        }
        style={{ backgroundColor: '#ffffff', marginBottom: 8 }}
        contentStyle={{ fontSize: fontScale.body }}
        activeUnderlineColor="#0b3954"
      />

      {/* 📋 LISTA */}
      {mostrarLista && resultados.length > 0 && (
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          marginTop: 5,
          maxHeight: 150,
          overflow: 'hidden'
        }}>
          {resultados.slice(0, 8).map((item, index) => (
            <View key={item.id}>
              <TouchableOpacity
                onPress={() => {
                  setBusca(item.nome);
                  setMedSelecionado(item); // 🔥 agora correto
                  setMostrarLista(false);
                }}
                style={{
                  padding: 12,
                  borderBottomWidth: index === Math.min(resultados.length, 8) - 1 ? 0 : 1,
                  borderBottomColor: '#eee'
                }}
              >
                <Text style={{ fontSize: fontScale.body }}>{item.nome}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* FORM */}
      <TextInput label="Dose" value={dose} onChangeText={setDose} style={{ backgroundColor: '#ffffff', marginTop: 12 }} contentStyle={{ fontSize: fontScale.body }} activeUnderlineColor="#0b3954" />

      <TextInput
        label="Intervalo (h)"
        value={intervaloHoras}
        onChangeText={setIntervaloHoras}
        keyboardType="numeric"
        style={{ backgroundColor: '#ffffff', marginTop: 12 }}
        contentStyle={{ fontSize: fontScale.body }}
        activeUnderlineColor="#0b3954"
      />

      <TextInput
        label="Quantidade de doses"
        value={quantidadeDoses}
        onChangeText={setQuantidadeDoses}
        keyboardType="numeric"
        style={{ backgroundColor: '#ffffff', marginTop: 12 }}
        contentStyle={{ fontSize: fontScale.body }}
        activeUnderlineColor="#0b3954"
      />

      {/* DATA */}
      <DateTimeSelector
        label="Data e hora de início"
        value={data}
        onChange={setData}
        fontScale={fontScale}
        mode="datetime"
        minimumDate={new Date()}
      />

      <TouchableOpacity
        onPress={avancar}
        style={{
          marginTop: 20,
          backgroundColor: '#0b3954',
          padding: 15,
          borderRadius: 16
        }}
      >
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700', fontSize: fontScale.button }}>
          Avançar
        </Text>
      </TouchableOpacity>
        </CartaoBase>

      {/* 📄 MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 10,
            width: '85%'
          }}>

            <Text style={{ fontSize: fontScale.sectionTitle, fontWeight: 'bold' }}>
              {medSelecionado?.nome}
            </Text>

            <Text style={{ fontSize: fontScale.body }}>Tipo: {medSelecionado?.tipo}</Text>
            <Text style={{ fontSize: fontScale.body }}>Princípio ativo: {medSelecionado?.principio}</Text>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{
                marginTop: 15,
                backgroundColor: '#00897b',
                padding: 10,
                borderRadius: 5
              }}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontSize: fontScale.button }}>
                Fechar
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      </TelaBase>
    </KeyboardAvoidingView>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { auth, firestore } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '@react-native-vector-icons/fontawesome6';
import { MedicamentoItem, RootStackParamList } from '../types/navigation';
import TelaBase from '../components/TelaBase';
import CartaoBase from '../components/CartaoBase';
import { useTamanhoFonte } from '../hooks/useTamanhoFonte';
import { useVinculosIdoso } from '../hooks/useVinculosIdoso';

function normalizarTexto(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function ListaMedicamentos() {
  const [medicamentos, setMedicamentos] = useState<MedicamentoItem[]>([]);
  const [busca, setBusca] = useState('');
  const { fontScale } = useTamanhoFonte();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { usuarioSelecionadoId, usuarioSelecionadoNome, visualizandoVinculado } = useVinculosIdoso();

  useEffect(() => {
    const uid = usuarioSelecionadoId;
    if (!uid) return;

    const unsubscribe = firestore
      .collection('Usuario')
      .doc(uid)
      .collection('Med')
      .orderBy('nomeComercial')
      .onSnapshot(snapshot => {
        const lista: MedicamentoItem[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<MedicamentoItem, 'id'>)
        }));
        setMedicamentos(lista);
      });

    return () => unsubscribe();
  }, [usuarioSelecionadoId]);

  const medicamentosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    if (!termo) {
      return medicamentos;
    }

    return [...medicamentos].sort((a, b) => {
      const nomeA = normalizarTexto(a.nomeComercial || '');
      const nomeB = normalizarTexto(b.nomeComercial || '');
      const tipoA = normalizarTexto(a.tipoApresentacao || '');
      const tipoB = normalizarTexto(b.tipoApresentacao || '');
      const principioA = normalizarTexto(a.principioAtivo || '');
      const principioB = normalizarTexto(b.principioAtivo || '');

      const pontuar = (nome: string, tipo: string, principio: string) => {
        if (nome === termo) return 0;
        if (nome.startsWith(termo)) return 1;
        if (nome.includes(termo)) return 2;
        if (principio.startsWith(termo)) return 3;
        if (principio.includes(termo)) return 4;
        if (tipo.startsWith(termo)) return 5;
        if (tipo.includes(termo)) return 6;
        return 7;
      };

      const scoreA = pontuar(nomeA, tipoA, principioA);
      const scoreB = pontuar(nomeB, tipoB, principioB);

      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }

      return nomeA.localeCompare(nomeB);
    });
  }, [busca, medicamentos]);

  return (
    <TelaBase title="Medicamentos" subtitle={visualizandoVinculado ? `Medicamentos de: ${usuarioSelecionadoNome}` : 'Acesse rapidamente a lista cadastrada e entre no detalhe de cada item.'}>
      <CartaoBase style={{ marginBottom: 14, padding: 16 }}>
        <TextInput
          label="Pesquisar medicamento"
          value={busca}
          onChangeText={setBusca}
          placeholder="Nome, tipo ou principio ativo"
          style={{ backgroundColor: '#ffffff' }}
          contentStyle={{ fontSize: fontScale.body }}
          activeUnderlineColor="#0b3954"
          left={<TextInput.Icon icon={() => <Icon name="magnifying-glass" size={Math.max(16, fontScale.body)} color="#5f7f92" iconStyle="solid" />} />}
          right={
            busca ? (
              <TextInput.Icon
                icon={() => <Icon name="xmark" size={Math.max(16, fontScale.body)} color="#5f7f92" iconStyle="solid" />}
                onPress={() => setBusca('')}
              />
            ) : undefined
          }
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: '#12384c', fontSize: fontScale.body, fontWeight: '700' }}>
              {busca ? `${medicamentosFiltrados.length} resultados encontrados` : `${medicamentos.length} medicamentos cadastrados`}
            </Text>
            <Text style={{ color: '#5f7f92', fontSize: fontScale.caption, marginTop: 3 }}>
              Os itens mais proximos da pesquisa aparecem primeiro.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Medicamento')}
            activeOpacity={0.9}
            style={{
              backgroundColor: '#deedf3',
              borderRadius: 16,
              paddingVertical: 12,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#c3dce8',
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#0b3954',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8,
              }}
            >
              <Icon name="plus" size={Math.max(12, fontScale.caption)} color="#ffffff" iconStyle="solid" />
            </View>
            <Text style={{ color: '#0b3954', fontWeight: '700', fontSize: fontScale.button }}>
              Novo
            </Text>
          </TouchableOpacity>
        </View>
      </CartaoBase>

        {medicamentosFiltrados.map(med => (
          <CartaoBase key={med.id} style={{
            backgroundColor: '#f7fbfd',
            marginBottom: 10
          }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('MedicamentoPer', { medicamento: med })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: '#12384c', fontSize: fontScale.sectionTitle, fontWeight: '700' }}>
                    {med.nomeComercial}
                  </Text>
                 
                </View>

                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: '#eaf4f8',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="chevron-right" size={Math.max(14, fontScale.caption)} color="#0b3954" iconStyle="solid" />
                </View>
              </View>
            </TouchableOpacity>
          </CartaoBase>
        ))}

        {medicamentos.length === 0 && (
          <Text style={{ color: '#dceef4', textAlign: 'center', marginTop: 20, fontSize: fontScale.body }}>
            Nenhum medicamento cadastrado
          </Text>
        )}

        {medicamentos.length > 0 && medicamentosFiltrados.length === 0 && (
          <CartaoBase style={{ marginTop: 8, alignItems: 'center' }}>
            <Text style={{ color: '#12384c', fontSize: fontScale.sectionTitle, fontWeight: '700' }}>
              Nenhum medicamento encontrado
            </Text>
            <Text style={{ color: '#5f7f92', textAlign: 'center', marginTop: 6, fontSize: fontScale.body }}>
              Tente pesquisar por outro nome, tipo ou principio ativo.
            </Text>
          </CartaoBase>
        )}
    </TelaBase>
  );
}

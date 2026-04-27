import { useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { auth, firestore } from '../firebase';
import TelaBaseIdoso from '../components/idoso/TelaBaseIdoso';
import CartaoBase from '../components/CartaoBase';
import { useTamanhoFonte } from '../hooks/useTamanhoFonte';
import { formatarDataHoraBR } from '../utils/dataHora';
import { useVinculosIdoso } from '../hooks/useVinculosIdoso';
import styles, { theme } from '../estilo';

type MedicamentoItem = {
  id: string;
  nomeComercial: string;
  tipoApresentacao?: string;
  principioAtivo?: string;
};

type ReceituarioItem = {
  id: string;
  medId: string;
  dose?: string;
  intervaloHoras?: number;
  quantidadeDoses?: number;
  dataInicio?: number;
};

export default function IdosoMedicamentoListar() {
  const navigation = useNavigation<any>();
  const { fontScale } = useTamanhoFonte();
  const { idosoPodeGerenciarMedicamentos } = useVinculosIdoso();
  const [medicamentos, setMedicamentos] = useState<MedicamentoItem[]>([]);
  const [receituarios, setReceituarios] = useState<ReceituarioItem[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsubscribeMedicamentos = firestore
      .collection('Usuario')
      .doc(uid)
      .collection('Med')
      .orderBy('nomeComercial')
      .onSnapshot((snapshot) => {
        const lista: MedicamentoItem[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<MedicamentoItem, 'id'>),
        }));
        setMedicamentos(lista);
      });

    const unsubscribeReceituarios = firestore
      .collection('Usuario')
      .doc(uid)
      .collection('Receituario')
      .onSnapshot((snapshot) => {
        const lista: ReceituarioItem[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<ReceituarioItem, 'id'>),
        }));
        setReceituarios(lista);
      });

    return () => {
      unsubscribeMedicamentos();
      unsubscribeReceituarios();
    };
  }, []);

  const receituarioPorMedicamento = useMemo(() => {
    const mapa = new Map<string, ReceituarioItem>();

    receituarios.forEach((item) => {
      const atual = mapa.get(item.medId);
      const dataAtual = atual?.dataInicio ?? 0;
      const dataNova = item.dataInicio ?? 0;

      if (!atual || dataNova >= dataAtual) {
        mapa.set(item.medId, item);
      }
    });

    return mapa;
  }, [receituarios]);

  return (
    <TelaBaseIdoso
      title="Meus remédios"
      subtitle={idosoPodeGerenciarMedicamentos ? 'Veja sua lista e use o botão + para cadastrar outro remédio.' : 'Veja os medicamentos cadastrados para você.'}
    >
      {idosoPodeGerenciarMedicamentos && (
        <CartaoBase style={[styles.idosoCard, { marginBottom: 14 }]}>
          <TouchableOpacity onPress={() => navigation.navigate('IdosoMedicamento')} style={styles.idosoPrimaryButton}>
            <Icon name="plus" size={16} color={theme.colors.textInverse} iconStyle="solid" />
            <Text style={{ color: theme.colors.textInverse, fontSize: fontScale.button, fontWeight: '700', marginLeft: 10 }}>
              Adicionar remédio
            </Text>
          </TouchableOpacity>
        </CartaoBase>
      )}

      {medicamentos.map((medicamento) => {
        const receituario = receituarioPorMedicamento.get(medicamento.id);

        return (
          <CartaoBase key={medicamento.id} style={[styles.idosoCard, { marginBottom: 12 }]}>
            <Text style={{ color: theme.colors.text, fontSize: fontScale.sectionTitle + 1, fontWeight: '700' }}>
              {medicamento.nomeComercial}
            </Text>

            <Text style={{ color: '#4d7182', fontSize: fontScale.body, marginTop: 6, lineHeight: 24 }}>
              {medicamento.tipoApresentacao || 'Tipo nao informado'}
            </Text>

            {!!medicamento.principioAtivo && (
              <Text style={{ color: '#4d7182', fontSize: fontScale.body, marginTop: 4, lineHeight: 24 }}>
                Princípio ativo: {medicamento.principioAtivo}
              </Text>
            )}

            <View style={styles.idosoSoftPanel}>
              <Text style={{ color: '#24505b', fontSize: fontScale.caption, fontWeight: '700' }}>
                Receituário
              </Text>

              {receituario ? (
                <>
                  <Text style={{ color: theme.colors.text, fontSize: fontScale.body, fontWeight: '700', marginTop: 8 }}>
                    Dose: {receituario.dose}
                  </Text>
                  <Text style={{ color: '#4d7182', fontSize: fontScale.body, marginTop: 4 }}>
                    Intervalo: {receituario.intervaloHoras} horas
                  </Text>
                  <Text style={{ color: '#4d7182', fontSize: fontScale.body, marginTop: 4 }}>
                    Quantidade: {receituario.quantidadeDoses}
                  </Text>
                  <Text style={{ color: '#4d7182', fontSize: fontScale.body, marginTop: 4 }}>
                    Inicio: {receituario.dataInicio ? formatarDataHoraBR(receituario.dataInicio) : '--'}
                  </Text>
                </>
              ) : (
                <Text style={{ color: theme.colors.textMuted, fontSize: fontScale.body, marginTop: 8, lineHeight: 24 }}>
                  Ainda não há receituário cadastrado para este remédio.
                </Text>
              )}
            </View>
          </CartaoBase>
        );
      })}

      {medicamentos.length === 0 && (
        <CartaoBase style={[styles.idosoCard, { alignItems: 'center', paddingVertical: 28 }]}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#deedf3',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Icon name="capsules" size={24} color={theme.colors.primary} iconStyle="solid" />
          </View>
          <Text style={{ color: theme.colors.text, fontSize: fontScale.sectionTitle + 1, fontWeight: '700', textAlign: 'center' }}>
            Nenhum remédio cadastrado
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: fontScale.body, marginTop: 8, lineHeight: 24, textAlign: 'center' }}>
            {idosoPodeGerenciarMedicamentos ? 'Use o botão + para adicionar seu primeiro remédio.' : 'Quando alguém cadastrar seus remédios, eles vão aparecer aqui.'}
          </Text>
        </CartaoBase>
      )}
    </TelaBaseIdoso>
  );
}

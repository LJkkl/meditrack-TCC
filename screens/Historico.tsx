import { Text, View, ActivityIndicator, Modal, TouchableOpacity, Alert, TextInput } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { auth, firestore } from '../firebase';
import { useEffect, useState } from 'react';
import { formatarDataHoraBR } from '../utils/dataHora';
import TelaBase from '../components/TelaBase';
import CartaoBase from '../components/CartaoBase';
import DateTimeSelector from '../components/DateTimeSelector';
import { useTamanhoFonte } from '../hooks/useTamanhoFonte';
import { useVinculosIdoso } from '../hooks/useVinculosIdoso';
import styles, { theme } from '../estilo';

interface Dose {
  id: string;
  nomeMed: string;
  previstoPara: number;
  status: 'tomado' | 'perdido' | 'pendente';
  tomadoEm?: number;
}

export default function Historico() {
  const [doses, setDoses] = useState<Dose[]>([]);
  const [carregando, setCarregando] = useState(true);
  const { fontScale } = useTamanhoFonte();
  const { usuarioSelecionadoId, usuarioSelecionadoNome, visualizandoVinculado } = useVinculosIdoso();

  // Estados para edição de dose
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [doseEmEdicao, setDoseEmEdicao] = useState<Dose | null>(null);
  const [dataHoraEdicao, setDataHoraEdicao] = useState(new Date());
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  useEffect(() => {
    if (auth.currentUser == null || !usuarioSelecionadoId) {
      setDoses([]);
      setCarregando(false);
      return;
    }

    setCarregando(true);

    const unsubscribeHistorico = firestore
      .collection('Usuario')
      .doc(usuarioSelecionadoId)
      .collection('Historico')
      .onSnapshot(
        (snapshot) => {
          const lista: Dose[] = [];

          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            lista.push({
              id: doc.id,
              nomeMed: data.nomeMed ?? data.nome ?? 'Medicamento',
              previstoPara: data.previstoPara ?? 0,
              status: data.status ?? 'pendente',
              tomadoEm: data.tomadoEm,
            });
          });

          const filtradas = lista.filter((item) => item.status === 'tomado' || item.status === 'perdido');
          setDoses(filtradas);
          setCarregando(false);
        },
        (erro) => {
          console.log('Erro ao carregar historico:', erro);
          setCarregando(false);
        }
      );

    return () => unsubscribeHistorico();
  }, [usuarioSelecionadoId]);

  const ATRASO_MAXIMO_MS = 2 * 60 * 60 * 1000; // 2 horas - acima disso, tratado como perdido
  const ATRASO_MINUTOS = 30; // 30 minutos para considerar atrasado

  const calcularAtrasoMs = (previsto: number, tomado?: number) => {
    if (tomado == null) return 0;
    return tomado - previsto;
  };

  const calcularStatusTomado = (previsto: number, tomado?: number) => {
    if (tomado == null) return 'Concluída';

    const diff = tomado - previsto;
    if (diff <= 0) return 'No horário';

    const min = Math.floor(diff / (1000 * 60));
    if (min < 60) return `${min} min atrasado`;

    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m}min atrasado`;
  };

  const dosesTomadas = doses
    .filter((dose) => dose.status === 'tomado' && calcularAtrasoMs(dose.previstoPara, dose.tomadoEm) <= ATRASO_MAXIMO_MS)
    .sort((a, b) => (b.tomadoEm ?? 0) - (a.tomadoEm ?? 0));

  const dosesTomadasAtrasadas = dosesTomadas.filter((dose) => {
    const diff = (dose.tomadoEm ?? 0) - dose.previstoPara;
    const minutos = Math.floor(diff / (1000 * 60));
    return minutos >= ATRASO_MINUTOS;
  });

  const dosesPerdidas = doses
    .filter((dose) => dose.status === 'perdido' || (dose.status === 'tomado' && calcularAtrasoMs(dose.previstoPara, dose.tomadoEm) > ATRASO_MAXIMO_MS))
    .sort((a, b) => (b.previstoPara ?? 0) - (a.previstoPara ?? 0));

  const abrirModalEdicao = (dose: Dose) => {
    setDoseEmEdicao(dose);
    const data = new Date(dose.tomadoEm ?? Date.now());
    setDataHoraEdicao(data);
    setModalEdicaoAberto(true);
  };

  const marcarComoTomada = async (dose: Dose) => {
    if (!usuarioSelecionadoId) return;

    Alert.alert(
      'Confirmar',
      `Marcar "${dose.nomeMed}" como tomada no horário previsto (${formatarDataHoraBR(dose.previstoPara)})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await firestore
                .collection('Usuario')
                .doc(usuarioSelecionadoId)
                .collection('Historico')
                .doc(dose.id)
                .update({
                  status: 'tomado',
                  tomadoEm: dose.previstoPara, // Marca como tomada no horário previsto
                });

              Alert.alert('Sucesso', 'Dose marcada como tomada!');
            } catch (error) {
              console.error('Erro ao marcar dose como tomada:', error);
              Alert.alert('Erro', 'Não foi possível marcar a dose como tomada.');
            }
          },
        },
      ]
    );
  };

  const salvarEdicaoDose = async () => {
    if (!doseEmEdicao || !usuarioSelecionadoId) return;

    try {
      const novoTomadoEm = dataHoraEdicao.getTime();
      const atraso = novoTomadoEm - doseEmEdicao.previstoPara;
      
      // Se atraso > ATRASO_MAXIMO_MS, marca como perdido, senão marca como tomado
      const novoStatus = atraso > ATRASO_MAXIMO_MS ? 'perdido' : 'tomado';

      setSalvandoEdicao(true);
      await firestore
        .collection('Usuario')
        .doc(usuarioSelecionadoId)
        .collection('Historico')
        .doc(doseEmEdicao.id)
        .update({
          tomadoEm: novoTomadoEm,
          status: novoStatus,
        });

      setModalEdicaoAberto(false);
      setDoseEmEdicao(null);
      Alert.alert('Sucesso', 'Data e hora da dose foram atualizadas!');
    } catch (error) {
      console.error('Erro ao atualizar dose:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a dose.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  return (
    <TelaBase
      title="Histórico"
      subtitle={visualizandoVinculado ? `Histórico de: ${usuarioSelecionadoNome}` : 'Veja as doses tomadas e as perdidas em seções separadas para leitura mais rápida.'}
    >
      <CartaoBase style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.summaryIconBubble}>
            <Icon name="clock-rotate-left" size={20} color="#0b3954" iconStyle="solid" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: '#12384c', fontSize: fontScale.sectionTitle, fontWeight: '700' }}>
              Resumo do histórico
            </Text>
            <Text style={{ color: '#5f7f92', marginTop: 4, fontSize: fontScale.body }}>
              {doses.length} registros finalizados entre doses tomadas e perdidas.
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summarySuccessBox}>
            <Text style={{ color: '#1b5e20', fontSize: fontScale.caption, textTransform: 'uppercase' }}>
              Tomadas
            </Text>
            <Text style={{ color: '#1b5e20', fontSize: fontScale.sectionTitle, fontWeight: '700', marginTop: 4 }}>
              {dosesTomadas.length}
            </Text>
          </View>

          <View style={styles.summaryWarningBox}>
            <Text style={{ color: '#e65100', fontSize: fontScale.caption, textTransform: 'uppercase' }}>
              Perdidas
            </Text>
            <Text style={{ color: '#e65100', fontSize: fontScale.sectionTitle, fontWeight: '700', marginTop: 4 }}>
              {dosesPerdidas.length}
            </Text>
          </View>
        </View>
      </CartaoBase>

      {carregando === true && (
        <CartaoBase style={{ alignItems: 'center', paddingVertical: 28 }}>
          <ActivityIndicator size="large" color="#0b3954" />
          <Text style={{ textAlign: 'center', marginTop: 14, color: '#5f7f92', fontSize: fontScale.body }}>
            Carregando historico...
          </Text>
        </CartaoBase>
      )}

      {carregando === false && dosesTomadas.length > 0 && (
        <Text style={{ color: '#1b5e20', fontWeight: '700', fontSize: fontScale.sectionTitle, marginBottom: 8 }}>
          Tomadas
        </Text>
      )}

      {carregando === false && dosesTomadas.map((dose) => (
        <CartaoBase
          key={dose.id}
          style={{
            backgroundColor: '#e8f5e9',
            marginBottom: 10,
            borderLeftWidth: 4,
            borderLeftColor: '#2e7d32',
          }}
        >
          <Text style={{ fontWeight: '700', color: '#12384c', fontSize: fontScale.sectionTitle }}>
            {dose.nomeMed}
          </Text>

          <Text style={{ marginTop: 8, color: '#1b5e20', fontWeight: '600', fontSize: fontScale.body }}>
            {calcularStatusTomado(dose.previstoPara, dose.tomadoEm)}
          </Text>

          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: fontScale.caption, color: '#5f7f92', textTransform: 'uppercase' }}>
              Horário previsto
            </Text>
            <Text style={{ fontSize: fontScale.body, color: '#12384c', fontWeight: '700', marginTop: 4 }}>
              {formatarDataHoraBR(dose.previstoPara)}
            </Text>

            {dose.tomadoEm != null && (
              <>
                <Text style={{ fontSize: fontScale.caption, color: '#5f7f92', textTransform: 'uppercase', marginTop: 10 }}>
                  Tomado em
                </Text>
                <Text style={{ fontSize: fontScale.body, color: '#12384c', fontWeight: '700', marginTop: 4 }}>
                  {formatarDataHoraBR(dose.tomadoEm)}
                </Text>
              </>
            )}

            <TouchableOpacity
              onPress={() => abrirModalEdicao(dose)}
              style={{
                marginTop: 12,
                paddingVertical: 10,
                paddingHorizontal: 12,
                backgroundColor: '#c8e6c9',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#81c784',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
            >
              <Icon name="pen" size={12} color="#1b5e20" iconStyle="solid" />
              <Text style={{ color: '#1b5e20', fontWeight: '600', fontSize: fontScale.body, marginLeft: 6 }}>
                Editar data e hora
              </Text>
            </TouchableOpacity>
          </View>
        </CartaoBase>
      ))}

      {carregando === false && dosesPerdidas.length > 0 && (
        <Text style={{ color: '#e65100', fontWeight: '700', fontSize: fontScale.sectionTitle, marginTop: 6, marginBottom: 8 }}>
          Perdidas
        </Text>
      )}

      {carregando === false && dosesPerdidas.map((dose) => (
        <CartaoBase
          key={dose.id}
          style={{
            backgroundColor: '#fff3e0',
            marginBottom: 10,
            borderLeftWidth: 4,
            borderLeftColor: '#ff9800',
          }}
        >
          <Text style={{ fontWeight: '700', color: '#12384c', fontSize: fontScale.sectionTitle }}>
            {dose.nomeMed}
          </Text>

          <Text style={{ marginTop: 8, color: '#e65100', fontWeight: '600', fontSize: fontScale.body }}>
            Dose não administrada a tempo
          </Text>

          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: fontScale.caption, color: '#5f7f92', textTransform: 'uppercase' }}>
              Horário previsto
            </Text>
            <Text style={{ fontSize: fontScale.body, color: '#12384c', fontWeight: '700', marginTop: 4 }}>
              {formatarDataHoraBR(dose.previstoPara)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              onPress={() => marcarComoTomada(dose)}
              style={{
                flex: 1,
                paddingVertical: 10,
                paddingHorizontal: 12,
                backgroundColor: '#4caf50',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#388e3c',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
            >
              <Icon name="check" size={12} color="#ffffff" iconStyle="solid" />
              <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: fontScale.body, marginLeft: 6 }}>
                Marcar como tomada
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => abrirModalEdicao(dose)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                backgroundColor: '#ffe0b2',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#ffb74d',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
            >
              <Icon name="pen" size={12} color="#e65100" iconStyle="solid" />
            </TouchableOpacity>
          </View>
        </CartaoBase>
      ))}

      {carregando === false && doses.length === 0 && (
        <CartaoBase style={{ alignItems: 'center', paddingVertical: 30 }}>
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: '#deedf3',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Icon name="clock-rotate-left" size={22} color="#0b3954" iconStyle="solid" />
          </View>
          <Text style={{ textAlign: 'center', color: '#12384c', fontSize: fontScale.sectionTitle, fontWeight: '700' }}>
            Nenhum registro ainda
          </Text>
          <Text style={{ textAlign: 'center', marginTop: 8, color: '#5f7f92', lineHeight: 20, fontSize: fontScale.body }}>
            As doses tomadas e perdidas vao aparecer aqui conforme o tratamento for sendo acompanhado.
          </Text>
        </CartaoBase>
      )}

      <Modal visible={modalEdicaoAberto} transparent animationType="fade" onRequestClose={() => setModalEdicaoAberto(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setModalEdicaoAberto(false)} style={styles.modalOverlay}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <CartaoBase style={styles.modalCard}>
              <Text style={{ fontSize: fontScale.sectionTitle, fontWeight: '700', color: theme.colors.text, marginBottom: 16 }}>
                Editar {doseEmEdicao?.nomeMed}
              </Text>

              <DateTimeSelector
                label="Data e hora da dose"
                value={dataHoraEdicao}
                onChange={setDataHoraEdicao}
                fontScale={fontScale}
                mode="datetime"
              />

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => setModalEdicaoAberto(false)}
                  disabled={salvandoEdicao}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#5f7f92',
                    alignItems: 'center',
                    opacity: salvandoEdicao ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: '#5f7f92', fontWeight: '600', fontSize: fontScale.body }}>
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={salvarEdicaoDose}
                  disabled={salvandoEdicao}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 8,
                    backgroundColor: '#1f6b75',
                    alignItems: 'center',
                    opacity: salvandoEdicao ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: fontScale.body }}>
                    {salvandoEdicao ? 'Salvando...' : 'Salvar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </CartaoBase>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </TelaBase>
  );
}

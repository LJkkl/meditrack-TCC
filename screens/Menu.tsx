import * as React from 'react';
import {
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Home from './Home';
import IdosoHome from './IdosoHome';
import IdosoHistorico from './IdosoHistorico';
import IdosoMedicamento from './IdosoMedicamento';
import IdosoMedicamentoListar from './IdosoMedicamentoListar';
import MedicamentoListar from './MedicamentoListar';
import MedicamentoRec from './MedicamentoRec';
import Perfil from './Perfil';
import Historico from './Historico';
import IdosoPerfil from './IdosoPerfil';
import Icon from '@react-native-vector-icons/fontawesome6';
import { MenuTabParamList, RootStackParamList } from '../types/navigation';
import { auth } from '../firebase';
import { useTamanhoFonte } from '../hooks/useTamanhoFonte';
import { useVinculosIdoso } from '../hooks/useVinculosIdoso';
import styles, { bodyText, captionText, titleText } from '../estilo';

const Tab = createBottomTabNavigator<MenuTabParamList>();

type ItemUsuario = {
  id: string;
  nome: string;
};

export default function Menu() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    loading,
    tipoUsuario,
    vinculados,
    usuarioSelecionadoId,
    usuarioSelecionadoNome,
    selecionarUsuario,
    desvincularIdoso,
    idosoPodeGerenciarMedicamentos,
  } = useVinculosIdoso();
  const { fontScale } = useTamanhoFonte();
  const insets = useSafeAreaInsets();
  const tabIconSize = Math.min(28, Math.max(22, fontScale.body + 2));
  const headerTitleSize = Math.min(22, Math.max(18, fontScale.sectionTitle));
  const headerPillTextSize = Math.min(12, Math.max(10, fontScale.caption - 2));
  const fabIconSize = Math.min(32, Math.max(26, fontScale.button + 2));

  const [modalUsuariosAberto, setModalUsuariosAberto] = React.useState(false);
  const [agora, setAgora] = React.useState(() => new Date());

  const isModoIdoso = tipoUsuario === 'idoso';
  const bottomInset = Math.max(insets.bottom, 16);
  const tabBarHeight = 60 + bottomInset;

  React.useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const usuariosDisponiveis = React.useMemo<ItemUsuario[]>(() => {
    return [
      { id: 'minha-conta', nome: 'Minha conta' },
      ...vinculados.map((v) => ({ id: v.id, nome: v.nome })),
    ];
  }, [vinculados]);

  const calendarioCabecalho = React.useMemo(() => {
    const dia = agora.getDate().toString().padStart(2, '0');
    const mes = agora
      .toLocaleDateString('pt-BR', { month: 'short' })
      .replace('.', '')
      .toUpperCase();
    const semana = agora
      .toLocaleDateString('pt-BR', { weekday: 'short' })
      .replace('.', '')
      .slice(0, 3)
      .toUpperCase();

    return { dia, mes, semana };
  }, [agora]);

  if (loading) {
    return null;
  }

  return (
    <>
      <Tab.Navigator
        key={isModoIdoso ? 'idoso' : 'normal'}
        id="main-tabs"
        screenOptions={{
          headerStyle: { backgroundColor: '#002a44' },
          headerTintColor: '#fff',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontSize: headerTitleSize,
            fontWeight: '700',
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Agenda')}
              activeOpacity={0.9}
              style={styles.menuCalendarBadge}
            >
              <View style={styles.menuCalendarIconWrap}>
                <Icon name="calendar-days" size={14} color="#e7f4ff" iconStyle="solid" />
              </View>
              <View>
                <Text
                  numberOfLines={1}
                  style={captionText(headerPillTextSize, '#9fcee5', {
                    fontWeight: '700',
                    letterSpacing: 0.8,
                  })}
                >
                  {calendarioCabecalho.semana}
                </Text>
                <Text
                  numberOfLines={1}
                  style={captionText(headerPillTextSize, '#e7f4ff', {
                    fontWeight: '700',
                  })}
                >
                  {`${calendarioCabecalho.dia} ${calendarioCabecalho.mes}`}
                </Text>
              </View>
            </TouchableOpacity>
          ),
          tabBarStyle: {
            backgroundColor: '#003f5c',
            height: tabBarHeight,
            paddingBottom: bottomInset,
            paddingTop: 8,
            borderTopWidth: 0,
          },
          tabBarItemStyle: {
            paddingTop: 2,
          },
          tabBarActiveTintColor: '#fff',
          tabBarInactiveTintColor: '#bcd3e6',
          tabBarShowLabel: false,
          headerRight: isModoIdoso
            ? undefined
            : () => (
                <TouchableOpacity
                  onPress={() => setModalUsuariosAberto(true)}
                  style={styles.menuUserSwitcher}
                >
                  <Icon name="users" size={14} color="#e7f4ff" iconStyle="solid" />
                  <Text
                    numberOfLines={1}
                    style={captionText(headerPillTextSize, '#e7f4ff', {
                      marginLeft: 6,
                      maxWidth: 88,
                      fontWeight: '700',
                    })}
                  >
                    {usuarioSelecionadoNome}
                  </Text>
                </TouchableOpacity>
              ),
        }}
      >
        <Tab.Screen
          name="Home"
          component={isModoIdoso ? IdosoHome : Home}
          options={{
            title: 'Meditrack',
            tabBarIcon: ({ color }) => (
              <Icon name="house" size={tabIconSize} color={color} iconStyle="solid" />
            ),
          }}
        />

        {(!isModoIdoso || idosoPodeGerenciarMedicamentos) && (
          <Tab.Screen
            name="MedicamentoListar"
            component={isModoIdoso ? IdosoMedicamentoListar : MedicamentoListar}
            options={{
              title: isModoIdoso ? 'Meus remédios' : 'Meditrack',
              tabBarIcon: ({ color }) => (
                <Icon name="pills" size={tabIconSize} color={color} iconStyle="solid" />
              ),
            }}
          />
        )}

        {!isModoIdoso && (
          <Tab.Screen
            name="MedicamentoRec"
            component={MedicamentoRec}
            options={{
              tabBarLabel: () => null,
              tabBarIcon: () => null,
              tabBarButton: ({ accessibilityLabel, accessibilityState, onLongPress, onPress, testID }) => (
                <TouchableOpacity
                  accessibilityLabel={accessibilityLabel}
                  accessibilityState={accessibilityState}
                  onLongPress={onLongPress}
                  onPress={onPress}
                  testID={testID}
                  style={styles.menuFab}
                >
                  <Icon name="plus" iconStyle="solid" size={fabIconSize} color="#fff" />
                </TouchableOpacity>
              ),
            }}
          />
        )}

        {isModoIdoso && idosoPodeGerenciarMedicamentos && (
          <Tab.Screen
            name="IdosoMedicamento"
            component={IdosoMedicamento}
            options={{
              title: 'Receituário',
              tabBarLabel: () => null,
              tabBarIcon: () => null,
              tabBarButton: ({ accessibilityLabel, accessibilityState, onLongPress, onPress, testID }) => (
                <TouchableOpacity
                  accessibilityLabel={accessibilityLabel}
                  accessibilityState={accessibilityState}
                  onLongPress={onLongPress}
                  onPress={onPress}
                  testID={testID}
                  style={styles.menuFabIdoso}
                >
                  <Icon name="plus" iconStyle="solid" size={fabIconSize} color="#fff" />
                </TouchableOpacity>
              ),
            }}
          />
        )}

        <Tab.Screen
          name="Historico"
          component={isModoIdoso ? IdosoHistorico : Historico}
          options={{
            title: isModoIdoso ? 'Histórico simples' : 'Meditrack',
            tabBarIcon: ({ color }) => (
              <Icon name="clock-rotate-left" size={tabIconSize} color={color} iconStyle="solid" />
            ),
          }}
        />

        <Tab.Screen
          name="Perfil"
          component={isModoIdoso ? IdosoPerfil : Perfil}
          options={{
            title: isModoIdoso ? 'Configurações' : 'Meditrack',
            tabBarIcon: ({ color, focused }) => (
              <Icon name="user" size={tabIconSize} color={color} iconStyle={focused ? 'solid' : 'regular'} />
            ),
          }}
        />
      </Tab.Navigator>

      {!isModoIdoso && (
        <Modal
          visible={modalUsuariosAberto}
          transparent
          animationType="fade"
          onRequestClose={() => setModalUsuariosAberto(false)}
        >
          <Pressable
            onPress={() => setModalUsuariosAberto(false)}
            style={styles.menuModalBackdrop}
          >
            <View style={styles.menuModalCard}>
              <Text style={titleText(fontScale.sectionTitle, '#12384c', { marginBottom: 8, paddingHorizontal: 6 })}>
                Usuários vinculados
              </Text>

              {usuariosDisponiveis.map((item) => {
                const selecionado =
                  item.id === 'minha-conta'
                    ? usuarioSelecionadoNome === 'Minha conta'
                    : usuarioSelecionadoId === item.id;
                const ehMinhacontas = item.id === 'minha-conta';

                return (
                  <View key={item.id} style={styles.menuModalRow}>
                    <TouchableOpacity
                      onPress={() => {
                        if (ehMinhacontas) {
                          const uidLogado = auth.currentUser?.uid;
                          if (uidLogado) {
                            selecionarUsuario(uidLogado, 'Minha conta');
                          }
                        } else {
                          selecionarUsuario(item.id, item.nome);
                        }
                        setModalUsuariosAberto(false);
                      }}
                      style={[
                        styles.menuModalOption,
                        selecionado && styles.menuModalOptionSelected,
                      ]}
                    >
                      <Text style={bodyText(fontScale.body, '#0f3044', { fontWeight: '600' })}>
                        {item.nome}
                      </Text>
                    </TouchableOpacity>
                    {selecionado && (
                      <Icon name="check" size={14} color="#1f6f8f" iconStyle="solid" />
                    )}
                    {!ehMinhacontas && (
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            'Desvincular',
                            `Tem certeza que deseja desvincular ${item.nome}?`,
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              {
                                text: 'Desvincular',
                                onPress: async () => {
                                  try {
                                    await desvincularIdoso(item.id);
                                    setModalUsuariosAberto(false);
                                  } catch (error) {
                                    Alert.alert('Erro', 'Não foi possível desvincular o usuário.');
                                  }
                                },
                                style: 'destructive',
                              },
                            ]
                          );
                        }}
                        style={styles.menuDeleteButton}
                      >
                        <Icon name="trash" size={14} color="#d32f2f" iconStyle="solid" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { auth } from '../firebase';
import styles, { theme } from '../estilo';
import { RootStackParamList } from '../types/navigation';
import { useTamanhoFonte } from '../hooks/useTamanhoFonte';
import TelaBaseIdoso from '../components/idoso/TelaBaseIdoso';
import CartaoBase from '../components/CartaoBase';
import { useVinculosIdoso } from '../hooks/useVinculosIdoso';
import {
  cancelAllNotificationsForCurrentUser,
  ensureNotificationPermissionsAsync,
  notificacoesSuportadas,
  syncAllNotificationsForCurrentUser,
} from '../utils/notificacoes';

type PerfilNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  navigation: PerfilNavigationProp;
};

export default function IdosoPerfil({ navigation }: Props) {
  const {
    loading,
    codigoVinculo,
    gerarNovoCodigo,
    idosoPodeGerenciarMedicamentos,
    notificacoesAtivas,
    atualizarPermissaoGerenciarMedicamentos,
    atualizarNotificacoesAtivas,
  } = useVinculosIdoso();
  const { fontScale, selectedFontSize, setSelectedFontSize } = useTamanhoFonte();
  const [gerandoCodigo, setGerandoCodigo] = useState(false);
  const [salvandoPermissao, setSalvandoPermissao] = useState(false);
  const [salvandoNotificacoes, setSalvandoNotificacoes] = useState(false);

  const nome = useMemo(() => {
    return auth.currentUser?.displayName || auth.currentUser?.email || 'Usuario';
  }, []);

  const iniciais =
    nome
      .trim()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join('') || 'U';

  const sair = async () => {
    await auth.signOut();
    navigation.replace('Login');
  };

  const atualizarCodigo = async () => {
    try {
      setGerandoCodigo(true);
      const novo = await gerarNovoCodigo();
      Alert.alert('Código atualizado', `Novo código: ${novo}`);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível gerar o código.');
    } finally {
      setGerandoCodigo(false);
    }
  };

  const atualizarPermissao = async (permitir: boolean) => {
    try {
      setSalvandoPermissao(true);
      await atualizarPermissaoGerenciarMedicamentos(permitir);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível atualizar essa opção.');
    } finally {
      setSalvandoPermissao(false);
    }
  };

  const atualizarNotificacoes = async (ativas: boolean) => {
    try {
      setSalvandoNotificacoes(true);

      if (ativas) {
        if (!notificacoesSuportadas()) {
          Alert.alert('Indisponível', 'As notificações locais não funcionam no Expo Go. Use uma build instalada no aparelho.');
          return;
        }

        const granted = await ensureNotificationPermissionsAsync();
        if (!granted) {
          Alert.alert('Permissão necessária', 'Ative a permissão de notificações no aparelho para continuar.');
          return;
        }
      }

      await atualizarNotificacoesAtivas(ativas);

      if (ativas) {
        await syncAllNotificationsForCurrentUser();
      } else {
        await cancelAllNotificationsForCurrentUser();
      }
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível atualizar as notificações.');
    } finally {
      setSalvandoNotificacoes(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.containerHome, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <TelaBaseIdoso title="Configurações simples" subtitle="Poucas opções e letras maiores.">
      <CartaoBase style={[styles.idosoCard, { marginBottom: 14, alignItems: 'center' }]}>
        <View style={styles.idosoAvatar}>
          <Text style={{ color: theme.colors.textInverse, fontSize: 30, fontWeight: '700' }}>{iniciais}</Text>
        </View>

        <Text style={{ color: theme.colors.text, fontSize: fontScale.title, fontWeight: '700', textAlign: 'center' }}>{nome}</Text>
      </CartaoBase>

      <CartaoBase style={[styles.idosoCard, { marginBottom: 14 }]}>
        <Text style={{ color: theme.colors.text, fontSize: fontScale.sectionTitle, fontWeight: '700' }}>Tamanho da letra</Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: fontScale.body, marginTop: 8, lineHeight: 24 }}>Escolha entre medio e grande.</Text>

        <View style={styles.idosoSegmented}>
          {(['Medio', 'Grande'] as const).map((opcao) => {
            const selecionado = selectedFontSize === opcao;
            return (
              <TouchableOpacity
                key={opcao}
                onPress={() => setSelectedFontSize(opcao)}
                style={[
                  styles.idosoSegmentedButton,
                  { backgroundColor: selecionado ? theme.colors.accent : 'transparent' },
                ]}
              >
                <Text
                  style={{
                    color: selecionado ? theme.colors.textInverse : '#29576d',
                    fontWeight: '700',
                    fontSize: opcao === 'Grande' ? 20 : 18,
                  }}
                >
                  {opcao}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </CartaoBase>

      <CartaoBase style={[styles.idosoCard, { marginBottom: 14 }]}>
        <Text style={{ color: theme.colors.text, fontSize: fontScale.sectionTitle, fontWeight: '700' }}>Código de vínculo</Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: fontScale.body, marginTop: 8, lineHeight: 24 }}>
          Envie este código para quem vai acompanhar seus remédios.
        </Text>

        <View style={styles.idosoCodeBox}>
          <Text style={{ color: '#4d7182', fontSize: fontScale.caption }}>Seu codigo</Text>
          <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: fontScale.title, letterSpacing: 2, marginTop: 6 }}>
            {codigoVinculo || '------'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={atualizarCodigo}
          disabled={gerandoCodigo}
          style={[styles.idosoPrimaryButton, { marginTop: 14, backgroundColor: gerandoCodigo ? '#7da3b8' : theme.colors.accent }]}
        >
          <Text style={{ color: theme.colors.textInverse, fontSize: fontScale.button, fontWeight: '700' }}>
            {gerandoCodigo ? 'Gerando...' : 'Gerar novo código'}
          </Text>
        </TouchableOpacity>
      </CartaoBase>

      <CartaoBase style={[styles.idosoCard, { marginBottom: 14 }]}>
        <Text style={{ color: theme.colors.text, fontSize: fontScale.sectionTitle, fontWeight: '700' }}>Notificacoes</Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: fontScale.body, marginTop: 8, lineHeight: 24 }}>
          Ative para receber avisos dos seus remédios no aparelho.
        </Text>

        <View style={styles.idosoSegmented}>
          <TouchableOpacity
            disabled={salvandoNotificacoes}
            onPress={() => atualizarNotificacoes(true)}
            style={[styles.idosoSegmentedButton, { backgroundColor: notificacoesAtivas ? theme.colors.accent : 'transparent' }]}
          >
            <Text style={{ color: notificacoesAtivas ? theme.colors.textInverse : '#29576d', fontWeight: '700', fontSize: 18 }}>
              Ativar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={salvandoNotificacoes}
            onPress={() => atualizarNotificacoes(false)}
            style={[styles.idosoSegmentedButton, { backgroundColor: !notificacoesAtivas ? theme.colors.accent : 'transparent' }]}
          >
            <Text style={{ color: !notificacoesAtivas ? theme.colors.textInverse : '#29576d', fontWeight: '700', fontSize: 18 }}>
              Desativar
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: theme.colors.textMuted, fontSize: fontScale.caption, marginTop: 12 }}>
          Status: {notificacoesAtivas ? 'Ativas' : 'Desativadas'}
        </Text>
      </CartaoBase>

      <CartaoBase style={[styles.idosoCard, { marginBottom: 14 }]}>
        <Text style={{ color: theme.colors.text, fontSize: fontScale.sectionTitle, fontWeight: '700' }}>Adicionar remédio sozinho</Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: fontScale.body, marginTop: 8, lineHeight: 24 }}>
          Quando estiver ativado, aparece um botao para cadastrar medicamento e receituario basico.
        </Text>

        <View style={styles.idosoSegmented}>
          <TouchableOpacity
            disabled={salvandoPermissao}
            onPress={() => atualizarPermissao(true)}
            style={[styles.idosoSegmentedButton, { backgroundColor: idosoPodeGerenciarMedicamentos ? theme.colors.accent : 'transparent' }]}
          >
            <Text style={{ color: idosoPodeGerenciarMedicamentos ? theme.colors.textInverse : '#29576d', fontWeight: '700', fontSize: 18 }}>
              Ativado
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={salvandoPermissao}
            onPress={() => atualizarPermissao(false)}
            style={[styles.idosoSegmentedButton, { backgroundColor: !idosoPodeGerenciarMedicamentos ? theme.colors.accent : 'transparent' }]}
          >
            <Text style={{ color: !idosoPodeGerenciarMedicamentos ? theme.colors.textInverse : '#29576d', fontWeight: '700', fontSize: 18 }}>
              Desativado
            </Text>
          </TouchableOpacity>
        </View>
      </CartaoBase>

      <CartaoBase style={[styles.idosoCard, { marginBottom: 14 }]}>
        <Text style={{ color: theme.colors.text, fontSize: fontScale.sectionTitle, fontWeight: '700' }}>Agenda dos remédios</Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: fontScale.body, marginTop: 8, lineHeight: 24 }}>
          Abra o calendário para ver os dias com horários e consultar os remédios de cada data.
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('Agenda')}
          style={[styles.idosoPrimaryButton, { marginTop: 14 }]}
        >
          <Icon name="calendar-days" size={18} color={theme.colors.textInverse} iconStyle="solid" />
          <Text style={{ color: theme.colors.textInverse, fontSize: fontScale.button, fontWeight: '700', marginLeft: 10 }}>
            Abrir agenda
          </Text>
        </TouchableOpacity>
      </CartaoBase>

      <CartaoBase style={styles.idosoCard}>
        <TouchableOpacity onPress={sair} style={styles.idosoDangerButton}>
          <Icon name="arrow-right-from-bracket" size={18} color="#b3261e" iconStyle="solid" />
          <Text style={{ color: '#b3261e', fontSize: fontScale.button, fontWeight: '700', marginLeft: 10 }}>
            Sair da conta
          </Text>
        </TouchableOpacity>
      </CartaoBase>
    </TelaBaseIdoso>
  );
}

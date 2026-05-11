import { useState } from 'react';
import { Text, View, KeyboardAvoidingView, TouchableOpacity, Alert, Image } from 'react-native';
import { TextInput } from 'react-native-paper';
import { auth, firestore } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Usuario } from '../model/Usuario';
import { RootStackParamList } from '../types/navigation';
import TelaBase from '../components/TelaBase';
import CartaoBase from '../components/CartaoBase';
import { useTamanhoFonte } from '../hooks/useTamanhoFonte';
import {
  bodyText,
  inverseText,
  segmentedButton,
  segmentedButtonText,
  theme,
  titleText,
} from '../estilo';
import styles from '../estilo';

function somenteDigitos(valor: string) {
  return valor.replace(/\D/g, '').slice(0, 13);
}

function formatarTelefone(valor: string) {
  const digitos = somenteDigitos(valor);

  if (digitos.startsWith('55') && digitos.length >= 4) {
    const ddd = digitos.slice(2, 4);
    const numero = digitos.slice(4);

    if (numero.length <= 4) return `+55 (${ddd}) ${numero}`;
    if (numero.length <= 8) return `+55 (${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
    return `+55 (${ddd}) ${numero.slice(0, 5)}-${numero.slice(5, 9)}`;
  }

  if (digitos.length === 11 && /^\d{2}/.test(digitos)) {
    const ddd = digitos.slice(0, 2);
    const numero = digitos.slice(2);

    if (numero.length <= 4) return `+55 (${ddd}) ${numero}`;
    if (numero.length <= 8) return `+55 (${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
    return `+55 (${ddd}) ${numero.slice(0, 5)}-${numero.slice(5, 9)}`;
  }

  if (digitos.length <= 2) return digitos ? `+${digitos}` : '';
  if (digitos.length <= 4) return `+${digitos.slice(0, 2)} (${digitos.slice(2)})`;
  if (digitos.length <= 8) return `+${digitos.slice(0, 2)} (${digitos.slice(2, 4)}) ${digitos.slice(4)}`;
  if (digitos.length <= 11) {
    return `+${digitos.slice(0, 2)} (${digitos.slice(2, 4)}) ${digitos.slice(4, 8)}-${digitos.slice(8)}`;
  }

  return `+${digitos.slice(0, 2)} (${digitos.slice(2, 4)}) ${digitos.slice(4, 9)}-${digitos.slice(9, 13)}`;
}

export default function Register() {
  const [formUsuario, setFormUsuario] = useState<Partial<Usuario> & { senha?: string }>({});
  const [tipoConta, setTipoConta] = useState<'normal' | 'idoso'>('normal');
  const [idosoPodeGerenciarMedicamentos, setIdosoPodeGerenciarMedicamentos] = useState(false);
  const { fontScale } = useTamanhoFonte();
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const registrar = async () => {
    if (!formUsuario.nome || !formUsuario.email || !formUsuario.senha) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const userCredentials = await auth.createUserWithEmailAndPassword(formUsuario.email, formUsuario.senha);
      const user = userCredentials.user;

      if (!user) {
        Alert.alert('Erro', 'Não foi possível concluir o cadastro.');
        return;
      }

      const refUsuario = firestore.collection('Usuario').doc(user.uid);
      await refUsuario.set({
        id: user.uid,
        nome: formUsuario.nome.trim(),
        email: formUsuario.email.trim().toLowerCase(),
        fone: somenteDigitos(formUsuario.fone || '').replace(/^55/, ''),
        tipo: tipoConta,
        modoInterface: tipoConta === 'idoso' ? 'idoso' : 'normal',
        tamanhoFonte: 'Medio',
        idosoPodeGerenciarMedicamentos: tipoConta === 'idoso' ? idosoPodeGerenciarMedicamentos : false,
        notificacoesAtivas: true,
        somNotificacao: 'padrao',
      });

      navigation.navigate('Menu');
    } catch (erro: any) {
      Alert.alert('Erro', erro.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screenKeyboard}>
      <TelaBase onBackPress={() => navigation.navigate('Login')} contentContainerStyle={styles.contentCenteredGrow}>
        <CartaoBase>
          <View style={styles.authHeaderBlock}>
            <Image source={require('../assets/FigL.png')} style={styles.authLogoSmall} />
            <Text style={titleText(fontScale.sectionTitle + 2, theme.colors.primary, { textAlign: 'center' })}>
              Criar conta
            </Text>
            <Text style={bodyText(fontScale.body, '#5d7888', { textAlign: 'center', marginTop: 8, lineHeight: 20 })}>
              Cadastre seu usuário e entre no app com tudo organizado.
            </Text>
          </View>

          <TextInput
            label="Nome"
            value={formUsuario.nome}
            onChangeText={valor => setFormUsuario({ ...formUsuario, nome: valor })}
            style={[styles.inputSurface, styles.inputSpacingSm]}
            contentStyle={{ fontSize: fontScale.body }}
            activeUnderlineColor={theme.colors.primary}
          />
          <TextInput
            label="Email"
            value={formUsuario.email}
            onChangeText={valor => setFormUsuario({ ...formUsuario, email: valor })}
            onBlur={() =>
              setFormUsuario(prev => ({
                ...prev,
                email: (prev.email || '').trim().toLowerCase(),
              }))
            }
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            style={[styles.inputSurface, styles.inputSpacingSm]}
            contentStyle={{ fontSize: fontScale.body }}
            activeUnderlineColor={theme.colors.primary}
          />
          <TextInput
            label="Senha"
            value={formUsuario.senha}
            onChangeText={valor => setFormUsuario({ ...formUsuario, senha: valor })}
            secureTextEntry={!mostrarSenha}
            right={
              <TextInput.Icon
                icon={mostrarSenha ? 'eye-off' : 'eye'}
                onPress={() => setMostrarSenha(!mostrarSenha)}
              />
            }
            style={[styles.inputSurface, styles.inputSpacingSm]}
            contentStyle={{ fontSize: fontScale.body }}
            activeUnderlineColor={theme.colors.primary}
          />
          <TextInput
            label="Fone"
            value={formUsuario.fone}
            onChangeText={valor => setFormUsuario({ ...formUsuario, fone: formatarTelefone(valor) })}
            keyboardType="phone-pad"
            style={[styles.inputSurface, styles.inputSpacingSm]}
            contentStyle={{ fontSize: fontScale.body }}
            activeUnderlineColor={theme.colors.primary}
          />

          <Text style={[styles.sectionLabel, { fontSize: fontScale.caption }]}>Tipo de conta</Text>
          <View style={styles.sectionSelector}>
            <TouchableOpacity onPress={() => setTipoConta('normal')} style={segmentedButton(tipoConta === 'normal')}>
              <Text style={segmentedButtonText(tipoConta === 'normal', fontScale.body)}>Normal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTipoConta('idoso')} style={segmentedButton(tipoConta === 'idoso')}>
              <Text style={segmentedButtonText(tipoConta === 'idoso', fontScale.body)}>Idoso</Text>
            </TouchableOpacity>
          </View>

          {tipoConta === 'idoso' && (
            <View style={styles.infoCard}>
              <Text style={titleText(fontScale.body, theme.colors.text)}>
                Permitir que o próprio idoso adicione medicamentos
              </Text>
              <Text style={bodyText(fontScale.caption, '#5d7888', { marginTop: 6, lineHeight: 19 })}>
                Ative se essa conta vai poder cadastrar o remédio e o receituário básico sem depender do cuidador.
              </Text>

              <View style={styles.sectionSelectorCompact}>
                <TouchableOpacity onPress={() => setIdosoPodeGerenciarMedicamentos(true)} style={segmentedButton(idosoPodeGerenciarMedicamentos, theme.colors.accent)}>
                  <Text style={segmentedButtonText(idosoPodeGerenciarMedicamentos, fontScale.body)}>Ativar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIdosoPodeGerenciarMedicamentos(false)} style={segmentedButton(!idosoPodeGerenciarMedicamentos, theme.colors.accent)}>
                  <Text style={segmentedButtonText(!idosoPodeGerenciarMedicamentos, fontScale.body)}>Desativar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity style={[styles.authPrimaryButton, styles.authPrimaryButtonSpaced]} onPress={registrar}>
            <Text style={inverseText(fontScale.button, { fontWeight: '700' })}>Criar conta</Text>
          </TouchableOpacity>
        </CartaoBase>
      </TelaBase>
    </KeyboardAvoidingView>
  );
}

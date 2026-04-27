import { useState } from 'react';
import { Text, View, KeyboardAvoidingView, TouchableOpacity, Alert, Image } from 'react-native';
import { TextInput } from 'react-native-paper';
import { auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import TelaBase from '../components/TelaBase';
import CartaoBase from '../components/CartaoBase';
import { useTamanhoFonte } from '../hooks/useTamanhoFonte';
import styles, { bodyText, inverseText, theme, titleText } from '../estilo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const { fontScale } = useTamanhoFonte();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const logar = () => {
    if (!email || !senha) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    auth.signInWithEmailAndPassword(email, senha)
      .then(() => {
        navigation.replace('Menu');
      })
      .catch(erro => Alert.alert('Erro', erro.message));
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screenKeyboard}>
      <TelaBase contentContainerStyle={styles.contentStartGrow}>
        <View style={styles.authLogoWrapper}>
          <Image source={require('../assets/logo.png')} resizeMode="contain" style={styles.authLogoLarge} />
        </View>
        <CartaoBase>
          <View style={styles.authHeaderBlock}>
            <Image source={require('../assets/FigL.png')} style={styles.authLogoSmall} />
            <Text style={titleText(fontScale.sectionTitle + 2, theme.colors.primary, { textAlign: 'center' })}>
              Acesse sua conta
            </Text>
            <Text style={bodyText(fontScale.body, '#5d7888', { textAlign: 'center', marginTop: 8, lineHeight: 20 })}>
              Use seu e-mail e senha para continuar.
            </Text>
          </View>

          <TextInput
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            onBlur={() => setEmail(email.trim().toLowerCase())}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            style={[styles.inputSurface, styles.inputSpacingMd]}
            contentStyle={{ fontSize: fontScale.body }}
            activeUnderlineColor={theme.colors.primary}
          />
          <TextInput
            label="Senha"
            value={senha}
            onChangeText={texto => setSenha(texto)}
            secureTextEntry={!mostrarSenha}
            right={
              <TextInput.Icon
                icon={mostrarSenha ? 'eye-off' : 'eye'}
                onPress={() => setMostrarSenha(!mostrarSenha)}
              />
            }
            style={[styles.inputSurface, styles.inputSpacingLg]}
            contentStyle={{ fontSize: fontScale.body }}
            activeUnderlineColor={theme.colors.primary}
          />

          <TouchableOpacity style={styles.authPrimaryButton} onPress={logar}>
            <Text style={inverseText(fontScale.button, { fontWeight: '700' })}>Entrar</Text>
          </TouchableOpacity>

          <View style={styles.authFooterRow}>
            <Text style={bodyText(fontScale.body, '#5d7888')}>Não tem login? </Text>
            <TouchableOpacity onPress={() => navigation.replace('Register')}>
              <Text style={titleText(fontScale.body, theme.colors.primary)}>Registre-se</Text>
            </TouchableOpacity>
          </View>
        </CartaoBase>
      </TelaBase>
    </KeyboardAvoidingView>
  );
}

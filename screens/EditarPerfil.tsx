import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/fontawesome6";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { auth, firestore } from "../firebase";
import { RootStackParamList } from "../types/navigation";
import { useTamanhoFonte } from "../hooks/useTamanhoFonte";
import styles, { theme } from "../estilo";

type EditarPerfilNavigationProp = NativeStackNavigationProp<RootStackParamList, "EditarPerfil">;

type Props = {
  navigation: EditarPerfilNavigationProp;
};

function somenteDigitos(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 13); // Até 13 dígitos para incluir código do país
}

function formatarTelefone(valor: string) {
  const digitos = somenteDigitos(valor);

  // Se já começa com código do país
  if (digitos.startsWith('55') && digitos.length >= 4) {
    const ddd = digitos.slice(2, 4);
    const numero = digitos.slice(4);

    if (numero.length <= 4) return `+55 (${ddd}) ${numero}`;
    if (numero.length <= 8) return `+55 (${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
    return `+55 (${ddd}) ${numero.slice(0, 5)}-${numero.slice(5, 9)}`;
  }

  // Para números brasileiros (11 dígitos sem código do país)
  if (digitos.length === 11 && /^\d{2}/.test(digitos)) {
    const ddd = digitos.slice(0, 2);
    const numero = digitos.slice(2);

    if (numero.length <= 4) return `+55 (${ddd}) ${numero}`;
    if (numero.length <= 8) return `+55 (${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
    return `+55 (${ddd}) ${numero.slice(0, 5)}-${numero.slice(5, 9)}`;
  }

  // Para outros países ou números sem código
  if (digitos.length <= 2) return digitos ? `+${digitos}` : '';
  if (digitos.length <= 4) return `+${digitos.slice(0, 2)} (${digitos.slice(2)})`;
  if (digitos.length <= 8) return `+${digitos.slice(0, 2)} (${digitos.slice(2, 4)}) ${digitos.slice(4)}`;
  if (digitos.length <= 11) {
    return `+${digitos.slice(0, 2)} (${digitos.slice(2, 4)}) ${digitos.slice(4, 8)}-${digitos.slice(8)}`;
  }
  return `+${digitos.slice(0, 2)} (${digitos.slice(2, 4)}) ${digitos.slice(4, 9)}-${digitos.slice(9, 13)}`;
}

export default function EditarPerfil({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [fone, setFone] = useState("");
  const { fontScale } = useTamanhoFonte();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      navigation.replace("Login");
      return;
    }

    const carregar = async () => {
      try {
        const doc = await firestore.collection("Usuario").doc(user.uid).get();
        const data = doc.data();
        setNome(data?.nome || "");
        setEmail(data?.email || user.email || "");
        setFone(formatarTelefone((data?.fone || "").startsWith('55') ? data?.fone || "" : '55' + (data?.fone || "")));
      } catch (error) {
        console.log(error);
        Alert.alert("Erro", "Não foi possível carregar os dados para edição.");
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [navigation]);

  const salvar = async () => {
    const user = auth.currentUser;
    if (!user) {
      navigation.replace("Login");
      return;
    }

    if (!nome.trim()) {
      Alert.alert("Erro", "Informe seu nome.");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Erro", "Informe seu e-mail.");
      return;
    }

    try {
      setSalvando(true);
      const ref = firestore.collection("Usuario").doc(user.uid);
      const atual = await ref.get();
      const dataAtual = atual.data();
      const emailNormalizado = email.trim().toLowerCase();
      const telefoneNormalizado = somenteDigitos(fone).replace(/^55/, ''); // Remove código do país se for Brasil

      if (user.email !== emailNormalizado) {
        await user.updateEmail(emailNormalizado);
      }

      await ref.set(
        {
          id: user.uid,
          nome: nome.trim(),
          email: emailNormalizado,
          fone: telefoneNormalizado,
          tipo: dataAtual?.tipo === "idoso" ? "idoso" : "normal",
        },
        { merge: true }
      );

      navigation.goBack();
    } catch (error) {
      console.log(error);
      Alert.alert(
        "Erro",
        "Não foi possível salvar seu perfil. Se você alterou o e-mail, talvez seja necessário entrar novamente antes de atualizar."
      );
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.containerHome, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.screenKeyboard, { backgroundColor: theme.colors.background }]} behavior="padding">
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: Math.max(insets.top, 12) + 12, paddingBottom: Math.max(insets.bottom, 16) + 20, flexGrow: 1, justifyContent: "center" }}>
        <View
          style={{
            backgroundColor: "#f7fbfd",
            borderRadius: 28,
            padding: 22,
            shadowColor: "#02131f",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 18,
            elevation: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.9}
            style={{
              alignSelf: "flex-start",
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#deedf3",
              borderWidth: 1,
              borderColor: "#c9dde7",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Icon name="chevron-left" size={Math.max(16, fontScale.body)} color="#0b3954" iconStyle="solid" />
          </TouchableOpacity>

          <Text style={{ color: "#0b3954", fontSize: fontScale.title, fontWeight: "700", marginBottom: 8 }}>
            Editar perfil
          </Text>
          <Text style={{ color: "#54707f", fontSize: fontScale.body, marginBottom: 18 }}>
            Atualize seu nome e telefone exibidos no aplicativo.
          </Text>

          <TextInput
            label="Nome"
            value={nome}
            onChangeText={setNome}
            style={[styles.inputSurface, { marginBottom: 14 }]}
            contentStyle={{ fontSize: fontScale.body }}
            activeUnderlineColor="#0b3954"
          />

          <TextInput
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.inputSurface, { marginBottom: 14 }]}
            contentStyle={{ fontSize: fontScale.body }}
            activeUnderlineColor="#0b3954"
          />

          <TextInput
            label="Telefone"
            value={fone}
            onChangeText={(valor) => setFone(formatarTelefone(valor))}
            keyboardType="phone-pad"
            style={[styles.inputSurface, { marginBottom: 22 }]}
            contentStyle={{ fontSize: fontScale.body }}
            activeUnderlineColor="#0b3954"
          />

          <TouchableOpacity
            onPress={salvar}
            disabled={salvando}
            style={{
              backgroundColor: salvando ? "#7da3b8" : "#0b3954",
              borderRadius: 16,
              paddingVertical: 15,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            {salvando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: fontScale.button, fontWeight: "700" }}>Salvar alterações</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

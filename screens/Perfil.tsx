import React, { useState, useEffect } from "react";
import {
  KeyboardAvoidingView,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { auth, firestore, storage } from "../firebase";
import styles, {
  bodyText,
  buttonState,
  captionText,
  inverseText,
  segmentedButton,
  segmentedButtonText,
  theme,
  titleText,
} from "../estilo";
import { RootStackParamList } from "../types/navigation";
import { TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTamanhoFonte } from "../hooks/useTamanhoFonte";
import { useVinculosIdoso } from "../hooks/useVinculosIdoso";
import {
  cancelAllNotificationsForCurrentUser,
  ensureNotificationPermissionsAsync,
  notificacoesSuportadas,
  syncAllNotificationsForCurrentUser,
  syncLinkedDoseNotificationsForCurrentUser,
} from "../utils/notificacoes";

type PerfilNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type PerfilProps = {
  navigation: PerfilNavigationProp;
};

type UserData = {
  nome: string;
  email: string;
  fone: string;
  tipo: string;
  fotoUrl: string;
};

export default function Perfil({ navigation }: PerfilProps) {
  const [loading, setLoading] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const [codigoParaVincular, setCodigoParaVincular] = useState("");
  const [vinculando, setVinculando] = useState(false);
  const [gerandoCodigo, setGerandoCodigo] = useState(false);
  const [salvandoNotificacoes, setSalvandoNotificacoes] = useState(false);
  const { selectedFontSize, setSelectedFontSize, fontScale } = useTamanhoFonte();
  const insets = useSafeAreaInsets();
  const {
    tipoUsuario,
    codigoVinculo,
    vincularPorCodigo,
    gerarNovoCodigo,
    vinculados,
    notificacoesAtivas,
    atualizarNotificacoesAtivas,
  } = useVinculosIdoso();

  const [userData, setUserData] = useState<UserData>({
    nome: "",
    email: "",
    fone: "",
    tipo: "",
    fotoUrl: "",
  });

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      navigation.replace("Login");
      return;
    }

    const ref = firestore
      .collection("Usuario")
      .doc(user.uid);

    const unsubscribe = ref.onSnapshot(async (doc) => {
        if (doc.exists) {
          const data = doc.data();
          setUserData({
            nome: data?.nome || user.displayName || "Sem nome",
            email: data?.email || user.email || "",
            fone: data?.fone || "Não informado",
            tipo: data?.tipo === "idoso" ? "Idoso" : "Responsavel",
            fotoUrl: data?.fotoUrl || "",
          });
        } else {
          const perfilInicial = {
            id: user.uid,
            nome: user.displayName || "Usuario",
            email: user.email || "",
            fone: "",
            tipo: "normal",
            modoInterface: "normal",
            tamanhoFonte: "Medio",
            notificacoesAtivas: true,
            fotoUrl: "",
          };

          await ref.set(perfilInicial, { merge: true });
          setUserData({
            nome: perfilInicial.nome,
            email: user.email || "",
            fone: "Não informado",
            tipo: "Responsavel",
            fotoUrl: "",
          });
        }
        setLoading(false);
      }, () => {
        setLoading(false);
        Alert.alert("Erro", "Não foi possível carregar os dados do perfil.");
      });

    return () => unsubscribe();
  }, [navigation]);

  const iniciais = userData.nome
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("") || "U";

  const logout = async () => {
    try {
      setSaindo(true);
      await auth.signOut();
      navigation.replace("Login");
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível sair agora.");
    } finally {
      setSaindo(false);
    }
  };

  const vincularCodigo = async () => {
    if (tipoUsuario !== "normal") return;

    const codigo = codigoParaVincular.trim();
    if (codigo.length < 4) {
      Alert.alert("Codigo invalido", "Digite um codigo valido para vincular.");
      return;
    }

    try {
      setVinculando(true);
      const vinculado = await vincularPorCodigo(codigo);
      await syncLinkedDoseNotificationsForCurrentUser();
      setCodigoParaVincular("");
      Alert.alert("Vinculo criado", `Agora voce pode visualizar ${vinculado.nome} na Home.`);
    } catch (error: any) {
      Alert.alert("Nao foi possivel vincular", error?.message || "Tente novamente.");
    } finally {
      setVinculando(false);
    }
  };

  const gerarCodigoVinculo = async () => {
    if (tipoUsuario !== "idoso") return;

    try {
      setGerandoCodigo(true);
      const novoCodigo = await gerarNovoCodigo();
      Alert.alert("Codigo atualizado", `Novo codigo: ${novoCodigo}`);
    } catch (error: any) {
      Alert.alert("Erro", error?.message || "Nao foi possivel gerar um novo codigo.");
    } finally {
      setGerandoCodigo(false);
    }
  };

  const atualizarNotificacoes = async (ativas: boolean) => {
    try {
      setSalvandoNotificacoes(true);

      if (ativas) {
        if (!notificacoesSuportadas()) {
          Alert.alert("Indisponivel", "As notificacoes locais nao funcionam no Expo Go. Use uma build instalada no aparelho.");
          return;
        }

        const granted = await ensureNotificationPermissionsAsync();
        if (!granted) {
          Alert.alert("Permissao necessaria", "Ative a permissao de notificacoes no aparelho para continuar.");
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
      Alert.alert("Erro", error?.message || "Nao foi possivel atualizar as notificacoes.");
    } finally {
      setSalvandoNotificacoes(false);
    }
  };

  const escolherFoto = async () => {
    const user = auth.currentUser;

    if (!user) {
      navigation.replace("Login");
      return;
    }

    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissao.granted) {
        Alert.alert("Permissao necessaria", "Precisamos de acesso a galeria para escolher sua foto.");
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (resultado.canceled || !resultado.assets?.length) {
        return;
      }

      setSalvandoFoto(true);

      const imagem = resultado.assets[0];
      const resposta = await fetch(imagem.uri);
      const blob = await resposta.blob();

      const referencia = storage.ref(`usuarios/${user.uid}/foto-perfil.jpg`);
      await referencia.put(blob);
      const fotoUrl = await referencia.getDownloadURL();

      await firestore.collection("Usuario").doc(user.uid).set(
        {
          fotoUrl,
        },
        { merge: true }
      );
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Nao foi possivel atualizar sua foto agora.");
    } finally {
      setSalvandoFoto(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.containerHome}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.containerHome, styles.screenHorizontalPadding]}>
      <View style={styles.profileBackgroundOrbTop} />
      <View style={styles.profileBackgroundOrbBottom} />

      <ScrollView
        style={styles.fullWidth}
        contentContainerStyle={[styles.profileScrollContent, { paddingTop: Math.max(insets.top, 12) + 12, paddingBottom: Math.max(insets.bottom, 16) + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileShell}>
          <View style={styles.profileHeader}>
            <Text style={captionText(12, "#9fd3e6", { letterSpacing: 1.4, textTransform: "uppercase" })}>
              Meu Perfil
            </Text>

            <View style={styles.profileHeaderRow}>
              <View style={styles.profileAvatarWrap}>
                <TouchableOpacity
                  onPress={escolherFoto}
                  disabled={salvandoFoto}
                  style={styles.profileAvatarButton}
                >
                  {userData.fotoUrl ? (
                    <Image source={{ uri: userData.fotoUrl }} style={styles.profileAvatarImage} />
                  ) : (
                    <Text style={inverseText(28, { fontWeight: "700" })}>{iniciais}</Text>
                  )}

                  {salvandoFoto && (
                    <View style={styles.profileAvatarLoadingOverlay}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={escolherFoto} disabled={salvandoFoto}>
                  <Text style={captionText(12, "#dff4fb", { fontWeight: "700", marginTop: 8 })}>
                    {userData.fotoUrl ? "Trocar foto" : "Adicionar foto"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.flexOne}>
                <Text style={inverseText(fontScale.title, { fontWeight: "700" })}>
                  {userData.nome}
                </Text>
                <Text style={bodyText(fontScale.body, "#caeaf4", { marginTop: 4 })}>
                  {userData.tipo}
                </Text>
                <View style={styles.profileStatusPill}>
                  <Text style={captionText(12, "#dff4fb", { fontWeight: "600" })}>Conta ativa</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.profileBody}>
            <View style={styles.infoSurface}>
              <Text style={captionText(12, theme.colors.textMuted, { textTransform: "uppercase", marginBottom: 6 })}>E-mail</Text>
              <Text style={bodyText(fontScale.body, theme.colors.text, { fontWeight: "600" })}>{userData.email}</Text>
            </View>

            <View style={styles.infoSurface}>
              <Text style={captionText(12, theme.colors.textMuted, { textTransform: "uppercase", marginBottom: 6 })}>Telefone</Text>
              <Text style={bodyText(fontScale.body, theme.colors.text, { fontWeight: "600" })}>{userData.fone}</Text>
            </View>

            <View style={[styles.settingsCard, styles.settingsCardFirst]}>
              <Text style={titleText(fontScale.sectionTitle)}>Preferencias de leitura</Text>
              <Text style={bodyText(fontScale.caption, "#5e7b89", { marginTop: 6, lineHeight: 20 })}>
                Em breve voce podera aumentar o tamanho da fonte para facilitar a leitura em todo o aplicativo.
              </Text>

              <View style={styles.settingsSegmented}>
                {(["Pequeno", "Medio", "Grande"] as const).map((opcao) => {
                  const selecionado = selectedFontSize === opcao;
                  return (
                    <TouchableOpacity
                      key={opcao}
                      onPress={() => setSelectedFontSize(opcao)}
                      style={segmentedButton(selecionado)}
                    >
                      <Text style={segmentedButtonText(selecionado, opcao === "Grande" ? 18 : opcao === "Medio" ? 16 : 13)}>
                        {opcao}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={bodyText(fontScale.caption, "#4d7182", { marginTop: 12 })}>
                Opcao selecionada: {selectedFontSize}
              </Text>
            </View>

            <View style={styles.settingsCard}>
              <Text style={titleText(fontScale.sectionTitle)}>Notificacoes</Text>
              <Text style={bodyText(fontScale.caption, "#5e7b89", { marginTop: 6, lineHeight: 20 })}>
                Ative para receber avisos dos seus remedios e dos idosos vinculados.
              </Text>

              <View style={styles.settingsSegmented}>
                <TouchableOpacity
                  disabled={salvandoNotificacoes}
                  onPress={() => atualizarNotificacoes(true)}
                  style={segmentedButton(notificacoesAtivas)}
                >
                  <Text style={segmentedButtonText(notificacoesAtivas, 16)}>Ativar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={salvandoNotificacoes}
                  onPress={() => atualizarNotificacoes(false)}
                  style={segmentedButton(!notificacoesAtivas)}
                >
                  <Text style={segmentedButtonText(!notificacoesAtivas, 16)}>Desativar</Text>
                </TouchableOpacity>
              </View>

              <Text style={bodyText(fontScale.caption, "#4d7182", { marginTop: 12 })}>
                Status: {notificacoesAtivas ? "Ativas" : "Desativadas"}
              </Text>
            </View>

            <View style={styles.settingsCard}>
              <Text style={titleText(fontScale.sectionTitle)}>Vinculo entre contas</Text>
              <Text style={bodyText(fontScale.caption, "#5e7b89", { marginTop: 6, lineHeight: 20 })}>
                Tipo da conta: {tipoUsuario === "idoso" ? "Idoso" : "Usuario normal"}.
              </Text>

              {tipoUsuario === "idoso" ? (
                <>
                  <View style={styles.profileCodeBox}>
                    <Text style={bodyText(fontScale.caption, "#4d7182")}>Codigo para vincular</Text>
                    <Text style={titleText(fontScale.title, theme.colors.primary, { fontWeight: "800", letterSpacing: 2, marginTop: 6 })}>
                      {codigoVinculo || "------"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={gerarCodigoVinculo}
                    disabled={gerandoCodigo}
                    style={[styles.profilePrimaryAction, buttonState(gerandoCodigo)]}
                  >
                    <Text style={inverseText(fontScale.button, { fontWeight: "700" })}>
                      {gerandoCodigo ? "Gerando..." : "Gerar novo codigo"}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TextInput
                    label="Codigo do idoso"
                    value={codigoParaVincular}
                    onChangeText={(v) => setCodigoParaVincular(v.toUpperCase())}
                    autoCapitalize="characters"
                    style={[styles.inputSurface, { marginTop: theme.spacing.md }]}
                    contentStyle={{ fontSize: fontScale.body }}
                    activeUnderlineColor={theme.colors.primary}
                  />

                  <TouchableOpacity
                    onPress={vincularCodigo}
                    disabled={vinculando}
                    style={[styles.profilePrimaryAction, buttonState(vinculando)]}
                  >
                    <Text style={inverseText(fontScale.button, { fontWeight: "700" })}>
                      {vinculando ? "Vinculando..." : "Vincular idoso"}
                    </Text>
                  </TouchableOpacity>

                  <Text style={bodyText(fontScale.caption, "#4d7182", { marginTop: 10 })}>
                    Vinculados: {vinculados.length}
                  </Text>
                </>
              )}
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate("EditarPerfil")}
              style={styles.profileSecondaryAction}
            >
              <Text style={titleText(fontScale.button)}>Editar perfil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.logoutButton, buttonState(saindo, "#005f99")]}
              onPress={logout}
              disabled={saindo}
            >
              {saindo ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={inverseText(fontScale.button, { fontWeight: "700", letterSpacing: 0.4, textAlign: "center" })}>
                  Sair da conta
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

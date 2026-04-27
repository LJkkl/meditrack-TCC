import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, Alert, View } from "react-native";
import { auth, firestore } from "../firebase";
import { formatarDataHoraBR } from "../utils/dataHora";
import TelaBaseIdoso from "../components/idoso/TelaBaseIdoso";
import CartaoBase from "../components/CartaoBase";
import { useTamanhoFonte } from "../hooks/useTamanhoFonte";
import { syncDoseNotificationsForCurrentUser } from "../utils/notificacoes";
import styles, { theme } from "../estilo";

type DoseItem = {
  id: string;
  medId?: string;
  nomeMed: string;
  previstoPara: number;
  status: "pendente" | "tomado" | "perdido";
};

export default function IdosoHome() {
  const [doses, setDoses] = useState<DoseItem[]>([]);
  const [agora, setAgora] = useState(Date.now());
  const { fontScale } = useTamanhoFonte();
  const LIMITE_PERDIDO_MS = 12 * 60 * 60 * 1000;

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsubscribe = firestore
      .collection("Usuario")
      .doc(uid)
      .collection("Historico")
      .where("status", "==", "pendente")
      .onSnapshot(async (snapshot) => {
        const lista: DoseItem[] = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            const previstoPara = typeof data.previstoPara === "object" && data.previstoPara?.toMillis
              ? data.previstoPara.toMillis()
              : (data.previstoPara ?? 0);
            return {
              id: doc.id,
              ...(data as Omit<DoseItem, "id">),
              previstoPara,
            };
          })
          .sort((a, b) => (a.previstoPara ?? 0) - (b.previstoPara ?? 0));

        const dosesPerdidasIds = new Set<string>();
        const agoraAtual = Date.now();

        lista.forEach(item => {
          const atraso = agoraAtual - (item.previstoPara ?? 0);
          if (atraso > LIMITE_PERDIDO_MS) {
            dosesPerdidasIds.add(item.id);
          }
        });

        if (dosesPerdidasIds.size > 0) {
          try {
            const batch = firestore.batch();
            snapshot.docs.forEach(doc => {
              if (dosesPerdidasIds.has(doc.id)) {
                batch.update(doc.ref, { status: "perdido" });
              }
            });
            await batch.commit();
          } catch {
            // Mantem a tela funcional mesmo se a atualizacao falhar.
          }
        }

        setDoses(lista.filter(d => !dosesPerdidasIds.has(d.id)));
      });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const doseAtual = useMemo(() => doses[0] ?? null, [doses]);

  const podeTomarAgora = useMemo(() => {
    if (!doseAtual) return false;
    return agora >= doseAtual.previstoPara;
  }, [agora, doseAtual]);

  const proximaDose = useMemo(() => {
    if (!doseAtual) return null;
    return doses[1] ?? null;
  }, [doseAtual, doses]);

  const marcarComoTomado = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !doseAtual) return;

    try {
      await firestore
        .collection("Usuario")
        .doc(uid)
        .collection("Historico")
        .doc(doseAtual.id)
        .update({
          status: "tomado",
          tomadoEm: Date.now(),
        });
      await syncDoseNotificationsForCurrentUser();
    } catch {
      Alert.alert("Erro", "Não foi possível registrar a dose agora.");
    }
  };

  return (
    <TelaBaseIdoso title="Agora" subtitle="Somente o que precisa fazer agora.">
      <CartaoBase style={[styles.idosoCard, { marginBottom: 14 }]}>
        {doseAtual ? (
          <>
            <Text style={{ color: theme.colors.text, fontSize: fontScale.title, fontWeight: "700", marginTop: 8 }}>
              {doseAtual.nomeMed}
            </Text>
            <Text style={{ color: "#4d7182", fontSize: fontScale.body, marginTop: 8, lineHeight: 28 }}>
              Horário: {formatarDataHoraBR(doseAtual.previstoPara)}
            </Text>

            {podeTomarAgora ? (
              <TouchableOpacity onPress={marcarComoTomado} style={styles.idosoLargeButton}>
                <Text style={{ color: theme.colors.textInverse, fontSize: fontScale.button + 2, fontWeight: "700" }}>
                  Ja tomei
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.idosoSoftPanel}>
                <Text style={{ color: "#24505b", fontSize: fontScale.sectionTitle, fontWeight: "700", textAlign: "center" }}>
                  Ainda não está na hora
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: fontScale.body, marginTop: 8, lineHeight: 24, textAlign: "center" }}>
                  O botão aparece na hora certa.
                </Text>
              </View>
            )}
          </>
        ) : (
          <Text style={{ color: theme.colors.textMuted, fontSize: fontScale.body, marginTop: 12, lineHeight: 28 }}>
            Nenhuma dose pendente agora.
          </Text>
        )}
      </CartaoBase>

      <CartaoBase style={styles.idosoCard}>
        {proximaDose ? (
          <>
            <Text style={{ color: theme.colors.textMuted, fontSize: fontScale.caption, textTransform: "uppercase" }}>
              Depois
            </Text>
            <Text style={{ color: theme.colors.text, fontSize: fontScale.sectionTitle + 1, fontWeight: "700", marginTop: 8 }}>
              {proximaDose.nomeMed}
            </Text>
            <Text style={{ color: "#4d7182", fontSize: fontScale.body, marginTop: 8, lineHeight: 28 }}>
              {formatarDataHoraBR(proximaDose.previstoPara)}
            </Text>
          </>
        ) : (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: "#4d7182", fontSize: fontScale.body, lineHeight: 28 }}>
              Não há outra dose agendada.
            </Text>
          </View>
        )}
      </CartaoBase>
    </TelaBaseIdoso>
  );
}

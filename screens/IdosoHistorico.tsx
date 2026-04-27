import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Icon from "@react-native-vector-icons/fontawesome6";
import { auth, firestore } from "../firebase";
import { formatarDataHoraBR } from "../utils/dataHora";
import TelaBaseIdoso from "../components/idoso/TelaBaseIdoso";
import CartaoBase from "../components/CartaoBase";
import { useTamanhoFonte } from "../hooks/useTamanhoFonte";

type DoseItem = {
  id: string;
  nomeMed: string;
  previstoPara: number;
  status: "tomado" | "perdido" | "pendente";
  tomadoEm?: number | null;
};

export default function IdosoHistorico() {
  const [doses, setDoses] = useState<DoseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { fontScale } = useTamanhoFonte();

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const unsubscribe = firestore
      .collection("Usuario")
      .doc(uid)
      .collection("Historico")
      .onSnapshot((snapshot) => {
        const lista: DoseItem[] = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<DoseItem, "id">),
          }))
          .filter((item) => item.status === "tomado" || item.status === "perdido")
          .sort((a, b) => {
            const dataA = a.status === "tomado" ? (a.tomadoEm ?? 0) : (a.previstoPara ?? 0);
            const dataB = b.status === "tomado" ? (b.tomadoEm ?? 0) : (b.previstoPara ?? 0);
            return dataB - dataA;
          });

        setDoses(lista);
        setLoading(false);
      });

    return () => unsubscribe();
  }, []);

  const ultimasDoses = useMemo(() => doses.slice(0, 4), [doses]);
  const tomadas = doses.filter((item) => item.status === "tomado").length;
  const perdidas = doses.filter((item) => item.status === "perdido").length;

  return (
    <TelaBaseIdoso
      title="Historico simples"
      subtitle="Ultimos registros."
    >
      <CartaoBase style={{ marginBottom: 14, backgroundColor: "#fffdf8", borderColor: "#d9e8ea" }}>
        <View style={{ flexDirection: "row", marginTop: 14 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "#e8f5e9",
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor: "#cfe8d2",
              marginRight: 6,
            }}
          >
            <Text style={{ color: "#1b5e20", fontSize: 14, fontWeight: "700" }}>
              Tomadas
            </Text>
            <Text style={{ color: "#1b5e20", fontSize: 28, fontWeight: "700", marginTop: 6 }}>
              {tomadas}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: "#fff3e0",
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor: "#f2d6b1",
              marginLeft: 6,
            }}
          >
            <Text style={{ color: "#e65100", fontSize: 14, fontWeight: "700" }}>
              Perdidas
            </Text>
            <Text style={{ color: "#e65100", fontSize: 28, fontWeight: "700", marginTop: 6 }}>
              {perdidas}
            </Text>
          </View>
        </View>
      </CartaoBase>

      {loading && (
          <CartaoBase style={{ alignItems: "center", paddingVertical: 28, backgroundColor: "#fffdf8", borderColor: "#d9e8ea" }}>
            <ActivityIndicator size="large" color="#0b3954" />
            <Text style={{ marginTop: 14, color: "#5f7f92", fontSize: fontScale.body }}>
              Carregando...
            </Text>
          </CartaoBase>
      )}

      {!loading && ultimasDoses.map((dose) => {
        const perdido = dose.status === "perdido";

        return (
          <CartaoBase
            key={dose.id}
            style={{
              marginBottom: 12,
              backgroundColor: perdido ? "#fff7eb" : "#f2fbf2",
              borderLeftWidth: 5,
              borderLeftColor: perdido ? "#ef6c00" : "#2e7d32",
              borderColor: perdido ? "#f3dfbf" : "#d6ead6",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: "#12384c", fontSize: fontScale.sectionTitle + 2, fontWeight: "700", flex: 1, paddingRight: 12 }}>
                {dose.nomeMed}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: perdido ? "#ffe0b2" : "#c8e6c9",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Icon
                  name={perdido ? "triangle-exclamation" : "check"}
                  size={12}
                  color={perdido ? "#e65100" : "#1b5e20"}
                  iconStyle="solid"
                />
                <Text
                  style={{
                    color: perdido ? "#e65100" : "#1b5e20",
                    fontWeight: "700",
                    fontSize: 13,
                    marginLeft: 6,
                  }}
                >
                  {perdido ? "Perdida" : "Tomada"}
                </Text>
              </View>
            </View>

            <Text style={{ color: "#4d7182", fontSize: fontScale.body, marginTop: 12, lineHeight: 24 }}>
              {formatarDataHoraBR(dose.previstoPara)}
            </Text>

            {!perdido && dose.tomadoEm && (
              <Text style={{ color: "#4d7182", fontSize: fontScale.body, marginTop: 6, lineHeight: 24 }}>
                Tomado: {formatarDataHoraBR(dose.tomadoEm)}
              </Text>
            )}

            {perdido && (
              <Text style={{ color: "#b85c00", fontSize: fontScale.body, marginTop: 6, lineHeight: 24 }}>
                Nao tomada a tempo.
              </Text>
            )}
          </CartaoBase>
        );
      })}

      {!loading && doses.length === 0 && (
        <CartaoBase style={{ alignItems: "center", paddingVertical: 30, backgroundColor: "#fffdf8", borderColor: "#d9e8ea" }}>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: "#deedf3",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Icon name="clock-rotate-left" size={24} color="#0b3954" iconStyle="solid" />
          </View>
          <Text style={{ color: "#12384c", fontSize: fontScale.sectionTitle + 1, fontWeight: "700", textAlign: "center" }}>
            Nenhum registro ainda
          </Text>
          <Text style={{ color: "#5f7f92", fontSize: fontScale.body, marginTop: 8, textAlign: "center", lineHeight: 24 }}>
            As doses tomadas ou perdidas vao aparecer aqui.
          </Text>
        </CartaoBase>
      )}
    </TelaBaseIdoso>
  );
}

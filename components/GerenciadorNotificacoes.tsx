import { useEffect, useRef } from "react";
import { AppState, Linking } from "react-native";
import { auth } from "../firebase";
import {
  ACTION_ADIAR_DOSE_5_MIN,
  ACTION_TOMAR_DOSE,
  adiarDoseNotificadaCincoMinutos,
  ensureNotificationPermissionsAsync,
  marcarDoseNotificadaComoTomada,
  notificacoesSuportadas,
  syncDoseNotificationsForUser,
  syncLinkedDoseNotificationsForUser,
} from "../utils/notificacoes";
import { firestore } from "../firebase";
import { useVinculosIdoso } from "../hooks/useVinculosIdoso";
import * as Notifications from "expo-notifications";
import { navigationRef } from "../navigation/navigationRef";

function navigateToHistorico(targetUserId?: string, targetUserName?: string, fallbackDelay = 0) {
  const run = () => {
    if (!navigationRef.isReady()) {
      setTimeout(() => navigateToHistorico(targetUserId, targetUserName, fallbackDelay + 1), 300);
      return;
    }

    navigationRef.navigate("Menu", {
      screen: "Historico",
    });
  };

  if (fallbackDelay > 10) {
    return;
  }

  run();
}

function payloadFromAlarmUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "meditrack:" || parsed.hostname !== "dose-action") {
      return null;
    }

    const action = parsed.pathname.replace("/", "");
    if (action !== "tomar") {
      return null;
    }

    const source = parsed.searchParams.get("source");
    const historicoId = parsed.searchParams.get("historicoId");
    const nomeMed = parsed.searchParams.get("nomeMed") || "Medicamento";
    const previstoPara = Number(parsed.searchParams.get("previstoPara") || Date.now());
    const medId = parsed.searchParams.get("medId") || undefined;

    if (source === "dose_reminder") {
      const uid = parsed.searchParams.get("uid");
      if (!uid || !historicoId) return null;
      return { source, uid, historicoId, medId, previstoPara, nomeMed };
    }

    if (source === "linked_dose_reminder") {
      const caregiverUid = parsed.searchParams.get("caregiverUid");
      const elderlyUid = parsed.searchParams.get("elderlyUid");
      const elderlyName = parsed.searchParams.get("elderlyName") || "Idoso";
      if (!caregiverUid || !elderlyUid || !historicoId) return null;
      return { source, caregiverUid, elderlyUid, elderlyName, historicoId, medId, previstoPara, nomeMed };
    }
  } catch {
    return null;
  }

  return null;
}

export default function GerenciadorNotificacoes() {
  const { selecionarUsuario } = useVinculosIdoso();
  const lastHandledResponseId = useRef<string | null>(null);

  useEffect(() => {
    let unsubscribeUserDoc = () => {};
    let unsubscribeOwnHistory = () => {};
    let unsubscribeLinkedList = () => {};
    let linkedHistoryUnsubs: Array<() => void> = [];
    let syncTimer: ReturnType<typeof setTimeout> | null = null;
    let usuarioAtualId: string | null = null;

    const clearLinkedHistoryUnsubs = () => {
      linkedHistoryUnsubs.forEach((unsubscribe) => unsubscribe());
      linkedHistoryUnsubs = [];
    };

    const clearAllDataSubscriptions = () => {
      unsubscribeUserDoc();
      unsubscribeOwnHistory();
      unsubscribeLinkedList();
      clearLinkedHistoryUnsubs();
    };

    const scheduleSync = () => {
      if (syncTimer) {
        clearTimeout(syncTimer);
      }

      syncTimer = setTimeout(() => {
        if (!usuarioAtualId) {
          return;
        }

        Promise.all([
          syncDoseNotificationsForUser(usuarioAtualId),
          syncLinkedDoseNotificationsForUser(usuarioAtualId),
        ]).catch((error) => {
          console.log(error);
        });
      }, 400);
    };

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      clearAllDataSubscriptions();
      usuarioAtualId = user?.uid ?? null;

      if (!user) {
        return;
      }

      try {
        if (notificacoesSuportadas()) {
          await ensureNotificationPermissionsAsync();
        }

        await syncDoseNotificationsForUser(user.uid);
        await syncLinkedDoseNotificationsForUser(user.uid);
      } catch (error) {
        console.log(error);
      }

      unsubscribeUserDoc = firestore
        .collection("Usuario")
        .doc(user.uid)
        .onSnapshot(
          () => {
            scheduleSync();
          },
          (error) => {
            console.log(error);
          }
        );

      unsubscribeOwnHistory = firestore
        .collection("Usuario")
        .doc(user.uid)
        .collection("Historico")
        .onSnapshot(
          () => {
            scheduleSync();
          },
          (error) => {
            console.log(error);
          }
        );

      unsubscribeLinkedList = firestore
        .collection("Usuario")
        .doc(user.uid)
        .collection("Vinculados")
        .onSnapshot(
          (snapshot) => {
            scheduleSync();

            clearLinkedHistoryUnsubs();

            linkedHistoryUnsubs = snapshot.docs.map((doc) =>
              firestore
                .collection("Usuario")
                .doc(doc.id)
                .collection("Historico")
                .onSnapshot(
                  () => {
                    scheduleSync();
                  },
                  (error) => {
                    console.log(error);
                  }
                )
            );
          },
          (error) => {
            console.log(error);
          }
        );
    });

    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const identifier = response.notification.request.identifier;
      if (lastHandledResponseId.current === identifier) {
        return;
      }
      lastHandledResponseId.current = identifier;

      const data = response.notification.request.content.data as any;
      const currentUid = auth.currentUser?.uid;

      if (response.actionIdentifier === ACTION_TOMAR_DOSE) {
        void marcarDoseNotificadaComoTomada(data).catch((error) => console.log(error));
        return;
      }

      if (response.actionIdentifier === ACTION_ADIAR_DOSE_5_MIN) {
        void adiarDoseNotificadaCincoMinutos(data).catch((error) => console.log(error));
        return;
      }

      if (data?.source === "linked_dose_reminder" && typeof data.elderlyUid === "string") {
        selecionarUsuario(data.elderlyUid, typeof data.elderlyName === "string" ? data.elderlyName : "Idoso");
        navigateToHistorico(data.elderlyUid, data.elderlyName);
        return;
      }

      if (data?.source === "dose_reminder" && currentUid) {
        selecionarUsuario(currentUid, "Minha conta");
        navigateToHistorico(currentUid, "Minha conta");
      }
    };

    const handleUrl = (url: string | null) => {
      if (!url) {
        return;
      }

      const payload = payloadFromAlarmUrl(url);
      if (!payload) {
        return;
      }

      void marcarDoseNotificadaComoTomada(payload).catch((error) => console.log(error));
    };

    const response = Notifications.getLastNotificationResponse();
    if (response) {
      handleNotificationResponse(response);
    }

    Linking.getInitialURL().then(handleUrl).catch(console.log);

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    const linkingSubscription = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !usuarioAtualId) {
        return;
      }

      scheduleSync();
    });

    return () => {
      if (syncTimer) {
        clearTimeout(syncTimer);
      }
      clearAllDataSubscriptions();
      responseSubscription.remove();
      linkingSubscription.remove();
      appStateSubscription.remove();
      unsubscribe();
    };
  }, [selecionarUsuario]);

  return null;
}

import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { auth } from "../firebase";
import {
  ensureNotificationPermissionsAsync,
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

    const scheduleSync = (runner: () => Promise<void>) => {
      if (syncTimer) {
        clearTimeout(syncTimer);
      }

      syncTimer = setTimeout(() => {
        runner().catch((error) => {
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
            scheduleSync(async () => {
              await syncDoseNotificationsForUser(user.uid);
              await syncLinkedDoseNotificationsForUser(user.uid);
            });
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
            scheduleSync(async () => {
              await syncDoseNotificationsForUser(user.uid);
            });
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
            scheduleSync(async () => {
              await syncLinkedDoseNotificationsForUser(user.uid);
            });

            clearLinkedHistoryUnsubs();

            linkedHistoryUnsubs = snapshot.docs.map((doc) =>
              firestore
                .collection("Usuario")
                .doc(doc.id)
                .collection("Historico")
                .onSnapshot(
                  () => {
                    scheduleSync(async () => {
                      await syncLinkedDoseNotificationsForUser(user.uid);
                    });
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

    const response = Notifications.getLastNotificationResponse();
    if (response) {
      handleNotificationResponse(response);
    }

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !usuarioAtualId) {
        return;
      }

      scheduleSync(async () => {
        if (!usuarioAtualId) {
          return;
        }

        await syncDoseNotificationsForUser(usuarioAtualId);
        await syncLinkedDoseNotificationsForUser(usuarioAtualId);
      });
    });

    return () => {
      if (syncTimer) {
        clearTimeout(syncTimer);
      }
      clearAllDataSubscriptions();
      responseSubscription.remove();
      appStateSubscription.remove();
      unsubscribe();
    };
  }, [selecionarUsuario]);

  return null;
}

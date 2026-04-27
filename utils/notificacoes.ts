import { Platform } from "react-native";
import Constants from "expo-constants";
import { auth, firestore } from "../firebase";

type DoseNotificationData = {
  source: "dose_reminder";
  uid: string;
  historicoId: string;
  medId?: string;
  previstoPara: number;
  nomeMed: string;
};

type LinkedDoseNotificationData = {
  source: "linked_dose_reminder";
  caregiverUid: string;
  elderlyUid: string;
  elderlyName: string;
  historicoId: string;
  medId?: string;
  previstoPara: number;
  nomeMed: string;
};

type NotificationsModule = typeof import("expo-notifications");

let notificationsModule: NotificationsModule | null | undefined;
const MARGEM_REAGENDAMENTO_MS = 15000;
const DISPARO_MINIMO_A_PARTIR_DE_AGORA_MS = 2000;
const ATRASO_AVISO_VINCULADO_MS = 5 * 60 * 1000;

function isExpoGo() {
  return Constants.appOwnership === "expo";
}

async function notificationsEnabledForUser(uid: string) {
  const doc = await firestore.collection("Usuario").doc(uid).get();
  return doc.data()?.notificacoesAtivas !== false;
}

function getNotificationsModule(): NotificationsModule | null {
  if (notificationsModule !== undefined) {
    return notificationsModule;
  }

  if (isExpoGo()) {
    notificationsModule = null;
    return notificationsModule;
  }

  try {
    const Notifications = require("expo-notifications") as NotificationsModule;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    notificationsModule = Notifications;
    return notificationsModule;
  } catch (error) {
    console.log("Notificacoes locais indisponiveis neste ambiente.", error);
    notificationsModule = null;
    return notificationsModule;
  }
}

export function notificacoesSuportadas() {
  return getNotificationsModule() !== null;
}

export async function ensureNotificationPermissionsAsync() {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    await ensureNotificationChannelAsync();
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  const granted = requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (granted) {
    await ensureNotificationChannelAsync();
  }

  return granted;
}

async function ensureNotificationChannelAsync() {
  const Notifications = getNotificationsModule();
  if (!Notifications || Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("medicamentos", {
    name: "Lembretes de medicamentos",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0b3954",
    sound: "default",
  });
}

function isDoseReminder(data: unknown): data is DoseNotificationData {
  if (!data || typeof data !== "object") {
    return false;
  }

  const candidate = data as Partial<DoseNotificationData>;
  return candidate.source === "dose_reminder" && typeof candidate.uid === "string" && typeof candidate.historicoId === "string";
}

function isLinkedDoseReminder(data: unknown): data is LinkedDoseNotificationData {
  if (!data || typeof data !== "object") {
    return false;
  }

  const candidate = data as Partial<LinkedDoseNotificationData>;
  return (
    candidate.source === "linked_dose_reminder" &&
    typeof candidate.caregiverUid === "string" &&
    typeof candidate.elderlyUid === "string" &&
    typeof candidate.historicoId === "string"
  );
}

async function getPendingDoseDocs(uid: string) {
  const snapshot = await firestore
    .collection("Usuario")
    .doc(uid)
    .collection("Historico")
    .where("status", "==", "pendente")
    .get();

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...(doc.data() as {
        medId?: string;
        nomeMed: string;
        previstoPara: number;
      }),
    }))
    .filter((item) => (item.previstoPara ?? 0) >= Date.now() - MARGEM_REAGENDAMENTO_MS)
    .sort((a, b) => (a.previstoPara ?? 0) - (b.previstoPara ?? 0));
}

async function cancelScheduledDoseNotificationsForUser(uid: string) {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return;
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    scheduled
      .filter((item) => isDoseReminder(item.content.data) && item.content.data.uid === uid)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );
}

async function cancelScheduledLinkedDoseNotificationsForCaregiver(caregiverUid: string) {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return;
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    scheduled
      .filter((item) => isLinkedDoseReminder(item.content.data) && item.content.data.caregiverUid === caregiverUid)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );
}

export async function cancelDoseNotificationsForUser(uid?: string) {
  const resolvedUid = uid ?? auth.currentUser?.uid;
  if (!resolvedUid) {
    return;
  }

  await cancelScheduledDoseNotificationsForUser(resolvedUid);
}

export async function cancelLinkedDoseNotificationsForUser(caregiverUid?: string) {
  const resolvedUid = caregiverUid ?? auth.currentUser?.uid;
  if (!resolvedUid) {
    return;
  }

  await cancelScheduledLinkedDoseNotificationsForCaregiver(resolvedUid);
}

async function getLinkedElderlyForCaregiver(caregiverUid: string) {
  const snapshot = await firestore
    .collection("Usuario")
    .doc(caregiverUid)
    .collection("Vinculados")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    nome: (doc.data().nome as string) || "Idoso",
  }));
}

export async function syncDoseNotificationsForUser(uid?: string) {
  const Notifications = getNotificationsModule();
  const resolvedUid = uid ?? auth.currentUser?.uid;
  if (!Notifications || !resolvedUid) {
    return;
  }

  const enabled = await notificationsEnabledForUser(resolvedUid);
  if (!enabled) {
    await cancelScheduledDoseNotificationsForUser(resolvedUid);
    return;
  }

  const granted = await ensureNotificationPermissionsAsync();
  if (!granted) {
    return;
  }

  const pendentes = await getPendingDoseDocs(resolvedUid);
  await cancelScheduledDoseNotificationsForUser(resolvedUid);

  await Promise.all(
    pendentes.map((dose) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: "Hora do medicamento",
          body: `${dose.nomeMed} precisa ser tomado agora.`,
          sound: "default",
          data: {
            source: "dose_reminder",
            uid: resolvedUid,
            historicoId: dose.id,
            medId: dose.medId,
            previstoPara: dose.previstoPara,
            nomeMed: dose.nomeMed,
          } satisfies DoseNotificationData,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(Math.max(dose.previstoPara, Date.now() + DISPARO_MINIMO_A_PARTIR_DE_AGORA_MS)),
          channelId: Platform.OS === "android" ? "medicamentos" : undefined,
        },
      })
    )
  );
}

export async function syncDoseNotificationsForCurrentUser() {
  await syncDoseNotificationsForUser(auth.currentUser?.uid);
}

export async function syncLinkedDoseNotificationsForUser(caregiverUid?: string) {
  const Notifications = getNotificationsModule();
  const resolvedUid = caregiverUid ?? auth.currentUser?.uid;
  if (!Notifications || !resolvedUid) {
    return;
  }

  const enabled = await notificationsEnabledForUser(resolvedUid);
  if (!enabled) {
    await cancelScheduledLinkedDoseNotificationsForCaregiver(resolvedUid);
    return;
  }

  const granted = await ensureNotificationPermissionsAsync();
  if (!granted) {
    return;
  }

  const vinculados = await getLinkedElderlyForCaregiver(resolvedUid);
  await cancelScheduledLinkedDoseNotificationsForCaregiver(resolvedUid);

  const notificacoes = await Promise.all(
    vinculados.map(async (vinculado) => {
      const pendentes = await getPendingDoseDocs(vinculado.id);
      return pendentes.map((dose) => ({
        vinculado,
        dose,
      }));
    })
  );

  await Promise.all(
    notificacoes.flat().map(({ vinculado, dose }) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: `Dose de ${vinculado.nome}`,
          body: `${dose.nomeMed} pode estar atrasado. Verifique o tratamento.`,
          sound: "default",
          data: {
            source: "linked_dose_reminder",
            caregiverUid: resolvedUid,
            elderlyUid: vinculado.id,
            elderlyName: vinculado.nome,
            historicoId: dose.id,
            medId: dose.medId,
            previstoPara: dose.previstoPara,
            nomeMed: dose.nomeMed,
          } satisfies LinkedDoseNotificationData,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(
            Math.max(
              dose.previstoPara + ATRASO_AVISO_VINCULADO_MS,
              Date.now() + DISPARO_MINIMO_A_PARTIR_DE_AGORA_MS
            )
          ),
          channelId: Platform.OS === "android" ? "medicamentos" : undefined,
        },
      })
    )
  );
}

export async function syncLinkedDoseNotificationsForCurrentUser() {
  await syncLinkedDoseNotificationsForUser(auth.currentUser?.uid);
}

export async function syncAllNotificationsForCurrentUser() {
  await syncDoseNotificationsForCurrentUser();
  await syncLinkedDoseNotificationsForCurrentUser();
}

export async function cancelAllNotificationsForCurrentUser() {
  await cancelDoseNotificationsForUser(auth.currentUser?.uid);
  await cancelLinkedDoseNotificationsForUser(auth.currentUser?.uid);
}

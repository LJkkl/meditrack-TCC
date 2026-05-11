import { Platform } from "react-native";
import Constants from "expo-constants";
import { auth, firestore } from "../firebase";
import { TOLERANCIA_ATRASO_MS } from "./doses";

export type NotificationSoundPreference = "padrao" | "suave" | "alerta";

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
const ATRASO_AVISO_VINCULADO_MS = TOLERANCIA_ATRASO_MS;
const MAX_DOSES_AGENDADAS = 64;
const REFORCOS_LEMBRETE_MS = [0, TOLERANCIA_ATRASO_MS, 6 * 60 * 1000, 9 * 60 * 1000];
const SOUND_CONFIG: Record<NotificationSoundPreference, { channelId: string; sound: "default" | "notificacao_suave.wav" | "notificacao_alerta.wav" }> = {
  padrao: { channelId: "medicamentos-padrao-v2", sound: "default" },
  suave: { channelId: "medicamentos-suave-v2", sound: "notificacao_suave.wav" },
  alerta: { channelId: "medicamentos-alerta-v2", sound: "notificacao_alerta.wav" },
};

function isExpoGo() {
  return Constants.appOwnership === "expo";
}

async function notificationsEnabledForUser(uid: string) {
  const doc = await firestore.collection("Usuario").doc(uid).get();
  return doc.data()?.notificacoesAtivas !== false;
}

async function notificationSoundForUser(uid: string): Promise<NotificationSoundPreference> {
  const doc = await firestore.collection("Usuario").doc(uid).get();
  const value = doc.data()?.somNotificacao;
  return value === "suave" || value === "alerta" || value === "padrao" ? value : "padrao";
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
        priority: Notifications.AndroidNotificationPriority.MAX,
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

  await Promise.all(
    (Object.entries(SOUND_CONFIG) as Array<[NotificationSoundPreference, { channelId: string; sound: "default" | "notificacao_suave.wav" | "notificacao_alerta.wav" }]>).map(
      async ([key, config]) => {
        await Notifications.setNotificationChannelAsync(config.channelId, {
          name: `Lembretes de medicamentos - ${key}`,
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 700, 250, 700, 250, 700],
          lightColor: "#0b3954",
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          audioAttributes: {
            usage: Notifications.AndroidAudioUsage.ALARM,
            contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          },
          sound: config.sound,
        });
      }
    )
  );
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
    .sort((a, b) => (a.previstoPara ?? 0) - (b.previstoPara ?? 0))
    .slice(0, MAX_DOSES_AGENDADAS);
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
  const soundPreference = await notificationSoundForUser(resolvedUid);
  const soundConfig = SOUND_CONFIG[soundPreference];
  await cancelScheduledDoseNotificationsForUser(resolvedUid);

  await Promise.all(
    pendentes.flatMap((dose) =>
      REFORCOS_LEMBRETE_MS.map((offsetMs) => Notifications.scheduleNotificationAsync({
        content: {
          title: offsetMs === 0 ? "Hora do medicamento" : "Lembrete de medicamento",
          body: offsetMs === 0
            ? `${dose.nomeMed} precisa ser tomado agora.`
            : `${dose.nomeMed} ainda nao foi registrado. Confira a dose.`,
          sound: soundConfig.sound,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 700, 250, 700, 250, 700],
          autoDismiss: false,
          sticky: offsetMs > 0,
          interruptionLevel: "timeSensitive",
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
          date: new Date(Math.max(dose.previstoPara + offsetMs, Date.now() + DISPARO_MINIMO_A_PARTIR_DE_AGORA_MS)),
          channelId: Platform.OS === "android" ? soundConfig.channelId : undefined,
        },
      }))
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
  const soundPreference = await notificationSoundForUser(resolvedUid);
  const soundConfig = SOUND_CONFIG[soundPreference];
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
          sound: soundConfig.sound,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 700, 250, 700],
          interruptionLevel: "timeSensitive",
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
          channelId: Platform.OS === "android" ? soundConfig.channelId : undefined,
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

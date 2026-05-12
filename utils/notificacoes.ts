import { Platform } from "react-native";
import Constants from "expo-constants";
import { auth, firestore } from "../firebase";
import { cancelNativeDoseAlarmsForOwner, scheduleNativeDoseAlarm } from "./alarmesNativos";
import { TOLERANCIA_ATRASO_MS } from "./doses";

export type NotificationSoundPreference = "padrao" | "suave" | "alerta";
export const DOSE_NOTIFICATION_CATEGORY_ID = "dose_actions";
export const ACTION_TOMAR_DOSE = "tomar_dose";
export const ACTION_ADIAR_DOSE_5_MIN = "adiar_dose_5_min";

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
const MAX_NOTIFICACOES_AGENDADAS = 64;
const REFORCOS_LEMBRETE_MS = [0, TOLERANCIA_ATRASO_MS, 6 * 60 * 1000, 9 * 60 * 1000];
const REFORCOS_CUIDADOR_MS = [0, TOLERANCIA_ATRASO_MS, 6 * 60 * 1000];
const SOUND_CONFIG: Record<NotificationSoundPreference, { channelId: string; sound: "default" | "notificacao_suave.wav" | "notificacao_alerta.wav" }> = {
  padrao: { channelId: "medicamentos-alarme-padrao-v3", sound: "default" },
  suave: { channelId: "medicamentos-alarme-suave-v3", sound: "notificacao_suave.wav" },
  alerta: { channelId: "medicamentos-alarme-alerta-v3", sound: "notificacao_alerta.wav" },
};

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
    console.log("Notificacoes locais indisponiveis neste ambiente.", {
      appOwnership: Constants.appOwnership,
      error,
    });
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
  if (!Notifications) {
    return;
  }

  await Notifications.setNotificationCategoryAsync(DOSE_NOTIFICATION_CATEGORY_ID, [
    {
      identifier: ACTION_TOMAR_DOSE,
      buttonTitle: "Tomar",
      options: {
        opensAppToForeground: false,
        isAuthenticationRequired: false,
        isDestructive: false,
      },
    },
    {
      identifier: ACTION_ADIAR_DOSE_5_MIN,
      buttonTitle: "Adiar 5 min",
      options: {
        opensAppToForeground: false,
        isAuthenticationRequired: false,
        isDestructive: false,
      },
    },
  ]);

  if (Platform.OS !== "android") {
    return;
  }

  await Promise.all(
    (Object.entries(SOUND_CONFIG) as Array<[NotificationSoundPreference, { channelId: string; sound: "default" | "notificacao_suave.wav" | "notificacao_alerta.wav" }]>).map(
      async ([key, config]) => {
        await Notifications.setNotificationChannelAsync(config.channelId, {
          name: `Alarmes de medicamentos - ${key}`,
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
    .slice(0, Math.max(1, Math.floor(MAX_NOTIFICACOES_AGENDADAS / REFORCOS_LEMBRETE_MS.length)));
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

  await cancelNativeDoseAlarmsForOwner(`dose:${uid}`).catch(console.log);
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

  await cancelNativeDoseAlarmsForOwner(`linked:${caregiverUid}`).catch(console.log);
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
          title: offsetMs === 0 ? "Hora do medicamento" : "Medicamento ainda pendente",
          body: offsetMs === 0
            ? `${dose.nomeMed} precisa ser tomado agora.`
            : `${dose.nomeMed} ainda não foi registrado. Confira a dose.`,
          sound: soundConfig.sound,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 700, 250, 700, 250, 700],
          autoDismiss: false,
          sticky: true,
          interruptionLevel: "timeSensitive",
          categoryIdentifier: DOSE_NOTIFICATION_CATEGORY_ID,
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

  await Promise.all(
    pendentes.map((dose) =>
      scheduleNativeDoseAlarm({
        alarmId: `dose:${resolvedUid}:${dose.id}`,
        ownerKey: `dose:${resolvedUid}`,
        title: "Hora do medicamento",
        body: `${dose.nomeMed} precisa ser tomado agora.`,
        triggerAt: dose.previstoPara,
        data: {
          source: "dose_reminder",
          uid: resolvedUid,
          historicoId: dose.id,
          medId: dose.medId,
          previstoPara: dose.previstoPara,
          nomeMed: dose.nomeMed,
        },
      }).catch((error) => {
        console.log(error);
        return false;
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

  const notificacoesLimitadas = notificacoes
    .flat()
    .slice(0, Math.max(1, Math.floor(MAX_NOTIFICACOES_AGENDADAS / REFORCOS_CUIDADOR_MS.length)));

  await Promise.all(
    notificacoesLimitadas
      .flatMap(({ vinculado, dose }) =>
        REFORCOS_CUIDADOR_MS.map((offsetMs) =>
          Notifications.scheduleNotificationAsync({
            content: {
              title: offsetMs === 0 ? `Hora da dose de ${vinculado.nome}` : `Dose pendente de ${vinculado.nome}`,
              body: offsetMs === 0
                ? `${dose.nomeMed} deve ser tomado agora.`
                : `${dose.nomeMed} ainda não foi registrado. Verifique o tratamento.`,
              sound: soundConfig.sound,
              priority: Notifications.AndroidNotificationPriority.MAX,
              vibrate: [0, 700, 250, 700, 250, 700],
              autoDismiss: false,
              sticky: true,
              interruptionLevel: "timeSensitive",
              categoryIdentifier: DOSE_NOTIFICATION_CATEGORY_ID,
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
              date: new Date(Math.max(dose.previstoPara + offsetMs, Date.now() + DISPARO_MINIMO_A_PARTIR_DE_AGORA_MS)),
              channelId: Platform.OS === "android" ? soundConfig.channelId : undefined,
            },
          })
        )
      )
  );

  await Promise.all(
    notificacoesLimitadas.map(({ vinculado, dose }) =>
      scheduleNativeDoseAlarm({
        alarmId: `linked:${resolvedUid}:${vinculado.id}:${dose.id}`,
        ownerKey: `linked:${resolvedUid}`,
        title: `Hora da dose de ${vinculado.nome}`,
        body: `${dose.nomeMed} deve ser tomado agora.`,
        triggerAt: dose.previstoPara,
        data: {
          source: "linked_dose_reminder",
          caregiverUid: resolvedUid,
          elderlyUid: vinculado.id,
          elderlyName: vinculado.nome,
          historicoId: dose.id,
          medId: dose.medId,
          previstoPara: dose.previstoPara,
          nomeMed: dose.nomeMed,
        },
      }).catch((error) => {
        console.log(error);
        return false;
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

export async function marcarDoseNotificadaComoTomada(data: unknown) {
  const payload = isDoseReminder(data)
    ? { uid: data.uid, historicoId: data.historicoId }
    : isLinkedDoseReminder(data)
      ? { uid: data.elderlyUid, historicoId: data.historicoId }
      : null;

  if (!payload) {
    return false;
  }

  await firestore
    .collection("Usuario")
    .doc(payload.uid)
    .collection("Historico")
    .doc(payload.historicoId)
    .update({
      status: "tomado",
      tomadoEm: Date.now(),
    });

  await syncDoseNotificationsForUser(payload.uid);

  const caregiverUid = isLinkedDoseReminder(data) ? data.caregiverUid : auth.currentUser?.uid;
  if (caregiverUid) {
    await syncLinkedDoseNotificationsForUser(caregiverUid);
  }

  return true;
}

export async function adiarDoseNotificadaCincoMinutos(data: unknown) {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return false;
  }

  const payload = isDoseReminder(data) || isLinkedDoseReminder(data) ? data : null;
  if (!payload) {
    return false;
  }

  const uid = isLinkedDoseReminder(payload) ? payload.elderlyUid : payload.uid;
  const enabled = await notificationsEnabledForUser(isLinkedDoseReminder(payload) ? payload.caregiverUid : uid);
  if (!enabled) {
    return false;
  }

  const granted = await ensureNotificationPermissionsAsync();
  if (!granted) {
    return false;
  }

  const soundPreference = await notificationSoundForUser(isLinkedDoseReminder(payload) ? payload.caregiverUid : uid);
  const soundConfig = SOUND_CONFIG[soundPreference];
  const nomeAlvo = isLinkedDoseReminder(payload) ? payload.elderlyName : undefined;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: nomeAlvo ? `Dose adiada de ${nomeAlvo}` : "Dose adiada",
      body: `${payload.nomeMed} foi adiado por 5 minutos.`,
      sound: soundConfig.sound,
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: [0, 700, 250, 700, 250, 700],
      autoDismiss: false,
      sticky: true,
      interruptionLevel: "timeSensitive",
      categoryIdentifier: DOSE_NOTIFICATION_CATEGORY_ID,
      data: payload,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 5 * 60 * 1000),
      channelId: Platform.OS === "android" ? soundConfig.channelId : undefined,
    },
  });

  return true;
}

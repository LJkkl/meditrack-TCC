import { NativeModules, Platform } from "react-native";

type NativeAlarmPayload = Record<string, string | number | boolean | null | undefined>;

type ScheduleNativeDoseAlarmParams = {
  alarmId: string;
  ownerKey: string;
  title: string;
  body: string;
  triggerAt: number;
  data: NativeAlarmPayload;
};

type MeditrackAlarmModule = {
  scheduleAlarm: (
    alarmId: string,
    ownerKey: string,
    title: string,
    body: string,
    triggerAt: number,
    data: NativeAlarmPayload
  ) => Promise<boolean>;
  cancelAlarmsForOwner: (ownerKey: string) => Promise<boolean>;
};

function getNativeAlarmModule(): MeditrackAlarmModule | null {
  if (Platform.OS !== "android") {
    return null;
  }

  const module = NativeModules.MeditrackAlarm as MeditrackAlarmModule | undefined;
  if (!module?.scheduleAlarm || !module?.cancelAlarmsForOwner) {
    return null;
  }

  return module;
}

export function alarmesNativosSuportados() {
  return getNativeAlarmModule() != null;
}

export async function scheduleNativeDoseAlarm(params: ScheduleNativeDoseAlarmParams) {
  const module = getNativeAlarmModule();
  if (!module) {
    return false;
  }

  return module.scheduleAlarm(
    params.alarmId,
    params.ownerKey,
    params.title,
    params.body,
    params.triggerAt,
    params.data
  );
}

export async function cancelNativeDoseAlarmsForOwner(ownerKey: string) {
  const module = getNativeAlarmModule();
  if (!module) {
    return false;
  }

  return module.cancelAlarmsForOwner(ownerKey);
}

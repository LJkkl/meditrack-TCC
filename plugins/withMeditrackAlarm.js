const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const ANDROID_PACKAGE = "com.luanjardim.meditrack";
const ALARM_PACKAGE = `${ANDROID_PACKAGE}.alarm`;
const ALARM_ACTIVITY = `${ALARM_PACKAGE}.MeditrackAlarmActivity`;
const ALARM_RECEIVER = `${ALARM_PACKAGE}.MeditrackAlarmReceiver`;

function addPermission(manifest, permission) {
  if (!manifest.manifest["uses-permission"]) {
    manifest.manifest["uses-permission"] = [];
  }

  const permissions = manifest.manifest["uses-permission"];
  if (!permissions.some((item) => item.$?.["android:name"] === permission)) {
    permissions.push({ $: { "android:name": permission } });
  }
}

function addApplicationItem(application, key, name, item) {
  if (!application[key]) {
    application[key] = [];
  }

  if (!application[key].some((entry) => entry.$?.["android:name"] === name)) {
    application[key].push(item);
  }
}

function writeFileOnce(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function patchMainApplication(contents) {
  if (!contents.includes(`import ${ALARM_PACKAGE}.MeditrackAlarmPackage`)) {
    contents = contents.replace(
      /^import /m,
      `import ${ALARM_PACKAGE}.MeditrackAlarmPackage\nimport `
    );
  }

  if (!contents.includes("MeditrackAlarmPackage()")) {
    contents = contents.replace(
      /val packages = PackageList\(this\)\.packages\s*\n/,
      (match) => `${match}      packages.add(MeditrackAlarmPackage())\n`
    );
  }

  return contents;
}

module.exports = function withMeditrackAlarm(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    addPermission(manifest, "android.permission.USE_FULL_SCREEN_INTENT");
    addPermission(manifest, "android.permission.WAKE_LOCK");
    addPermission(manifest, "android.permission.DISABLE_KEYGUARD");

    addApplicationItem(application, "activity", ALARM_ACTIVITY, {
      $: {
        "android:name": ALARM_ACTIVITY,
        "android:exported": "false",
        "android:excludeFromRecents": "true",
        "android:showWhenLocked": "true",
        "android:turnScreenOn": "true",
        "android:theme": "@style/Theme.Meditrack.Alarm",
      },
    });

    addApplicationItem(application, "receiver", ALARM_RECEIVER, {
      $: {
        "android:name": ALARM_RECEIVER,
        "android:exported": "false",
      },
    });

    return config;
  });

  config = withMainApplication(config, (config) => {
    config.modResults.contents = patchMainApplication(config.modResults.contents);
    return config;
  });

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const srcRoot = path.join(projectRoot, "android", "app", "src", "main", "java", ...ANDROID_PACKAGE.split("."));
      const alarmRoot = path.join(srcRoot, "alarm");
      const valuesRoot = path.join(projectRoot, "android", "app", "src", "main", "res", "values");

      writeFileOnce(path.join(alarmRoot, "MeditrackAlarmModule.java"), meditrackAlarmModuleJava());
      writeFileOnce(path.join(alarmRoot, "MeditrackAlarmPackage.java"), meditrackAlarmPackageJava());
      writeFileOnce(path.join(alarmRoot, "MeditrackAlarmScheduler.java"), meditrackAlarmSchedulerJava());
      writeFileOnce(path.join(alarmRoot, "MeditrackAlarmReceiver.java"), meditrackAlarmReceiverJava());
      writeFileOnce(path.join(alarmRoot, "MeditrackAlarmActivity.java"), meditrackAlarmActivityJava());
      writeFileOnce(path.join(valuesRoot, "meditrack_alarm_styles.xml"), alarmStylesXml());

      return config;
    },
  ]);

  return config;
};

function meditrackAlarmPackageJava() {
  return `package ${ALARM_PACKAGE};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class MeditrackAlarmPackage implements ReactPackage {
  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
    List<NativeModule> modules = new ArrayList<>();
    modules.add(new MeditrackAlarmModule(reactContext));
    return modules;
  }

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }
}
`;
}

function meditrackAlarmModuleJava() {
  return `package ${ALARM_PACKAGE};

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import org.json.JSONObject;

public class MeditrackAlarmModule extends ReactContextBaseJavaModule {
  private final ReactApplicationContext reactContext;

  public MeditrackAlarmModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
  }

  @Override
  public String getName() {
    return "MeditrackAlarm";
  }

  @ReactMethod
  public void scheduleAlarm(String alarmId, String ownerKey, String title, String body, double triggerAt, ReadableMap data, Promise promise) {
    try {
      JSONObject json = new JSONObject(data.toHashMap());
      MeditrackAlarmScheduler.schedule(
        reactContext,
        alarmId,
        ownerKey,
        title,
        body,
        (long) triggerAt,
        json.toString()
      );
      promise.resolve(true);
    } catch (Exception error) {
      promise.reject("MEDITRACK_ALARM_SCHEDULE_ERROR", error);
    }
  }

  @ReactMethod
  public void cancelAlarmsForOwner(String ownerKey, Promise promise) {
    try {
      MeditrackAlarmScheduler.cancelOwner(reactContext, ownerKey);
      promise.resolve(true);
    } catch (Exception error) {
      promise.reject("MEDITRACK_ALARM_CANCEL_ERROR", error);
    }
  }
}
`;
}

function meditrackAlarmSchedulerJava() {
  return `package ${ALARM_PACKAGE};

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import java.util.HashSet;
import java.util.Set;

public class MeditrackAlarmScheduler {
  private static final String PREFS = "meditrack_alarm_prefs";
  private static final String ACTION_FIRE = "${ALARM_PACKAGE}.FIRE";

  static void schedule(Context context, String alarmId, String ownerKey, String title, String body, long triggerAt, String dataJson) {
    AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    PendingIntent pendingIntent = pendingIntent(context, alarmId, ownerKey, title, body, triggerAt, dataJson);

    if (alarmManager == null) {
      return;
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
      alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
    } else {
      AlarmManager.AlarmClockInfo alarmClockInfo = new AlarmManager.AlarmClockInfo(triggerAt, pendingIntent);
      alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);
    }

    storeAlarm(context, ownerKey, alarmId);
  }

  static void cancelOwner(Context context, String ownerKey) {
    SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    Set<String> ids = new HashSet<>(prefs.getStringSet(ownerKey, new HashSet<String>()));
    AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

    if (alarmManager != null) {
      for (String alarmId : ids) {
        alarmManager.cancel(pendingIntent(context, alarmId, ownerKey, "", "", 0, "{}"));
      }
    }

    prefs.edit().remove(ownerKey).apply();
  }

  static void removeAlarm(Context context, String ownerKey, String alarmId) {
    SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    Set<String> ids = new HashSet<>(prefs.getStringSet(ownerKey, new HashSet<String>()));
    ids.remove(alarmId);
    prefs.edit().putStringSet(ownerKey, ids).apply();
  }

  private static PendingIntent pendingIntent(Context context, String alarmId, String ownerKey, String title, String body, long triggerAt, String dataJson) {
    Intent intent = new Intent(context, MeditrackAlarmReceiver.class);
    intent.setAction(ACTION_FIRE);
    intent.putExtra("alarmId", alarmId);
    intent.putExtra("ownerKey", ownerKey);
    intent.putExtra("title", title);
    intent.putExtra("body", body);
    intent.putExtra("triggerAt", triggerAt);
    intent.putExtra("dataJson", dataJson);

    return PendingIntent.getBroadcast(
      context,
      alarmId.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
  }

  private static void storeAlarm(Context context, String ownerKey, String alarmId) {
    SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    Set<String> ids = new HashSet<>(prefs.getStringSet(ownerKey, new HashSet<String>()));
    ids.add(alarmId);
    prefs.edit().putStringSet(ownerKey, ids).apply();
  }
}
`;
}

function meditrackAlarmReceiverJava() {
  return `package ${ALARM_PACKAGE};

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.os.Build;

public class MeditrackAlarmReceiver extends BroadcastReceiver {
  private static final String CHANNEL_ID = "meditrack_fullscreen_alarm_v1";

  @Override
  public void onReceive(Context context, Intent intent) {
    String alarmId = intent.getStringExtra("alarmId");
    String ownerKey = intent.getStringExtra("ownerKey");
    String title = intent.getStringExtra("title");
    String body = intent.getStringExtra("body");
    long triggerAt = intent.getLongExtra("triggerAt", System.currentTimeMillis());
    String dataJson = intent.getStringExtra("dataJson");

    if (alarmId == null) alarmId = "alarm";
    if (ownerKey == null) ownerKey = "owner";
    if (title == null || title.length() == 0) title = "Hora do medicamento";
    if (body == null || body.length() == 0) body = "Está na hora de tomar o remédio.";
    if (dataJson == null) dataJson = "{}";

    MeditrackAlarmScheduler.removeAlarm(context, ownerKey, alarmId);
    ensureChannel(context);

    Intent fullScreenIntent = new Intent(context, MeditrackAlarmActivity.class);
    fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    fullScreenIntent.putExtra("alarmId", alarmId);
    fullScreenIntent.putExtra("ownerKey", ownerKey);
    fullScreenIntent.putExtra("title", title);
    fullScreenIntent.putExtra("body", body);
    fullScreenIntent.putExtra("triggerAt", triggerAt);
    fullScreenIntent.putExtra("dataJson", dataJson);

    PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
      context,
      alarmId.hashCode(),
      fullScreenIntent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );

    Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
      ? new Notification.Builder(context, CHANNEL_ID)
      : new Notification.Builder(context);

    builder
      .setSmallIcon(context.getApplicationInfo().icon)
      .setContentTitle(title)
      .setContentText(body)
      .setColor(Color.rgb(11, 57, 84))
      .setPriority(Notification.PRIORITY_MAX)
      .setCategory(Notification.CATEGORY_ALARM)
      .setOngoing(true)
      .setAutoCancel(false)
      .setFullScreenIntent(fullScreenPendingIntent, true)
      .setContentIntent(fullScreenPendingIntent);

    NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager != null) {
      manager.notify(alarmId.hashCode(), builder.build());
    }

    try {
      context.startActivity(fullScreenIntent);
    } catch (Exception ignored) {
      // Android may block background activity starts; the full-screen notification still remains.
    }
  }

  private void ensureChannel(Context context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }

    NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) {
      return;
    }

    NotificationChannel channel = new NotificationChannel(
      CHANNEL_ID,
      "Alarmes tela cheia de medicamentos",
      NotificationManager.IMPORTANCE_HIGH
    );
    channel.setDescription("Mostra o alarme do medicamento em tela cheia.");
    channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
    channel.enableVibration(true);
    channel.setVibrationPattern(new long[] {0, 700, 250, 700, 250, 700});
    channel.setBypassDnd(true);
    channel.setSound(
      android.provider.Settings.System.DEFAULT_ALARM_ALERT_URI,
      new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
    );
    manager.createNotificationChannel(channel);
  }
}
`;
}

function meditrackAlarmActivityJava() {
  return `package ${ALARM_PACKAGE};

import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Gravity;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.net.URLEncoder;
import org.json.JSONObject;

public class MeditrackAlarmActivity extends Activity {
  private Ringtone ringtone;
  private Vibrator vibrator;
  private String alarmId;
  private String ownerKey;
  private String title;
  private String body;
  private long triggerAt;
  private String dataJson;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setupWindow();
    readIntent();
    startAlarmFeedback();
    render();
  }

  @Override
  protected void onDestroy() {
    stopAlarmFeedback();
    super.onDestroy();
  }

  private void setupWindow() {
    Window window = getWindow();
    window.addFlags(
      WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
      WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
      WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
      WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
    );

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true);
      setTurnScreenOn(true);
    }
  }

  private void readIntent() {
    Intent intent = getIntent();
    alarmId = intent.getStringExtra("alarmId");
    ownerKey = intent.getStringExtra("ownerKey");
    title = intent.getStringExtra("title");
    body = intent.getStringExtra("body");
    triggerAt = intent.getLongExtra("triggerAt", System.currentTimeMillis());
    dataJson = intent.getStringExtra("dataJson");

    if (alarmId == null) alarmId = "alarm";
    if (ownerKey == null) ownerKey = "owner";
    if (title == null || title.length() == 0) title = "Hora do medicamento";
    if (body == null || body.length() == 0) body = "Está na hora de tomar o remédio.";
    if (dataJson == null) dataJson = "{}";
  }

  private void render() {
    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setGravity(Gravity.CENTER);
    root.setPadding(42, 42, 42, 42);
    root.setBackgroundColor(Color.rgb(6, 38, 58));

    TextView titleView = text(title, 30, true, Color.WHITE);
    TextView bodyView = text(body, 22, false, Color.rgb(214, 238, 247));
    TextView timeView = text("Agendado: " + android.text.format.DateFormat.format("dd/MM/yyyy HH:mm", triggerAt), 18, false, Color.rgb(170, 213, 229));

    Button tomar = new Button(this);
    tomar.setText("Tomar");
    tomar.setTextSize(20);
    tomar.setAllCaps(false);
    tomar.setOnClickListener((view) -> tomarDose());

    Button adiar = new Button(this);
    adiar.setText("Adiar 5 min");
    adiar.setTextSize(20);
    adiar.setAllCaps(false);
    adiar.setOnClickListener((view) -> adiarDose());

    root.addView(titleView, params(0, 0, 0, 16));
    root.addView(bodyView, params(0, 0, 0, 16));
    root.addView(timeView, params(0, 0, 0, 32));
    root.addView(tomar, params(0, 0, 0, 14));
    root.addView(adiar, params(0, 0, 0, 0));
    setContentView(root);
  }

  private TextView text(String value, int size, boolean bold, int color) {
    TextView text = new TextView(this);
    text.setText(value);
    text.setTextSize(size);
    text.setTextColor(color);
    text.setGravity(Gravity.CENTER);
    if (bold) text.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
    return text;
  }

  private LinearLayout.LayoutParams params(int left, int top, int right, int bottom) {
    LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.WRAP_CONTENT
    );
    params.setMargins(left, top, right, bottom);
    return params;
  }

  private void tomarDose() {
    stopAlarmFeedback();
    cancelNotification();

    try {
      JSONObject data = new JSONObject(dataJson);
      Uri.Builder uri = new Uri.Builder()
        .scheme("meditrack")
        .authority("dose-action")
        .path("tomar");

      String[] keys = new String[] {"source", "uid", "caregiverUid", "elderlyUid", "elderlyName", "historicoId", "medId", "previstoPara", "nomeMed"};
      for (String key : keys) {
        if (data.has(key) && !data.isNull(key)) {
          uri.appendQueryParameter(key, String.valueOf(data.get(key)));
        }
      }

      Intent intent = new Intent(Intent.ACTION_VIEW, uri.build());
      intent.setPackage(getPackageName());
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
      startActivity(intent);
    } catch (Exception ignored) {
    }

    finish();
  }

  private void adiarDose() {
    stopAlarmFeedback();
    cancelNotification();
    MeditrackAlarmScheduler.schedule(
      this,
      alarmId + ":snooze:" + System.currentTimeMillis(),
      ownerKey,
      title,
      body,
      System.currentTimeMillis() + 5 * 60 * 1000,
      dataJson
    );
    finish();
  }

  private void startAlarmFeedback() {
    try {
      Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
      if (alarmUri == null) {
        alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
      }
      ringtone = RingtoneManager.getRingtone(this, alarmUri);
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        ringtone.setAudioAttributes(
          new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        );
      }
      ringtone.play();
    } catch (Exception ignored) {
    }

    try {
      vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
      long[] pattern = new long[] {0, 800, 250, 800, 250, 800};
      if (vibrator != null) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
        } else {
          vibrator.vibrate(pattern, 0);
        }
      }
    } catch (Exception ignored) {
    }
  }

  private void stopAlarmFeedback() {
    try {
      if (ringtone != null && ringtone.isPlaying()) {
        ringtone.stop();
      }
    } catch (Exception ignored) {
    }

    try {
      if (vibrator != null) {
        vibrator.cancel();
      }
    } catch (Exception ignored) {
    }
  }

  private void cancelNotification() {
    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager != null) {
      manager.cancel(alarmId.hashCode());
    }
  }
}
`;
}

function alarmStylesXml() {
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <style name="Theme.Meditrack.Alarm" parent="@android:style/Theme.Material.NoActionBar">
    <item name="android:windowNoTitle">true</item>
    <item name="android:windowActionBar">false</item>
    <item name="android:windowShowWallpaper">true</item>
    <item name="android:windowFullscreen">true</item>
    <item name="android:windowIsTranslucent">false</item>
    <item name="android:windowLightStatusBar">false</item>
    <item name="android:colorAccent">#1f6b75</item>
  </style>
</resources>
`;
}

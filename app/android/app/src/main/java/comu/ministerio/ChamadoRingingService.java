package comu.ministerio;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

public class ChamadoRingingService extends Service {
    public static final String ACTION_START = "comu.ministerio.action.START_RINGING";
    public static final String ACTION_STOP = "comu.ministerio.action.STOP_RINGING";
    public static final String EXTRA_TEXT = "texto";
    private static final String CHANNEL_ID = "acionamentos_urgentes";
    private static final long[] RING_PATTERN = new long[]{0, 1200, 400, 1200, 900};
    private final Handler handler = new Handler(Looper.getMainLooper());
    private MediaPlayer mediaPlayer;
    private boolean ringing = false;

    private final Runnable vibrationLoop = new Runnable() {
        @Override
        public void run() {
            if (!ringing) return;
            vibrarUmaVez();
            handler.postDelayed(this, 3300);
        }
    };

    public static void iniciar(Context context, String texto) {
        Intent intent = new Intent(context, ChamadoRingingService.class);
        intent.setAction(ACTION_START);
        intent.putExtra(EXTRA_TEXT, texto);
        ContextCompat.startForegroundService(context, intent);
    }

    public static void parar(Context context) {
        if (context == null) return;
        Intent intent = new Intent(context, ChamadoRingingService.class);
        intent.setAction(ACTION_STOP);
        try {
            context.startService(intent);
        } catch (Exception ignored) {
            ChamadoAlertaController.pararTudo(context);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;
        if (ACTION_STOP.equals(action)) {
            pararTudo();
            return START_NOT_STICKY;
        }

        String texto = intent != null ? intent.getStringExtra(EXTRA_TEXT) : null;
        if (texto == null || texto.trim().isEmpty()) {
            texto = "O Gestor solicitou sua atenção.";
        }

        createNotificationChannel();
        startForeground(ChamadoAlertaController.NOTIFICATION_ID, buildNotification(texto));
        iniciarToque();
        iniciarVibracao();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        pararToque();
        pararVibracao();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void iniciarToque() {
        pararToque();
        try {
            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            if (ringtoneUri == null) ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            mediaPlayer = MediaPlayer.create(this, ringtoneUri);
            if (mediaPlayer == null) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            }
            mediaPlayer.setLooping(true);
            mediaPlayer.start();
        } catch (Exception ignored) {
            mediaPlayer = null;
        }
    }

    private void iniciarVibracao() {
        pararVibracao();
        ringing = true;
        vibrationLoop.run();
    }

    private void vibrarUmaVez() {
        Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(RING_PATTERN, -1));
        } else {
            vibrator.vibrate(RING_PATTERN, -1);
        }
    }

    private void pararTudo() {
        stopForeground(true);
        pararToque();
        pararVibracao();
        ChamadoAlertaController.pararTudo(this);
        stopSelf();
    }

    private void pararToque() {
        if (mediaPlayer == null) return;
        try {
            if (mediaPlayer.isPlaying()) mediaPlayer.stop();
            mediaPlayer.release();
        } catch (Exception ignored) {
        } finally {
            mediaPlayer = null;
        }
    }

    private void pararVibracao() {
        ringing = false;
        handler.removeCallbacks(vibrationLoop);
        Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null) vibrator.cancel();
    }

    private android.app.Notification buildNotification(String texto) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openIntent.putExtra("acionamento_texto", texto);

        Intent stopIntent = new Intent(this, ChamadoStopReceiver.class);
        stopIntent.setAction(ACTION_STOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;

        PendingIntent openPendingIntent = PendingIntent.getActivity(this, 0, openIntent, flags);
        PendingIntent stopPendingIntent = PendingIntent.getBroadcast(this, 1, stopIntent, flags);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(getApplicationInfo().icon)
            .setContentTitle("Acionamento do Gestor")
            .setContentText(texto)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(texto))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(openPendingIntent)
            .setFullScreenIntent(openPendingIntent, true)
            .addAction(0, "OK", stopPendingIntent)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Acionamentos urgentes",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Avisos urgentes enviados pelo Gestor de Chamados.");
        channel.enableVibration(false);
        channel.setSound(null, null);
        channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(channel);
    }
}

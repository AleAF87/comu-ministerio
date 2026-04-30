package comu.ministerio;

import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;

public final class ChamadoAlertaController {
    public static final int NOTIFICATION_ID = 4101;
    private static final long[] RING_PATTERN = new long[]{0, 1200, 350, 1200, 900};
    private static final Handler HANDLER = new Handler(Looper.getMainLooper());
    private static boolean ringing = false;
    private static Context appContext;

    private static final Runnable RING_TASK = new Runnable() {
        @Override
        public void run() {
            if (!ringing || appContext == null) return;
            vibrateOnce(appContext);
            HANDLER.postDelayed(this, 3300);
        }
    };

    private ChamadoAlertaController() {}

    public static void iniciar(Context context) {
        if (context == null) return;
        appContext = context.getApplicationContext();
        pararVibracao(appContext);
        ringing = true;
        RING_TASK.run();
    }

    public static void pararTudo(Context context) {
        Context targetContext = context != null ? context.getApplicationContext() : appContext;
        ringing = false;
        HANDLER.removeCallbacks(RING_TASK);
        pararVibracao(targetContext);
        cancelarNotificacoes(targetContext);
    }

    private static void vibrateOnce(Context context) {
        Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(RING_PATTERN, -1));
        } else {
            vibrator.vibrate(RING_PATTERN, -1);
        }
    }

    private static void pararVibracao(Context context) {
        if (context == null) return;

        Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null) vibrator.cancel();
    }

    private static void cancelarNotificacoes(Context context) {
        if (context == null) return;

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.cancel(NOTIFICATION_ID);
            manager.cancelAll();
        }
    }
}

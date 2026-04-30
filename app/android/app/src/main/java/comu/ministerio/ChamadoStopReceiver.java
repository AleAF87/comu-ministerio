package comu.ministerio;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class ChamadoStopReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        ChamadoRingingService.parar(context);
        ChamadoAlertaController.pararTudo(context);
    }
}

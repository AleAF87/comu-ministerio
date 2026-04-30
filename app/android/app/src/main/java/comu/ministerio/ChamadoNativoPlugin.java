package comu.ministerio;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ChamadoNativo")
public class ChamadoNativoPlugin extends Plugin {
    @PluginMethod
    public void pararAcionamento(PluginCall call) {
        pararAcionamentoNativo(getContext());
        call.resolve();
    }

    @PluginMethod
    public void verificarOtimizacaoBateria(PluginCall call) {
        JSObject result = new JSObject();
        result.put("ignorandoOtimizacao", isIgnoringBatteryOptimizations(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void solicitarSegundoPlano(PluginCall call) {
        Context context = getContext();
        if (isIgnoringBatteryOptimizations(context)) {
            call.resolve();
            return;
        }

        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            getActivity().startActivity(intent);
        } catch (Exception error) {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            getActivity().startActivity(intent);
        }

        call.resolve();
    }

    @PluginMethod
    public void abrirConfiguracoesApp(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        getActivity().startActivity(intent);
        call.resolve();
    }

    public static void pararAcionamentoNativo(Context context) {
        ChamadoRingingService.parar(context);
        ChamadoAlertaController.pararTudo(context);
    }

    private static boolean isIgnoringBatteryOptimizations(Context context) {
        if (context == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;

        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        return powerManager == null || powerManager.isIgnoringBatteryOptimizations(context.getPackageName());
    }
}

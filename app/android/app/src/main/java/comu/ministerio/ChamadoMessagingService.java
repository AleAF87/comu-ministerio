package comu.ministerio;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class ChamadoMessagingService extends FirebaseMessagingService {
    @Override
    public void onMessageReceived(RemoteMessage message) {
        String tipo = message.getData().get("tipo");
        if (!"vibracao".equals(tipo)) {
            super.onMessageReceived(message);
            return;
        }

        String texto = message.getData().get("texto");
        if (texto == null || texto.trim().isEmpty()) {
            texto = "O Gestor solicitou sua atenção.";
        }

        ChamadoRingingService.iniciar(this, texto);
    }
}

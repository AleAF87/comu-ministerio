const admin = require("firebase-admin");
const functions = require("firebase-functions/v1");

admin.initializeApp();

exports.enviarAcionamentoPush = functions.database
  .ref("/acionamentos/{uid}/{acionamentoId}")
  .onCreate(async (snapshot, context) => {
    const { uid, acionamentoId } = context.params;
    const acionamento = snapshot.val() || {};
    const usuarioRef = admin.database().ref(`/usuarios/${uid}`);
    const usuarioSnapshot = await usuarioRef.get();
    const usuario = usuarioSnapshot.val() || {};
    const token = usuario.fcmToken;

    if (!token) {
      await snapshot.ref.update({
        pushStatus: "sem_token",
        pushErro: "Usuário sem token FCM registrado."
      });
      return null;
    }

    const texto = String(acionamento.texto || "O Gestor solicitou sua atenção.").slice(0, 800);

    try {
      await admin.messaging().send({
        token,
        data: {
          tipo: "vibracao",
          acionamentoId,
          uid,
          texto
        },
        android: {
          priority: "high",
          ttl: 60000
        }
      });

      await snapshot.ref.update({
        pushStatus: "enviado",
        pushEnviadoEm: admin.database.ServerValue.TIMESTAMP
      });
    } catch (error) {
      await snapshot.ref.update({
        pushStatus: "erro",
        pushErro: error.message || String(error)
      });
    }

    return null;
  });

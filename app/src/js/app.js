import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
  remove,
  onDisconnect,
  onValue,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { firebaseConfig, ministeriosPadrao } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getDatabase(app);
const capacitor = window.Capacitor;

const state = {
  user: null,
  profile: null,
  registerUser: null,
  authIntent: "login",
  ministerio: "",
  ministeriosByName: new Map(),
  children: [],
  selectedChild: null,
  profileListenerStarted: false,
  acionamentosListenerStarted: false,
  acionamentosUnsubscribe: null,
  mensagensListenerStarted: false,
  mensagensUnsubscribe: null,
  acionamentosRecebidos: new Set(),
  acionamentoAtivo: null,
  vibrationInterval: null,
  pushRegistered: false
};

const els = {
  loginView: document.querySelector("#loginView"),
  registerView: document.querySelector("#registerView"),
  pendingView: document.querySelector("#pendingView"),
  blockedView: document.querySelector("#blockedView"),
  selectMinisterioView: document.querySelector("#selectMinisterioView"),
  ministerioView: document.querySelector("#ministerioView"),
  messageArea: document.querySelector("#messageArea"),
  infantilArea: document.querySelector("#infantilArea"),
  logoutBtn: document.querySelector("#logoutBtn"),
  googleLoginBtn: document.querySelector("#googleLoginBtn"),
  openRegisterBtn: document.querySelector("#openRegisterBtn"),
  registerGoogleBtn: document.querySelector("#registerGoogleBtn"),
  googleAccountBox: document.querySelector("#googleAccountBox"),
  nomeInput: document.querySelector("#nomeInput"),
  telefoneInput: document.querySelector("#telefoneInput"),
  saveProfileBtn: document.querySelector("#saveProfileBtn"),
  backToLoginBtn: document.querySelector("#backToLoginBtn"),
  ministerioSelect: document.querySelector("#ministerioSelect"),
  enterBtn: document.querySelector("#enterBtn"),
  activeMinisterioTitle: document.querySelector("#activeMinisterioTitle"),
  switchMinisterioBtn: document.querySelector("#switchMinisterioBtn"),
  mensagemTexto: document.querySelector("#mensagemTexto"),
  sendMessageBtn: document.querySelector("#sendMessageBtn"),
  addChildBtn: document.querySelector("#addChildBtn"),
  childFormModal: document.querySelector("#childFormModal"),
  childNameInput: document.querySelector("#childNameInput"),
  saveChildBtn: document.querySelector("#saveChildBtn"),
  childrenList: document.querySelector("#childrenList"),
  sentPendingSection: document.querySelector("#sentPendingSection"),
  sentPendingList: document.querySelector("#sentPendingList"),
  callParentsModal: document.querySelector("#callParentsModal"),
  callParentsTitle: document.querySelector("#callParentsTitle"),
  callParentsSubtitle: document.querySelector("#callParentsSubtitle"),
  callParentsMessage: document.querySelector("#callParentsMessage"),
  sendCallParentsBtn: document.querySelector("#sendCallParentsBtn"),
  persistentAlertCard: document.querySelector("#persistentAlertCard"),
  persistentAlertText: document.querySelector("#persistentAlertText"),
  permissionsBanner: document.querySelector("#permissionsBanner"),
  permissionsBannerText: document.querySelector("#permissionsBannerText"),
  enablePushPermissionBtn: document.querySelector("#enablePushPermissionBtn"),
  enableBackgroundPermissionBtn: document.querySelector("#enableBackgroundPermissionBtn"),
  managerAlertModal: document.querySelector("#managerAlertModal"),
  managerAlertText: document.querySelector("#managerAlertText"),
  managerAlertOkBtn: document.querySelector("#managerAlertOkBtn"),
  toast: document.querySelector("#appToast")
};

const coresMinisterios = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#059669",
  "#0891b2",
  "#0284c7",
  "#4f46e5",
  "#9333ea",
  "#c026d3",
  "#be123c",
  "#475569"
];

const coresPadraoMinisterios = {
  "Ministério de Dança": "#7c3aed",
  "Ministério Infantil": "#db2777",
  "Ministério Youth": "#2563eb",
  "Ministério ALVO": "#16a34a"
};

function escolherCorDisponivel(preferida, usadas) {
  if (preferida && !usadas.has(preferida)) {
    usadas.add(preferida);
    return preferida;
  }

  const corLivre = coresMinisterios.find((cor) => !usadas.has(cor)) || coresMinisterios[0];
  usadas.add(corLivre);
  return corLivre;
}

function show(view) {
  [
    els.loginView,
    els.registerView,
    els.pendingView,
    els.blockedView,
    els.selectMinisterioView,
    els.ministerioView
  ].forEach((el) => el.classList.add("hidden"));
  view.classList.remove("hidden");
  els.logoutBtn.classList.toggle("hidden", !state.user);
}

function toast(message, color = "success", duration = 2200) {
  els.toast.message = message;
  els.toast.color = color;
  els.toast.duration = duration;
  els.toast.present();
}

function populateMinisterios() {
  els.ministerioSelect.innerHTML = "";
  const ministerios = state.ministeriosByName.size
    ? Array.from(state.ministeriosByName.values()).map((item) => item.nome)
    : ministeriosPadrao;

  ministerios.forEach((nome) => {
    const option = document.createElement("ion-select-option");
    option.value = nome;
    option.textContent = nome;
    els.ministerioSelect.appendChild(option);
  });
}

async function ensureBaseMinisterios() {
  const updates = {};
  const snapshot = await get(ref(db, "ministerios"));
  const existentes = snapshot.val() || {};
  const coresUsadas = new Set(Object.values(existentes).filter((ministerio) => !ministerio?.removido).map((ministerio) => ministerio?.cor).filter(Boolean));

  ministeriosPadrao.forEach((nome, index) => {
    const key = nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .toLowerCase();
    if (existentes[key]?.removido) return;
    if (!existentes[key]) {
      const cor = escolherCorDisponivel(coresPadraoMinisterios[nome] || coresMinisterios[index % coresMinisterios.length], coresUsadas);
      updates[`ministerios/${key}`] = {
        nome,
        cor,
        ativo: true,
        criadoEm: serverTimestamp()
      };
    } else if (!existentes[key].cor) {
      updates[`ministerios/${key}/cor`] = escolherCorDisponivel(coresPadraoMinisterios[nome] || coresMinisterios[index % coresMinisterios.length], coresUsadas);
    }
  });
  if (Object.keys(updates).length) await update(ref(db), updates);
}

function observarMinisterios() {
  onValue(ref(db, "ministerios"), (snapshot) => {
    const ministerios = new Map();

    ministeriosPadrao.forEach((nome) => {
      const key = nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .toLowerCase();
      if (snapshot.child(key).val()?.removido) return;
      ministerios.set(nome, {
        nome,
        cor: coresPadraoMinisterios[nome] || coresMinisterios[0],
        ativo: true
      });
    });

    snapshot.forEach((item) => {
      const ministerio = item.val();
      if (ministerio?.removido) return;
      if (ministerio?.nome) {
        ministerios.set(ministerio.nome, {
          id: item.key,
          ...ministerio,
          cor: ministerio.cor || coresPadraoMinisterios[ministerio.nome] || coresMinisterios[0]
        });
      }
    });

    state.ministeriosByName = ministerios;
    populateMinisterios();
    if (state.ministerio) aplicarCorMinisterio();
  });
}

function corMinisterio(nome) {
  return state.ministeriosByName.get(nome)?.cor || coresPadraoMinisterios[nome] || coresMinisterios[0];
}

function aplicarCorMinisterio() {
  document.documentElement.style.setProperty("--ministerio-color", corMinisterio(state.ministerio));
}

async function getExistingUserProfile(user) {
  const snapshot = await get(ref(db, `usuarios/${user.uid}`));
  if (!snapshot.exists()) {
    throw new Error("Usuário não cadastrado. Use o botão Cadastrar primeiro.");
  }
  return snapshot.val();
}

function setRegisterFormEnabled(enabled) {
  els.nomeInput.disabled = !enabled;
  els.telefoneInput.disabled = !enabled;
  els.saveProfileBtn.disabled = !enabled;
}

function fillRegisterGoogleAccount(user) {
  state.registerUser = user;
  if (!els.nomeInput.value) els.nomeInput.value = user.displayName || "";
  els.googleAccountBox.innerHTML = `
    <div>
      <strong>Conta vinculada</strong>
      <p>${user.displayName || "Usuário Google"}</p>
      <p>${user.email || ""}</p>
    </div>
    <ion-button id="changeGoogleAccountBtn" fill="outline">Trocar conta</ion-button>
  `;
  document.querySelector("#changeGoogleAccountBtn")?.addEventListener("click", async () => {
    state.registerUser = null;
    await signOut(auth).catch(() => {});
    location.reload();
  });
  setRegisterFormEnabled(true);
}

function isNativeAndroidApp() {
  return capacitor?.getPlatform?.() === "android" || capacitor?.isNativePlatform?.();
}

async function signInWithGoogle() {
  const nativeAuth = capacitor?.Plugins?.FirebaseAuthentication;

  if (isNativeAndroidApp()) {
    if (!nativeAuth?.signInWithGoogle) {
      throw new Error("Instale e sincronize o plugin de autenticação nativa do Firebase para entrar pelo Android.");
    }

    const result = await nativeAuth.signInWithGoogle();
    const idToken = result?.credential?.idToken;
    const accessToken = result?.credential?.accessToken;

    if (!idToken && !accessToken) {
      throw new Error("O Google não retornou credenciais para concluir o login.");
    }

    const credential = GoogleAuthProvider.credential(idToken || null, accessToken || null);
    return signInWithCredential(auth, credential);
  }

  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    if (
      error.code === "auth/popup-blocked" ||
      error.code === "auth/popup-closed-by-user" ||
      error.code === "auth/operation-not-supported-in-this-environment"
    ) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

async function configurarPushNotifications(uid) {
  const pushNotifications = capacitor?.Plugins?.PushNotifications;
  if (!isNativeAndroidApp() || !pushNotifications) return;
  await atualizarAvisoPermissoes();
  if (state.pushRegistered) return;

  state.pushRegistered = true;

  await pushNotifications.createChannel?.({
    id: "acionamentos_urgentes",
    name: "Acionamentos urgentes",
    description: "Avisos urgentes enviados pelo Gestor de Chamados.",
    importance: 5,
    visibility: 1,
    lights: true,
    lightColor: "#ef4444",
    vibration: true
  }).catch(() => {});

  await pushNotifications.addListener("registration", async (token) => {
    if (!token?.value || !state.user?.uid) return;
    await update(ref(db, `usuarios/${state.user.uid}`), {
      fcmToken: token.value,
      fcmTokenAtualizadoEm: serverTimestamp(),
      notificacoesBloqueadas: false
    }).catch(() => {});
  });

  await pushNotifications.addListener("registrationError", (error) => {
    toast(`Erro ao registrar notificações: ${error.error || "verifique as permissões."}`, "warning");
  });

  await pushNotifications.addListener("pushNotificationReceived", (notification) => {
    const data = notification.data || {};
    if (data.tipo !== "vibracao") return;
    processarAcionamento({
      id: data.acionamentoId || String(Date.now()),
      texto: data.texto || notification.body || "O Gestor solicitou sua atenção.",
      status: "enviado"
    });
  });

  await pushNotifications.addListener("pushNotificationActionPerformed", () => {
    if (state.acionamentoAtivo) els.managerAlertModal.present();
  });

  let permissao = await pushNotifications.checkPermissions();
  if (permissao.receive === "prompt" || permissao.receive === "prompt-with-rationale") {
    permissao = await pushNotifications.requestPermissions();
  }

  if (permissao.receive === "granted") {
    await pushNotifications.register();
    await solicitarPermissaoSegundoPlano();
  } else {
    await update(ref(db, `usuarios/${uid}`), {
      notificacoesBloqueadas: true,
      notificacoesBloqueadasEm: serverTimestamp()
    }).catch(() => {});
    toast("Permita notificações para receber acionamentos com o celular bloqueado.", "warning");
  }

  await atualizarAvisoPermissoes();
}

async function verificarPermissoesAcionamento() {
  if (!isNativeAndroidApp()) return { native: false, push: "granted", segundoPlano: true };

  const chamadoNativo = capacitor?.Plugins?.ChamadoNativo;
  const pushNotifications = capacitor?.Plugins?.PushNotifications;
  const push = await pushNotifications?.checkPermissions?.().catch(() => null);
  const bateria = await chamadoNativo?.verificarOtimizacaoBateria?.().catch(() => null);

  return {
    native: true,
    push: push?.receive || "prompt",
    segundoPlano: Boolean(bateria?.ignorandoOtimizacao)
  };
}

async function atualizarAvisoPermissoes() {
  const status = await verificarPermissoesAcionamento();
  if (!status.native) {
    els.permissionsBanner.classList.add("hidden");
    return;
  }

  const precisaPush = status.push !== "granted";
  const precisaSegundoPlano = !status.segundoPlano;
  const pendencias = [];
  if (precisaPush) pendencias.push("notificações");
  if (precisaSegundoPlano) pendencias.push("segundo plano");

  els.enablePushPermissionBtn.classList.toggle("hidden", !precisaPush);
  els.enableBackgroundPermissionBtn.classList.toggle("hidden", !precisaSegundoPlano);
  els.permissionsBanner.classList.toggle("hidden", pendencias.length === 0);
  els.permissionsBannerText.textContent = pendencias.length
    ? `Libere ${pendencias.join(" e ")} para receber chamados com a tela bloqueada.`
    : "";
}

async function solicitarPermissaoSegundoPlano(force = false) {
  const chamadoNativo = capacitor?.Plugins?.ChamadoNativo;
  if (!isNativeAndroidApp() || !chamadoNativo?.solicitarSegundoPlano) return;
  if (!force && localStorage.getItem("comuMinisterioSegundoPlanoSolicitado") === "sim") return;

  const status = await chamadoNativo.verificarOtimizacaoBateria?.().catch(() => null);
  if (status?.ignorandoOtimizacao) {
    localStorage.setItem("comuMinisterioSegundoPlanoSolicitado", "sim");
    await atualizarAvisoPermissoes();
    return;
  }

  toast("Permita o funcionamento em segundo plano para receber acionamentos com a tela bloqueada.", "warning");
  await chamadoNativo.solicitarSegundoPlano().catch(() => {});
  localStorage.setItem("comuMinisterioSegundoPlanoSolicitado", "sim");
  setTimeout(atualizarAvisoPermissoes, 1000);
}

async function solicitarPermissaoNotificacoes() {
  const pushNotifications = capacitor?.Plugins?.PushNotifications;
  if (!isNativeAndroidApp() || !pushNotifications) return;

  let permissao = await pushNotifications.checkPermissions();
  if (permissao.receive !== "granted") {
    permissao = await pushNotifications.requestPermissions();
  }

  if (permissao.receive === "granted") {
    state.pushRegistered = false;
    await configurarPushNotifications(state.user?.uid);
  } else {
    toast("Se a permissão não aparecer mais, ative as notificações nas configurações do aplicativo.", "warning", 4200);
    await capacitor?.Plugins?.ChamadoNativo?.abrirConfiguracoesApp?.().catch(() => {});
  }

  await atualizarAvisoPermissoes();
}

function listenProfile(uid) {
  if (state.profileListenerStarted) return;
  state.profileListenerStarted = true;
  onValue(ref(db, `usuarios/${uid}`), (snapshot) => {
    state.profile = snapshot.val();
    routeByProfile();
  });
}

function listenAcionamentos(uid) {
  if (state.acionamentosListenerStarted) return;
  state.acionamentosListenerStarted = true;

  state.acionamentosUnsubscribe = onValue(ref(db, `acionamentos/${uid}`), (snapshot) => {
    snapshot.forEach((item) => {
      const acionamento = { id: item.key, ...item.val() };
      if (acionamento.status === "recebido" || state.acionamentosRecebidos.has(acionamento.id)) return;
      state.acionamentosRecebidos.add(acionamento.id);
      processarAcionamento(acionamento);
    });
  });
}

function listenMensagensEnviadas(uid) {
  if (state.mensagensListenerStarted) return;
  state.mensagensListenerStarted = true;

  state.mensagensUnsubscribe = onValue(ref(db, "mensagens"), (snapshot) => {
    const pendentes = [];
    snapshot.forEach((item) => {
      const mensagem = { id: item.key, ...item.val() };
      if (mensagem.uid === uid && mensagem.status !== "feito") pendentes.push(mensagem);
    });

    pendentes.sort((a, b) => (b.dataHora || 0) - (a.dataHora || 0));
    renderMensagensEnviadasPendentes(pendentes);
  });
}

function renderMensagensEnviadasPendentes(mensagens) {
  els.sentPendingList.innerHTML = "";
  els.sentPendingSection.classList.toggle("hidden", mensagens.length === 0);

  mensagens.forEach((mensagem) => {
    const card = document.createElement("article");
    card.className = "sent-pending-card";
    card.innerHTML = `
      <div class="sent-pending-head">
        <strong>${mensagem.tipo === "chamar_pais" ? "Chamado infantil" : "Mensagem enviada"}</strong>
        <span>Aguardando Gestor</span>
      </div>
      <p>${escapeHtml(mensagem.texto || "")}</p>
      <time>${formatDate(mensagem.dataHora)}</time>
    `;
    els.sentPendingList.appendChild(card);
  });
}

async function processarAcionamento(acionamento) {
  state.acionamentoAtivo = acionamento;
  const texto = acionamento.texto || "O Gestor solicitou sua atenção.";
  els.persistentAlertText.textContent = texto;
  els.managerAlertText.textContent = texto;
  els.persistentAlertCard.classList.remove("hidden");
  iniciarVibracaoPersistente();
}

function iniciarVibracaoPersistente() {
  pararVibracaoPersistente();
  vibrar();
  state.vibrationInterval = window.setInterval(vibrar, 1400);
}

function vibrar() {
  if ("vibrate" in navigator) {
    navigator.vibrate([800, 180, 800]);
  }
}

function pararVibracaoPersistente() {
  if (state.vibrationInterval) {
    window.clearInterval(state.vibrationInterval);
    state.vibrationInterval = null;
  }

  if ("vibrate" in navigator) {
    navigator.vibrate(0);
  }

  capacitor?.Plugins?.PushNotifications?.removeAllDeliveredNotifications?.().catch(() => {});
  capacitor?.Plugins?.ChamadoNativo?.pararAcionamento?.().catch(() => {});
}

async function confirmarAcionamento() {
  const acionamento = state.acionamentoAtivo;
  if (!acionamento) return;

  pararVibracaoPersistente();
  els.persistentAlertCard.classList.add("hidden");
  await els.managerAlertModal.dismiss();

  await update(ref(db, `acionamentos/${state.user.uid}/${acionamento.id}`), {
    status: "recebido",
    recebidoEm: serverTimestamp()
  }).catch(() => {});
  state.acionamentoAtivo = null;
}

function routeByProfile() {
  const profile = state.profile;
  if (!state.user || !profile) {
    show(els.loginView);
    return;
  }

  if (profile.statusCadastro === "bloqueado") {
    show(els.blockedView);
    return;
  }

  if (!profile.nome || !profile.telefone) {
    els.nomeInput.value = profile.nome || state.user.displayName || "";
    els.telefoneInput.value = profile.telefone || "";
    state.registerUser = state.user;
    fillRegisterGoogleAccount(state.user);
    show(els.registerView);
    return;
  }

  if (!profile.aprovado) {
    show(els.pendingView);
    return;
  }

  if (!state.ministerio) {
    show(els.selectMinisterioView);
    return;
  }

  showMinisterio();
}

async function registrarOnline() {
  if (!state.user || !state.profile || !state.ministerio) return;
  const onlineRef = ref(db, `usuariosOnline/${state.user.uid}`);
  await set(onlineRef, {
    uid: state.user.uid,
    nome: state.profile.nome,
    telefone: state.profile.telefone,
    ministerio: state.ministerio,
    status: "online",
    ultimoAcesso: serverTimestamp()
  });
  onDisconnect(onlineRef).remove();
}

async function removerOnline() {
  if (!state.user) return;
  await remove(ref(db, `usuariosOnline/${state.user.uid}`));
}

function showMinisterio() {
  els.activeMinisterioTitle.textContent = state.ministerio;
  aplicarCorMinisterio();
  els.messageArea.classList.toggle("hidden", state.ministerio === "Ministério Infantil");
  els.infantilArea.classList.toggle("hidden", state.ministerio !== "Ministério Infantil");
  show(els.ministerioView);
}

async function sendMessage() {
  const texto = String(els.mensagemTexto.value || "").trim();
  if (!texto) {
    toast("Digite uma mensagem para enviar.", "warning");
    return;
  }

  await push(ref(db, "mensagens"), {
    uid: state.user.uid,
    nomeUsuario: state.profile.nome,
    ministerio: state.ministerio,
    tipo: "mensagem",
    texto,
    status: "pendente",
    dataHora: serverTimestamp()
  });

  els.mensagemTexto.value = "";
  toast("Mensagem enviada ao Gestor.");
}

function nextChildNumber() {
  return String(state.children.length + 1).padStart(2, "0");
}

function renderChildren() {
  els.childrenList.innerHTML = "";
  state.children.forEach((child) => {
    const button = document.createElement("button");
    button.className = "child-card";
    button.type = "button";
    button.textContent = child.nome ? `${child.numero} - ${child.nome}` : child.numero;
    button.addEventListener("click", () => openCallParents(child));
    els.childrenList.appendChild(button);
  });
}

function openCallParents(child) {
  state.selectedChild = child;
  els.callParentsTitle.textContent = `Criança ${child.numero}`;
  els.callParentsSubtitle.textContent = child.nome ? `${child.numero} - ${child.nome}` : child.numero;
  els.callParentsMessage.value = "";
  els.callParentsModal.present();
}

async function sendCallParents() {
  const child = state.selectedChild;
  if (!child) return;

  const customText = String(els.callParentsMessage.value || "").trim();
  const fallback = child.nome
    ? `Chamar os pais - ${child.nome}`
    : `Chamar os pais - Criança ${child.numero}`;

  await push(ref(db, "mensagens"), {
    uid: state.user.uid,
    nomeUsuario: state.profile.nome,
    ministerio: "Ministério Infantil",
    tipo: "chamar_pais",
    numeroCrianca: child.numero,
    nomeCrianca: child.nome || "",
    texto: customText || fallback,
    status: "pendente",
    dataHora: serverTimestamp()
  });

  els.callParentsModal.dismiss();
  toast("Chamado enviado ao Gestor.");
}

els.googleLoginBtn.addEventListener("click", async () => {
  try {
    state.authIntent = "login";
    await signInWithGoogle();
  } catch (error) {
    toast(`Erro ao entrar: ${error.message}`, "danger");
  }
});

els.openRegisterBtn.addEventListener("click", () => {
  state.authIntent = "register";
  state.registerUser = null;
  els.nomeInput.value = "";
  els.telefoneInput.value = "";
  setRegisterFormEnabled(false);
  show(els.registerView);
});

els.registerGoogleBtn.addEventListener("click", async () => {
  try {
    state.authIntent = "register";
    const credential = await signInWithGoogle();
    if (credential?.user) {
      fillRegisterGoogleAccount(credential.user);
      toast("Conta Google vinculada. Complete seus dados.");
    }
  } catch (error) {
    toast(`Não foi possível entrar com Google: ${error.message}`, "danger");
  }
});

els.saveProfileBtn.addEventListener("click", async () => {
  const nome = String(els.nomeInput.value || "").trim();
  const telefone = String(els.telefoneInput.value || "").trim();
  const user = state.registerUser || state.user;

  if (!user) {
    toast("Entre com Google antes de enviar.", "warning");
    return;
  }

  if (!nome || !telefone) {
    toast("Informe nome e telefone.", "warning");
    return;
  }

  const usuarioRef = ref(db, `usuarios/${user.uid}`);
  const snapshot = await get(usuarioRef);
  if (snapshot.exists() && snapshot.val()?.statusCadastro !== "incompleto") {
    toast("Este Google já possui cadastro. Use Entrar com Google ou aguarde aprovação.", "warning");
    return;
  }

  await set(usuarioRef, {
    uid: user.uid,
    nome,
    telefone,
    email: user.email || "",
    foto: user.photoURL || "",
    aprovado: false,
    statusCadastro: "pendente",
    criadoEm: snapshot.val()?.criadoEm || serverTimestamp(),
    ultimoAcesso: serverTimestamp()
  });

  state.profile = {
    uid: user.uid,
    nome,
    telefone,
    email: user.email || "",
    foto: user.photoURL || "",
    aprovado: false,
    statusCadastro: "pendente"
  };
  toast("Cadastro enviado para aprovação.");
  show(els.pendingView);
});

els.backToLoginBtn.addEventListener("click", async () => {
  state.authIntent = "login";
  state.registerUser = null;
  await signOut(auth).catch(() => {});
  show(els.loginView);
});

els.enterBtn.addEventListener("click", async () => {
  state.ministerio = els.ministerioSelect.value;
  if (!state.ministerio) {
    toast("Escolha um ministério.", "warning");
    return;
  }
  await registrarOnline();
  showMinisterio();
});

els.switchMinisterioBtn.addEventListener("click", async () => {
  await removerOnline();
  state.ministerio = "";
  show(els.selectMinisterioView);
});

els.sendMessageBtn.addEventListener("click", sendMessage);

els.addChildBtn.addEventListener("click", () => {
  els.childNameInput.value = "";
  els.childFormModal.present();
  setTimeout(() => els.childNameInput.setFocus(), 250);
});

document.querySelector("[data-close-child-form]").addEventListener("click", () => els.childFormModal.dismiss());
document.querySelector("[data-close-call-modal]").addEventListener("click", () => els.callParentsModal.dismiss());

els.persistentAlertCard.addEventListener("click", () => {
  if (state.acionamentoAtivo) els.managerAlertModal.present();
});

els.enablePushPermissionBtn.addEventListener("click", solicitarPermissaoNotificacoes);
els.enableBackgroundPermissionBtn.addEventListener("click", () => solicitarPermissaoSegundoPlano(true));
els.managerAlertOkBtn.addEventListener("click", confirmarAcionamento);

els.saveChildBtn.addEventListener("click", () => {
  const child = {
    numero: nextChildNumber(),
    nome: String(els.childNameInput.value || "").trim()
  };
  state.children.push(child);
  renderChildren();
  els.childFormModal.dismiss();
});

els.sendCallParentsBtn.addEventListener("click", sendCallParents);

els.logoutBtn.addEventListener("click", async () => {
  await removerOnline();
  state.ministerio = "";
  await signOut(auth);
});

window.addEventListener("pagehide", removerOnline);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (state.ministerio) registrarOnline();
    atualizarAvisoPermissoes();
  }
});

getRedirectResult(auth).catch(() => {});
populateMinisterios();
ensureBaseMinisterios().catch(() => {});
observarMinisterios();

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  state.profileListenerStarted = false;

  if (!user) {
    state.profile = null;
    state.ministerio = "";
    state.acionamentosRecebidos.clear();
    state.acionamentosUnsubscribe?.();
    state.acionamentosUnsubscribe = null;
    state.acionamentosListenerStarted = false;
    state.mensagensUnsubscribe?.();
    state.mensagensUnsubscribe = null;
    state.mensagensListenerStarted = false;
    state.acionamentoAtivo = null;
    state.pushRegistered = false;
    els.persistentAlertCard.classList.add("hidden");
    els.sentPendingSection.classList.add("hidden");
    els.sentPendingList.innerHTML = "";
    els.permissionsBanner.classList.add("hidden");
    pararVibracaoPersistente();
    show(els.loginView);
    return;
  }

  try {
    if (state.authIntent === "register") {
      fillRegisterGoogleAccount(user);
      show(els.registerView);
      return;
    }

    state.profile = await getExistingUserProfile(user);
    listenProfile(user.uid);
    listenAcionamentos(user.uid);
    listenMensagensEnviadas(user.uid);
    await configurarPushNotifications(user.uid);
    await update(ref(db, `usuarios/${user.uid}`), { ultimoAcesso: serverTimestamp() });
    routeByProfile();
  } catch (error) {
    toast(`Erro ao carregar cadastro: ${error.message}`, "danger");
    await signOut(auth).catch(() => {});
    show(els.loginView);
  }
});

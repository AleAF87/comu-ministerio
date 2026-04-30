import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getDatabase,
  ref,
  child,
  get,
  onValue,
  push,
  set,
  update,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { firebaseConfig, ministeriosPadrao } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getDatabase(app);

const els = {
  loginView: document.querySelector("#loginView"),
  registerView: document.querySelector("#registerView"),
  pendingView: document.querySelector("#pendingView"),
  dashboardView: document.querySelector("#dashboardView"),
  googleLoginBtn: document.querySelector("#googleLoginBtn"),
  googleRegisterBtn: document.querySelector("#googleRegisterBtn"),
  registerGoogleAuthBtn: document.querySelector("#registerGoogleAuthBtn"),
  googleAccountBox: document.querySelector("#googleAccountBox"),
  gestorSignupForm: document.querySelector("#gestorSignupForm"),
  gestorSignupFieldset: document.querySelector("#gestorSignupFieldset"),
  cadastroNome: document.querySelector("#cadastroNome"),
  cadastroTelefone: document.querySelector("#cadastroTelefone"),
  submitSignupBtn: document.querySelector("#submitSignupBtn"),
  backToLoginBtn: document.querySelector("#backToLoginBtn"),
  signupAlert: document.querySelector("#signupAlert"),
  loginAlert: document.querySelector("#loginAlert"),
  pendingLogoutBtn: document.querySelector("#pendingLogoutBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  enableNotificationsBtn: document.querySelector("#enableNotificationsBtn"),
  bannerNotificationsBtn: document.querySelector("#bannerNotificationsBtn"),
  notificationsBanner: document.querySelector("#notificationsBanner"),
  gestorNome: document.querySelector("#gestorNome"),
  mensagensList: document.querySelector("#mensagensList"),
  emptyMensagens: document.querySelector("#emptyMensagens"),
  pendingCount: document.querySelector("#pendingCount"),
  ultimasMensagensList: document.querySelector("#ultimasMensagensList"),
  emptyUltimasMensagens: document.querySelector("#emptyUltimasMensagens"),
  onlineList: document.querySelector("#onlineList"),
  emptyOnline: document.querySelector("#emptyOnline"),
  onlineCount: document.querySelector("#onlineCount"),
  usuariosPendentesList: document.querySelector("#usuariosPendentesList"),
  emptyUsuariosPendentes: document.querySelector("#emptyUsuariosPendentes"),
  gestoresPendentesList: document.querySelector("#gestoresPendentesList"),
  emptyGestoresPendentes: document.querySelector("#emptyGestoresPendentes"),
  ministerioForm: document.querySelector("#ministerioForm"),
  ministerioNomeInput: document.querySelector("#ministerioNomeInput"),
  ministerioCorInput: document.querySelector("#ministerioCorInput"),
  ministeriosList: document.querySelector("#ministeriosList"),
  textoRapidoForm: document.querySelector("#textoRapidoForm"),
  textoRapidoInput: document.querySelector("#textoRapidoInput"),
  textosRapidosList: document.querySelector("#textosRapidosList"),
  emptyTextosRapidos: document.querySelector("#emptyTextosRapidos"),
  acionamentoUsuario: document.querySelector("#acionamentoUsuario"),
  acionamentoTextoRapido: document.querySelector("#acionamentoTextoRapido"),
  acionamentoTextoLivre: document.querySelector("#acionamentoTextoLivre"),
  acionamentoAlert: document.querySelector("#acionamentoAlert"),
  enviarAcionamentoBtn: document.querySelector("#enviarAcionamentoBtn"),
  notifySound: document.querySelector("#notifySound"),
  feitoBtn: document.querySelector("#feitoBtn")
};

const modalEl = document.querySelector("#mensagemModal");
const mensagemModal = new bootstrap.Modal(modalEl);
const acionamentoModal = new bootstrap.Modal(document.querySelector("#acionamentoModal"));
let mensagemSelecionada = null;
let pessoaAcionamento = null;
let primeiraCargaMensagens = true;
let ultimoTotalPendente = 0;
let authIntent = "login";
let registerUser = null;
let ministeriosCache = [];
let usuariosOnlineCache = [];
let ministerioCorPorNome = new Map();
let textosRapidosCache = [];

const coresMinisterios = [
  { nome: "Azul royal", valor: "#2563eb" },
  { nome: "Violeta", valor: "#7c3aed" },
  { nome: "Rosa intenso", valor: "#db2777" },
  { nome: "Vermelho", valor: "#dc2626" },
  { nome: "Laranja", valor: "#ea580c" },
  { nome: "Dourado", valor: "#ca8a04" },
  { nome: "Verde", valor: "#16a34a" },
  { nome: "Verde água", valor: "#059669" },
  { nome: "Ciano", valor: "#0891b2" },
  { nome: "Azul céu", valor: "#0284c7" },
  { nome: "Índigo", valor: "#4f46e5" },
  { nome: "Roxo", valor: "#9333ea" },
  { nome: "Magenta", valor: "#c026d3" },
  { nome: "Cereja", valor: "#be123c" },
  { nome: "Ardósia", valor: "#475569" }
];

const valoresCoresMinisterios = coresMinisterios.map((cor) => cor.valor);

const coresPadraoMinisterios = {
  "Ministério de Dança": "#7c3aed",
  "Ministério Infantil": "#db2777",
  "Ministério Youth": "#2563eb",
  "Ministério ALVO": "#16a34a"
};

const showOnly = (view) => {
  [els.loginView, els.registerView, els.pendingView, els.dashboardView].forEach((el) => el.classList.add("d-none"));
  view.classList.remove("d-none");
};

const showLoginAlert = (message, type = "danger") => {
  els.loginAlert.textContent = message;
  els.loginAlert.className = `alert alert-${type} mt-3`;
};

const showSignupAlert = (message, type = "info") => {
  els.signupAlert.innerHTML = message;
  els.signupAlert.className = `alert alert-${type} mt-4`;
};

const setSignupEnabled = (enabled) => {
  els.gestorSignupFieldset.disabled = !enabled;
  els.submitSignupBtn.disabled = !enabled;
};

const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

const formatTelefone = (value) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatDate = (value) => {
  if (!value) return "Agora";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
}[char]));

const normalizeKey = (name) => name
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "")
  .toLowerCase();

const corMinisterio = (nome) => ministerioCorPorNome.get(nome) || coresPadraoMinisterios[nome] || valoresCoresMinisterios[0];

function escolherCorDisponivel(preferida, usadas) {
  if (preferida && !usadas.has(preferida)) {
    usadas.add(preferida);
    return preferida;
  }

  const corLivre = valoresCoresMinisterios.find((cor) => !usadas.has(cor)) || valoresCoresMinisterios[0];
  usadas.add(corLivre);
  return corLivre;
}

function renderColorOptions(select, selectedColor = "", disabledColors = new Set()) {
  select.innerHTML = '<option value="">⬚ Selecione uma cor</option>';
  coresMinisterios.forEach((cor) => {
    const option = document.createElement("option");
    option.value = cor.valor;
    option.textContent = `■ ${cor.nome}`;
    option.style.color = cor.valor;
    option.style.backgroundColor = "#111827";
    option.disabled = disabledColors.has(cor.valor) && cor.valor !== selectedColor;
    option.selected = cor.valor === selectedColor;
    select.appendChild(option);
  });
}

function atualizarOpcoesFormularioMinisterio() {
  const usadas = new Set(ministeriosCache.map((ministerio) => ministerio.cor).filter(Boolean));
  renderColorOptions(els.ministerioCorInput, "", usadas);
  atualizarPreviewCor(els.ministerioCorInput);
}

function atualizarPreviewCor(select) {
  const preview = select.closest(".color-select-wrap")?.querySelector(".color-preview");
  if (preview) preview.style.setProperty("--preview-color", select.value || "transparent");
}

async function existeGestorAprovado() {
  const gestoresSnap = await get(ref(db, "gestores"));
  return Object.values(gestoresSnap.val() || {}).some((gestor) => gestor?.aprovado === true);
}

async function garantirMinisteriosPadrao() {
  const snapshot = await get(ref(db, "ministerios"));
  const existentes = snapshot.val() || {};
  const updates = {};
  const coresUsadas = new Set(Object.values(existentes).filter((ministerio) => !ministerio?.removido).map((ministerio) => ministerio?.cor).filter(Boolean));

  ministeriosPadrao.forEach((nome, index) => {
    const key = normalizeKey(nome);
    if (existentes[key]?.removido) return;
    if (!existentes[key]) {
      const cor = escolherCorDisponivel(coresPadraoMinisterios[nome] || valoresCoresMinisterios[index % valoresCoresMinisterios.length], coresUsadas);
      updates[`ministerios/${key}`] = {
        nome,
        cor,
        ativo: true,
        criadoEm: serverTimestamp()
      };
    } else if (!existentes[key].cor) {
      updates[`ministerios/${key}/cor`] = escolherCorDisponivel(coresPadraoMinisterios[nome] || valoresCoresMinisterios[index % valoresCoresMinisterios.length], coresUsadas);
    }
  });

  if (Object.keys(updates).length) {
    await update(ref(db), updates);
  }
}

async function ensureGestorProfile(user, allowCreate = false) {
  const gestorRef = ref(db, `gestores/${user.uid}`);
  const gestorSnap = await get(gestorRef);
  if (gestorSnap.exists()) return gestorSnap.val();

  if (!allowCreate) {
    throw new Error("Gestor não cadastrado. Use o botão Cadastrar primeiro.");
  }

  const primeiroGestor = !(await existeGestorAprovado());
  const perfil = {
    uid: user.uid,
    nome: user.displayName || "Gestor",
    email: user.email || "",
    foto: user.photoURL || "",
    papel: "gestor",
    aprovado: primeiroGestor,
    statusCadastro: primeiroGestor ? "aprovado" : "pendente",
    criadoEm: serverTimestamp(),
    ultimoAcesso: serverTimestamp()
  };

  await set(gestorRef, perfil);
  return perfil;
}

function fillRegisterGoogleAccount(user) {
  registerUser = user;
  if (!els.cadastroNome.value) els.cadastroNome.value = user.displayName || "";
  els.googleAccountBox.innerHTML = `
    <div>
      <span class="section-label">Conta vinculada</span>
      <p class="mb-0"><strong>${escapeHtml(user.displayName || "Usuário Google")}</strong></p>
      <p class="mb-0 text-muted">${escapeHtml(user.email || "")}</p>
    </div>
    <button id="changeGoogleAccountBtn" type="button" class="btn btn-outline-secondary">
      <i class="fas fa-rotate me-2"></i>Trocar conta
    </button>`;
  document.querySelector("#changeGoogleAccountBtn")?.addEventListener("click", async () => {
    registerUser = null;
    await signOut(auth).catch(() => {});
    location.reload();
  });
  setSignupEnabled(true);
}

async function submitGestorSignup(event) {
  event.preventDefault();
  const nome = els.cadastroNome.value.trim();
  const telefone = onlyDigits(els.cadastroTelefone.value);
  const invalid = [];

  document.querySelectorAll(".is-invalid").forEach((field) => field.classList.remove("is-invalid"));

  if (!registerUser) invalid.push("Entre com Google antes de enviar.");
  if (!nome) {
    invalid.push("Informe o nome completo.");
    els.cadastroNome.classList.add("is-invalid");
  }
  if (!telefone) {
    invalid.push("Informe o telefone.");
    els.cadastroTelefone.classList.add("is-invalid");
  }

  if (invalid.length) {
    showSignupAlert(`<div class="fw-semibold mb-2">Confira os campos:</div><ul class="mb-0 ps-3">${invalid.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`, "danger");
    return;
  }

  const gestorSnap = await get(ref(db, `gestores/${registerUser.uid}`));
  if (gestorSnap.exists()) {
    showSignupAlert("Este Google já possui cadastro de gestor. Use Entrar com Google ou aguarde aprovação.", "warning");
    return;
  }

  const primeiroGestor = !(await existeGestorAprovado());
  await set(ref(db, `gestores/${registerUser.uid}`), {
    uid: registerUser.uid,
    nome,
    telefone,
    email: registerUser.email || "",
    foto: registerUser.photoURL || "",
    papel: "gestor",
    aprovado: primeiroGestor,
    statusCadastro: primeiroGestor ? "aprovado" : "pendente",
    criadoEm: serverTimestamp(),
    ultimoAcesso: serverTimestamp()
  });

  if (primeiroGestor) {
    showSignupAlert("Cadastro criado e aprovado automaticamente por ser o primeiro gestor. Você será direcionado ao painel.", "success");
    authIntent = "login";
    iniciarPainel(registerUser);
    return;
  }

  await signOut(auth).catch(() => {});
  setSignupEnabled(false);
  showSignupAlert("Cadastro enviado com sucesso. Aguarde aprovação de um gestor.", "success");
}

function iniciarPainel(user) {
  els.gestorNome.textContent = user.displayName || user.email || "Gestor";
  showOnly(els.dashboardView);
  atualizarStatusNotificacoes();
  garantirMinisteriosPadrao();
  observarMensagens();
  observarOnline();
  observarAprovacoes();
  observarMinisterios();
  observarTextosRapidos();
}

function observarMensagens() {
  onValue(ref(db, "mensagens"), (snapshot) => {
    const todasMensagens = [];
    snapshot.forEach((item) => {
      const msg = { id: item.key, ...item.val() };
      todasMensagens.push(msg);
    });

    const mensagens = todasMensagens.filter((msg) => msg.status !== "feito");
    mensagens.sort((a, b) => {
      if ((a.status || "pendente") !== (b.status || "pendente")) return (a.status === "pendente" ? -1 : 1);
      return (b.dataHora || 0) - (a.dataHora || 0);
    });

    renderMensagens(mensagens);
    renderUltimasMensagens(todasMensagens);
    notificarNovasMensagens(mensagens);
  });
}

function renderMensagens(mensagens) {
  els.mensagensList.innerHTML = "";
  els.pendingCount.textContent = mensagens.length;
  els.emptyMensagens.classList.toggle("show", mensagens.length === 0);

  mensagens.forEach((msg) => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-xl-4";

    const infantil = msg.ministerio === "Ministério Infantil";
    col.innerHTML = `
      <article class="message-card color-card pending-blink" style="--ministerio-color: ${corMinisterio(msg.ministerio)}" tabindex="0" role="button">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <span class="badge badge-ministerio">${escapeHtml(msg.ministerio || "Ministério")}</span>
          <span class="badge text-bg-light border">${escapeHtml(msg.status || "pendente")}</span>
        </div>
        <h3 class="h5 mt-3 mb-1">${escapeHtml(msg.nomeUsuario || "Usuário")}</h3>
        <p class="message-text">${escapeHtml(msg.texto || "")}</p>
        <time class="small text-secondary">${formatDate(msg.dataHora)}</time>
      </article>
    `;

    const card = col.querySelector(".message-card");
    card.addEventListener("click", () => abrirMensagem(msg));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") abrirMensagem(msg);
    });
    els.mensagensList.appendChild(col);
  });
}

function renderUltimasMensagens(mensagens) {
  const ultimas = [...mensagens]
    .sort((a, b) => (b.dataHora || b.dataFeito || 0) - (a.dataHora || a.dataFeito || 0))
    .slice(0, 12);

  els.ultimasMensagensList.innerHTML = "";
  els.emptyUltimasMensagens.classList.toggle("show", ultimas.length === 0);

  ultimas.forEach((msg) => {
    const card = document.createElement("article");
    card.className = "ultima-mensagem-card color-card";
    card.style.setProperty("--ministerio-color", corMinisterio(msg.ministerio));
    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-2">
        <span class="badge badge-ministerio">${escapeHtml(msg.ministerio || "Ministério")}</span>
        <span class="badge ${msg.status === "feito" ? "text-bg-success" : "text-bg-warning"}">${escapeHtml(msg.status || "pendente")}</span>
      </div>
      <h4>${escapeHtml(msg.nomeUsuario || "Usuário")}</h4>
      <p>${escapeHtml(msg.texto || "")}</p>
      <time class="small text-secondary">${formatDate(msg.dataHora)}</time>
    `;
    els.ultimasMensagensList.appendChild(card);
  });
}

function notificarNovasMensagens(mensagens) {
  const total = mensagens.length;
  const houveNova = !primeiraCargaMensagens && total > ultimoTotalPendente;
  primeiraCargaMensagens = false;
  ultimoTotalPendente = total;
  document.title = total ? `(${total}) Comu Ministério` : "Comu Ministério | Gestor de Chamados";

  if (!houveNova) return;
  els.notifySound.play().catch(() => {});

  if ("Notification" in window && Notification.permission === "granted") {
    const msg = mensagens[0];
    new Notification("Nova mensagem recebida", {
      body: `${msg.ministerio}: ${msg.texto}`,
      tag: msg.id,
      requireInteraction: true,
      silent: false
    });
  }
}

function atualizarStatusNotificacoes() {
  if (!("Notification" in window)) {
    els.enableNotificationsBtn.textContent = "Notificações indisponíveis";
    els.enableNotificationsBtn.disabled = true;
    els.notificationsBanner.classList.remove("show");
    return;
  }

  const permission = Notification.permission;
  const precisaAtivar = permission !== "granted";
  els.notificationsBanner.classList.toggle("show", precisaAtivar);
  els.enableNotificationsBtn.classList.toggle("needs-attention", precisaAtivar);

  if (permission === "granted") {
    els.enableNotificationsBtn.textContent = "Notificações ativas";
    els.enableNotificationsBtn.className = "btn btn-success btn-sm fw-bold notification-cta";
    return;
  }

  if (permission === "denied") {
    els.enableNotificationsBtn.textContent = "Notificações bloqueadas";
    els.enableNotificationsBtn.className = "btn btn-danger btn-sm fw-bold notification-cta needs-attention";
    els.notificationsBanner.querySelector("p").textContent = "As notificações foram bloqueadas no navegador. Libere nas configurações do site para receber avisos no Windows.";
    return;
  }

  els.enableNotificationsBtn.textContent = "Ativar notificações";
  els.enableNotificationsBtn.className = "btn btn-warning btn-sm fw-bold notification-cta needs-attention";
  els.notificationsBanner.querySelector("p").textContent = "Assim o Gestor recebe um aviso mesmo com a tela minimizada ou fora de foco.";
}

async function solicitarNotificacoes() {
  if (!("Notification" in window)) return;
  await Notification.requestPermission();
  atualizarStatusNotificacoes();
}

function abrirMensagem(msg) {
  mensagemSelecionada = msg;
  document.querySelector("#modalMinisterio").textContent = msg.ministerio || "Ministério";
  document.querySelector("#modalUsuario").textContent = msg.nomeUsuario || "Usuário";
  document.querySelector("#modalTexto").textContent = msg.texto || "";
  document.querySelector("#modalHorario").textContent = `Recebida em ${formatDate(msg.dataHora)}`;

  const info = document.querySelector("#modalCriancaInfo");
  const temCrianca = Boolean(msg.numeroCrianca || msg.nomeCrianca);
  info.classList.toggle("d-none", !temCrianca);
  document.querySelector("#modalNumeroCrianca").textContent = msg.numeroCrianca || "-";
  document.querySelector("#modalNomeCrianca").textContent = msg.nomeCrianca || "-";
  mensagemModal.show();
}

function observarOnline() {
  onValue(ref(db, "usuariosOnline"), (snapshot) => {
    const pessoas = [];
    snapshot.forEach((item) => pessoas.push({ id: item.key, ...item.val() }));
    pessoas.sort((a, b) => (a.ministerio || "").localeCompare(b.ministerio || "") || (a.nome || "").localeCompare(b.nome || ""));
    usuariosOnlineCache = pessoas;
    renderOnline(pessoas);
    if (!els.ministeriosList.closest(".d-none")) renderMinisterios(ministeriosCache);
  });
}

function renderOnline(pessoas) {
  els.onlineList.innerHTML = "";
  els.onlineCount.textContent = pessoas.length;
  els.emptyOnline.classList.toggle("show", pessoas.length === 0);

  pessoas.forEach((pessoa) => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-xl-3";
    col.innerHTML = `
      <article class="online-card color-card" style="--ministerio-color: ${corMinisterio(pessoa.ministerio)}">
        <span class="badge badge-ministerio">${escapeHtml(pessoa.ministerio || "Ministério")}</span>
        <h3 class="h5 mt-3 mb-1">${escapeHtml(pessoa.nome || "Usuário")}</h3>
        <button class="btn btn-primary btn-sm mt-3" data-action="acionar">Acionar vibração</button>
      </article>
    `;
    col.querySelector('[data-action="acionar"]').addEventListener("click", () => abrirAcionamento(pessoa));
    els.onlineList.appendChild(col);
  });
}

function observarTextosRapidos() {
  onValue(ref(db, "textosRapidos"), (snapshot) => {
    const textos = [];
    snapshot.forEach((item) => textos.push({ id: item.key, ...item.val() }));
    textos.sort((a, b) => (a.texto || "").localeCompare(b.texto || ""));
    textosRapidosCache = textos;
    renderTextosRapidos(textos);
    popularSelectTextosRapidos();
  });
}

function renderTextosRapidos(textos) {
  els.textosRapidosList.innerHTML = "";
  els.emptyTextosRapidos.classList.toggle("show", textos.length === 0);

  textos.forEach((item) => {
    const card = document.createElement("article");
    card.className = "approval-card";
    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <h3 class="h6 mb-1">${escapeHtml(item.texto || "")}</h3>
          <p class="small text-secondary mb-0">Criado em ${formatDate(item.criadoEm)}</p>
        </div>
        <button class="btn btn-outline-danger btn-sm" type="button">Remover</button>
      </div>
    `;
    card.querySelector("button").addEventListener("click", () => set(ref(db, `textosRapidos/${item.id}`), null));
    els.textosRapidosList.appendChild(card);
  });
}

function popularSelectTextosRapidos() {
  const valorAtual = els.acionamentoTextoRapido.value;
  els.acionamentoTextoRapido.innerHTML = '<option value="">Nenhum texto rápido</option>';
  textosRapidosCache.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.texto || "";
    option.textContent = item.texto || "";
    els.acionamentoTextoRapido.appendChild(option);
  });
  els.acionamentoTextoRapido.value = valorAtual;
}

function abrirAcionamento(pessoa) {
  pessoaAcionamento = pessoa;
  els.acionamentoUsuario.textContent = `${pessoa.nome || "Usuário"} - ${pessoa.ministerio || "Ministério"}`;
  els.acionamentoTextoRapido.value = "";
  els.acionamentoTextoLivre.value = "";
  els.acionamentoAlert.classList.add("d-none");
  acionamentoModal.show();
}

async function enviarAcionamento() {
  if (!pessoaAcionamento?.uid) return;

  const textoRapido = els.acionamentoTextoRapido.value.trim();
  const textoLivre = els.acionamentoTextoLivre.value.trim();
  if (!textoRapido && !textoLivre) {
    els.acionamentoAlert.classList.remove("d-none");
    return;
  }

  const texto = [textoRapido, textoLivre].filter(Boolean).join("\n\n");
  await push(ref(db, `acionamentos/${pessoaAcionamento.uid}`), {
    uid: pessoaAcionamento.uid,
    nomeUsuario: pessoaAcionamento.nome || "",
    ministerio: pessoaAcionamento.ministerio || "",
    textoRapido,
    textoLivre,
    texto,
    tipo: "vibracao",
    status: "enviado",
    criadoEm: serverTimestamp(),
    criadoPor: auth.currentUser.uid,
    nomeGestor: auth.currentUser.displayName || auth.currentUser.email || "Gestor"
  });

  acionamentoModal.hide();
}

function observarAprovacoes() {
  onValue(ref(db, "usuarios"), (snapshot) => {
    const pendentes = [];
    snapshot.forEach((item) => {
      const usuario = { id: item.key, ...item.val() };
      if (!usuario.aprovado && usuario.statusCadastro !== "bloqueado") pendentes.push(usuario);
    });
    renderAprovacoes(els.usuariosPendentesList, els.emptyUsuariosPendentes, pendentes, "usuarios");
  });

  onValue(ref(db, "gestores"), (snapshot) => {
    const atual = auth.currentUser?.uid;
    const pendentes = [];
    snapshot.forEach((item) => {
      const gestor = { id: item.key, ...item.val() };
      if (!gestor.aprovado && gestor.uid !== atual && gestor.statusCadastro !== "bloqueado") pendentes.push(gestor);
    });
    renderAprovacoes(els.gestoresPendentesList, els.emptyGestoresPendentes, pendentes, "gestores");
  });
}

function renderAprovacoes(container, emptyEl, itens, path) {
  container.innerHTML = "";
  emptyEl.classList.toggle("show", itens.length === 0);

  itens.forEach((item) => {
    const card = document.createElement("article");
    card.className = "approval-card";
    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <h3 class="h5 mb-1">${escapeHtml(item.nome || item.email || "Cadastro")}</h3>
          <p class="text-secondary mb-1">${escapeHtml(item.email || item.telefone || "")}</p>
          <p class="small text-secondary mb-0">Criado em ${formatDate(item.criadoEm)}</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-success btn-sm" data-action="aprovar">Aprovar</button>
          <button class="btn btn-outline-danger btn-sm" data-action="bloquear">Bloquear</button>
        </div>
      </div>
    `;
    card.querySelector('[data-action="aprovar"]').addEventListener("click", () => update(ref(db, `${path}/${item.uid}`), {
      aprovado: true,
      statusCadastro: "aprovado",
      aprovadoEm: serverTimestamp(),
      aprovadoPor: auth.currentUser.uid
    }));
    card.querySelector('[data-action="bloquear"]').addEventListener("click", () => update(ref(db, `${path}/${item.uid}`), {
      aprovado: false,
      statusCadastro: "bloqueado",
      bloqueadoEm: serverTimestamp(),
      bloqueadoPor: auth.currentUser.uid
    }));
    container.appendChild(card);
  });
}

function observarMinisterios() {
  onValue(ref(db, "ministerios"), (snapshot) => {
    const ministeriosMap = new Map();

    ministeriosPadrao.forEach((nome) => {
      const id = normalizeKey(nome);
      if (snapshot.child(id).val()?.removido) return;
      ministeriosMap.set(id, {
        id,
        nome,
        ativo: true,
        padrao: true
      });
    });

    snapshot.forEach((item) => {
      if (item.val()?.removido) return;
      ministeriosMap.set(item.key, {
        id: item.key,
        ...item.val()
      });
    });

    const ministerios = Array.from(ministeriosMap.values());
    ministerios.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    ministeriosCache = ministerios;
    ministerioCorPorNome = new Map(ministerios.map((ministerio) => [ministerio.nome, ministerio.cor || coresPadraoMinisterios[ministerio.nome] || valoresCoresMinisterios[0]]));
    atualizarOpcoesFormularioMinisterio();
    renderMinisterios(ministerios);
  });
}

function renderMinisterios(ministerios) {
  els.ministeriosList.innerHTML = "";
  const coresUsadas = new Set(ministerios.map((ministerio) => ministerio.cor).filter(Boolean));

  ministerios.forEach((ministerio) => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-xl-3";
    const corAtual = ministerio.cor || coresPadraoMinisterios[ministerio.nome] || valoresCoresMinisterios[0];
    const usuariosAtivos = usuariosOnlineCache.filter((pessoa) => pessoa.ministerio === ministerio.nome).length;
    const podeExcluir = usuariosAtivos === 0;
    col.innerHTML = `
      <article class="ministerio-card color-card" style="--ministerio-color: ${corAtual}">
        <div class="d-flex justify-content-between align-items-start gap-3">
          <div>
            <h3 class="h5 mb-2">${escapeHtml(ministerio.nome)}</h3>
            <p class="small text-secondary mb-0">${usuariosAtivos} pessoa${usuariosAtivos === 1 ? "" : "s"} online</p>
          </div>
          <button class="btn btn-outline-danger btn-sm" type="button" data-action="excluir" ${podeExcluir ? "" : "disabled"} title="${podeExcluir ? "Excluir ministério" : "Há pessoas online neste ministério"}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <label class="form-label small text-secondary mt-3" for="cor-${ministerio.id}">Cor do ministério</label>
        <div class="color-select-wrap">
          <span class="color-preview" style="--preview-color: ${corAtual}"></span>
          <select id="cor-${ministerio.id}" class="form-select form-select-sm" data-ministerio-id="${ministerio.id}" data-current-color="${corAtual}"></select>
        </div>
      </article>
    `;
    const select = col.querySelector("select");
    renderColorOptions(select, corAtual, coresUsadas);
    atualizarPreviewCor(select);
    select.addEventListener("change", async () => {
      const novaCor = select.value;
      if (!novaCor) return;
      atualizarPreviewCor(select);
      const corEmUso = ministeriosCache.some((item) => item.id !== ministerio.id && item.cor === novaCor);
      if (corEmUso) {
        alert("Esta cor já está sendo usada por outro ministério.");
        select.value = corAtual;
        atualizarPreviewCor(select);
        return;
      }

      await update(ref(db, `ministerios/${ministerio.id}`), {
        cor: novaCor,
        atualizadoEm: serverTimestamp(),
        atualizadoPor: auth.currentUser.uid
      });
    });
    col.querySelector('[data-action="excluir"]').addEventListener("click", () => excluirMinisterio(ministerio));
    els.ministeriosList.appendChild(col);
  });
}

async function excluirMinisterio(ministerio) {
  const usuariosAtivos = usuariosOnlineCache.filter((pessoa) => pessoa.ministerio === ministerio.nome).length;
  if (usuariosAtivos > 0) {
    alert("Não é possível excluir este ministério enquanto houver pessoas online nele.");
    return;
  }

  if (!confirm(`Excluir o ministério "${ministerio.nome}"?`)) return;
  await update(ref(db, `ministerios/${ministerio.id}`), {
    nome: ministerio.nome,
    removido: true,
    ativo: false,
    removidoEm: serverTimestamp(),
    removidoPor: auth.currentUser.uid
  });
}

els.googleLoginBtn.addEventListener("click", async () => {
  try {
    authIntent = "login";
    await signInWithPopup(auth, provider);
  } catch (error) {
    showLoginAlert(`Não foi possível entrar: ${error.message}`);
  }
});

els.googleRegisterBtn.addEventListener("click", async () => {
  authIntent = "register";
  setSignupEnabled(false);
  showOnly(els.registerView);
});

els.registerGoogleAuthBtn.addEventListener("click", async () => {
  const originalHtml = els.registerGoogleAuthBtn.innerHTML;
  try {
    authIntent = "register";
    els.registerGoogleAuthBtn.disabled = true;
    els.registerGoogleAuthBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>Conectando...`;
    const credential = await signInWithPopup(auth, provider);
    fillRegisterGoogleAccount(credential.user);
    showSignupAlert("Conta Google vinculada. Complete os dados e envie para aprovação.", "success");
  } catch (error) {
    showSignupAlert(`Não foi possível entrar com Google: ${escapeHtml(error.message)}`, "danger");
  } finally {
    els.registerGoogleAuthBtn.disabled = false;
    els.registerGoogleAuthBtn.innerHTML = originalHtml;
  }
});

els.backToLoginBtn.addEventListener("click", async () => {
  authIntent = "login";
  registerUser = null;
  setSignupEnabled(false);
  await signOut(auth).catch(() => {});
  showOnly(els.loginView);
});

els.cadastroTelefone.addEventListener("input", (event) => {
  event.target.value = formatTelefone(event.target.value);
});

els.ministerioCorInput.addEventListener("change", () => atualizarPreviewCor(els.ministerioCorInput));

els.gestorSignupForm.addEventListener("submit", submitGestorSignup);

els.pendingLogoutBtn.addEventListener("click", () => signOut(auth));
els.logoutBtn.addEventListener("click", () => signOut(auth));

els.enableNotificationsBtn.addEventListener("click", async () => {
  solicitarNotificacoes();
});

els.bannerNotificationsBtn.addEventListener("click", solicitarNotificacoes);

els.feitoBtn.addEventListener("click", async () => {
  if (!mensagemSelecionada) return;
  await update(ref(db, `mensagens/${mensagemSelecionada.id}`), {
    status: "feito",
    dataFeito: serverTimestamp()
  });
  mensagemModal.hide();
});

els.enviarAcionamentoBtn.addEventListener("click", enviarAcionamento);

els.textoRapidoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const texto = els.textoRapidoInput.value.trim();
  if (!texto) return;

  await push(ref(db, "textosRapidos"), {
    texto,
    ativo: true,
    criadoEm: serverTimestamp(),
    criadoPor: auth.currentUser.uid
  });
  els.textoRapidoInput.value = "";
});

els.ministerioForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const nome = els.ministerioNomeInput.value.trim();
  const cor = els.ministerioCorInput.value;
  if (!nome) return;
  if (!cor) {
    alert("Selecione uma cor para o ministério.");
    return;
  }
  if (ministeriosCache.some((ministerio) => ministerio.cor === cor)) {
    alert("Esta cor já está sendo usada por outro ministério.");
    return;
  }
  const key = normalizeKey(nome);
  await set(ref(db, `ministerios/${key}`), {
    nome,
    cor,
    ativo: true,
    criadoEm: serverTimestamp(),
    criadoPor: auth.currentUser.uid
  });
  els.ministerioNomeInput.value = "";
  els.ministerioCorInput.value = "";
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showOnly(els.loginView);
    return;
  }

  try {
    if (authIntent === "register") {
      if (!registerUser) fillRegisterGoogleAccount(user);
      showOnly(els.registerView);
      return;
    }

    const gestor = await ensureGestorProfile(user, authIntent === "register");
    await update(ref(db, `gestores/${user.uid}`), { ultimoAcesso: serverTimestamp() });

    if (gestor.aprovado && gestor.statusCadastro !== "bloqueado") {
      iniciarPainel(user);
    } else {
      showOnly(els.pendingView);
    }
  } catch (error) {
    await signOut(auth);
    showOnly(els.loginView);
    showLoginAlert(`Erro ao validar gestor: ${error.message}`);
  }
});

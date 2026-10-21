// ===== Estado do quiz =====
let dados = null;        // conteúdo carregado do quiz.json
let indice = 0;          // pergunta atual
let pontos = {};         // pontuação por monstro
let bloqueado = false;   // evita clique duplo durante a transição

// ===== Atalhos para elementos =====
const $ = (id) => document.getElementById(id);
const telas = {
  inicio: $("tela-inicio"),
  quiz: $("tela-quiz"),
  resultado: $("tela-resultado"),
};

function mostrarTela(nome) {
  Object.values(telas).forEach((t) => t.classList.remove("ativa"));
  telas[nome].classList.add("ativa");
}

// ===== Carregar o JSON =====
async function carregarDados() {
  try {
    const resp = await fetch("quiz.json");
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    dados = await resp.json();
    $("titulo").textContent = dados.titulo;
  } catch (erro) {
    console.error(erro);
    $("btn-comecar").disabled = true;
    $("btn-comecar").textContent = "Erro ao carregar";
    // fetch não funciona abrindo o arquivo direto (file://). Use um servidor local.
    alert("Não foi possível carregar o quiz.json.\nRode 'python -m http.server' na pasta e abra http://localhost:8000");
  }
}

// ===== Fluxo do quiz =====
function iniciar() {
  indice = 0;
  pontos = {};
  Object.keys(dados.monstros).forEach((m) => (pontos[m] = 0));
  mostrarTela("quiz");
  mostrarPergunta();
}

function mostrarPergunta() {
  const total = dados.perguntas.length;
  const p = dados.perguntas[indice];

  $("contador").textContent = `Pergunta ${indice + 1} de ${total}`;
  $("barra").style.width = `${(indice / total) * 100}%`;
  $("pergunta").textContent = p.texto;

  const caixa = $("opcoes");
  caixa.innerHTML = "";
  p.opcoes.forEach((op) => {
    const btn = document.createElement("button");
    btn.className = "opcao";
    btn.textContent = op.texto;
    btn.addEventListener("click", () => escolher(op, btn));
    caixa.appendChild(btn);
  });
  bloqueado = false;
}

function escolher(opcao, botao) {
  if (bloqueado) return;
  bloqueado = true;
  botao.classList.add("escolhida");

  for (const [monstro, valor] of Object.entries(opcao.pontos)) {
    pontos[monstro] += valor;
  }

  setTimeout(() => {
    indice++;
    if (indice < dados.perguntas.length) {
      mostrarPergunta();
    } else {
      $("barra").style.width = "100%";
      mostrarResultado();
    }
  }, 350);
}

// ===== Resultado =====
function calcularVencedor() {
  // Em caso de empate, vence o primeiro na ordem do JSON
  return Object.keys(pontos).reduce((a, b) => (pontos[b] > pontos[a] ? b : a));
}

function mostrarResultado() {
  const id = calcularVencedor();
  const m = dados.monstros[id];

  document.documentElement.style.setProperty("--destaque", m.cor);
  $("res-emoji").textContent = m.emoji;
  $("res-nome").textContent = m.nome;
  $("res-desc").textContent = m.descricao;
  $("aviso").textContent = "";

  // Barras de porcentagem
  const soma = Object.values(pontos).reduce((a, b) => a + b, 0) || 1;
  const caixa = $("res-barras");
  caixa.innerHTML = "";
  Object.entries(dados.monstros).forEach(([chave, info]) => {
    const pct = Math.round((pontos[chave] / soma) * 100);
    const linha = document.createElement("div");
    linha.className = "barra-linha";
    linha.innerHTML = `
      <div class="topo"><span>${info.emoji} ${info.nome}</span><span>${pct}%</span></div>
      <div class="barra-trilho"><div class="barra-valor" style="background:${info.cor}"></div></div>`;
    caixa.appendChild(linha);
    // anima a barra depois de renderizar
    requestAnimationFrame(() => {
      setTimeout(() => (linha.querySelector(".barra-valor").style.width = pct + "%"), 50);
    });
  });

  mostrarTela("resultado");
}

// ===== Compartilhar =====
async function compartilhar() {
  const id = calcularVencedor();
  const m = dados.monstros[id];
  const texto = `${m.emoji} Eu sou ${m.nome}! Descubra qual monstro você é: ${location.href}`;

  try {
    if (navigator.share) {
      await navigator.share({ title: dados.titulo, text: texto });
    } else {
      await navigator.clipboard.writeText(texto);
      $("aviso").textContent = "Resultado copiado! Cole onde quiser 📋";
    }
  } catch (e) {
    // usuário cancelou o compartilhamento: sem problema
  }
}

// ===== Eventos =====
$("btn-comecar").addEventListener("click", iniciar);
$("btn-refazer").addEventListener("click", () => {
  document.documentElement.style.setProperty("--destaque", "#ff7a1a");
  iniciar();
});
$("btn-compartilhar").addEventListener("click", compartilhar);

carregarDados();

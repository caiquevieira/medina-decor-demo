/* Configuração do projeto: preencher a partir do briefing.md.
   IDs vazios = nenhum script de terceiros é carregado e o banner de cookies não aparece. */
const CONFIG = {
  ga4Id: '', // ex.: 'G-XXXXXXXXXX'
  metaPixelId: '', // ex.: '123456789012345'
};

const CHAVE_CONSENTIMENTO = 'ul-consentimento';

// data-track → eventos disparados (ver _docs/padrao-whatsapp.md)
const EVENTOS = {
  whatsapp: { ga: 'generate_lead', gaParams: { method: 'whatsapp' }, meta: 'Contact' },
  instagram: { ga: 'click_instagram' },
  'avaliar-google': { ga: 'click_avaliar_google' },
  'como-chegar': { ga: 'click_como_chegar', meta: 'FindLocation' },
};

let analyticsCarregado = false;

// Consent Mode v2: os 4 sinais seguem juntos a escolha do banner
function sinaisConsentimento(aceito) {
  const valor = aceito ? 'granted' : 'denied';
  return { analytics_storage: valor, ad_storage: valor, ad_user_data: valor, ad_personalization: valor };
}

function lerConsentimento() {
  try {
    return localStorage.getItem(CHAVE_CONSENTIMENTO);
  } catch {
    return null;
  }
}

function salvarConsentimento(valor) {
  try {
    localStorage.setItem(CHAVE_CONSENTIMENTO, valor);
  } catch {
    // Sem armazenamento (aba anônima restrita): vale só para esta visita.
  }
  if (window.gtag) window.gtag('consent', 'update', sinaisConsentimento(valor === 'aceito'));
}

function carregarAnalytics() {
  if (analyticsCarregado) return;
  analyticsCarregado = true;

  if (CONFIG.ga4Id) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.ga4Id}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    // Só chega aqui com a escolha "aceito" salva ou recém-feita
    window.gtag('consent', 'default', sinaisConsentimento(true));
    window.gtag('js', new Date());
    window.gtag('config', CONFIG.ga4Id);
  }

  if (CONFIG.metaPixelId) {
    /* Snippet oficial do Meta Pixel */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', CONFIG.metaPixelId);
    window.fbq('track', 'PageView');
  }
}

function iniciarConsentimento() {
  const usaAnalytics = Boolean(CONFIG.ga4Id || CONFIG.metaPixelId);
  const banner = document.getElementById('consentimento');
  const botoesAbrir = document.querySelectorAll('[data-abrir-consentimento]');

  if (!usaAnalytics) {
    botoesAbrir.forEach((b) => (b.hidden = true));
    return;
  }

  const abrir = () => {
    if (!banner) return;
    banner.hidden = false;
    document.body.classList.add('consentimento-aberto');
  };
  const fechar = () => {
    if (!banner) return;
    banner.hidden = true;
    document.body.classList.remove('consentimento-aberto');
  };

  const escolha = lerConsentimento();
  if (escolha === 'aceito') carregarAnalytics();
  else if (!escolha) abrir();

  banner?.querySelector('[data-consentimento="aceitar"]')?.addEventListener('click', () => {
    salvarConsentimento('aceito');
    fechar();
    carregarAnalytics();
  });

  banner?.querySelector('[data-consentimento="recusar"]')?.addEventListener('click', () => {
    salvarConsentimento('recusado');
    fechar();
    // Scripts já carregados só saem da página com um recarregamento.
    if (analyticsCarregado) location.reload();
  });

  botoesAbrir.forEach((b) => b.addEventListener('click', abrir));
}

function iniciarTracking() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-track]');
    if (!link || !analyticsCarregado) return;
    const evento = EVENTOS[link.dataset.track];
    if (!evento) return;
    const origem = link.dataset.origem || '';
    if (window.gtag && evento.ga) window.gtag('event', evento.ga, { ...evento.gaParams, origem });
    if (window.fbq && evento.meta) window.fbq('track', evento.meta, { origem });
  });
}

/* Galeria com "Ver mais": sem JS a grade aparece completa; com JS mostra as 6 primeiras. */
function iniciarGaleria() {
  document.querySelectorAll('[data-galeria-grade]').forEach((grade) => {
    const botao = document.querySelector(`[data-galeria-mais="${grade.id}"]`);
    if (!botao) return;
    grade.classList.add('galeria-recolhida');
    botao.hidden = false;
    botao.addEventListener('click', () => {
      grade.classList.remove('galeria-recolhida');
      botao.hidden = true;
    });
  });
}

/* Serviços: cada serviço tem as fotos em data-fotos.
   Celular: setas na própria foto do cartão. Desktop: o item clicado ou em foco vira o ativo
   (foto grande + descrição) e as setas sobre a foto grande passam as fotos dele. */
function iniciarServicos() {
  const lista = document.querySelector('[data-servicos]');
  if (!lista) return;
  const itens = [...lista.querySelectorAll('[data-servico]')];
  const setas = lista.querySelector('[data-servicos-setas]');
  const contador = lista.querySelector('[data-servicos-contador]');

  const atualizarSetas = (item) => {
    setas.hidden = item.fotos.length < 2;
    contador.textContent = `${item.indice + 1} de ${item.fotos.length}`;
  };

  const mostrar = (item, indice) => {
    const total = item.fotos.length;
    item.indice = (indice + total) % total;
    const foto = item.fotos[item.indice];
    const img = item.querySelector('.servico-foto img');
    img.src = foto.p;
    img.srcset = `${foto.p} 600w, ${foto.g} 1200w`;
    img.alt = foto.a;
    item.querySelector('[data-foto-contador]').textContent = `${item.indice + 1} de ${total}`;
    if (item.classList.contains('ativo')) atualizarSetas(item);
  };

  const ativar = (item) => {
    itens.forEach((outro) => {
      outro.classList.toggle('ativo', outro === item);
      outro.querySelector('.servico-nome button').setAttribute('aria-expanded', String(outro === item));
    });
    atualizarSetas(item);
  };

  itens.forEach((item) => {
    item.fotos = JSON.parse(item.dataset.fotos);
    item.indice = 0;
    const botao = item.querySelector('.servico-nome button');
    ['focus', 'click'].forEach((evento) => botao.addEventListener(evento, () => ativar(item)));

    const setasFoto = item.querySelector('[data-foto-setas]');
    if (item.fotos.length > 1) {
      setasFoto.hidden = false;
      item.querySelector('[data-foto-contador]').textContent = `1 de ${item.fotos.length}`;
    }
    setasFoto.querySelectorAll('[data-foto-seta]').forEach((b) => {
      b.addEventListener('click', () => mostrar(item, item.indice + Number(b.dataset.fotoSeta)));
    });

    // Arrastar a foto para os lados (celular)
    let inicioX = null;
    const figura = item.querySelector('.servico-foto');
    figura.addEventListener('touchstart', (e) => (inicioX = e.touches[0].clientX), { passive: true });
    figura.addEventListener('touchend', (e) => {
      if (inicioX === null || item.fotos.length < 2) return;
      const dx = e.changedTouches[0].clientX - inicioX;
      if (Math.abs(dx) > 40) mostrar(item, item.indice + (dx < 0 ? 1 : -1));
      inicioX = null;
    });
  });

  setas.querySelectorAll('[data-seta]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const item = itens.find((i) => i.classList.contains('ativo'));
      mostrar(item, item.indice + Number(botao.dataset.seta));
    });
  });
  atualizarSetas(itens.find((i) => i.classList.contains('ativo')));
}

iniciarConsentimento();
iniciarTracking();
iniciarGaleria();
iniciarServicos();

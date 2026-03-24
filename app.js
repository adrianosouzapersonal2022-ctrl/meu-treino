// ==================== STATE ====================
const getSafeJSON = (key, defaultVal = '[]') => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : JSON.parse(defaultVal);
  } catch (e) {
    console.error(`Error parsing localStorage key "${key}":`, e);
    return JSON.parse(defaultVal);
  }
};

const state = {
  alunos: getSafeJSON('alunos'),
  avaliacoes: getSafeJSON('avaliacoes'),
  testes: getSafeJSON('testes'),
  pagamentos: getSafeJSON('pagamentos'),
  fichas: getSafeJSON('fichas'),
  anamneses: getSafeJSON('anamneses'),
  rms: getSafeJSON('rms'),
  treinosCustom: getSafeJSON('treinosCustom')
};

// ==================== ADMIN LOGIN & NAVIGATION ====================
function showPortalScreen(screen) {
  const landing = document.getElementById('portal-landing');
  const login = document.getElementById('admin-login-screen');
  
  if (screen === 'admin') {
    landing.style.display = 'none';
    login.style.display = 'flex';
  } else {
    landing.style.display = 'flex';
    login.style.display = 'none';
  }
}

function loginAdmin() {
  const user = document.getElementById('admin-user').value;
  const pass = document.getElementById('admin-pass').value;
  const error = document.getElementById('admin-login-error');

  // Login simples fixo para o administrador
  if (user === 'adrianoquake' && pass === 'adri080979') {
    localStorage.setItem('isAdmin', 'true');
    
    // Transição de página: Ocultar Portal e mostrar Dashboard
    const portalContainer = document.getElementById('portal-container');
    const app = document.getElementById('app');
    
    if (portalContainer) portalContainer.style.display = 'none';
    if (app) {
      app.style.setProperty('display', 'block', 'important');
      app.classList.add('auth-ready');
    }
    
    error.style.display = 'none';
    
    // Inicializar dados após login
    try {
      renderAlunosGrid();
      if (typeof initPresc === 'function') initPresc();
    } catch (e) {
      console.error("Erro ao inicializar dashboard:", e);
    }
    
    showPage('cadastro');
  } else {
    error.style.display = 'block';
  }
}

function logoutAdmin() {
  localStorage.removeItem('isAdmin');
  location.reload();
}

let alunoLogado = null;
let chartAntroEvolucao = null; // Global reference for Antro Evolution chart

// Global reference for editing
window._editingId = null;

// PWA Install Logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('pwa-banner');
  if (banner) banner.style.display = 'flex';
  const bannerSuccess = document.getElementById('pwa-banner-success');
  if (bannerSuccess) bannerSuccess.style.display = 'flex';
});

const handleInstallClick = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      const banner = document.getElementById('pwa-banner');
      if (banner) banner.style.display = 'none';
      const bannerSuccess = document.getElementById('pwa-banner-success');
      if (bannerSuccess) bannerSuccess.style.display = 'none';
    }
    deferredPrompt = null;
  }
};

document.getElementById('btn-pwa-install')?.addEventListener('click', handleInstallClick);
document.getElementById('btn-pwa-install-success')?.addEventListener('click', handleInstallClick);

// Helper to save state
function saveState() {
  localStorage.setItem('alunos', JSON.stringify(state.alunos));
  localStorage.setItem('avaliacoes', JSON.stringify(state.avaliacoes));
  localStorage.setItem('testes', JSON.stringify(state.testes));
  localStorage.setItem('pagamentos', JSON.stringify(state.pagamentos));
  localStorage.setItem('fichas', JSON.stringify(state.fichas));
  localStorage.setItem('anamneses', JSON.stringify(state.anamneses));
  localStorage.setItem('rms', JSON.stringify(state.rms));
  localStorage.setItem('treinosCustom', JSON.stringify(state.treinosCustom));
}

// ==================== NAVIGATION ====================
const showPage = (name) => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.remove('active');
    b.removeAttribute('aria-current');
  });

  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');

  const pages = ['cadastro', 'meus-alunos', 'anamnese', 'antropometria', 'treino', 'evolucao', 'pagamentos'];
  const idx = pages.indexOf(name);
  const btns = document.querySelectorAll('.nav-btn');
  if (idx >= 0 && btns[idx]) {
    btns[idx].classList.add('active');
    btns[idx].setAttribute('aria-current', 'page');
  }

  // Sincronizar aluno selecionado entre páginas
  const selCadastro = document.getElementById('alunoVO2') || document.getElementById('alunoAntro');
  if (selCadastro && selCadastro.value) {
    window._ultimoAlunoId = selCadastro.value;
  }

  if (name !== 'cadastro') populateAlunoSelects();
  if (name === 'meus-alunos') renderListaGeralAlunos();
  if (name === 'pagamentos') renderPagamentos();
  if (name === 'evolucao') {
    initEvolucao();
    carregarEvolucao();
  }

  if (name === 'antropometria') {
    const selector = '#page-antropometria input';
    document.querySelectorAll(selector).forEach(input => {
      input.addEventListener('focus', () => {
        const id = input.id;
        document.querySelectorAll('.measure-point').forEach(p => {
          p.classList.toggle('active', p.dataset.target === id);
        });
      });
      input.addEventListener('blur', () => {
        document.querySelectorAll('.measure-point').forEach(p => p.classList.remove('active'));
      });
    });
  }
};

const showTab = (id) => {
  const target = document.getElementById(id);
  if (!target) return;

  // Encontrar o container de abas mais próximo (não o container da página inteira)
  const tabsContainer = target.parentElement;
  if (!tabsContainer) return;

  // Esconder apenas os irmãos que são conteúdos de aba
  Array.from(tabsContainer.children).forEach(sibling => {
    if (sibling.classList.contains('tab-content')) {
      sibling.classList.remove('active');
    }
  });
  
  target.classList.add('active');

  // Atualizar botões de aba no cabeçalho de abas correspondente
  // Procuramos o elemento .tabs que está antes do container de conteúdos
  let navContainer = tabsContainer.querySelector('.tabs');
  if (!navContainer) {
    // Se não estiver dentro, procuramos o anterior ao tabsContainer
    navContainer = tabsContainer.previousElementSibling;
    while (navContainer && !navContainer.classList.contains('tabs')) {
      navContainer = navContainer.previousElementSibling;
    }
  }

  if (navContainer) {
    const tabBtns = navContainer.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
      const onclickAttr = btn.getAttribute('onclick') || '';
      if (onclickAttr.includes(`'${id}'`) || onclickAttr.includes(`"${id}"`)) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      }
    });
  }
};

// ==================== TOAST ====================
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  
  // Adicionar ícone baseado no tipo
  let icon = '';
  if (type === 'success') icon = '✅ ';
  if (type === 'error') icon = '❌ ';
  
  t.textContent = icon + msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 4000);
}

// ==================== MASKS ====================
function maskCPF(el) {
  let v = el.value.replace(/\D/g, '').substring(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  el.value = v;
}
function maskTel(el) {
  let v = el.value.replace(/\D/g, '').substring(0, 11);
  v = v.replace(/(\d{2})(\d)/, '($1) $2');
  v = v.replace(/(\d{4,5})(\d{4})$/, '$1-$2');
  el.value = v;
}

// ==================== CADASTRO ====================
function calcularIdade() {
  const dn = document.getElementById('dataNasc').value;
  if (!dn) return;
  const hoje = new Date();
  const nasc = new Date(dn);
  let age = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) age--;
  document.getElementById('idade').value = age;
  calcularFC();
}

function getClassificacaoIMC(imc) {
  if (imc < 18.5) return 'Abaixo do peso';
  if (imc < 25) return 'Peso normal';
  if (imc < 30) return 'Sobrepeso (Pré-obesidade)';
  if (imc < 35) return 'Obesidade Grau I';
  if (imc < 40) return 'Obesidade Grau II';
  return 'Obesidade Grau III (Mórbida)';
}

function calcularIMC() {
  const peso = parseFloat(document.getElementById('peso').value);
  const alt = parseFloat(document.getElementById('altura').value);
  const imcField = document.getElementById('imc');
  const classField = document.getElementById('classImc');

  if (!peso || !alt || alt <= 0) {
    if (imcField) imcField.value = '';
    if (classField) classField.value = '';
    return;
  }

  const h = alt / 100;
  const imc = peso / (h * h);
  
  if (imcField) imcField.value = imc.toFixed(2);
  if (classField) classField.value = getClassificacaoIMC(imc);
}

function calcularFC() {
  const idade = parseInt(document.getElementById('idade').value);
  const fcRep = parseFloat(document.getElementById('fcRepouso').value);
  if (isNaN(idade)) return;
  const tanaka = Math.round(208 - 0.7 * idade);
  const fox = 220 - idade;
  document.getElementById('fcMaxTanaka').value = tanaka + ' bpm';
  document.getElementById('fcMaxFox').value = fox + ' bpm';
  if (!isNaN(fcRep)) {
    const reserva = tanaka - fcRep;
    document.getElementById('fcReserva').value = reserva + ' bpm';
    const z60 = Math.round(0.6 * reserva + fcRep);
    const z80 = Math.round(0.8 * reserva + fcRep);
    document.getElementById('fcZona').value = z60 + ' – ' + z80 + ' bpm';
  }
}

function salvarCadastro() {
  const nome = document.getElementById('nome').value.trim();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const dataNasc = document.getElementById('dataNasc').value;
  const sexo = document.getElementById('sexo').value;
  if (!nome || !dataNasc || !sexo) { showToast('Preencha os campos obrigatórios (*)', 'error'); return; }

  const id = window._editingId || Date.now();
  const patologias = [...document.querySelectorAll('input[name="patologia"]:checked')].map(c => c.value);
  
  // Buscar se o aluno já existe para não perder a senha se for edição
  const alunoExistente = state.alunos.find(a => a.id === id);

  const aluno = {
    id,
    nome, 
    email,
    senha: alunoExistente ? alunoExistente.senha : '123456', // Senha padrão se for novo
    dataNasc, 
    sexo,
    idade: parseInt(document.getElementById('idade').value) || '',
    cpf: document.getElementById('cpf').value,
    telefone: document.getElementById('telefone').value,
    profissao: document.getElementById('profissao').value,
    peso: document.getElementById('peso').value,
    altura: document.getElementById('altura').value,
    imc: document.getElementById('imc').value,
    classImc: document.getElementById('classImc').value,
    nivel: document.getElementById('nivel').value,
    freqAtual: document.getElementById('freqAtual').value,
    objetivo: document.getElementById('objetivo').value,
    tipo: document.getElementById('aluno-tipo')?.value || 'pago',
    patologias,
    obs: document.getElementById('obs')?.value || '',
    // Preservar dados vinculados
    anamnese: alunoExistente ? alunoExistente.anamnese : null,
    ultimaAnamnese: alunoExistente ? alunoExistente.ultimaAnamnese : null
  };

  const isUpdate = !!window._editingId;
  const idx = state.alunos.findIndex(a => a.id === id);
  if (idx >= 0) state.alunos[idx] = aluno; else state.alunos.push(aluno);
  
  saveState();
  
  // Atualizar textos do modal de sucesso dinamicamente
  const modalTitulo = document.querySelector('#modal-sucesso-cadastro h2');
  const modalTexto = document.querySelector('#modal-sucesso-cadastro p');
  
  if (modalTitulo) modalTitulo.textContent = isUpdate ? 'Atualização Realizada!' : 'Cadastro Realizado!';
  if (modalTexto) modalTexto.textContent = isUpdate ? 'Os dados do aluno foram atualizados com sucesso.' : 'O aluno foi cadastrado com sucesso no sistema TreinoFitASM.';

  // Caixa de diálogo para atualizações cadastrais
  if (isUpdate) {
    alert(`✅ Cadastro de ${nome} atualizado com sucesso!`);
  } else {
    alert(`✅ Aluno ${nome} cadastrado com sucesso!`);
  }

  showToast(isUpdate ? 'Alterações salvas com sucesso!' : 'Cadastro realizado com sucesso!', 'success');
  
  window._editingId = null;
  renderAlunosGrid();
  limparCadastro();
  
  // Mostrar modal de sucesso
  document.getElementById('modal-sucesso-cadastro').style.display = 'flex';
  const bannerSuccess = document.getElementById('pwa-banner-success');
  if (bannerSuccess && deferredPrompt) bannerSuccess.style.display = 'flex';
}

function fecharModalSucesso() {
  document.getElementById('modal-sucesso-cadastro').style.display = 'none';
}

function renderAlunosGrid() {
  const grid = document.getElementById('alunos-grid');
  const section = document.getElementById('lista-alunos');
  if (!grid || !section) return;
  
  if (state.alunos.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  grid.innerHTML = state.alunos.map(a => `
    <div class="aluno-card" onclick="editarAluno(${a.id})">
      <h3>${a.nome}</h3>
      <p>${a.sexo === 'M' ? 'Masculino' : 'Feminino'} · ${a.idade} anos · IMC ${a.imc || '—'}</p>
      <p>Objetivo: ${a.objetivo || '—'} · Nível: ${a.nivel || '—'}</p>
    </div>
  `).join('');
}

function renderListaGeralAlunos() {
  const tbody = document.getElementById('corpo-lista-geral-alunos');
  if (!tbody) return;

  const filtro = document.getElementById('filtro-alunos-lista')?.value.toLowerCase() || '';
  const listaFiltrada = state.alunos.filter(a => 
    a.nome.toLowerCase().includes(filtro) || 
    (a.objetivo || '').toLowerCase().includes(filtro)
  );

  if (listaFiltrada.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Nenhum aluno encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = listaFiltrada.map(a => {
    const ultimaAv = state.avaliacoes.filter(av => String(av.alunoId) === String(a.id)).pop();
    const dataAv = ultimaAv ? new Date(ultimaAv.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
    
    const pagamentos = state.pagamentos.filter(p => String(p.alunoId) === String(a.id));
    const ultimoPag = pagamentos.sort((x, y) => new Date(y.dataPag) - new Date(x.dataPag))[0];
    
    let statusPag = ultimoPag ? ultimoPag.status : 'pendente';
    if (a.tipo === 'gratuito') statusPag = 'gratuito';
    
    const statusClass = `badge-${statusPag}`;

    // Status de Anamnese
    const temAnamnese = a.anamnese || state.anamneses.some(an => String(an.alunoId) === String(a.id));
    const anamneseLabel = temAnamnese ? `<span style="color:var(--success); font-weight:bold;">✅ Sim</span>` : `<span style="color:var(--danger); font-weight:bold;">❌ Não</span>`;

    return `
      <tr>
        <td>
          <strong>${a.nome}</strong>
          ${a.origem === 'online' ? '<br><span style="font-size:0.65rem; color:#2563eb; background:#dbeafe; padding:2px 4px; border-radius:4px;">CADASTRO ONLINE</span>' : ''}
        </td>
        <td>${a.idade} anos / ${a.sexo}</td>
        <td style="text-align:center;">${anamneseLabel}</td>
        <td>${dataAv}</td>
        <td><span class="badge ${statusClass}">${statusPag === 'gratuito' ? 'GRATUITO' : statusPag.toUpperCase()}</span></td>
        <td>
          <button class="btn-primary" onclick="editarAluno(${a.id}); showPage('cadastro')" style="padding: 4px 8px; font-size: 0.75rem;">Editar</button>
          <button class="btn-secondary" onclick="excluirAluno(${a.id})" style="padding: 4px 8px; font-size: 0.75rem; background:#dc2626; color:white; border:none;">Excluir</button>
        </td>
      </tr>
    `;
  }).join('');
}

function excluirAluno(id) {
  if (!confirm('Tem certeza que deseja excluir este aluno? Todos os dados vinculados (testes, treinos, pagamentos) serão mantidos, mas o aluno não aparecerá mais na lista principal.')) return;
  state.alunos = state.alunos.filter(a => a.id !== id);
  saveState();
  renderListaGeralAlunos();
  renderAlunosGrid();
  showToast('Aluno removido da lista', 'success');
}

function editarAluno(id) {
  const a = state.alunos.find(x => x.id === id);
  if (!a) return;
  window._editingId = id;
  document.getElementById('nome').value = a.nome;
  document.getElementById('email').value = a.email || '';
  document.getElementById('dataNasc').value = a.dataNasc;
  document.getElementById('sexo').value = a.sexo;
  document.getElementById('idade').value = a.idade;
  document.getElementById('cpf').value = a.cpf || '';
  document.getElementById('telefone').value = a.telefone || '';
  document.getElementById('profissao').value = a.profissao || '';
  document.getElementById('peso').value = a.peso;
  document.getElementById('altura').value = a.altura;
  calcularIMC();
  document.getElementById('nivel').value = a.nivel;
  document.getElementById('freqAtual').value = a.freqAtual;
  document.getElementById('objetivo').value = a.objetivo;
  if (document.getElementById('aluno-tipo')) document.getElementById('aluno-tipo').value = a.tipo || 'pago';
  if (document.getElementById('obs')) document.getElementById('obs').value = a.obs;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limparCadastro() {
  const form = document.getElementById('form-cadastro');
  if (form) form.reset();
  ['imc', 'classImc', 'fcMaxTanaka', 'fcMaxFox', 'fcReserva', 'fcZona', 'idade'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  window._editingId = null;
}

// ==================== POPULATE SELECTS ====================
function populateAlunoSelects() {
  const selIds = ['alunoAntro','alunoVO2','alunoPresc','alunoAnamnese','alunoRM','alunoAerobio','alunoEvolucao', 'alunoPagamento', 'alunoTreinoPronto'];
  selIds.forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">Selecione um aluno cadastrado</option>';
    state.alunos.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.nome + ' – ' + a.idade + ' anos (' + (a.sexo === 'M' ? 'M' : 'F') + ')';
      sel.appendChild(opt);
    });
    if (cur) sel.value = cur;
  });
}

// ==================== PAGAMENTOS ====================
function salvarPagamento() {
  const alunoId = document.getElementById('alunoPagamento').value;
  const valor = document.getElementById('valorPagamento').value;
  const dataPag = document.getElementById('dataPagamento').value;
  const dataVenc = document.getElementById('dataVencimento').value;
  const status = document.getElementById('statusPagamento').value;
  const forma = document.getElementById('formaPagamento').value;

  if (!alunoId || !valor || !dataPag || !dataVenc) {
    showToast('Preencha todos os campos obrigatórios', 'error');
    return;
  }

  const pagamento = {
    id: Date.now(),
    alunoId: String(alunoId),
    valor: parseFloat(valor),
    dataPag,
    dataVenc,
    status,
    forma
  };

  state.pagamentos.push(pagamento);
  saveState();
  showToast('Pagamento registrado com sucesso!', 'success');
  limparPagamento();
  renderPagamentos();
}

function renderPagamentos() {
  const tbody = document.getElementById('lista-pagamentos-corpo');
  if (!tbody) return;

  if (state.pagamentos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Nenhum pagamento registrado</td></tr>';
    return;
  }

  const sorted = [...state.pagamentos].sort((a, b) => new Date(b.dataPag) - new Date(a.dataPag));

  tbody.innerHTML = sorted.map(p => {
    const aluno = state.alunos.find(a => String(a.id) === String(p.alunoId));
    const statusClass = `badge-${p.status}`;
    return `
      <tr>
        <td>${aluno ? aluno.nome : 'Aluno Removido'}</td>
        <td>R$ ${p.valor.toFixed(2)}</td>
        <td>${new Date(p.dataPag).toLocaleDateString('pt-BR')}</td>
        <td>${new Date(p.dataVenc).toLocaleDateString('pt-BR')}</td>
        <td><span class="badge ${statusClass}">${p.status.toUpperCase()}</span></td>
        <td>${p.forma.toUpperCase()}</td>
        <td>
          <button class="btn-secondary" onclick="excluirPagamento(${p.id})" style="padding: 4px 8px; font-size: 0.75rem;">Excluir</button>
        </td>
      </tr>
    `;
  }).join('');
}

function excluirPagamento(id) {
  if (!confirm('Tem certeza que deseja excluir este pagamento?')) return;
  state.pagamentos = state.pagamentos.filter(p => p.id !== id);
  saveState();
  renderPagamentos();
  showToast('Pagamento excluído', 'success');
}

function limparPagamento() {
  const form = document.getElementById('form-pagamento');
  if (form) form.reset();
}

function toggleGuiaVisual(sexo) {
  const guideM = document.getElementById('guide-container-m');
  const guideF = document.getElementById('guide-container-f');
  if (guideM && guideF) {
    guideM.style.display = sexo === 'M' ? 'block' : 'none';
    guideF.style.display = sexo === 'F' ? 'block' : 'none';
  }
}

/**
 * Atualiza o valor de uma medida sobre a imagem do corpo
 */
function atualizarValorNoCorpo(campo, valor) {
  const sel = document.getElementById('alunoAntro');
  const id = sel.value;
  const aluno = id ? state.alunos.find(a => String(a.id) === String(id)) : null;
  const sexo = aluno ? aluno.sexo : 'M';
  const prefix = sexo === 'M' ? 'val-m-' : 'val-f-';
  const label = document.getElementById(prefix + campo);
  
  if (label) {
    label.textContent = valor ? valor + (campo === 'peso' ? 'kg' : 'cm') : '';
  }
}

/**
 * Mostra a equação do protocolo selecionado para circunferências
 */
function mostrarEquacaoProtocolo() {
  const protId = document.getElementById('protocolo-composicao-circ').value;
  const infoBox = document.getElementById('container-equacao-circ');
  
  if (!protId || !window.ANTRO_PROTOCOLOS[protId]) {
    infoBox.style.display = 'none';
    return;
  }
  
  const prot = window.ANTRO_PROTOCOLOS[protId];
  const sel = document.getElementById('alunoAntro');
  const id = sel.value;
  const aluno = id ? state.alunos.find(a => String(a.id) === String(id)) : null;
  const sexo = aluno ? aluno.sexo : 'M';
  
  const formula = sexo === 'M' ? (prot.formula_m || prot.formula) : (prot.formula_f || prot.formula);
  
  infoBox.innerHTML = `
    <strong>${prot.nome}</strong><br>
    <small>${prot.desc}</small><br>
    <div style="margin-top:8px; border-top: 1px dashed #ccc; padding-top: 5px;">
      Formula: ${formula}
    </div>
  `;
  infoBox.style.display = 'block';
}

/**
 * Calcula a composição corporal baseada em circunferências
 */
function calcularComposicaoCorporal() {
  const protId = document.getElementById('protocolo-composicao-circ').value;
  if (!protId) {
    showToast('Selecione um protocolo primeiro!', 'error');
    return;
  }

  const sel = document.getElementById('alunoAntro');
  const id = sel.value;
  const aluno = id ? state.alunos.find(a => String(a.id) === String(id)) : null;
  if (!aluno) {
    showToast('Selecione um aluno!', 'error');
    return;
  }

  const get = id => parseFloat(document.getElementById(id)?.value) || 0;
  const dados = {
    peso: get('c-peso'),
    altura: get('c-altura'),
    abdomen: get('c-abdomen'),
    cintura: get('c-cintura'),
    quadril: get('c-quadril'),
    pescoco: get('c-pescoco') || 38, // Valor padrão se não tiver campo específico
    ombro: get('c-ombro')
  };

  if (!dados.peso || !dados.altura) {
    showToast('Peso e Altura são obrigatórios para este cálculo!', 'error');
    return;
  }

  const res = window.ANTRO_PROTOCOLOS[protId].calcular(dados, aluno.sexo, parseInt(aluno.idade));
  if (!res) {
    showToast('Este protocolo não se aplica ao gênero do aluno.', 'error');
    return;
  }

  // Mostrar resultado em uma caixa bonita
  const resBox = document.getElementById('resultado-antro-box');
  resBox.innerHTML = `
    <h3 style="color: var(--primary); border-bottom: 1px solid var(--border); padding-bottom: 8px;">Resultado: ${window.ANTRO_PROTOCOLOS[protId].nome}</h3>
    <div class="result-grid">
      <div class="result-card highlight">
        <span class="rc-label">% Gordura Corporal</span>
        <span class="rc-value">${res.bf}%</span>
      </div>
      <div class="result-card">
        <span class="rc-label">Massa Gorda</span>
        <span class="rc-value">${res.gorduraKg} <small>kg</small></span>
      </div>
      <div class="result-card">
        <span class="rc-label">Massa Magra</span>
        <span class="rc-value">${res.massaMagraKg} <small>kg</small></span>
      </div>
    </div>
  `;
  
  // Mudar para a aba de resultados
  showTab('tab-resultados-antro');
  showToast('Cálculo concluído!', 'success');
}


function carregarDadosAluno(tipo) {
  const selId = tipo === 'antro' ? 'alunoAntro' : tipo === 'vo2' ? 'alunoVO2' : null;
  if (!selId) return;
  const sel = document.getElementById(selId);
  const id = sel.value;
  if (!id) return;
  const aluno = state.alunos.find(a => String(a.id) === String(id));
  if (!aluno) return;
  if (tipo === 'antro') {
    const hoje = new Date().toISOString().slice(0, 10);
    const dataAntro = document.getElementById('dataAntro');
    if (dataAntro) dataAntro.value = hoje;
    
    // Ajustar guia visual conforme sexo do aluno
    if (aluno.sexo) {
      const sexoSelect = document.getElementById('antro-guia-sexo');
      if (sexoSelect) {
        sexoSelect.value = aluno.sexo;
        toggleGuiaVisual(aluno.sexo);
      }
    }
  }
}

// ==================== ANTROPOMETRIA ====================
function calcularCircunferencias() {
  const get = id => parseFloat(document.getElementById(id)?.value) || 0;
  const cintura  = get('c-cintura');
  const quadril  = get('c-quadril');
  const sel      = document.getElementById('alunoAntro');
  const id       = sel.value;
  const aluno    = id ? state.alunos.find(a => String(a.id) === String(id)) : null;
  const peso     = aluno ? parseFloat(aluno.peso)   : 0;
  const altCm    = aluno ? parseFloat(aluno.altura) : 0;

  if (cintura && quadril) {
    const rcq = (cintura / quadril).toFixed(2);
    document.getElementById('rcq').value = rcq;
    const sexo   = aluno ? aluno.sexo : 'M';
    const idadeA = aluno ? parseInt(aluno.idade) : 0;
    let classRCQ = '';
    if (sexo === 'M') {
      if (idadeA < 30) classRCQ = rcq < 0.83 ? 'Baixo' : rcq < 0.88 ? 'Moderado' : rcq < 0.95 ? 'Alto' : 'Muito Alto';
      else if (idadeA < 40) classRCQ = rcq < 0.84 ? 'Baixo' : rcq < 0.91 ? 'Moderado' : rcq < 1.0  ? 'Alto' : 'Muito Alto';
      else classRCQ = rcq < 0.87 ? 'Baixo' : rcq < 0.93 ? 'Moderado' : rcq < 1.0 ? 'Alto' : 'Muito Alto';
    } else {
      if (idadeA < 30) classRCQ = rcq < 0.71 ? 'Baixo' : rcq < 0.77 ? 'Moderado' : rcq < 0.82 ? 'Alto' : 'Muito Alto';
      else if (idadeA < 40) classRCQ = rcq < 0.72 ? 'Baixo' : rcq < 0.78 ? 'Moderado' : rcq < 0.84 ? 'Alto' : 'Muito Alto';
      else classRCQ = rcq < 0.73 ? 'Baixo' : rcq < 0.79 ? 'Moderado' : rcq < 0.87 ? 'Alto' : 'Muito Alto';
    }
    document.getElementById('classRCQ').value = classRCQ;
  }

  if (cintura && peso && altCm) {
    const altM = altCm / 100;
    const ic = (cintura / 100) / (0.109 * Math.sqrt(peso / altM));
    document.getElementById('ic').value = ic.toFixed(3);
  }

  if (cintura && altCm) {
    const rcest = ((cintura / altCm) * 100).toFixed(1);
    document.getElementById('rcest').value = rcest + '%';
    const classRCEst = parseFloat(rcest) < 50 ? 'Normal' : parseFloat(rcest) < 60 ? 'Risco aumentado' : 'Alto risco';
    document.getElementById('classRCEst').value = classRCEst;
  }

  showToast('Índices calculados!', 'success');
}

// ==================== PROTOCOLOS DOBRAS ====================
const protocolosInfo = {
  JP3M: {
    nome: 'Jackson & Pollock – 3 Dobras (Masculino)',
    dobras: ['Peitoral', 'Abdominal', 'Coxa'],
    formula: `DC = 1,10938 − (0,0008267 × ΣD3) + (0,0000016 × ΣD3²) − (0,0002574 × Idade)
ΣD3 = Peitoral + Abdominal + Coxa  (Jackson & Pollock, 1978)`,
    calc: (d, idade) => {
      const s = (d['d-peitoral'] || 0) + (d['d-abdominal'] || 0) + (d['d-coxa'] || 0);
      return 1.10938 - 0.0008267 * s + 0.0000016 * s * s - 0.0002574 * idade;
    }
  },
  JP3F: {
    nome: 'Jackson, Pollock & Ward – 3 Dobras (Feminino)',
    dobras: ['Tríceps', 'Suprailíaca', 'Coxa'],
    formula: `DC = 1,0994921 − (0,0009929 × ΣD3) + (0,0000023 × ΣD3²) − (0,0001392 × Idade)
ΣD3 = Tríceps + Suprailíaca + Coxa  (Jackson, Pollock & Ward, 1980)`,
    calc: (d, idade) => {
      const s = (d['d-triceps'] || 0) + (d['d-suprailiaca'] || 0) + (d['d-coxa'] || 0);
      return 1.0994921 - 0.0009929 * s + 0.0000023 * s * s - 0.0001392 * idade;
    }
  },
  JP7M: {
    nome: 'Jackson & Pollock – 7 Dobras (Masculino)',
    dobras: ['Peitoral', 'Axilar Média', 'Tríceps', 'Subescapular', 'Abdominal', 'Suprailíaca', 'Coxa'],
    formula: `DC = 1,112 − (0,00043499 × ΣD7) + (0,00000055 × ΣD7²) − (0,00028826 × Idade)
ΣD7 = Peitoral + Axilar Média + Tríceps + Subescapular + Abdominal + Suprailíaca + Coxa`,
    calc: (d, idade) => {
      const s = (d['d-peitoral']||0)+(d['d-axilar']||0)+(d['d-triceps']||0)+(d['d-subescapular']||0)+(d['d-abdominal']||0)+(d['d-suprailiaca']||0)+(d['d-coxa']||0);
      return 1.112 - 0.00043499 * s + 0.00000055 * s * s - 0.00028826 * idade;
    }
  },
  JP7F: {
    nome: 'Jackson & Pollock – 7 Dobras (Feminino)',
    dobras: ['Peitoral', 'Axilar Média', 'Tríceps', 'Subescapular', 'Abdominal', 'Suprailíaca', 'Coxa'],
    formula: `DC = 1,097 − (0,00046971 × ΣD7) + (0,00000056 × ΣD7²) − (0,00012828 × Idade)
ΣD7 = Peitoral + Axilar Média + Tríceps + Subescapular + Abdominal + Suprailíaca + Coxa`,
    calc: (d, idade) => {
      const s = (d['d-peitoral']||0)+(d['d-axilar']||0)+(d['d-triceps']||0)+(d['d-subescapular']||0)+(d['d-abdominal']||0)+(d['d-suprailiaca']||0)+(d['d-coxa']||0);
      return 1.097 - 0.00046971 * s + 0.00000056 * s * s - 0.00012828 * idade;
    }
  },
  DW4M: {
    nome: 'Durnin & Womersley – 4 Dobras (Masculino)',
    dobras: ['Bíceps', 'Tríceps', 'Subescapular', 'Suprailíaca'],
    formula: `DC = C − M × log(ΣD4)
ΣD4 = Bíceps + Tríceps + Subescapular + Suprailíaca
Constantes C e M variam por faixa etária (Durnin & Womersley, 1974)`,
    calc: (d, idade) => {
      const s = (d['d-biceps']||0)+(d['d-triceps']||0)+(d['d-subescapular']||0)+(d['d-suprailiaca']||0);
      let C, M;
      if (idade < 20) { C = 1.1620; M = 0.0630; }
      else if (idade < 30) { C = 1.1631; M = 0.0632; }
      else if (idade < 40) { C = 1.1422; M = 0.0544; }
      else if (idade < 50) { C = 1.1620; M = 0.0700; }
      else { C = 1.1715; M = 0.0779; }
      return C - M * Math.log10(s);
    }
  },
  DW4F: {
    nome: 'Durnin & Womersley – 4 Dobras (Feminino)',
    dobras: ['Bíceps', 'Tríceps', 'Subescapular', 'Suprailíaca'],
    formula: `DC = C − M × log(ΣD4)
ΣD4 = Bíceps + Tríceps + Subescapular + Suprailíaca`,
    calc: (d, idade) => {
      const s = (d['d-biceps']||0)+(d['d-triceps']||0)+(d['d-subescapular']||0)+(d['d-suprailiaca']||0);
      let C, M;
      if (idade < 20) { C = 1.1549; M = 0.0678; }
      else if (idade < 30) { C = 1.1599; M = 0.0717; }
      else if (idade < 40) { C = 1.1423; M = 0.0632; }
      else if (idade < 50) { C = 1.1333; M = 0.0612; }
      else { C = 1.1339; M = 0.0645; }
      return C - M * Math.log10(s);
    }
  },
  GUEDES: {
    nome: 'Guedes (1985) – Masculino',
    dobras: ['Subescapular', 'Abdominal', 'Coxa'],
    formula: `DC = 1,17136 − 0,06706 × log(ΣD3)
ΣD3 = Subescapular + Abdominal + Coxa  (Guedes, 1985)`,
    calc: (d) => {
      const s = (d['d-subescapular']||0)+(d['d-abdominal']||0)+(d['d-coxa']||0);
      return 1.17136 - 0.06706 * Math.log10(s);
    }
  },
  GUEDESF: {
    nome: 'Guedes (1985) – Feminino',
    dobras: ['Subescapular', 'Suprailíaca', 'Coxa'],
    formula: `DC = 1,16650 − 0,07063 × log(ΣD3)
ΣD3 = Subescapular + Suprailíaca + Coxa  (Guedes, 1985)`,
    calc: (d) => {
      const s = (d['d-subescapular']||0)+(d['d-suprailiaca']||0)+(d['d-coxa']||0);
      return 1.16650 - 0.07063 * Math.log10(s);
    }
  },
  PETROSKI: {
    nome: 'Petroski (1995) – Masculino',
    dobras: ['Subescapular', 'Tríceps', 'Suprailíaca', 'Perna Medial'],
    formula: `DC = 1,10726863 − 0,00081201 × ΣD4 + 0,00000212 × ΣD4² − 0,00041761 × Idade`,
    calc: (d, idade) => {
      const s = (d['d-subescapular']||0)+(d['d-triceps']||0)+(d['d-suprailiaca']||0)+(d['d-perna']||0);
      return 1.10726863 - 0.00081201 * s + 0.00000212 * s * s - 0.00041761 * idade;
    }
  }
};

function mostrarProtocolo() {
  const key = document.getElementById('protocoloAntro').value;
  const p = protocolosInfo[key];
  if (!p) return;
  document.getElementById('protocolo-info').innerHTML = `<strong>${p.nome}</strong><br><br><pre style="white-space:pre-wrap;font-family:inherit;">${p.formula}</pre>`;
}

function calcularDobras() {
  const key = document.getElementById('protocoloAntro').value;
  const p = protocolosInfo[key];
  if (!p) return;
  const sel = document.getElementById('alunoAntro');
  const id = parseInt(sel.value);
  const aluno = id ? state.alunos.find(a => a.id === id) : null;
  const idade = aluno ? parseInt(aluno.idade) : 25;
  const sexo = aluno ? aluno.sexo : 'M';
  const peso = aluno ? parseFloat(aluno.peso) : 0;

  const d = {};
  ['d-subescapular','d-triceps','d-biceps','d-peitoral','d-axilar','d-suprailiaca','d-abdominal','d-coxa','d-perna'].forEach(id => {
    const el = document.getElementById(id);
    const v = el ? parseFloat(el.value) : 0;
    d[id] = isNaN(v) ? 0 : v;
  });

  let dc = p.calc ? p.calc(d, idade, sexo) : null;

  if (dc !== null && dc > 0) {
    const siri = (495 / dc - 450);
    const brozek = (4.570 / dc - 4.142) * 100;
    document.getElementById('densidade').value = dc.toFixed(5);
    document.getElementById('percGorduraSiri').value = siri.toFixed(1) + '%';
    document.getElementById('percGorduraBrozek').value = brozek.toFixed(1) + '%';

    if (peso) {
      const mg = (siri / 100) * peso;
      const mm = peso - mg;
      document.getElementById('massaGorda').value = mg.toFixed(2) + ' kg';
      document.getElementById('massaMagra').value = mm.toFixed(2) + ' kg';
      
      const classif = classGordura(siri, sexo, idade);
      document.getElementById('classGordura').value = classif;
      
      // Auto-preencher gordura ideal baseada no sexo
      const gIdeal = sexo === 'M' ? 15 : 22;
      document.getElementById('percGorduraIdeal').value = gIdeal;
      calcularPesoIdeal();
    }
  }

  renderResultadosAntro();
  showToast('Composição corporal calculada!', 'success');
}

/**
 * Calcula a composição corporal baseada em circunferências
 */
function calcularComposicaoCorporal() {
  const protId = document.getElementById('protocolo-composicao-circ').value;
  if (!protId) {
    showToast('Selecione um protocolo primeiro!', 'error');
    return;
  }

  const sel = document.getElementById('alunoAntro');
  const id = sel.value;
  const aluno = id ? state.alunos.find(a => String(a.id) === String(id)) : null;
  if (!aluno) {
    showToast('Selecione um aluno!', 'error');
    return;
  }

  const get = id => parseFloat(document.getElementById(id)?.value) || 0;
  const dados = {
    peso: get('c-peso'),
    altura: get('c-altura'),
    abdomen: get('c-abdomen'),
    cintura: get('c-cintura'),
    quadril: get('c-quadril'),
    pescoco: get('c-pescoco') || 38,
    ombro: get('c-ombro')
  };

  if (!dados.peso || !dados.altura) {
    showToast('Peso e Altura são obrigatórios para este cálculo!', 'error');
    return;
  }

  const res = window.ANTRO_PROTOCOLOS[protId].calcular(dados, aluno.sexo, parseInt(aluno.idade));
  if (!res) {
    showToast('Este protocolo não se aplica ao gênero do aluno.', 'error');
    return;
  }

  // Preencher campos ocultos ou globais para compatibilidade com renderResultadosAntro
  document.getElementById('percGorduraSiri').value = res.bf + '%';
  document.getElementById('massaGorda').value = res.gorduraKg + ' kg';
  document.getElementById('massaMagra').value = res.massaMagraKg + ' kg';
  
  const classif = classGordura(parseFloat(res.bf), aluno.sexo, parseInt(aluno.idade));
  document.getElementById('classGordura').value = classif;

  // Calcular Peso Ideal automaticamente
  const gIdeal = aluno.sexo === 'M' ? 15 : 22;
  document.getElementById('percGorduraIdeal').value = gIdeal;
  
  const mm = parseFloat(res.massaMagraKg);
  const pi = mm / (1 - gIdeal / 100);
  document.getElementById('pesoIdeal').value = pi.toFixed(2) + ' kg';
  const meta = Math.max(0, dados.peso - pi);
  document.getElementById('gorduraPerder').value = meta.toFixed(2) + ' kg';

  renderResultadosAntro();
  showTab('tab-resultados-antro');
  showToast('Cálculo concluído!', 'success');
}


function classGordura(pct, sexo, idade) {
  if (sexo === 'M') {
    if (idade < 30) return pct < 13 ? 'Excelente' : pct < 17 ? 'Bom' : pct < 21 ? 'Acima da Média' : pct < 25 ? 'Abaixo da Média' : 'Ruim';
    if (idade < 40) return pct < 14 ? 'Excelente' : pct < 18 ? 'Bom' : pct < 22 ? 'Acima da Média' : pct < 26 ? 'Abaixo da Média' : 'Ruim';
    if (idade < 50) return pct < 16 ? 'Excelente' : pct < 20 ? 'Bom' : pct < 24 ? 'Acima da Média' : pct < 28 ? 'Abaixo da Média' : 'Ruim';
    return pct < 17 ? 'Excelente' : pct < 21 ? 'Bom' : pct < 25 ? 'Acima da Média' : pct < 29 ? 'Abaixo da Média' : 'Ruim';
  } else {
    if (idade < 30) return pct < 18 ? 'Excelente' : pct < 22 ? 'Bom' : pct < 26 ? 'Acima da Média' : pct < 30 ? 'Abaixo da Média' : 'Ruim';
    if (idade < 40) return pct < 19 ? 'Excelente' : pct < 23 ? 'Bom' : pct < 27 ? 'Acima da Média' : pct < 31 ? 'Abaixo da Média' : 'Ruim';
    if (idade < 50) return pct < 20 ? 'Excelente' : pct < 24 ? 'Bom' : pct < 28 ? 'Acima da Média' : pct < 32 ? 'Abaixo da Média' : 'Ruim';
    return pct < 22 ? 'Excelente' : pct < 26 ? 'Bom' : pct < 30 ? 'Acima da Média' : pct < 34 ? 'Abaixo da Média' : 'Ruim';
  }
}

function calcularPesoIdeal() {
  const mm = parseFloat((document.getElementById('massaMagra').value || '').replace(' kg', ''));
  const pgIdeal = parseFloat(document.getElementById('percGorduraIdeal').value);
  if (!mm || !pgIdeal) { showToast('Calcule a composição corporal primeiro', 'error'); return; }
  const pi = mm / (1 - pgIdeal / 100);
  const sel = document.getElementById('alunoAntro');
  const id = parseInt(sel.value);
  const aluno = id ? state.alunos.find(a => a.id === id) : null;
  const peso = aluno ? parseFloat(aluno.peso) : 0;
  const mg = parseFloat((document.getElementById('massaGorda').value || '').replace(' kg', ''));
  document.getElementById('pesoIdeal').value = pi.toFixed(2) + ' kg';
  if (peso && mg) {
    const meta = Math.max(0, mg - (peso - pi));
    document.getElementById('gorduraPerder').value = meta.toFixed(2) + ' kg';
  }
  showToast('Peso ideal calculado!', 'success');
}

function renderResultadosAntro() {
  const box = document.getElementById('resultado-antro-box');
  if (!box) return;
  const dc = document.getElementById('densidade').value;
  const siri = document.getElementById('percGorduraSiri').value;
  const mg = document.getElementById('massaGorda').value;
  const mm = document.getElementById('massaMagra').value;
  const cls = document.getElementById('classGordura').value;
  const pi = document.getElementById('pesoIdeal').value;
  const pgIdeal = document.getElementById('percGorduraIdeal').value;
  
  const sel = document.getElementById('alunoAntro');
  const id = sel.value;
  const aluno = id ? state.alunos.find(a => String(a.id) === String(id)) : null;
  const pesoAtual = parseFloat(document.getElementById('c-peso')?.value) || (aluno ? parseFloat(aluno.peso) : 0);
  const altCm = parseFloat(document.getElementById('c-altura')?.value) || (aluno ? parseFloat(aluno.altura) : 0);
  
  let imcStr = '—';
  let imcCls = '—';
  if (pesoAtual && altCm > 0) {
    const h = altCm / 100;
    const imcVal = pesoAtual / (h * h);
    imcStr = imcVal.toFixed(2);
    imcCls = getClassificacaoIMC(imcVal);
  }

  box.innerHTML = `
    <h2 class="section-title">Resultados da Avaliação</h2>
    <div class="result-grid">
      <div class="result-card highlight">
        <div class="rc-label">% Gordura Atual</div>
        <div class="rc-value">${siri}</div>
      </div>
      <div class="result-card highlight">
        <div class="rc-label">Classificação Gordura</div>
        <div class="rc-value" style="font-size:1.2rem">${cls}</div>
      </div>
      <div class="result-card highlight" style="background: #f0f9ff; border-color: #bae6fd;">
        <div class="rc-label" style="color: #0369a1;">IMC Atual</div>
        <div class="rc-value" style="color: #0284c7;">${imcStr}</div>
        <div style="font-size: 0.75rem; font-weight: bold; color: #0369a1; margin-top: 4px;">${imcCls}</div>
      </div>
      <div class="result-card">
        <div class="rc-label">Peso Atual</div>
        <div class="rc-value">${pesoAtual} kg</div>
      </div>
      <div class="result-card highlight" style="background: linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%); border-color: #86efac;">
        <div class="rc-label" style="color: #166534;">Peso Ideal</div>
        <div class="rc-value" style="color: #15803d;">${pi}</div>
      </div>
      <div class="result-card">
        <div class="rc-label">% Gordura Ideal</div>
        <div class="rc-value">${pgIdeal}%</div>
      </div>
      <div class="result-card">
        <div class="rc-label">Massa Magra</div>
        <div class="rc-value">${mm}</div>
      </div>
      <div class="result-card">
        <div class="rc-label">Massa Gorda</div>
        <div class="rc-value">${mg}</div>
      </div>
    </div>`;
}


function limparAntro() {
  document.querySelectorAll('#page-antropometria input:not([readonly])').forEach(el => el.value = '');
  const res = document.getElementById('resultado-antro-box');
  if (res) res.innerHTML = '<p class="result-placeholder">Preencha os dados e calcule para ver os resultados aqui.</p>';
}

function salvarAntro() {
  const selId = document.getElementById('alunoAntro').value;
  if (!selId) { showToast('Selecione um aluno', 'error'); return; }
  
  const perimetros = {};
  document.querySelectorAll('#tab-circunferencias input:not([readonly])').forEach(el => {
    if (el.id.startsWith('c-')) perimetros[el.id.replace('c-', '')] = el.value;
  });

  const dobras = {};
  document.querySelectorAll('#tab-dobras input:not([readonly])').forEach(el => {
    if (el.id.startsWith('d-')) dobras[el.id.replace('d-', '')] = el.value;
  });

  const p = document.getElementById('c-peso')?.value || state.alunos.find(a => String(a.id) === String(selId))?.peso || 0;
  const h = document.getElementById('c-altura')?.value || state.alunos.find(a => String(a.id) === String(selId))?.altura || 0;
  let imcCalc = '';
  if (p && h > 0) {
    const hm = h / 100;
    imcCalc = (p / (hm * hm)).toFixed(2);
  }

  const avaliacao = {
    id: Date.now(),
    alunoId: String(selId),
    data: document.getElementById('dataAntro').value || new Date().toISOString().slice(0, 10),
    biotipo: document.getElementById('antro-biotipo').value,
    peso: p,
    altura: h,
    percGordura: (document.getElementById('percGorduraSiri').value || '').replace('%', ''),
    massaMagra: (document.getElementById('massaMagra').value || '').replace(' kg', ''),
    massaGorda: (document.getElementById('massaGorda').value || '').replace(' kg', ''),
    imc: imcCalc,
    pesoIdeal: (document.getElementById('pesoIdeal').value || '').replace(' kg', ''),
    percGorduraIdeal: document.getElementById('percGorduraIdeal').value,
    classificacao: document.getElementById('classGordura').value,
    protocolo: document.getElementById('protocoloAntro').value || document.getElementById('protocolo-composicao-circ').value || 'N/A',
    rcq: document.getElementById('rcq').value,
    perimetros,
    dobras
  };
  state.avaliacoes.push(avaliacao);
  saveState();
  showToast('Avaliação salva com sucesso!', 'success');
  carregarEvolucaoAntro(); // Refresh evolution after saving
}

function carregarComparativoAntro() {
  const selId = document.getElementById('alunoAntro').value;
  const selAnt = document.getElementById('comp-av-anterior');
  const selAtu = document.getElementById('comp-av-atual');
  const container = document.getElementById('container-tabela-comparativa');

  if (!selId) {
    container.innerHTML = '<p style="text-align:center; padding:2rem; color:#64748b;">Selecione um aluno para comparar as avaliações.</p>';
    return;
  }

  // Obter todas as avaliações do aluno e dobras/circunferências
  const avs = state.avaliacoes.filter(a => String(a.alunoId) === String(selId)).sort((a, b) => new Date(b.data) - new Date(a.data));
  
  if (avs.length < 2) {
    container.innerHTML = '<p style="text-align:center; padding:2rem; color:#64748b;">Este aluno precisa de pelo menos duas avaliações para realizar o comparativo.</p>';
    return;
  }

  // Preencher os selects
  const options = avs.map(a => `<option value="${a.id}">${new Date(a.data).toLocaleDateString('pt-BR')} - ${a.peso}kg (${a.percGordura}%)</option>`).join('');
  selAnt.innerHTML = options;
  selAtu.innerHTML = options;

  // Selecionar por padrão a última (atual) e a penúltima (anterior)
  selAnt.selectedIndex = 1;
  selAtu.selectedIndex = 0;

  renderTabelaComparativa();
}

function renderTabelaComparativa() {
  const idAnt = document.getElementById('comp-av-anterior').value;
  const idAtu = document.getElementById('comp-av-atual').value;
  const container = document.getElementById('container-tabela-comparativa');

  const avAnt = state.avaliacoes.find(a => String(a.id) === String(idAnt));
  const avAtu = state.avaliacoes.find(a => String(a.id) === String(idAtu));

  if (!avAnt || !avAtu) return;

  const diff = (v1, v2, reverse = false) => {
    const val1 = parseFloat(v1) || 0;
    const val2 = parseFloat(v2) || 0;
    const d = (val2 - val1).toFixed(2);
    
    // Para gordura/peso, diminuir é bom (verde). Para massa magra, aumentar é bom (verde).
    let color = '#64748b';
    if (d > 0) color = reverse ? '#10b981' : '#ef4444';
    else if (d < 0) color = reverse ? '#ef4444' : '#10b981';
    
    const signal = d > 0 ? '+' : '';
    return `<span style="color:${color}; font-weight:bold;">${signal}${d}</span>`;
  };

  const rows = [
    { label: 'Peso (kg)', v1: avAnt.peso, v2: avAtu.peso },
    { label: '% Gordura', v1: avAnt.percGordura, v2: avAtu.percGordura },
    { label: 'Massa Magra (kg)', v1: avAnt.massaMagra, v2: avAtu.massaMagra, rev: true },
    { label: 'Massa Gorda (kg)', v1: avAnt.massaGorda, v2: avAtu.massaGorda },
    { label: 'IMC', v1: avAnt.imc, v2: avAtu.imc },
    { type: 'header', label: 'Circunferências (cm)' },
    { label: 'Pescoço', v1: avAnt.perimetros?.pescoco, v2: avAtu.perimetros?.pescoco, rev: true },
    { label: 'Ombro', v1: avAnt.perimetros?.ombro, v2: avAtu.perimetros?.ombro, rev: true },
    { label: 'Peito', v1: avAnt.perimetros?.['peito-normal'], v2: avAtu.perimetros?.['peito-normal'], rev: true },
    { label: 'Cintura', v1: avAnt.perimetros?.cintura, v2: avAtu.perimetros?.cintura },
    { label: 'Abdômen', v1: avAnt.perimetros?.abdomen, v2: avAtu.perimetros?.abdomen },
    { label: 'Quadril', v1: avAnt.perimetros?.quadril, v2: avAtu.perimetros?.quadril },
    { label: 'Braço D', v1: avAnt.perimetros?.['braco-dir'], v2: avAtu.perimetros?.['braco-dir'], rev: true },
    { label: 'Braço E', v1: avAnt.perimetros?.['braco-esq'], v2: avAtu.perimetros?.['braco-esq'], rev: true },
    { label: 'Coxa D', v1: avAnt.perimetros?.['coxa-dir'], v2: avAtu.perimetros?.['coxa-dir'], rev: true },
    { label: 'Coxa E', v1: avAnt.perimetros?.['coxa-esq'], v2: avAtu.perimetros?.['coxa-esq'], rev: true },
    { label: 'Panturrilha D', v1: avAnt.perimetros?.['panturrilha-dir'], v2: avAtu.perimetros?.['panturrilha-dir'], rev: true },
    { label: 'Panturrilha E', v1: avAnt.perimetros?.['panturrilha-esq'], v2: avAtu.perimetros?.['panturrilha-esq'], rev: true },
    { type: 'header', label: 'Dobras Cutâneas (mm)' },
    { label: 'Subescapular', v1: avAnt.dobras?.subescapular, v2: avAtu.dobras?.subescapular },
    { label: 'Tríceps', v1: avAnt.dobras?.triceps, v2: avAtu.dobras?.triceps },
    { label: 'Bíceps', v1: avAnt.dobras?.biceps, v2: avAtu.dobras?.biceps },
    { label: 'Peitoral', v1: avAnt.dobras?.peitoral, v2: avAtu.dobras?.peitoral },
    { label: 'Axilar Média', v1: avAnt.dobras?.axilar, v2: avAtu.dobras?.axilar },
    { label: 'Suprailíaca', v1: avAnt.dobras?.suprailiaca, v2: avAtu.dobras?.suprailiaca },
    { label: 'Abdominal', v1: avAnt.dobras?.abdominal, v2: avAtu.dobras?.abdominal },
    { label: 'Coxa', v1: avAnt.dobras?.coxa, v2: avAtu.dobras?.coxa },
    { label: 'Perna Medial', v1: avAnt.dobras?.perna, v2: avAtu.dobras?.perna },
  ];

  container.innerHTML = `
    <table class="data-table" style="width:100%; text-align:center; border-collapse: collapse;">
      <thead style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
        <tr>
          <th style="text-align:left; padding:12px;">Parâmetro</th>
          <th style="padding:12px;">Anterior (${new Date(avAnt.data + 'T00:00:00').toLocaleDateString('pt-BR')})</th>
          <th style="padding:12px;">Atual (${new Date(avAtu.data + 'T00:00:00').toLocaleDateString('pt-BR')})</th>
          <th style="padding:12px;">Diferença</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => {
          if (r.type === 'header') {
            return `<tr style="background:#f1f5f9;"><td colspan="4" style="text-align:left; font-weight:bold; padding:12px; color:#4f46e5; border-bottom:1px solid #e2e8f0;">${r.label}</td></tr>`;
          }
          const v1 = r.v1 || '—';
          const v2 = r.v2 || '—';
          return `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="text-align:left; padding:12px; font-weight:500;">${r.label}</td>
              <td style="color:#64748b; padding:12px;">${v1}</td>
              <td style="font-weight:bold; padding:12px;">${v2}</td>
              <td style="padding:12px;">${v1 !== '—' && v2 !== '—' ? diff(v1, v2, r.rev) : '—'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function carregarComparativoAntro() {
  const selId = document.getElementById('alunoAntro').value;
  const selAnt = document.getElementById('comp-av-anterior');
  const selAtu = document.getElementById('comp-av-atual');
  const container = document.getElementById('container-tabela-comparativa');

  if (!selId) {
    container.innerHTML = '<p style="text-align:center; padding:2rem; color:#64748b;">Selecione um aluno para comparar as avaliações.</p>';
    return;
  }

  // Obter todas as avaliações do aluno e dobras/circunferências
  const avs = state.avaliacoes.filter(a => String(a.alunoId) === String(selId)).sort((a, b) => new Date(b.data) - new Date(a.data));
  
  if (avs.length < 2) {
    container.innerHTML = '<p style="text-align:center; padding:2rem; color:#64748b;">Este aluno precisa de pelo menos duas avaliações para realizar o comparativo.</p>';
    return;
  }

  // Preencher os selects
  const options = avs.map(a => `<option value="${a.id}">${new Date(a.data).toLocaleDateString('pt-BR')} - ${a.peso}kg (${a.percGordura}%)</option>`).join('');
  selAnt.innerHTML = options;
  selAtu.innerHTML = options;

  // Selecionar por padrão a última (atual) e a penúltima (anterior)
  selAnt.selectedIndex = 1;
  selAtu.selectedIndex = 0;

  renderTabelaComparativa();
}

function renderTabelaComparativa() {
  const idAnt = document.getElementById('comp-av-anterior').value;
  const idAtu = document.getElementById('comp-av-atual').value;
  const container = document.getElementById('container-tabela-comparativa');

  const avAnt = state.avaliacoes.find(a => String(a.id) === String(idAnt));
  const avAtu = state.avaliacoes.find(a => String(a.id) === String(idAtu));

  if (!avAnt || !avAtu) return;

  const diff = (v1, v2, reverse = false) => {
    const val1 = parseFloat(v1) || 0;
    const val2 = parseFloat(v2) || 0;
    const d = (val2 - val1).toFixed(2);
    
    // Para gordura/peso, diminuir é bom (verde). Para massa magra, aumentar é bom (verde).
    let color = '#64748b';
    if (d > 0) color = reverse ? '#10b981' : '#ef4444';
    else if (d < 0) color = reverse ? '#ef4444' : '#10b981';
    
    const signal = d > 0 ? '+' : '';
    return `<span style="color:${color}; font-weight:bold;">${signal}${d}</span>`;
  };

  const rows = [
    { label: 'Peso (kg)', v1: avAnt.peso, v2: avAtu.peso },
    { label: '% Gordura', v1: avAnt.percGordura, v2: avAtu.percGordura },
    { label: 'Massa Magra (kg)', v1: avAnt.massaMagra, v2: avAtu.massaMagra, rev: true },
    { label: 'Massa Gorda (kg)', v1: avAnt.massaGorda, v2: avAtu.massaGorda },
    { label: 'IMC', v1: avAnt.imc, v2: avAtu.imc },
    { type: 'header', label: 'Circunferências (cm)' },
    { label: 'Pescoço', v1: avAnt.perimetros?.pescoco, v2: avAtu.perimetros?.pescoco, rev: true },
    { label: 'Ombro', v1: avAnt.perimetros?.ombro, v2: avAtu.perimetros?.ombro, rev: true },
    { label: 'Peito', v1: avAnt.perimetros?.['peito-normal'], v2: avAtu.perimetros?.['peito-normal'], rev: true },
    { label: 'Cintura', v1: avAnt.perimetros?.cintura, v2: avAtu.perimetros?.cintura },
    { label: 'Abdômen', v1: avAnt.perimetros?.abdomen, v2: avAtu.perimetros?.abdomen },
    { label: 'Quadril', v1: avAnt.perimetros?.quadril, v2: avAtu.perimetros?.quadril },
    { label: 'Braço D', v1: avAnt.perimetros?.['braco-dir'], v2: avAtu.perimetros?.['braco-dir'], rev: true },
    { label: 'Braço E', v1: avAnt.perimetros?.['braco-esq'], v2: avAtu.perimetros?.['braco-esq'], rev: true },
    { label: 'Coxa D', v1: avAnt.perimetros?.['coxa-dir'], v2: avAtu.perimetros?.['coxa-dir'], rev: true },
    { label: 'Coxa E', v1: avAnt.perimetros?.['coxa-esq'], v2: avAtu.perimetros?.['coxa-esq'], rev: true },
    { label: 'Panturrilha D', v1: avAnt.perimetros?.['panturrilha-dir'], v2: avAtu.perimetros?.['panturrilha-dir'], rev: true },
    { label: 'Panturrilha E', v1: avAnt.perimetros?.['panturrilha-esq'], v2: avAtu.perimetros?.['panturrilha-esq'], rev: true },
    { type: 'header', label: 'Dobras Cutâneas (mm)' },
    { label: 'Subescapular', v1: avAnt.dobras?.subescapular, v2: avAtu.dobras?.subescapular },
    { label: 'Tríceps', v1: avAnt.dobras?.triceps, v2: avAtu.dobras?.triceps },
    { label: 'Bíceps', v1: avAnt.dobras?.biceps, v2: avAtu.dobras?.biceps },
    { label: 'Peitoral', v1: avAnt.dobras?.peitoral, v2: avAtu.dobras?.peitoral },
    { label: 'Axilar Média', v1: avAnt.dobras?.axilar, v2: avAtu.dobras?.axilar },
    { label: 'Suprailíaca', v1: avAnt.dobras?.suprailiaca, v2: avAtu.dobras?.suprailiaca },
    { label: 'Abdominal', v1: avAnt.dobras?.abdominal, v2: avAtu.dobras?.abdominal },
    { label: 'Coxa', v1: avAnt.dobras?.coxa, v2: avAtu.dobras?.coxa },
    { label: 'Perna Medial', v1: avAnt.dobras?.perna, v2: avAtu.dobras?.perna },
  ];

  container.innerHTML = `
    <table class="data-table" style="width:100%; text-align:center; border-collapse: collapse;">
      <thead style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
        <tr>
          <th style="text-align:left; padding:12px;">Parâmetro</th>
          <th style="padding:12px;">Anterior (${new Date(avAnt.data).toLocaleDateString('pt-BR')})</th>
          <th style="padding:12px;">Atual (${new Date(avAtu.data).toLocaleDateString('pt-BR')})</th>
          <th style="padding:12px;">Diferença</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => {
          if (r.type === 'header') {
            return `<tr style="background:#f1f5f9;"><td colspan="4" style="text-align:left; font-weight:bold; padding:12px; color:#4f46e5; border-bottom:1px solid #e2e8f0;">${r.label}</td></tr>`;
          }
          const v1 = r.v1 || '—';
          const v2 = r.v2 || '—';
          return `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="text-align:left; padding:12px; font-weight:500;">${r.label}</td>
              <td style="color:#64748b; padding:12px;">${v1}</td>
              <td style="font-weight:bold; padding:12px;">${v2}</td>
              <td style="padding:12px;">${v1 !== '—' && v2 !== '—' ? diff(v1, v2, r.rev) : '—'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// ==================== VO2MAX ====================
const vo2Protocolos = {
  bruce: {
    nome: 'Protocolo de Bruce (1973) – Esteira',
    descricao: 'Protocolo máximo em esteira com estágios de 3 minutos. Amplamente utilizado em populações saudáveis e cardíacas.',
    campos: [
      { id: 'vo2-bruce-tempo', label: 'Tempo Total (minutos decimais)', type: 'number', step: '0.1', placeholder: 'Ex: 10.5' },
      { id: 'vo2-bruce-sexo', label: 'Sexo', type: 'select', options: [['M','Masculino'],['F','Feminino']] },
    ],
    formula: `VO2máx (Homens) = 14,76 − 1,379 × T + 0,451 × T² − 0,012 × T³\nVO2máx (Mulheres) = 4,38 × T − 3,90`,
    calc: () => {
      const T = parseFloat(document.getElementById('vo2-bruce-tempo').value);
      const sexo = document.getElementById('vo2-bruce-sexo').value;
      if (isNaN(T)) return null;
      if (sexo === 'M') return 14.76 - 1.379 * T + 0.451 * T * T - 0.012 * T * T * T;
      return 4.38 * T - 3.90;
    }
  },
  // Add other protocols as needed, keeping it simple for now
};

function carregarProtocolo() {
  const key = document.getElementById('protocoloVO2').value;
  const p = vo2Protocolos[key];
  if (!p) return;

  const desc = document.getElementById('protocolo-descricao');
  if (desc) desc.innerHTML = `<strong>${p.nome}</strong><br>${p.descricao}`;

  let camposHTML = '<div class="form-row">';
  p.campos.forEach(c => {
    camposHTML += `<div class="form-group"><label>${c.label}</label>`;
    if (c.type === 'select') {
      camposHTML += `<select id="${c.id}">`;
      c.options.forEach(o => camposHTML += `<option value="${o[0]}">${o[1]}</option>`);
      camposHTML += '</select>';
    } else {
      camposHTML += `<input type="${c.type}" id="${c.id}" step="${c.step||'1'}" placeholder="${c.placeholder||''}" />`;
    }
    camposHTML += '</div>';
  });
  camposHTML += '</div>';

  const pc = document.getElementById('protocolo-campos');
  if (pc) pc.innerHTML = camposHTML;
  
  const fb = document.getElementById('protocolo-formula');
  if (fb) {
    fb.style.display = 'block';
    fb.innerHTML = `<strong>Fórmula:</strong><br><pre style="white-space:pre-wrap;font-family:inherit;margin-top:0.5rem;">${p.formula}</pre>`;
  }
}

function calcularVO2() {
  const key = document.getElementById('protocoloVO2').value;
  const p = vo2Protocolos[key];
  if (!p || !p.calc) { showToast('Selecione um protocolo válido', 'error'); return; }
  const vo2 = p.calc();
  if (vo2 === null || isNaN(vo2)) { showToast('Preencha todos os campos necessários', 'error'); return; }
  const sel = document.getElementById('alunoVO2');
  const id = parseInt(sel.value);
  const aluno = id ? state.alunos.find(a => a.id === id) : null;
  const sexo = aluno ? aluno.sexo : 'M';
  const idade = aluno ? parseInt(aluno.idade) : 30;
  const cls = classificarVO2(vo2, sexo, idade);

  const box = document.getElementById('resultado-vo2');
  if (box) {
    box.style.display = 'block';
    box.innerHTML = `
      <h2 class="section-title">Resultado do Teste</h2>
      <div class="result-grid">
        <div class="result-card highlight"><div class="rc-label">VO2máx</div><div class="rc-value">${vo2.toFixed(1)}</div><div class="rc-unit">mL·kg⁻¹·min⁻¹</div></div>
        <div class="result-card"><div class="rc-label">Classificação</div><div class="rc-value" style="font-size:1rem">${cls.classe}</div></div>
      </div>`;
    window._ultimoVO2 = { vo2, cls: cls.classe, protocolo: p.nome };
    box.scrollIntoView({ behavior: 'smooth' });
  }
}

function classificarVO2(vo2, sexo, idade) {
  const classes = ['Fraco', 'Abaixo da Média', 'Média', 'Acima da Média', 'Bom', 'Excelente', 'Superior'];
  // Simplified classification
  let cls = 3; 
  if (vo2 < 25) cls = 0; else if (vo2 < 35) cls = 1; else if (vo2 < 45) cls = 2; else if (vo2 < 55) cls = 4; else if (vo2 < 65) cls = 5; else cls = 6;
  return { classe: classes[cls], idx: cls };
}

function salvarVO2() {
  const selId = document.getElementById('alunoVO2').value;
  if (!selId || !window._ultimoVO2) { showToast('Calcule o teste primeiro', 'error'); return; }
  const teste = {
    id: Date.now(),
    alunoId: selId,
    data: document.getElementById('dataVO2').value,
    vo2: window._ultimoVO2.vo2,
    classificacao: window._ultimoVO2.cls,
    protocolo: window._ultimoVO2.protocolo,
  };
  state.testes.push(teste);
  saveState();
  showToast('Teste salvo com sucesso!', 'success');
}

// Renderizar tabelas de referência ao carregar
document.addEventListener('DOMContentLoaded', () => {
  // Tabela de técnicas
  const tb = document.getElementById('tabela-tecnicas-corpo');
  if (tb) tb.innerHTML = TECNICAS_DB.map(t =>
    `<tr><td><strong>${t.nome}</strong></td><td>${t.categoria}</td><td style="font-size:0.78rem">${t.intensidade}</td><td>${t.series}</td><td>${t.descanso}</td><td>${t.nivel}</td></tr>`
  ).join('');
  
  // Tabela de protocolos
  const tp = document.getElementById('tabela-protocolos-corpo');
  if (tp) tp.innerHTML = PROTOCOLOS_DB.map(p => `
    <div style="margin-bottom:1rem;padding:1rem;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
      <strong style="color:#1d4ed8">${p.nome}</strong> – <span style="font-size:0.85rem">${p.descricao}</span>
      <div class="table-wrapper" style="margin-top:0.5rem;">
        <table class="data-table" style="font-size:0.78rem;">
          <thead><tr><th>Período</th><th>Objetivo</th><th>Séries</th><th>Reps</th><th>Intensidade</th></tr></thead>
          <tbody>${p.fase.map(f=>`<tr><td>${f.sem}</td><td>${f.obj}</td><td>${f.series}</td><td>${f.reps}</td><td>${f.int}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <p style="font-size:0.72rem;color:#64748b;margin-top:4px;">Ref: ${p.ref}</p>
    </div>`).join('');
    
  // Verificar se já está logado
  if (localStorage.getItem('isAdmin') === 'true') {
    const portalContainer = document.getElementById('portal-container');
    const app = document.getElementById('app');
    if (portalContainer) portalContainer.style.display = 'none';
    if (app) {
      app.style.setProperty('display', 'block', 'important');
      app.classList.add('auth-ready');
    }
    renderAlunosGrid();
    if (typeof initPresc === 'function') initPresc();
    showPage('cadastro');
  }
});

function checkAdminAuth() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const portalContainer = document.getElementById('portal-container');
  const app = document.getElementById('app');

  if (isAdmin) {
    if (portalContainer) portalContainer.style.display = 'none';
    if (app) {
      app.style.setProperty('display', 'block', 'important');
      app.classList.add('auth-ready');
    }
  } else {
    if (portalContainer) portalContainer.style.display = 'block';
    if (app) {
      app.style.setProperty('display', 'none', 'important');
      app.classList.remove('auth-ready');
    }
  }
}

function carregarEvolucao() {
  const container = document.getElementById('lista-evolucao-geral');
  const selId = document.getElementById('alunoAntro')?.value;
  
  if (!container || !selId) return;

  const avs = state.avaliacoes.filter(a => String(a.alunoId) === String(selId)).sort((a, b) => new Date(b.data + 'T00:00:00') - new Date(a.data + 'T00:00:00'));

  if (avs.length === 0) {
    container.innerHTML = '<tr><td colspan="6" style="text-align:center">Nenhuma avaliação encontrada.</td></tr>';
  } else {
    container.innerHTML = avs.map(a => `
      <tr>
        <td>${new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
        <td>${a.peso} kg</td>
        <td>${a.percGordura}%</td>
        <td>${a.massaMagra} kg</td>
        <td>${a.imc}</td>
        <td style="text-align:center;">
          <button class="btn-primary" style="padding:6px 12px; font-size:0.75rem; border-radius:6px; background:#4f46e5;" onclick="showTab('tab-comparativo-antro'); verComparativoDireto('${a.alunoId}', '${a.id}')">📊 Comparar</button>
        </td>
      </tr>
    `).join('');
  }

  // Inicializar gráficos
  renderGraficoEvolucaoComposicao(selId);
  renderGraficoEvolucaoVO2(selId);
  popularSelectRM(selId);
}

function renderGraficoEvolucaoComposicao(alunoId) {
  const ctx = document.getElementById('chart-composicao');
  if (!ctx) return;

  const avs = state.avaliacoes
    .filter(a => String(a.alunoId) === String(alunoId))
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  if (window._chartComposicao) window._chartComposicao.destroy();

  window._chartComposicao = new Chart(ctx, {
    type: 'line',
    data: {
      labels: avs.map(a => new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR')),
      datasets: [
        {
          label: 'Gordura %',
          data: avs.map(a => a.percGordura),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Massa Magra (kg)',
          data: avs.map(a => a.massaMagra),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
}

function renderGraficoEvolucaoVO2(alunoId) {
  const ctx = document.getElementById('chart-vo2');
  if (!ctx) return;

  const testes = state.testes
    .filter(t => String(t.alunoId) === String(alunoId))
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  if (window._chartVO2) window._chartVO2.destroy();

  window._chartVO2 = new Chart(ctx, {
    type: 'line',
    data: {
      labels: testes.map(t => new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')),
      datasets: [{
        label: 'VO2máx (mL/kg/min)',
        data: testes.map(t => t.vo2),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function popularSelectRM(alunoId) {
  const sel = document.getElementById('rm-exercicio-graf');
  if (!sel) return;

  const rms = state.rms.filter(r => String(r.alunoId) === String(alunoId));
  const exUnicos = [...new Set(rms.map(r => r.exercicio))];

  sel.innerHTML = '<option value="">Selecione um Exercício</option>' + 
    exUnicos.map(ex => `<option value="${ex}">${ex}</option>`).join('');
}

function carregarGraficoRM() {
  const ctx = document.getElementById('chart-rm');
  const ex = document.getElementById('rm-exercicio-graf').value;
  const alunoId = document.getElementById('alunoEvolucao').value;
  
  if (!ctx || !ex || !alunoId) return;

  const dados = state.rms
    .filter(r => String(r.alunoId) === String(alunoId) && r.exercicio === ex)
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  if (window._chartRM) window._chartRM.destroy();

  window._chartRM = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dados.map(d => new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')),
      datasets: [{
        label: `1RM - ${ex}`,
        data: dados.map(d => d.rm),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function verComparativoDireto(alunoId, avId) {
  // Mudar para a aba de antropometria e abrir o comparativo
  showPage('antropometria');
  document.getElementById('alunoAntro').value = alunoId;
  showTab('tab-comparativo-antro');
  
  // Aguardar um pouco para os selects serem preenchidos e carregar os dados
  setTimeout(() => {
    carregarComparativoAntro();
    document.getElementById('comp-av-atual').value = avId;
    renderTabelaComparativa();
  }, 150);
}

function initEvolucao() {
  // Função mantida por compatibilidade, mas a lógica agora é disparada via aba Antropometria
  carregarEvolucao();
}

// Iniciar a página de evolução quando carregada
document.addEventListener('DOMContentLoaded', () => {
  // Garantir que os eventos de clique do admin funcionem com Enter
  const adminPass = document.getElementById('admin-pass');
  if (adminPass) {
    adminPass.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loginAdmin();
    });
  }

  // Pré-cadastro da Jessica Bruna solicitado pelo usuário
  const alunosExistentes = JSON.parse(localStorage.getItem('alunos') || '[]');
  if (!alunosExistentes.some(a => a.nome.toLowerCase() === 'jessicabruna' || a.email === 'jessica@email.com')) {
    const jessica = {
      id: 1711111111111,
      nome: 'Jessica Bruna',
      email: 'jessica@email.com',
      senha: '12345678',
      dataNasc: '1995-01-01',
      sexo: 'F',
      idade: 31,
      telefone: '(00) 00000-0000',
      objetivo: 'hipertrofia',
      tipo: 'pago',
      origem: 'online'
    };
    alunosExistentes.push(jessica);
    localStorage.setItem('alunos', JSON.stringify(alunosExistentes));
    state.alunos = alunosExistentes; // Atualiza o estado em memória
  }

  checkAdminAuth();
  
  if (localStorage.getItem('isAdmin') === 'true') {
    renderAlunosGrid();
    if (typeof initPresc === 'function') initPresc();
  }
  
  const hoje = new Date().toISOString().slice(0, 10);
  const dVO2 = document.getElementById('dataVO2');
  if (dVO2) dVO2.value = hoje;
  const dAntro = document.getElementById('dataAntro');
  if (dAntro) dAntro.value = hoje;
  
  if (document.getElementById('protocoloAntro')) mostrarProtocolo();
  if (document.getElementById('protocoloVO2')) carregarProtocolo();
});

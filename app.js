// ==================== STATE ====================
const state = {
  alunos: JSON.parse(localStorage.getItem('alunos') || '[]'),
  avaliacoes: JSON.parse(localStorage.getItem('avaliacoes') || '[]'),
  testes: JSON.parse(localStorage.getItem('testes') || '[]'),
  pagamentos: JSON.parse(localStorage.getItem('pagamentos') || '[]'),
  fichas: JSON.parse(localStorage.getItem('fichas') || '[]'),
  anamneses: JSON.parse(localStorage.getItem('anamneses') || '[]'),
  rms: JSON.parse(localStorage.getItem('rms') || '[]'),
  treinosCustom: JSON.parse(localStorage.getItem('treinosCustom') || '[]')
};

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
function showPage(name) {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const adminPages = ['meus-alunos', 'treino', 'comunidade', 'anamnese', 'antropometria', 'pagamentos'];
  
  if (adminPages.includes(name) && !isAdmin) {
    console.error('Acesso negado: Página restrita ao administrador.');
    showPage('cadastro');
    return;
  }

  console.log('Navegando para:', name);
  
  // Esconder todas as páginas
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });

  // Mostrar a página selecionada
  const page = document.getElementById('page-' + name);
  if (page) {
    page.classList.add('active');
    page.style.display = 'block';
    
    // Garantir renderização imediata de componentes específicos
    if (name === 'comunidade') {
      setTimeout(() => {
        renderMuralAdmin();
      }, 50);
    }
  }

  // Marcar botão como ativo de forma robusta
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.removeAttribute('aria-current');
    
    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${name}'`)) {
      btn.classList.add('active');
      btn.setAttribute('aria-current', 'page');
    }
  });

  // Ações específicas de cada página
  if (name !== 'cadastro') populateAlunoSelects();
  if (name === 'meus-alunos') renderListaGeralAlunos();
  if (name === 'pagamentos') renderPagamentos();
  if (name === 'evolucao') carregarEvolucao();
}

const showTab = (id) => {
  const target = document.getElementById(id);
  if (!target) return;

  const parent = target.closest('.page, .container');
  if (!parent) return;

  parent.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  target.classList.add('active');

  // Atualizar botões
  const tabBtns = parent.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (onclickAttr.includes(`'${id}'`) || onclickAttr.includes(`"${id}"`)) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    }
  });
};

// ==================== TOAST ====================
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3000);
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

function calcularIMC() {
  const peso = parseFloat(document.getElementById('peso').value);
  const alt = parseFloat(document.getElementById('altura').value);
  if (!peso || !alt) return;
  const h = alt / 100;
  const imc = peso / (h * h);
  document.getElementById('imc').value = imc.toFixed(2);
  let cls = '';
  if (imc < 18.5) cls = 'Abaixo do peso';
  else if (imc < 25) cls = 'Peso normal';
  else if (imc < 30) cls = 'Sobrepeso';
  else if (imc < 35) cls = 'Obesidade Grau I';
  else if (imc < 40) cls = 'Obesidade Grau II';
  else cls = 'Obesidade Grau III';
  document.getElementById('classImc').value = cls;
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
  };

  const idx = state.alunos.findIndex(a => a.id === id);
  if (idx >= 0) state.alunos[idx] = aluno; else state.alunos.push(aluno);
  
  saveState();
  showToast('Cadastro salvo com sucesso!', 'success');
  window._editingId = null;
  renderAlunosGrid();
  limparCadastro();
  
  // Mostrar modal de sucesso com opção de instalar app
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
    const dataAv = ultimaAv ? new Date(ultimaAv.data).toLocaleDateString('pt-BR') : '—';
    
    const pagamentos = state.pagamentos.filter(p => String(p.alunoId) === String(a.id));
    const ultimoPag = pagamentos.sort((x, y) => new Date(y.dataPag) - new Date(x.dataPag))[0];
    
    let statusPag = ultimoPag ? ultimoPag.status : 'pendente';
    // Se o tipo do aluno for gratuito, o status de pagamento deve ser GRATUITO (liberado)
    if (a.tipo === 'gratuito') statusPag = 'gratuito';
    
    const statusClass = `badge-${statusPag}`;

    return `
      <tr>
        <td>
          <strong>${a.nome}</strong>
          ${a.origem === 'online' ? '<br><span style="font-size:0.65rem; color:#2563eb; background:#dbeafe; padding:2px 4px; border-radius:4px;">CADASTRO ONLINE</span>' : ''}
        </td>
        <td>${a.idade} anos / ${a.sexo}</td>
        <td style="text-transform: capitalize;">${a.objetivo || '—'}</td>
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
  const pesoAtual = aluno ? aluno.peso : (document.getElementById('c-peso')?.value || '—');

  box.innerHTML = `
    <h2 class="section-title">Resultados da Avaliação</h2>
    <div class="result-grid">
      <div class="result-card highlight">
        <div class="rc-label">% Gordura Atual</div>
        <div class="rc-value">${siri}</div>
      </div>
      <div class="result-card highlight">
        <div class="rc-label">Classificação</div>
        <div class="rc-value" style="font-size:1.2rem">${cls}</div>
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

  const avaliacao = {
    id: Date.now(),
    alunoId: String(selId),
    data: document.getElementById('dataAntro').value || new Date().toISOString().slice(0, 10),
    biotipo: document.getElementById('antro-biotipo').value,
    peso: document.getElementById('c-peso')?.value || state.alunos.find(a => String(a.id) === String(selId))?.peso || '',
    altura: document.getElementById('c-altura')?.value || '',
    percGordura: (document.getElementById('percGorduraSiri').value || '').replace('%', ''),
    massaMagra: (document.getElementById('massaMagra').value || '').replace(' kg', ''),
    massaGorda: (document.getElementById('massaGorda').value || '').replace(' kg', ''),
    imc: (document.getElementById('imc')?.value || ''),
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

function carregarEvolucaoAntro() {
  const selId = document.getElementById('alunoAntro').value;
  if (!selId) {
    document.getElementById('lista-evolucao-antro').innerHTML = '<tr><td colspan="5" style="text-align:center">Selecione um aluno para ver a evolução.</td></tr>';
    return;
  }

  const avs = state.avaliacoes.filter(a => String(a.alunoId) === String(selId)).sort((a, b) => new Date(a.data) - new Date(b.data));
  const tbody = document.getElementById('lista-evolucao-antro');
  
  if (avs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Nenhuma avaliação encontrada para este aluno.</td></tr>';
    if (chartAntroEvolucao) chartAntroEvolucao.destroy();
    return;
  }

  tbody.innerHTML = avs.map(a => `
    <tr>
      <td>${new Date(a.data).toLocaleDateString('pt-BR')}</td>
      <td>${a.peso || '—'}</td>
      <td>${a.percGordura ? a.percGordura + '%' : '—'}</td>
      <td>${a.massaMagra ? a.massaMagra + ' kg' : '—'}</td>
      <td>${a.imc || '—'}</td>
    </tr>
  `).join('');

  // Render Chart
  const ctx = document.getElementById('chart-antro-evolucao')?.getContext('2d');
  if (!ctx) return;
  
  if (chartAntroEvolucao) chartAntroEvolucao.destroy();
  
  chartAntroEvolucao = new Chart(ctx, {
    type: 'line',
    data: {
      labels: avs.map(a => new Date(a.data).toLocaleDateString('pt-BR')),
      datasets: [
        {
          label: '% Gordura',
          data: avs.map(a => parseFloat(a.percGordura) || 0),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Peso (kg)',
          data: avs.map(a => parseFloat(a.peso) || 0),
          borderColor: '#ef4444',
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { title: { display: true, text: '% Gordura' } },
        y1: { 
          position: 'right', 
          title: { display: true, text: 'Peso (kg)' },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
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

// ==================== ADMIN LOGIN ====================
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
  const userInput = document.getElementById('admin-user');
  const passInput = document.getElementById('admin-pass');
  const user = userInput ? userInput.value : '';
  const pass = passInput ? passInput.value : '';
  const error = document.getElementById('admin-login-error');

  console.log('Tentativa de login admin:', user);

  // Login simples fixo para o administrador
  if (user === 'adrianoquake' && pass === 'adri080979') {
    localStorage.setItem('isAdmin', 'true');
    
    // Transição de página
    checkAdminAuth();
    
    // Inicializar dados após login
    renderAlunosGrid();
    if (typeof initPresc === 'function') initPresc();
    renderMuralAdmin();
    
    showPage('cadastro');
    
    // Limpar campos após login
    if (userInput) userInput.value = '';
    if (passInput) passInput.value = '';
    if (error) error.style.display = 'none';
  } else {
    if (error) error.style.display = 'block';
  }
}

function logoutAdmin() {
  localStorage.removeItem('isAdmin');
  location.reload();
}

function checkAdminAuth() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const portalContainer = document.getElementById('portal-container');
  const app = document.getElementById('app');

  console.log('Verificando Autenticação Admin:', isAdmin);

  if (isAdmin) {
    if (portalContainer) portalContainer.style.display = 'none';
    if (app) {
      app.classList.add('auth-ready');
      app.style.display = 'block';
    }
    
    // Mostrar abas administrativas
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = ''; 
    });
  } else {
    if (portalContainer) portalContainer.style.display = 'block';
    if (app) {
      app.classList.remove('auth-ready');
      app.style.display = 'none';
    }
    
    // Esconder abas administrativas
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'none';
    });
  }
}

// ==================== COMUNIDADE E MURAL ====================
const MENSAGENS_DIARIAS = {
  0: "☀️ Domingo de descanso merecido! Aproveite para recarregar as energias e preparar a mente para a nova semana que vem por aí! 🔋",
  1: "🚀 Segunda-feira: Dia de começar com tudo! O treino de hoje é a base para uma semana incrível. Vamos pra cima! 💪",
  2: "🔥 Terça-feira no foco total! A constância é o que traz o resultado. Não pare agora! ⚡",
  3: "🎯 Quarta-feira: Metade da semana já foi! Mantenha a disciplina e o ritmo. Cada repetição conta! 🏋️",
  4: "⚡ Quinta-feira: O cansaço tenta parar, mas sua meta é maior! Bora esmagar esse treino! 👊",
  5: "🌟 Sexta-feira: Dia de fechar a semana com chave de ouro! Sensação de dever cumprido é a melhor recompensa. Bora! 🏆",
  6: "🔥 Sábado também é dia! Quem treina no fim de semana chega mais rápido no objetivo. Foco total! 🚀"
};

const CATEGORIAS_MENSAGENS = {
  incentivo: [
    "Parabéns pelo foco! Continue assim e os resultados virão! 💪",
    "Não pare agora, você está no caminho certo! 🚀",
    "Cada gota de suor é um passo rumo ao seu objetivo! 🔥",
    "A disciplina vence o talento quando o talento não tem disciplina! 🎯"
  ],
  saude: [
    "Lembre-se de beber bastante água hoje! 💧",
    "Uma boa noite de sono é fundamental para a recuperação muscular! 😴",
    "Alimente-se bem, seu corpo é seu templo! 🍎",
    "Não esqueça de alongar após o treino! 🧘"
  ],
  cobranca: [
    "Sentimos sua falta no treino hoje! O que aconteceu? 🤔",
    "A constância é a chave do sucesso. Vamos retomar o ritmo? ⚡",
    "Seu plano está vencendo, não esqueça de renovar para continuar treinando! 💳"
  ]
};

function renderMuralAdmin() {
  const mural = document.getElementById('admin-mural-mensagens');
  const stats = document.getElementById('mural-stats');
  const gridDiario = document.getElementById('mensagens-diarias-grid');
  
  console.log('Iniciando renderização do Mural Admin...');
  
  if (!mural) {
    console.error('ERRO CRÍTICO: Elemento admin-mural-mensagens não encontrado no DOM!');
    return;
  }

  try {
    let mensagens = [];
    try {
      mensagens = JSON.parse(localStorage.getItem('mural_feedbacks') || '[]');
    } catch (e) {
      console.error('Erro ao ler mensagens do mural:', e);
      mensagens = [];
    }

    // Renderizar Estatísticas
    if (stats) {
      const total = mensagens.length;
      const admin = mensagens.filter(m => m.isAdmin).length;
      const alunosIds = [...new Set(mensagens.filter(m=>!m.isAdmin).map(m=>m.alunoId))];
      stats.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px; background: white; padding: 12px; border-radius: 10px; border: 1px solid #bfdbfe;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem;"><span>Total:</span> <strong>${total}</strong></div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem;"><span>Admin:</span> <strong>${admin}</strong></div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem;"><span>Alunos:</span> <strong>${alunosIds.length}</strong></div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #dc2626;"><span>Pendentes:</span> <strong>${mensagens.filter(m => !m.isAdmin && !m.respostaProfessor).length}</strong></div>
        </div>
      `;
    }

    // Renderizar Sugestões e Categorias
    if (gridDiario) {
      const hoje = new Date().getDay();
      const msgHoje = MENSAGENS_DIARIAS[hoje] || "Bom treino!";
      
      gridDiario.innerHTML = `
        <div style="margin-bottom: 10px;">
          <p style="font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">⭐ Sugestão Hoje</p>
          <button onclick="enviarMensagemRapida('${msgHoje.replace(/'/g, "\\'")}')" 
                  style="text-align: left; padding: 10px; border-radius: 8px; border: 1px solid #2563eb; 
                         background: #eff6ff; cursor: pointer; width: 100%;">
            <span style="font-size: 0.75rem; color: #1e293b; line-height: 1.3;">${msgHoje}</span>
          </button>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${Object.entries(CATEGORIAS_MENSAGENS).map(([cat, msgs]) => `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <div style="background: #f8fafc; padding: 4px 8px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0;">
                ${cat === 'incentivo' ? '💪 Incentivo' : cat === 'saude' ? '🍎 Saúde' : '💳 Cobrança'}
              </div>
              ${msgs.map(m => `
                <button onclick="enviarMensagemRapida('${m.replace(/'/g, "\\'")}')" 
                        style="text-align: left; padding: 6px 8px; background: white; border: none; border-bottom: 1px solid #f1f5f9; cursor: pointer; font-size: 0.7rem; color: #334155; width: 100%;">
                  ${m.substring(0, 35)}...
                </button>
              `).join('')}
            </div>
          `).join('')}
        </div>
      `;
    }

    if (mensagens.length === 0) {
      mural.innerHTML = `
        <div style="text-align: center; color: #94a3b8; padding: 40px;">
          <div style="font-size: 3rem; margin-bottom: 10px;">💬</div>
          <p>Nenhuma mensagem ainda.</p>
          <p style="font-size: 0.8rem;">Envie um comunicado para seus alunos!</p>
        </div>
      `;
      return;
    }

    mural.innerHTML = mensagens.map(m => {
      const ehDuvidaPendente = !m.isAdmin && !m.respostaProfessor;
      return `
      <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid ${ehDuvidaPendente ? '#ef4444' : '#e2e8f0'}; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); position: relative;">
        ${ehDuvidaPendente ? '<div style="position: absolute; top: 5px; right: 5px; background: #ef4444; color: white; font-size: 0.55rem; padding: 2px 6px; border-radius: 4px; font-weight: 800;">PENDENTE</div>' : ''}
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; background: ${m.isAdmin ? '#2563eb' : (ehDuvidaPendente ? '#ef4444' : '#f1f5f9')}; color: ${m.isAdmin || ehDuvidaPendente ? 'white' : '#475569'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;">
              ${(m.nome || 'A').charAt(0)}
            </div>
            <div>
              <strong style="color: ${m.isAdmin ? '#2563eb' : '#1e293b'}; font-size: 0.85rem;">
                ${m.nome || 'Aluno'} ${m.isAdmin ? '⭐' : ''}
              </strong>
              <div style="font-size: 0.65rem; color: #94a3b8;">${m.data}</div>
            </div>
          </div>
          <button onclick="removerMensagemMural(${m.id})" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.7rem; font-weight: 700;">EXCLUIR</button>
        </div>
        
        <div style="font-size: 0.9rem; color: #334155; line-height: 1.5; margin-bottom: 10px; padding-left: 40px;">
          ${m.texto}
        </div>
        
        ${m.respostaProfessor ? `
          <div style="margin-left: 40px; background: #f0fdf4; border-left: 3px solid #16a34a; padding: 8px; border-radius: 6px; margin-bottom: 10px;">
            <div style="font-size: 0.85rem; color: #14532d;">${m.respostaProfessor}</div>
          </div>
        ` : ''}

        <div style="display: flex; flex-direction: column; gap: 8px; padding-left: 40px;">
          <div style="display: flex; gap: 5px; align-items: center; flex-wrap: wrap;">
            <button onclick="reagirMural(${m.id}, '👍')" style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 15px; cursor: pointer; font-size: 0.9rem;">👍</button>
            <button onclick="reagirMural(${m.id}, '❤️')" style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 15px; cursor: pointer; font-size: 0.9rem;">❤️</button>
            <button onclick="reagirMural(${m.id}, '💪')" style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 15px; cursor: pointer; font-size: 0.9rem;">💪</button>
            <button onclick="reagirMural(${m.id}, '🔥')" style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 15px; cursor: pointer; font-size: 0.9rem;">🔥</button>
            
            <div style="margin-left: auto; display: flex; gap: 3px;">
              ${(m.reacoes || []).map(r => `<span style="background: #eff6ff; padding: 2px 6px; border-radius: 8px; border: 1px solid #bfdbfe; font-size: 0.75rem;">${r}</span>`).join('')}
            </div>
          </div>

          ${!m.isAdmin ? `
            <div style="display: flex; gap: 5px;">
              <input type="text" id="reply-input-${m.id}" placeholder="Responder dúvida..." style="flex: 1; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.8rem; outline: none;" onkeypress="if(event.key==='Enter') responderMensagem(${m.id})">
              <button onclick="responderMensagem(${m.id})" style="background: #1e293b; color: white; border: none; padding: 0 10px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.75rem;">OK</button>
            </div>
          ` : ''}
        </div>
      </div>
    `; }).reverse().join(''); 
    
    console.log('Mural renderizado com sucesso.');
  } catch (err) {
    console.error('Erro ao renderizar mural admin:', err);
    mural.innerHTML = `<p style="color: red; padding: 20px;">Erro ao carregar mensagens. Tente atualizar a página.</p>`;
  }
}

function reagirMural(id, emoji) {
  const mensagens = JSON.parse(localStorage.getItem('mural_feedbacks') || '[]');
  const idx = mensagens.findIndex(m => m.id === id);
  if (idx >= 0) {
    if (!mensagens[idx].reacoes) mensagens[idx].reacoes = [];
    if (!mensagens[idx].reacoes.includes(emoji)) {
      mensagens[idx].reacoes.push(emoji);
      localStorage.setItem('mural_feedbacks', JSON.stringify(mensagens));
      renderMuralAdmin();
    }
  }
}

function enviarMensagemRapida(texto) {
  const input = document.getElementById('admin-input-msg');
  if (input) input.value = texto;
  adminEnviarMensagemMural();
}

function responderMensagem(id) {
  const input = document.getElementById(`reply-input-${id}`);
  const texto = input ? input.value.trim() : '';
  if (!texto) return;

  const mensagens = JSON.parse(localStorage.getItem('mural_feedbacks') || '[]');
  const idx = mensagens.findIndex(m => m.id === id);
  if (idx >= 0) {
    mensagens[idx].respostaProfessor = texto;
    if (!mensagens[idx].reacoes) mensagens[idx].reacoes = [];
    if (!mensagens[idx].reacoes.includes('❤️')) mensagens[idx].reacoes.push('❤️');
    localStorage.setItem('mural_feedbacks', JSON.stringify(mensagens));
    renderMuralAdmin();
    showToast('Resposta enviada!', 'success');
  }
}

function adminEnviarMensagemMural() {
  const input = document.getElementById('admin-input-msg');
  const texto = input ? input.value.trim() : '';
  if (!texto) return;

  const mensagens = JSON.parse(localStorage.getItem('mural_feedbacks') || '[]');
  const novaMsg = {
    id: Date.now(),
    alunoId: 'admin',
    nome: 'Professor Adriano',
    texto: texto,
    data: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    isAdmin: true,
    reacoes: []
  };

  mensagens.push(novaMsg);
  localStorage.setItem('mural_feedbacks', JSON.stringify(mensagens));
  if (input) input.value = '';
  renderMuralAdmin();
  showToast('Mensagem enviada!', 'success');
}

// Funções de ação do mural já definidas acima (reagirMural, etc)

function removerMensagemMural(id) {
  if (confirm('Excluir mensagem?')) {
    let mensagens = JSON.parse(localStorage.getItem('mural_feedbacks') || '[]');
    mensagens = mensagens.filter(m => m.id !== id);
    localStorage.setItem('mural_feedbacks', JSON.stringify(mensagens));
    renderMuralAdmin();
  }
}

// ==================== GESTÃO DE DADOS (BACKUP) ====================
function exportarSistema() {
  const backup = {
    alunos: JSON.parse(localStorage.getItem('alunos') || '[]'),
    avaliacoes: JSON.parse(localStorage.getItem('avaliacoes') || '[]'),
    testes: JSON.parse(localStorage.getItem('testes') || '[]'),
    pagamentos: JSON.parse(localStorage.getItem('pagamentos') || '[]'),
    fichas: JSON.parse(localStorage.getItem('fichas') || '[]'),
    anamneses: JSON.parse(localStorage.getItem('anamneses') || '[]'),
    rms: JSON.parse(localStorage.getItem('rms') || '[]'),
    treinosCustom: JSON.parse(localStorage.getItem('treinosCustom') || '[]'),
    mural_feedbacks: JSON.parse(localStorage.getItem('mural_feedbacks') || '[]')
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
  const link = document.createElement('a');
  link.setAttribute("href", dataStr);
  link.setAttribute("download", "backup_treinofit_" + new Date().toISOString().slice(0,10) + ".json");
  link.click();
  showToast('Backup exportado!', 'success');
}

function importarSistema(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (confirm('Isso substituirá todos os dados. Continuar?')) {
        Object.keys(data).forEach(key => localStorage.setItem(key, JSON.stringify(data[key])));
        showToast('Dados restaurados!', 'success');
        setTimeout(() => location.reload(), 1000);
      }
    } catch (err) { showToast('Erro ao importar!', 'error'); }
  };
  reader.readAsText(file);
}

// Listener de Storage
window.addEventListener('storage', (e) => {
  if (e.key === 'mural_feedbacks') renderMuralAdmin();
});

// ==================== RESTAURAÇÃO DE DADOS (JESSICA BRUNA) ====================
function restaurarDadosJessica() {
  const JESSICA_ID = '1711111111111';
  const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
  const jessica = alunos.find(a => String(a.id) === JESSICA_ID);
  
  if (!jessica) return;

  // 1. Restaurar Ficha (Treino)
  const fichas = JSON.parse(localStorage.getItem('fichas') || '[]');
  const jaTemFicha = fichas.some(f => String(f.alunoId) === JESSICA_ID);
  
  if (!jaTemFicha) {
    const novaFicha = {
      alunoId: JESSICA_ID,
      alunoNome: 'Jessica Bruna',
      dataCriacao: new Date().toLocaleDateString('pt-BR'),
      metaSessoes: 24,
      sessoesRealizadas: 0,
      exercicios: [
        // TREINO A - Superiores (Empurrar)
        { id: Date.now()+1, divisao: 'A', grupo: 'Peito', nome: 'Supino Reto Barra', series: '4', reps: '10-12', carga: '20', descanso: '60', tecnica: 'Tradicional' },
        { id: Date.now()+2, divisao: 'A', grupo: 'Ombros', nome: 'Desenvolvimento Halteres', series: '3', reps: '12', carga: '8', descanso: '60', tecnica: 'Tradicional' },
        { id: Date.now()+3, divisao: 'A', grupo: 'Tríceps', nome: 'Tríceps Pulley', series: '3', reps: '15', carga: '15', descanso: '45', tecnica: 'Drop Set' },
        // TREINO B - Superiores (Puxar)
        { id: Date.now()+4, divisao: 'B', grupo: 'Costas', nome: 'Puxada Frente Aberta', series: '4', reps: '10-12', carga: '35', descanso: '60', tecnica: 'Tradicional' },
        { id: Date.now()+5, divisao: 'B', grupo: 'Costas', nome: 'Remada Baixa Triângulo', series: '3', reps: '12', carga: '30', descanso: '60', tecnica: 'Tradicional' },
        { id: Date.now()+6, divisao: 'B', grupo: 'Bíceps', nome: 'Rosca Direta Polia', series: '3', reps: '12', carga: '10', descanso: '45', tecnica: 'Rest-Pause' },
        // TREINO C - Inferiores
        { id: Date.now()+7, divisao: 'C', grupo: 'Pernas', nome: 'Agachamento Livre', series: '4', reps: '10', carga: '30', descanso: '90', tecnica: 'Tradicional' },
        { id: Date.now()+8, divisao: 'C', grupo: 'Pernas', nome: 'Leg Press 45º', series: '3', reps: '12', carga: '120', descanso: '60', tecnica: 'Tradicional' },
        { id: Date.now()+9, divisao: 'C', grupo: 'Glúteos', nome: 'Elevação Pélvica', series: '4', reps: '12', carga: '40', descanso: '60', tecnica: 'Tradicional' },
        { id: Date.now()+10, divisao: 'C', grupo: 'Pernas', nome: 'Cadeira Extensora', series: '3', reps: '15', carga: '25', descanso: '45', tecnica: 'Isometria 3s' }
      ]
    };
    fichas.push(novaFicha);
    localStorage.setItem('fichas', JSON.stringify(fichas));
  }

  // 2. Restaurar Avaliação
  const avs = JSON.parse(localStorage.getItem('avaliacoes') || '[]');
  const jaTemAv = avs.some(a => String(a.alunoId) === JESSICA_ID);
  if (!jaTemAv) {
    const novaAv = {
      id: Date.now() + 20,
      alunoId: JESSICA_ID,
      data: new Date().toLocaleDateString('pt-BR'),
      peso: 65.5,
      altura: 1.65,
      imc: 24.06,
      percGordura: 22.5,
      massaMagra: 50.7,
      massaGorda: 14.8,
      protocolo: 'Jackson & Pollock 3 dobras'
    };
    avs.push(novaAv);
    localStorage.setItem('avaliacoes', JSON.stringify(avs));
  }

  // 3. Restaurar Anamnese
  const anamneses = JSON.parse(localStorage.getItem('anamneses') || '[]');
  const jaTemAn = anamneses.some(a => String(a.alunoId) === JESSICA_ID);
  if (!jaTemAn) {
    const novaAn = {
      alunoId: JESSICA_ID,
      data: new Date().toLocaleDateString('pt-BR'),
      objetivo: 'Hipertrofia e Definição',
      lesoes: 'Nenhuma',
      medicamentos: 'Nenhum',
      frequencia: '5x na semana',
      obs: 'Aluna dedicada, busca melhorar condicionamento físico.'
    };
    anamneses.push(novaAn);
    localStorage.setItem('anamneses', JSON.stringify(anamneses));
  }

  console.log('Dados de Jessica Bruna restaurados com sucesso.');
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  // RESTAURAR DADOS INICIAIS
  let alunosExistentes = JSON.parse(localStorage.getItem('alunos') || '[]');
  if (alunosExistentes.length === 0) {
    const jessica = {
      id: '1711111111111',
      nome: 'Jessica Bruna',
      email: 'jessica@email.com',
      senha: '12345678',
      dataNasc: '1995-01-01',
      sexo: 'F',
      idade: 31,
      telefone: '(85) 90000-0000',
      objetivo: 'hipertrofia',
      tipo: 'pago',
      origem: 'online',
      cadastroData: new Date().toLocaleDateString('pt-BR')
    };
    alunosExistentes.push(jessica);
    localStorage.setItem('alunos', JSON.stringify(alunosExistentes));
  }
  
  // Garantir que os dados de treino da Jessica existam
  restaurarDadosJessica();

  checkAdminAuth();
  
  if (localStorage.getItem('isAdmin') === 'true') {
    renderAlunosGrid();
    if (typeof initPresc === 'function') initPresc();
    renderMuralAdmin();
  }
  
  // Enter no Login Admin
  const adminUserInput = document.getElementById('admin-user');
  const adminPassInput = document.getElementById('admin-pass');
  if (adminUserInput && adminPassInput) {
    [adminUserInput, adminPassInput].forEach(el => {
      el.addEventListener('keypress', (e) => { if (e.key === 'Enter') loginAdmin(); });
    });
  }

  // Tabelas
  const tb = document.getElementById('tabela-tecnicas-corpo');
  if (tb) tb.innerHTML = TECNICAS_DB.map(t =>
    `<tr><td><strong>${t.nome}</strong></td><td>${t.categoria}</td><td style="font-size:0.78rem">${t.intensidade}</td><td>${t.series}</td><td>${t.descanso}</td><td>${t.nivel}</td></tr>`
  ).join('');
  
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

  // Datas padrão
  const hoje = new Date().toISOString().slice(0, 10);
  if (document.getElementById('dataVO2')) document.getElementById('dataVO2').value = hoje;
  if (document.getElementById('dataAntro')) document.getElementById('dataAntro').value = hoje;
  
  if (document.getElementById('protocoloAntro')) mostrarProtocolo();
  if (document.getElementById('protocoloVO2')) carregarProtocolo();
});

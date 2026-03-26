// ==================== STATE ====================
// Helper para parse seguro de JSON
function safeParse(key, fallback = '[]') {
  try {
    const item = localStorage.getItem(key);
    return JSON.parse(item || fallback);
  } catch (e) {
    console.error(`Erro ao parsear ${key} do localStorage:`, e);
    return JSON.parse(fallback);
  }
}

const state = {
  alunos: safeParse('alunos', '[]'),
  avaliacoes: safeParse('avaliacoes', '[]'),
  testes: safeParse('testes', '[]'),
  pagamentos: safeParse('pagamentos', '[]'),
  fichas: safeParse('fichas', '[]'),
  anamneses: safeParse('anamneses', '[]'),
  rms: safeParse('rms', '[]'),
  treinosCustom: safeParse('treinosCustom', '[]'),
  planos: safeParse('planos_config', JSON.stringify([
    { id: 'mensal', nome: 'MENSAL', preco: 150.00, desc: '• Renovação mês a mês<br>• Prescrição completa<br>• Suporte via App' },
    { id: 'trimestral', nome: 'TRIMESTRAL', preco: 390.00, desc: '• 3 meses de acompanhamento<br>• R$ 130,00 por mês<br>• Avaliações mensais', popular: true },
    { id: 'semestral', nome: 'SEMESTRAL', preco: 720.00, desc: '• 6 meses de acompanhamento<br>• R$ 120,00 por mês<br>• Melhor custo-benefício' }
  ]))
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
  localStorage.setItem('planos_config', JSON.stringify(state.planos));
}

// ==================== NAVIGATION ====================
window.showPage = function(name) {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const adminPages = ['meus-alunos', 'treino', 'comunidade', 'anamnese', 'antropometria', 'pagamentos'];
  
  if (adminPages.includes(name) && !isAdmin) {
    console.error('Acesso negado: Página restrita ao administrador.');
    window.showPage('cadastro');
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
      console.log('Entrou na aba Comunidade - Disparando renderMuralAdmin');
      setTimeout(() => {
        if (typeof renderMuralAdmin === 'function') renderMuralAdmin();
      }, 100);
    }
  }

  // Marcar botão como ativo de forma robusta
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.removeAttribute('aria-current');
    
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (onclickAttr.includes(`'${name}'`) || onclickAttr.includes(`"${name}"`)) {
      btn.classList.add('active');
      btn.setAttribute('aria-current', 'page');
    }
  });

  // Ações específicas de cada página
  if (name === 'cadastro') populateAlunoSelects();
  if (name !== 'cadastro') populateAlunoSelects();
  
  if (name === 'antropometria') {
    populateAlunoSelects();
    // Forçar a exibição da primeira aba (Circunferências)
    setTimeout(() => {
      if (typeof window.showTab === 'function') {
        window.showTab('tab-circunferencias');
      }
    }, 50);
  }

  if (name === 'treino') {
    const hoje = new Date().toISOString().slice(0, 10);
    const di = document.getElementById('presc-data-inicio');
    if (di) di.value = hoje;
    atualizarDatasTreino();
    if (typeof populateRMExercises === 'function') populateRMExercises();
  }
  
  if (name === 'meus-alunos') renderListaGeralAlunos();
  if (name === 'pagamentos') {
    renderPagamentos();
    renderPlanosAdmin();
  }
  if (name === 'evolucao') carregarEvolucao();
}

// ==================== TABS ====================
window.showTab = function(id) {
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
  if (!nome || !email || !dataNasc || !sexo) { showToast('Preencha os campos obrigatórios (*)', 'error'); return; }

  const id = window._editingId || Date.now();
  const patologias = [...document.querySelectorAll('input[name="patologia"]:checked')].map(c => c.value);
  
  // Buscar se o aluno já existe para não perder a senha se for edição
  const alunoExistente = state.alunos.find(a => String(a.id) === String(id));

  const aluno = {
    id: alunoExistente ? alunoExistente.id : id,
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

  const idx = state.alunos.findIndex(a => String(a.id) === String(id));
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
  const a = state.alunos.find(x => String(x.id) === String(id));
  if (!a) {
    console.error('Aluno não encontrado para edição:', id);
    return;
  }
  window._editingId = a.id;
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

window.renderMuralAdmin = function() {
  const mural = document.getElementById('admin-mural-mensagens');
  const stats = document.getElementById('mural-stats');
  const gridDiario = document.getElementById('mensagens-diarias-grid');
  
  console.log('Iniciando renderização do Mural Admin...');
  
  if (!mural) {
    console.warn('admin-mural-mensagens não encontrado no DOM. Ignorando renderMuralAdmin.');
    return;
  }

  try {
    let mensagens = safeParse('mural_feedbacks', '[]');

    // Ordenar por data (mais recente primeiro)
    mensagens.sort((a, b) => b.id - a.id);

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
    `; }).join(''); 
    
    console.log('Mural renderizado com sucesso.');
    if (typeof showToast === 'function') showToast('Mural atualizado!', 'success');
  } catch (err) {
    console.error('Erro ao renderizar mural admin:', err);
    mural.innerHTML = `<p style="color: red; padding: 20px;">Erro ao carregar mensagens. Tente atualizar a página.</p>`;
  }
}

// Funções para gerenciamento de validade e planos
function atualizarDatasTreino() {
  const di = document.getElementById('presc-data-inicio');
  const valInput = document.getElementById('presc-validade');
  const val = valInput ? parseInt(valInput.value) : 30;
  const dv = document.getElementById('presc-data-venc');
  
  if (di && dv) {
    const data = new Date(di.value);
    if (!isNaN(data.getTime())) {
      data.setDate(data.getDate() + val);
      dv.value = data.toISOString().slice(0, 10);
    }
  }
}

function renderPlanosAdmin() {
  const grid = document.getElementById('grid-planos-admin');
  if (!grid) return;
  
  grid.innerHTML = state.planos.map(p => `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; display: flex; flex-direction: column; gap: 10px;">
      <strong style="color: var(--primary); font-size: 0.9rem;">${p.nome}</strong>
      <div class="form-group">
        <label style="font-size: 0.7rem;">Valor (R$)</label>
        <input type="number" id="plano-preco-${p.id}" value="${p.preco}" step="0.01" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1;">
      </div>
      <div style="font-size: 0.7rem; color: #64748b;">${p.desc.replace(/<br>/g, ' ')}</div>
    </div>
  `).join('');
}

function salvarPlanosAdmin() {
  state.planos.forEach(p => {
    const input = document.getElementById(`plano-preco-${p.id}`);
    if (input) {
      p.preco = parseFloat(input.value) || 0;
    }
  });
  
  saveState();
  showToast('Valores dos planos atualizados no App!', 'success');
}

// Sobrescrever salvarFichaCompleta para incluir validade
const originalSalvarFicha = window.salvarFichaCompleta;
window.salvarFichaCompleta = function() {
  const selId = document.getElementById('alunoPresc').value;
  if (!selId) { showToast('Selecione um aluno', 'error'); return; }
  
  const diEl = document.getElementById('presc-data-inicio');
  const dvEl = document.getElementById('presc-data-venc');
  const valEl = document.getElementById('presc-validade');
  
  const dataInicio = diEl ? diEl.value : new Date().toISOString().slice(0, 10);
  const dataVenc = dvEl ? dvEl.value : '';
  const validade = valEl ? valEl.value : '30';

  const idx = state.fichas.findIndex(f => String(f.alunoId) === String(selId));
  const ficha = {
    alunoId: String(selId),
    dataCriacao: dataInicio,
    dataVencimento: dataVenc,
    validadeDias: validade,
    sessoesRealizadas: 0,
    metaSessoes: 24, // Padrão
    exercicios: window.fichaExercicios || []
  };

  if (idx >= 0) {
    state.fichas[idx] = { ...state.fichas[idx], ...ficha };
  } else {
    state.fichas.push(ficha);
  }

  saveState();
  showToast('Ficha com validade salva!', 'success');
  if (typeof renderFichaTabela === 'function') renderFichaTabela();
};

function reagirMural(id, emoji) {
  const mensagens = safeParse('mural_feedbacks', '[]');
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

  const mensagens = safeParse('mural_feedbacks', '[]');
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

  const mensagens = safeParse('mural_feedbacks', '[]');
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

/**
 * Envia uma mensagem de teste do sistema para todos os alunos (Simulado no Mural)
 */
function enviarMensagemTesteSistema() {
  const texto = "🚀 MENSAGEM DE TESTE DO SISTEMA: Olá a todos os alunos! Este é um teste das notificações e do mural da comunidade. Bons treinos! 💪🔥";
  const muralKey = 'mural_feedbacks';
  const mensagens = safeParse(muralKey, '[]');
  
  const novaMsg = {
    id: Date.now(),
    alunoId: 'system-test',
    nome: 'SISTEMA TREINOFIT (TESTE)',
    texto: texto,
    data: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    isAdmin: true,
    reacoes: ['🚀', '✅']
  };

  mensagens.push(novaMsg);
  localStorage.setItem(muralKey, JSON.stringify(mensagens));
  
  renderMuralAdmin();
  showToast('Mensagem de teste enviada para todos os alunos!', 'success');
  console.log('Mensagem de teste do sistema enviada com sucesso.');
}

// Funções de ação do mural já definidas acima (reagirMural, etc)

function removerMensagemMural(id) {
  if (confirm('Excluir mensagem?')) {
    let mensagens = safeParse('mural_feedbacks', '[]');
    mensagens = mensagens.filter(m => m.id !== id);
    localStorage.setItem('mural_feedbacks', JSON.stringify(mensagens));
    renderMuralAdmin();
  }
}

// ==================== GESTÃO DE DADOS (BACKUP) ====================
function exportarSistema() {
  const backup = {
    alunos: safeParse('alunos', '[]'),
    avaliacoes: safeParse('avaliacoes', '[]'),
    testes: safeParse('testes', '[]'),
    pagamentos: safeParse('pagamentos', '[]'),
    fichas: safeParse('fichas', '[]'),
    anamneses: safeParse('anamneses', '[]'),
    rms: safeParse('rms', '[]'),
    treinosCustom: safeParse('treinosCustom', '[]'),
    mural_feedbacks: safeParse('mural_feedbacks', '[]')
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
  const alunos = safeParse('alunos', '[]');
  const jessica = alunos.find(a => String(a.id) === JESSICA_ID);
  
  if (!jessica) return;

  // 1. Restaurar Ficha (Treino)
  const fichas = safeParse('fichas', '[]');
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
        { id: Date.now()+1, divisao: 'A', grupo: 'Peito', nome: 'Supino Reto Barra', series: '4', reps: '10-12', carga: '20', carga1RM: '80', perc1RM: '75', descanso: '60', tecnica: 'Tradicional' },
        { id: Date.now()+2, divisao: 'A', grupo: 'Ombros', nome: 'Desenvolvimento Halteres', series: '3', reps: '12', carga: '8', carga1RM: '15', perc1RM: '70', descanso: '60', tecnica: 'Tradicional' },
        { id: Date.now()+3, divisao: 'A', grupo: 'Tríceps', nome: 'Tríceps Pulley', series: '3', reps: '15', carga: '15', carga1RM: '30', perc1RM: '65', descanso: '45', tecnica: 'Drop Set' },
        // TREINO B - Superiores (Puxar)
        { id: Date.now()+4, divisao: 'B', grupo: 'Costas', nome: 'Puxada Frente Aberta', series: '4', reps: '10-12', carga: '35', carga1RM: '60', perc1RM: '70', descanso: '60', tecnica: 'Tradicional' },
        { id: Date.now()+5, divisao: 'B', grupo: 'Costas', nome: 'Remada Baixa Triângulo', series: '3', reps: '12', carga: '30', carga1RM: '55', perc1RM: '75', descanso: '60', tecnica: 'Tradicional' },
        { id: Date.now()+6, divisao: 'B', grupo: 'Bíceps', nome: 'Rosca Direta Polia', series: '3', reps: '12', carga: '10', carga1RM: '25', perc1RM: '60', descanso: '45', tecnica: 'Rest-Pause' },
        // TREINO C - Inferiores
        { id: Date.now()+7, divisao: 'C', grupo: 'Pernas', nome: 'Agachamento Livre', series: '4', reps: '10', carga: '30', carga1RM: '60', perc1RM: '80', descanso: '90', tecnica: 'Tradicional' },
        { id: Date.now()+8, divisao: 'C', grupo: 'Pernas', nome: 'Leg Press 45º', series: '3', reps: '12', carga: '120', carga1RM: '200', perc1RM: '70', descanso: '60', tecnica: 'Tradicional' },
        { id: Date.now()+9, divisao: 'C', grupo: 'Glúteos', nome: 'Elevação Pélvica', series: '4', reps: '12', carga: '40', carga1RM: '80', perc1RM: '75', descanso: '60', tecnica: 'Tradicional' },
        { id: Date.now()+10, divisao: 'C', grupo: 'Pernas', nome: 'Cadeira Extensora', series: '3', reps: '15', carga: '25', carga1RM: '50', perc1RM: '65', descanso: '45', tecnica: 'Isometria 3s' }
      ]
    };
    fichas.push(novaFicha);
    localStorage.setItem('fichas', JSON.stringify(fichas));
  }

  // 2. Restaurar Avaliação
  const avs = safeParse('avaliacoes', '[]');
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
  const anamneses = safeParse('anamneses', '[]');
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
  let alunosExistentes = safeParse('alunos', '[]');
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
  
  if (document.getElementById('protocoloVO2')) carregarProtocolo();
  
  // Inicializar range de intensidade se estiver na página de treino
  if (document.getElementById('aerobio-objetivo')) atualizarRangeIntensidade();
});

// ==================== PRESCRIÇÃO AERÓBIA (NOVA LÓGICA) ====================
const RANGES_AEROBIO = {
  regenerativo: { min: 30, max: 40, padrao: 35, met: 3.5, label: 'Regenerativo (Recuperação Ativa)' },
  emagrecimento: { min: 45, max: 65, padrao: 55, met: 7.0, label: 'Emagrecimento (Zona de FatMax)' },
  resistencia: { min: 65, max: 75, padrao: 70, met: 9.0, label: 'Resistência Aeróbia (Limiar 1)' },
  performance: { min: 75, max: 90, padrao: 80, met: 11.0, label: 'Performance (Limiar 2 / VO2Máx)' },
  competicao: { min: 90, max: 100, padrao: 95, met: 15.0, label: 'Competição (Esforço Máximo)' }
};

const DURACAO_NIVEL = {
  iniciante: 20,
  intermediario: 40,
  avancado: 60
};

function atualizarRangeIntensidade() {
  const obj = document.getElementById('aerobio-objetivo').value;
  const range = RANGES_AEROBIO[obj];
  const info = document.getElementById('range-intensidade-info');
  const input = document.getElementById('aerobio-intensidade-valor');
  
  if (range && info && input) {
    info.textContent = `(${range.min}% - ${range.max}%)`;
    input.min = range.min;
    input.max = range.max;
    input.value = range.padrao;
  }
}

function atualizarDuracaoPorNivel() {
  const nivel = document.getElementById('aerobio-nivel').value;
  const duracaoInput = document.getElementById('aerobio-duracao-sessao');
  if (duracaoInput && DURACAO_NIVEL[nivel]) {
    duracaoInput.value = DURACAO_NIVEL[nivel];
  }
}

function carregarAerobio() {
  const selId = document.getElementById('alunoAerobio').value;
  if (!selId) return;
  const aluno = state.alunos.find(a => String(a.id) === String(selId));
  if (!aluno) return;
  
  // Buscar último teste de VO2 ou Antro para pegar dados
  const ultimoVO2 = state.testes.filter(t => String(t.alunoId) === String(selId)).pop();
  const ultimaAv = state.avaliacoes.filter(a => String(a.alunoId) === String(selId)).pop();
  
  const idade = parseInt(aluno.idade) || 25;
  const fcMax = Math.round(208 - (0.7 * idade)); // Tanaka
  
  document.getElementById('aerobio-fcmax').value = fcMax;
  document.getElementById('aerobio-fcrep').value = 60; // Padrão
  document.getElementById('aerobio-vo2max').value = ultimoVO2 ? ultimoVO2.vo2.toFixed(1) : (ultimaAv ? 35 : '');
}

function calcularZonasAerobio() {
  const fcMax = parseInt(document.getElementById('aerobio-fcmax').value);
  const fcRep = parseInt(document.getElementById('aerobio-fcrep').value);
  const vo2Max = parseFloat(document.getElementById('aerobio-vo2max').value);
  
  if (!fcMax) { showToast('FC Máxima é obrigatória', 'error'); return; }
  
  const fcReserva = fcRep ? (fcMax - fcRep) : 0;
  const tbody = document.getElementById('zonas-tbody');
  
  const zonas = [
    { z: 'Z1', nome: 'Muito Leve', pct: '50-60%', rpe: '7-10', obj: 'Regenerativo' },
    { z: 'Z2', nome: 'Leve', pct: '60-70%', rpe: '11-12', obj: 'Saúde / Queima Gordura' },
    { z: 'Z3', nome: 'Moderado', pct: '70-80%', rpe: '13-14', obj: 'Resistência' },
    { z: 'Z4', nome: 'Pesado', pct: '80-90%', rpe: '15-16', obj: 'Limiar' },
    { z: 'Z5', nome: 'Máximo', pct: '90-100%', rpe: '17-20', obj: 'Performance' }
  ];

  tbody.innerHTML = zonas.map(z => {
    const pcts = z.pct.replace('%', '').split('-');
    const minPct = parseInt(pcts[0]) / 100;
    const maxPct = parseInt(pcts[1]) / 100;
    
    const fcMin = Math.round(fcMax * minPct);
    const fcMaxZ = Math.round(fcMax * maxPct);
    
    let karvonen = '—';
    if (fcReserva) {
      const kMin = Math.round((fcReserva * minPct) + fcRep);
      const kMax = Math.round((fcReserva * maxPct) + fcRep);
      karvonen = `${kMin}-${kMax}`;
    }
    
    let vo2Range = '—';
    if (vo2Max) {
      vo2Range = `${(vo2Max * minPct).toFixed(1)}-${(vo2Max * maxPct).toFixed(1)}`;
    }

    return `<tr>
      <td>${z.z}</td><td>${z.nome}</td><td>${z.pct}</td><td>${fcMin}-${fcMaxZ}</td>
      <td>${z.pct}</td><td>${karvonen}</td><td>${z.pct}</td><td>${vo2Range}</td>
      <td>${z.rpe}</td><td>${z.obj}</td>
    </tr>`;
  }).join('');
  
  document.getElementById('aerobio-zonas').style.display = 'block';
  showToast('Zonas calculadas!', 'success');
}

function gerarPrescricaoAerobio() {
  try {
    const selId = document.getElementById('alunoAerobio').value;
    if (!selId) { showToast('Selecione um aluno primeiro', 'error'); return; }
    
    const aluno = state.alunos.find(a => String(a.id) === String(selId));
    if (!aluno) { showToast('Aluno não encontrado', 'error'); return; }

    const objKey = document.getElementById('aerobio-objetivo').value;
    const modalidade = document.getElementById('aerobio-modalidade').value;
    const nivel = document.getElementById('aerobio-nivel').value;
    const sessoes = parseInt(document.getElementById('aerobio-sessoes').value) || 12;
    const duracaoSessao = parseInt(document.getElementById('aerobio-duracao-sessao').value) || 30;
    const intensidade = parseInt(document.getElementById('aerobio-intensidade-valor').value) || 55;
    
    let fcMax = parseInt(document.getElementById('aerobio-fcmax').value);
    const fcRep = parseInt(document.getElementById('aerobio-fcrep').value) || 70;
    
    if (!fcMax) {
      if (aluno.idade) {
        fcMax = Math.round(208 - (0.7 * parseInt(aluno.idade)));
        document.getElementById('aerobio-fcmax').value = fcMax;
      } else {
        fcMax = 190; // Fallback
      }
    }
    
    // Cálculo de FC Alvo (Karvonen - Heart Rate Reserve)
    const fcReserva = fcMax - fcRep;
    const rangeObj = RANGES_AEROBIO[objKey] || RANGES_AEROBIO['emagrecimento'];
    
    // Usar a intensidade digitada pelo usuário
    const intensidadePct = intensidade / 100;
    const fcAlvoBase = Math.round((fcReserva * intensidadePct) + fcRep);
    
    // Definir uma zona de +/- 5 bpm em torno da intensidade alvo para criar uma faixa
    const fcAlvoMin = fcAlvoBase - 5;
    const fcAlvoMax = fcAlvoBase + 5;
    
    // Gasto Calórico Estimado (Ajustado pela Intensidade)
    // METs aproximados baseados na intensidade (VO2 Reserve % ≈ HR Reserve %)
    // MET = (Intensidade% * (VO2max - 3.5) + 3.5) / 3.5
    // Como não temos VO2max, usamos o MET base do objetivo e escalamos pela intensidade relativa
    const metBase = rangeObj.met || 6.0;
    const metEscalado = metBase * (intensidade / rangeObj.padrao);
    const peso = parseFloat(aluno.peso) || 75;
    const gastoCalorico = Math.round(metEscalado * peso * (duracaoSessao / 60));

    const dias = [...document.querySelectorAll('input[name="aerobio-dia"]:checked')].map(d => d.value);
    const objLabel = rangeObj.label;

    let protocoloInfo = '';
    if (objKey === 'emagrecimento') {
      protocoloInfo = 'Zona de FatMax: Intensidade ideal para maximizar a oxidação de gordura durante o exercício. Mantenha o ritmo constante.';
    } else if (objKey === 'regenerativo') {
      protocoloInfo = 'Recuperação Ativa: Intensidade leve para auxiliar na remoção de resíduos metabólicos sem gerar fadiga adicional.';
    } else if (objKey === 'performance' || objKey === 'competicao') {
      protocoloInfo = 'Foco em VO2 Máximo e Limiar Anaeróbio: Treino de alta intensidade para melhora de rendimento e vigor físico.';
    } else {
      protocoloInfo = 'Melhora da Capacidade Cardiorrespiratória: Foco em resistência e fortalecimento do sistema cardiovascular.';
    }

    let sessoesHtml = '';
    const sessoesLista = [];
    for (let i = 1; i <= sessoes; i++) {
      sessoesLista.push({ num: i, duracao: duracaoSessao });
      sessoesHtml += `
        <div style="display: flex; justify-content: space-between; padding: 12px 15px; background: ${i % 2 === 0 ? '#f8fafc' : 'white'}; border-bottom: 1px solid #e2e8f0; font-size: 0.95rem;">
          <span><strong>Sessão ${i}</strong></span>
          <span>⏱️ ${duracaoSessao} min</span>
          <span style="color: #2563eb; font-weight: 800;">💓 ${fcAlvoMin}-${fcAlvoMax} bpm</span>
        </div>
      `;
    }

    const prescricao = {
      id: Date.now(),
      alunoId: String(selId),
      objetivo: objKey,
      objetivoLabel: objLabel,
      modalidade,
      nivel,
      intensidade: `${rangeObj.min}% - ${rangeObj.max}%`,
      fcAlvo: `${fcAlvoMin}-${fcAlvoMax}`,
      fcInicial: fcAlvoMin,
      fcFinal: fcAlvoMax,
      intensidadeReal: intensidade,
      duracaoSessao,
      gastoCalorico,
      protocolo: protocoloInfo,
      sessoesTotais: sessoes,
      sessoesLista,
      dias,
      data: new Date().toISOString().slice(0, 10)
    };

    window._ultimaPrescAerobia = prescricao;

    const resContainer = document.getElementById('aerobio-presc-resultado');
    const resConteudo = document.getElementById('aerobio-presc-conteudo');
    
    if (resConteudo && resContainer) {
      resConteudo.innerHTML = `
        <div class="info-box" style="background: white; border: 3px solid #2563eb; padding: 30px; border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); margin-top: 20px; border-top: 8px solid #2563eb;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 3px solid #f1f5f9; padding-bottom: 20px;">
            <div>
              <h3 style="color: #1e293b; margin: 0; font-size: 1.5rem; font-weight: 900; letter-spacing: -0.025em;">
                🏃 CONFIGURAÇÃO DO TREINO AERÓBIO
              </h3>
              <div style="color: #64748b; font-size: 0.9rem; font-weight: 600; margin-top: 4px;">Objetivo: ${objLabel}</div>
            </div>
            <div style="background: #2563eb; color: white; padding: 10px 20px; border-radius: 12px; font-size: 0.9rem; font-weight: 900; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
              MODALIDADE: ${modalidade.toUpperCase()}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 35px;">
            <div style="background: #eff6ff; padding: 20px; border-radius: 16px; border: 1px solid #dbeafe; text-align: center;">
              <div style="font-size: 0.75rem; color: #1e40af; text-transform: uppercase; font-weight: 800; margin-bottom: 10px; letter-spacing: 0.05em;">Zona de FC Alvo</div>
              <div style="display: flex; justify-content: center; align-items: baseline; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 1.6rem; font-weight: 900; color: #2563eb;">${fcAlvoMin}</span>
                <span style="font-size: 1rem; color: #64748b; font-weight: 700;">a</span>
                <span style="font-size: 1.6rem; font-weight: 900; color: #2563eb;">${fcAlvoMax}</span>
                <span style="font-size: 0.9rem; color: #1e40af; font-weight: 700;">BPM</span>
              </div>
              <div style="font-size: 0.75rem; color: #3b82f6; font-weight: 600;">Intensidade: ${intensidade}% da FC Reserva</div>
            </div>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 16px; border: 1px solid #dcfce7; text-align: center;">
              <div style="font-size: 0.75rem; color: #166534; text-transform: uppercase; font-weight: 800; margin-bottom: 10px; letter-spacing: 0.05em;">Gasto Calórico Estimado</div>
              <div style="display: flex; justify-content: center; align-items: baseline; gap: 6px;">
                <span style="font-size: 2.2rem; font-weight: 950; color: #10b981;">~${gastoCalorico}</span>
                <span style="font-size: 1rem; color: #166534; font-weight: 800;">KCAL</span>
              </div>
              <div style="font-size: 0.75rem; color: #15803d; font-weight: 600; margin-top: 4px;">Total por cada Sessão</div>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 10px; letter-spacing: 0.05em;">Tempo por Sessão</div>
              <div style="display: flex; justify-content: center; align-items: baseline; gap: 6px;">
                <span style="font-size: 2.2rem; font-weight: 950; color: #1e293b;">${duracaoSessao}</span>
                <span style="font-size: 1rem; color: #64748b; font-weight: 800;">MIN</span>
              </div>
              <div style="font-size: 0.75rem; color: #475569; font-weight: 600; margin-top: 4px;">Duração Recomendada</div>
            </div>
          </div>

          <div style="background: #fffbeb; padding: 20px; border-radius: 16px; border-left: 8px solid #f59e0b; margin-bottom: 35px; box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.05);">
            <div style="font-size: 0.85rem; font-weight: 900; color: #92400e; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
              📚 PROTOCOLO DE TREINAMENTO CIENTÍFICO
            </div>
            <div style="font-size: 1.05rem; color: #78350f; line-height: 1.6; font-weight: 500;">
              ${protocoloInfo}
            </div>
          </div>

          <h4 style="font-size: 1rem; color: #1e293b; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 2px; font-weight: 900; display: flex; align-items: center; gap: 10px;">
            📅 CRONOGRAMA DETALHADO DE SESSÕES
          </h4>
          <div style="border: 2px solid #f1f5f9; border-radius: 16px; overflow: hidden; margin-bottom: 35px; max-height: 400px; overflow-y: auto; background: #fff;">
            <div style="display: flex; background: #f8fafc; padding: 12px 15px; border-bottom: 2px solid #e2e8f0; font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase;">
              <span style="flex: 1;">Sessão</span>
              <span style="flex: 1; text-align: center;">Duração</span>
              <span style="flex: 1; text-align: right;">Zona Alvo (BPM)</span>
            </div>
            ${sessoesHtml}
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 15px;">
            <button onclick="salvarPrescricaoAerobia()" class="btn-success" style="width: 100%; height: 70px; font-weight: 950; font-size: 1.4rem; display: flex; align-items: center; justify-content: center; gap: 15px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3); border-radius: 18px; cursor: pointer; border: none; transition: transform 0.2s, box-shadow 0.2s;">
              💾 GRAVAR NO CADASTRO DO ALUNO
            </button>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <button onclick="baixarPDFPrescricaoAerobia()" class="btn-primary" style="height: 60px; font-weight: 900; background: #6366f1; border-radius: 15px; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; border: none; color: white; font-size: 1.1rem; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.2);">
                📥 BAIXAR PDF
              </button>
              <button onclick="document.getElementById('aerobio-presc-resultado').style.display='none'" class="btn-secondary" style="height: 60px; font-weight: 900; border-radius: 15px; cursor: pointer; background: #64748b; border: none; color: white; font-size: 1.1rem;">
                FECHAR JANELA
              </button>
            </div>
          </div>
        </div>
      `;
      resContainer.style.display = 'block';
      resContainer.scrollIntoView({ behavior: 'smooth' });
      showToast('Treino gerado com sucesso!', 'success');
    } else {
      console.error('Elementos de resultado aeróbio não encontrados');
      showToast('Erro ao exibir resultado', 'error');
    }
  } catch (error) {
    console.error('Erro em gerarPrescricaoAerobio:', error);
    showToast('Erro interno ao gerar treino', 'error');
  }
}

function salvarPrescricaoAerobia() {
  try {
    if (!window._ultimaPrescAerobia) {
      showToast('Gere o treino antes de salvar', 'error');
      return;
    }
    
    const presc = window._ultimaPrescAerobia;
    const idx = state.fichas.findIndex(f => String(f.alunoId) === String(presc.alunoId));
    
    if (idx === -1) {
      const novaFicha = {
        alunoId: presc.alunoId,
        data: new Date().toISOString().slice(0, 10),
        exercicios: [],
        aerobio: presc
      };
      state.fichas.push(novaFicha);
    } else {
      state.fichas[idx].aerobio = presc;
    }
    
    saveState();
    showToast('✅ Treino aeróbio salvo e enviado!', 'success');
  } catch (error) {
    console.error('Erro ao salvar prescrição aeróbia:', error);
    showToast('Erro ao salvar treino', 'error');
  }
}

function baixarPDFPrescricaoAerobia() {
  try {
    if (!window._ultimaPrescAerobia) return;
    const p = window._ultimaPrescAerobia;
    const aluno = state.alunos.find(a => String(a.id) === String(p.alunoId));
    
    let sessoesHtml = '';
    p.sessoesLista.forEach(s => {
      sessoesHtml += `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">Sessão ${s.num}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">⏱️ ${s.duracao} min</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; color: #2563eb; font-weight: 700;">💓 ${p.fcInicial} - ${p.fcFinal} bpm</td>
        </tr>
      `;
    });

    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Prescrição Aeróbia - ${aluno ? aluno.nome : 'Aluno'}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; background: #fff; }
        .header { text-align: center; border-bottom: 4px solid #2563eb; padding-bottom: 25px; margin-bottom: 35px; }
        .header h1 { color: #2563eb; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px; }
        .header p { margin: 5px 0 0; color: #64748b; font-weight: bold; }
        .card { border: 2px solid #e2e8f0; border-radius: 16px; padding: 30px; background: #f8fafc; margin-bottom: 35px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 25px; }
        .item { background: white; padding: 18px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 6px; }
        .value { font-size: 18px; font-weight: 900; color: #1e293b; }
        .highlight { color: #2563eb; }
        .kcal { color: #ea580c; }
        .protocolo-box { margin-top: 30px; padding: 20px; background: #fffbeb; border-left: 6px solid #f59e0b; border-radius: 8px; }
        .protocolo-title { font-weight: 900; color: #92400e; text-transform: uppercase; font-size: 13px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 25px; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
        th { background: #f1f5f9; text-align: left; padding: 15px; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; }
        .footer { text-align: center; margin-top: 60px; font-size: 13px; color: #94a3b8; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
      </head><body>
        <div class="header">
          <h1>TREINOFITASM</h1>
          <p>PRESCRIÇÃO DE TREINAMENTO AERÓBIO CIENTÍFICO</p>
        </div>
        
        <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 800;">Aluno(a)</div>
            <div style="font-size: 20px; font-weight: 900; color: #1e293b;">${aluno ? aluno.nome : 'Não identificado'}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 800;">Data da Prescrição</div>
            <div style="font-size: 16px; font-weight: 700;">${new Date(p.data).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>

        <div class="card">
          <h2 style="margin-top:0; color: #2563eb; font-size: 22px; border-bottom: 2px solid #dbeafe; padding-bottom: 10px;">🎯 Objetivo: ${p.objetivoLabel}</h2>
          
          <div class="grid">
            <div class="item"><div class="label">Modalidade</div><div class="value">${p.modalidade.toUpperCase()}</div></div>
            <div class="item"><div class="label">Zona Alvo (BPM)</div><div class="value highlight">${p.fcInicial} - ${p.fcFinal}</div></div>
            <div class="item"><div class="label">Gasto Calórico</div><div class="value kcal">~${p.gastoCalorico} kcal</div></div>
            <div class="item"><div class="label">Duração / Sessão</div><div class="value">${p.duracaoSessao} min</div></div>
            <div class="item"><div class="label">Total de Sessões</div><div class="value">${p.sessoesTotais}</div></div>
            <div class="item"><div class="label">Frequência Semanal</div><div class="value">${p.dias.length}x na semana</div></div>
          </div>

          <div class="protocolo-box">
            <div class="protocolo-title">📚 Protocolo e Orientação Científica</div>
            <div style="font-size: 15px; color: #78350f;">${p.protocolo}</div>
          </div>
        </div>

        <h3 style="font-size: 16px; text-transform: uppercase; letter-spacing: 1px; color: #1e293b; margin-bottom: 15px;">📅 Cronograma Detalhado de Sessões</h3>
        <table>
          <thead>
            <tr><th>Sessão</th><th>Duração Estimada</th><th>Zona de Treinamento (BPM)</th></tr>
          </thead>
          <tbody>
            ${sessoesHtml}
          </tbody>
        </table>

        <div class="footer">
          <strong>TREINOFITASM - Consultoria Esportiva & Performance</strong><br>
          Este treino foi calculado com base em parâmetros fisiológicos individuais (Fórmula de Karvonen).
        </div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  } catch (err) {
    console.error('Erro ao gerar PDF aeróbio:', err);
    showToast('Erro ao gerar PDF', 'error');
  }
}

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

  if (name !== 'cadastro') populateAlunoSelects();
  if (name === 'meus-alunos') renderListaGeralAlunos();
  if (name === 'pagamentos') renderPagamentos();
  if (name === 'evolucao') carregarEvolucao();
};

const showTab = (id) => {
  const target = document.getElementById(id);
  if (!target) return;

  const parent = target.closest('.page, .container');
  parent.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  parent.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });

  target.classList.add('active');
  
  const tabBtns = parent.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    const onclick = btn.getAttribute('onclick');
    if (onclick && onclick.includes(`'${id}'`)) {
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
    const ultimaAv = state.avaliacoes.filter(av => av.alunoId == a.id).pop();
    const dataAv = ultimaAv ? new Date(ultimaAv.data).toLocaleDateString('pt-BR') : '—';
    
    const pagamentos = state.pagamentos.filter(p => p.alunoId == a.id);
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
    alunoId: parseInt(alunoId),
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
    const aluno = state.alunos.find(a => a.id === p.alunoId);
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

function carregarDadosAluno(tipo) {
  const selId = tipo === 'antro' ? 'alunoAntro' : tipo === 'vo2' ? 'alunoVO2' : null;
  if (!selId) return;
  const sel = document.getElementById(selId);
  const id = parseInt(sel.value);
  if (!id) return;
  const aluno = state.alunos.find(a => a.id === id);
  if (!aluno) return;
  if (tipo === 'antro') {
    const hoje = new Date().toISOString().slice(0, 10);
    const dataAntro = document.getElementById('dataAntro');
    if (dataAntro) dataAntro.value = hoje;
  }
}

// ==================== ANTROPOMETRIA ====================
function calcularCircunferencias() {
  const get = id => parseFloat(document.getElementById(id)?.value) || 0;
  const cintura  = get('c-cintura');
  const quadril  = get('c-quadril');
  const sel      = document.getElementById('alunoAntro');
  const id       = parseInt(sel.value);
  const aluno    = id ? state.alunos.find(a => a.id === id) : null;
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
      document.getElementById('classGordura').value = classGordura(siri, sexo, idade);
    }
  }

  renderResultadosAntro();
  showToast('Composição corporal calculada!', 'success');
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
  const brozek = document.getElementById('percGorduraBrozek').value;
  const mg = document.getElementById('massaGorda').value;
  const mm = document.getElementById('massaMagra').value;
  const cls = document.getElementById('classGordura').value;
  const rcq = document.getElementById('rcq').value;
  const ic = document.getElementById('ic').value;
  const rcest = document.getElementById('rcest').value;
  box.innerHTML = `
    <h2 class="section-title">Resultados da Avaliação</h2>
    <div class="result-grid">
      <div class="result-card highlight"><div class="rc-label">% Gordura (Siri)</div><div class="rc-value">${siri}</div></div>
      <div class="result-card highlight"><div class="rc-label">% Gordura (Brozek)</div><div class="rc-value">${brozek}</div></div>
      <div class="result-card"><div class="rc-label">Densidade Corporal</div><div class="rc-value" style="font-size:1rem">${dc}</div><div class="rc-unit">g/cm³</div></div>
      <div class="result-card"><div class="rc-label">Massa Gorda</div><div class="rc-value">${mg}</div></div>
      <div class="result-card"><div class="rc-label">Massa Magra</div><div class="rc-value">${mm}</div></div>
      <div class="result-card"><div class="rc-label">Classificação</div><div class="rc-value" style="font-size:1rem">${cls}</div></div>
      <div class="result-card"><div class="rc-label">RCQ</div><div class="rc-value">${rcq || '—'}</div></div>
      <div class="result-card"><div class="rc-label">Índice Conicidade</div><div class="rc-value">${ic || '—'}</div></div>
      <div class="result-card"><div class="rc-label">RCEst</div><div class="rc-value">${rcest || '—'}</div></div>
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
    alunoId: selId,
    data: document.getElementById('dataAntro').value || new Date().toISOString().slice(0, 10),
    peso: state.alunos.find(a => String(a.id) === String(selId))?.peso || '',
    percGordura: (document.getElementById('percGorduraSiri').value || '').replace('%', ''),
    massaMagra: (document.getElementById('massaMagra').value || '').replace(' kg', ''),
    massaGorda: (document.getElementById('massaGorda').value || '').replace(' kg', ''),
    imc: (document.getElementById('imc')?.value || ''),
    protocolo: document.getElementById('protocoloAntro').value,
    rcq: document.getElementById('rcq').value,
    perimetros,
    dobras
  };
  state.avaliacoes.push(avaliacao);
  saveState();
  showToast('Avaliação salva com sucesso!', 'success');
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
    renderAlunosGrid();
    if (typeof initPresc === 'function') initPresc();
    
    showPage('cadastro');
  } else {
    error.style.display = 'block';
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

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
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

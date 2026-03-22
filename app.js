// ==================== STATE ====================
const state = {
  alunos: JSON.parse(localStorage.getItem('alunos') || '[]'),
  avaliacoes: JSON.parse(localStorage.getItem('avaliacoes') || '[]'),
  testes: JSON.parse(localStorage.getItem('testes') || '[]'),
  pagamentos: JSON.parse(localStorage.getItem('pagamentos') || '[]')
};

// ==================== NAVIGATION ====================
const showPage = (name) => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.remove('active');
    b.removeAttribute('aria-current');
  });

  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');

  const pages = ['cadastro', 'anamnese', 'antropometria', 'treino', 'evolucao', 'pagamentos'];
  const idx = pages.indexOf(name);
  const btns = document.querySelectorAll('.nav-btn');
  if (idx >= 0 && btns[idx]) {
    btns[idx].classList.add('active');
    btns[idx].setAttribute('aria-current', 'page');
  }

  if (name !== 'cadastro') populateAlunoSelects();
  if (name === 'pagamentos') renderPagamentos();
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
  
  // Find the button that triggers this tab and set it to active
  const tabBtns = parent.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    if (btn.getAttribute('onclick').includes(`'${id}'`)) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    }
  });
};

// ==================== TOAST ====================
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
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
  const dataNasc = document.getElementById('dataNasc').value;
  const sexo = document.getElementById('sexo').value;
  if (!nome || !dataNasc || !sexo) { showToast('Preencha os campos obrigatórios (*)', 'error'); return; }

  const patologias = [...document.querySelectorAll('input[name="patologia"]:checked')].map(c => c.value);
  const aluno = {
    id: Date.now(),
    nome, dataNasc, sexo,
    idade: parseInt(document.getElementById('idade').value) || '',
    cpf: document.getElementById('cpf').value,
    telefone: document.getElementById('telefone').value,
    email: document.getElementById('email').value,
    profissao: document.getElementById('profissao').value,
    peso: document.getElementById('peso').value,
    altura: document.getElementById('altura').value,
    imc: document.getElementById('imc').value,
    nivel: document.getElementById('nivel').value,
    freqAtual: document.getElementById('freqAtual').value,
    objetivo: document.getElementById('objetivo').value,
    patologias,
    obs: document.getElementById('obs')?.value || '',
    fcRepouso: document.getElementById('fcRepouso').value,
    fcMaxTanaka: document.getElementById('fcMaxTanaka').value,
    fcMaxFox: document.getElementById('fcMaxFox').value,
  };

  const idx = state.alunos.findIndex(a => a.id === aluno.id);
  if (idx >= 0) state.alunos[idx] = aluno; else state.alunos.push(aluno);
  localStorage.setItem('alunos', JSON.stringify(state.alunos));
  showToast('Cadastro salvo com sucesso!', 'success');
  renderAlunosGrid();
}

function renderAlunosGrid() {
  if (state.alunos.length === 0) { document.getElementById('lista-alunos').style.display = 'none'; return; }
  document.getElementById('lista-alunos').style.display = 'block';
  document.getElementById('alunos-grid').innerHTML = state.alunos.map(a => `
    <div class="aluno-card" onclick="editarAluno(${a.id})">
      <h3>${a.nome}</h3>
      <p>${a.sexo === 'M' ? 'Masculino' : 'Feminino'} · ${a.idade} anos · IMC ${a.imc || '—'}</p>
      <p>Objetivo: ${a.objetivo || '—'} · Nível: ${a.nivel || '—'}</p>
    </div>
  `).join('');
}

function editarAluno(id) {
  const a = state.alunos.find(x => x.id === id);
  if (!a) return;
  document.getElementById('nome').value = a.nome;
  document.getElementById('dataNasc').value = a.dataNasc;
  document.getElementById('sexo').value = a.sexo;
  document.getElementById('idade').value = a.idade;
  document.getElementById('cpf').value = a.cpf;
  document.getElementById('telefone').value = a.telefone;
  document.getElementById('email').value = a.email;
  document.getElementById('profissao').value = a.profissao;
  document.getElementById('peso').value = a.peso;
  document.getElementById('altura').value = a.altura;
  calcularIMC();
  document.getElementById('nivel').value = a.nivel;
  document.getElementById('freqAtual').value = a.freqAtual;
  document.getElementById('objetivo').value = a.objetivo;
  if (document.getElementById('obs')) document.getElementById('obs').value = a.obs;
  document.getElementById('fcRepouso').value = a.fcRepouso;
  calcularFC();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limparCadastro() {
  document.getElementById('form-cadastro').reset();
  ['imc', 'classImc', 'fcMaxTanaka', 'fcMaxFox', 'fcReserva', 'fcZona', 'idade'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

// ==================== POPULATE SELECTS ====================
function populateAlunoSelects() {
  const selIds = ['alunoAntro','alunoVO2','alunoPresc','alunoAnamnese','alunoRM','alunoAerobio','alunoEvolucao', 'alunoPagamento'];
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
  localStorage.setItem('pagamentos', JSON.stringify(state.pagamentos));
  showToast('Pagamento registrado com sucesso!', 'success');
  renderPagamentos();
  limparPagamento();
}

function renderPagamentos() {
  const tbody = document.getElementById('lista-pagamentos-corpo');
  if (!tbody) return;

  if (state.pagamentos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Nenhum pagamento registrado</td></tr>';
    return;
  }

  // Ordenar por data de pagamento decrescente
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
  localStorage.setItem('pagamentos', JSON.stringify(state.pagamentos));
  renderPagamentos();
  showToast('Pagamento excluído', 'success');
}

function limparPagamento() {
  document.getElementById('form-pagamento').reset();
}

function carregarDadosAluno(tipo) {
  const selId = tipo === 'antro' ? 'alunoAntro' : 'alunoVO2';
  const sel = document.getElementById(selId);
  const id = parseInt(sel.value);
  if (!id) return;
  const aluno = state.alunos.find(a => a.id === id);
  if (!aluno) return;
  if (tipo === 'antro') {
    const hoje = new Date().toISOString().slice(0, 10);
    document.getElementById('dataAntro').value = hoje;
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

  // Diferença Peito inspirado vs normal
  const peitoNormal   = get('c-peito-normal');
  const peitoInspir   = get('c-peito-inspirado');
  if (peitoNormal && peitoInspir) {
    const expansao = (peitoInspir - peitoNormal).toFixed(1);
    document.getElementById('rcq').title = `Expansão torácica: ${expansao} cm`;
  }

  // Diferença braços D vs E
  const bracoDirNormal = get('c-braco-dir');
  const bracoEsqNormal = get('c-braco-esq');
  const bracoDirInsp   = get('c-braco-dir-insp');
  const bracoEsqInsp   = get('c-braco-esq-insp');

  // RCQ
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

  // Índice de Conicidade
  if (cintura && peso && altCm) {
    const altM = altCm / 100;
    const ic = (cintura / 100) / (0.109 * Math.sqrt(peso / altM));
    document.getElementById('ic').value = ic.toFixed(3);
  }

  // RCEst
  if (cintura && altCm) {
    const rcest = ((cintura / altCm) * 100).toFixed(1);
    document.getElementById('rcest').value = rcest + '%';
    const classRCEst = parseFloat(rcest) < 50 ? 'Normal' : parseFloat(rcest) < 60 ? 'Risco aumentado' : 'Alto risco';
    document.getElementById('classRCEst').value = classRCEst;
  }

  // Resumo na tela
  let resumoExtra = '';
  if (peitoNormal && peitoInspir) {
    const exp = (peitoInspir - peitoNormal).toFixed(1);
    resumoExtra += `<strong>Expansão Torácica:</strong> ${exp} cm (Normal: ${peitoNormal} | Inspirado: ${peitoInspir})<br>`;
  }
  if (bracoDirNormal && bracoEsqNormal) {
    const dif = Math.abs(bracoDirNormal - bracoEsqNormal).toFixed(1);
    resumoExtra += `<strong>Assimetria Braços:</strong> Dif. ${dif} cm (D: ${bracoDirNormal} | E: ${bracoEsqNormal})<br>`;
  }
  if (bracoDirInsp && bracoDirNormal) {
    const ganhD = (bracoDirInsp - bracoDirNormal).toFixed(1);
    resumoExtra += `<strong>Ganho Braço Dir. (inspirado):</strong> +${ganhD} cm<br>`;
  }
  if (resumoExtra) {
    const infoBox = document.querySelector('#tab-circunferencias .info-box');
    if (infoBox) infoBox.innerHTML += '<hr style="margin:6px 0"><strong>Análise:</strong><br>' + resumoExtra;
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
Constantes C e M variam por faixa etária (Durnin & Womersley, 1974)
17–19a: C=1.1620, M=0.0630 | 20–29a: C=1.1631, M=0.0632 | 30–39a: C=1.1422, M=0.0544
40–49a: C=1.1620, M=0.0700 | ≥50a: C=1.1715, M=0.0779`,
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
ΣD4 = Bíceps + Tríceps + Subescapular + Suprailíaca
17–19a: C=1.1549, M=0.0678 | 20–29a: C=1.1599, M=0.0717 | 30–39a: C=1.1423, M=0.0632
40–49a: C=1.1333, M=0.0612 | ≥50a: C=1.1339, M=0.0645`,
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
    formula: `DC = 1,10726863 − 0,00081201 × ΣD4 + 0,00000212 × ΣD4² − 0,00041761 × Idade
ΣD4 = Subescapular + Tríceps + Suprailíaca + Perna Medial  (Petroski, 1995)`,
    calc: (d, idade) => {
      const s = (d['d-subescapular']||0)+(d['d-triceps']||0)+(d['d-suprailiaca']||0)+(d['d-perna']||0);
      return 1.10726863 - 0.00081201 * s + 0.00000212 * s * s - 0.00041761 * idade;
    }
  },
  SLAUGHTERK: {
    nome: 'Slaughter et al. (1988) – Crianças/Adolescentes',
    dobras: ['Tríceps', 'Perna Medial'],
    formula: `% Gordura (Meninos): %G = 0,735 × (Tríceps + Perna) + 1,0
% Gordura (Meninas): %G = 0,610 × (Tríceps + Perna) + 5,1
(Aplicado diretamente; não calcula DC)  Slaughter et al., 1988`,
    calc: (d, idade, sexo) => {
      return null; // special case
    }
  },
  WELTMAN: {
    nome: 'Weltman et al. – Circunferências (Mulheres)',
    dobras: [],
    formula: `DC = 0,000415 × Abdômen(cm) − 0,000937 × Estatura(cm) + 0,013682 × Peso(kg) + 1,1732
(Weltman et al., 1988 – utiliza circunferências, não dobras)`,
    calc: null, // uses circumferences
  },
  HODGDON: {
    nome: 'Hodgdon & Beckett – Circunferências (Homens)',
    dobras: [],
    formula: `DC = 1,0324 − 0,19077 × log(Abdômen − Pescoço) + 0,15456 × log(Estatura)
% Gordura = 495 / DC − 450  (US Navy Method)`,
    calc: null,
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
  const aluno = id ? alunos.find(a => a.id === id) : null;
  const idade = aluno ? parseInt(aluno.idade) : 25;
  const sexo = aluno ? aluno.sexo : 'M';
  const peso = aluno ? parseFloat(aluno.peso) : 0;

  const d = {};
  ['d-subescapular','d-triceps','d-biceps','d-peitoral','d-axilar','d-suprailiaca','d-abdominal','d-coxa','d-perna'].forEach(id => {
    const v = parseFloat(document.getElementById(id).value);
    d[id] = isNaN(v) ? 0 : v;
  });

  let percG = null;
  let dc = null;

  // Special cases
  if (key === 'SLAUGHTERK') {
    const s = d['d-triceps'] + d['d-perna'];
    percG = sexo === 'M' ? (0.735 * s + 1.0) : (0.610 * s + 5.1);
  } else if (key === 'WELTMAN') {
    const abd = parseFloat(document.getElementById('c-abdomen').value) || 0;
    const alt = aluno ? parseFloat(aluno.altura) : 0;
    if (!abd || !alt || !peso) { showToast('Preencha abdômen, peso e estatura', 'error'); return; }
    dc = 0.000415 * abd - 0.000937 * alt + 0.013682 * peso + 1.1732;
  } else if (key === 'HODGDON') {
    const abd = parseFloat(document.getElementById('c-abdomen').value) || 0;
    const pescoco = parseFloat(document.getElementById('c-pescoco').value) || 0;
    const alt = aluno ? parseFloat(aluno.altura) : 0;
    if (!abd || !pescoco || !alt) { showToast('Preencha circunferências pescoço, abdômen e estatura', 'error'); return; }
    dc = 1.0324 - 0.19077 * Math.log10(abd - pescoco) + 0.15456 * Math.log10(alt);
  } else {
    if (p.calc) dc = p.calc(d, idade, sexo);
  }

  if (dc !== null && dc > 0) {
    const siri = (495 / dc - 450);
    const brozek = (4.570 / dc - 4.142) * 100;
    percG = siri;
    document.getElementById('densidade').value = dc.toFixed(5);
    document.getElementById('percGorduraSiri').value = siri.toFixed(1) + '%';
    document.getElementById('percGorduraBrozek').value = brozek.toFixed(1) + '%';
  } else if (percG !== null) {
    document.getElementById('percGorduraSiri').value = percG.toFixed(1) + '%';
    document.getElementById('densidade').value = '—';
    document.getElementById('percGorduraBrozek').value = '—';
  }

  if (percG !== null && peso) {
    const mg = (percG / 100) * peso;
    const mm = peso - mg;
    document.getElementById('massaGorda').value = mg.toFixed(2) + ' kg';
    document.getElementById('massaMagra').value = mm.toFixed(2) + ' kg';
    document.getElementById('classGordura').value = classGordura(percG, sexo, idade);
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
  const aluno = id ? alunos.find(a => a.id === id) : null;
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
  document.getElementById('resultado-antro-box').innerHTML = '<p class="result-placeholder">Preencha os dados e calcule para ver os resultados aqui.</p>';
}

function salvarAntro() {
  const selId = document.getElementById('alunoAntro').value;
  if (!selId) { showToast('Selecione um aluno', 'error'); return; }
  const avaliacao = {
    id: Date.now(),
    alunoId: selId,
    data: document.getElementById('dataAntro').value,
    percGordura: document.getElementById('percGorduraSiri').value,
    massaMagra: document.getElementById('massaMagra').value,
    massaGorda: document.getElementById('massaGorda').value,
    protocolo: document.getElementById('protocoloAntro').value,
    rcq: document.getElementById('rcq').value,
  };
  avaliacoes.push(avaliacao);
  localStorage.setItem('avaliacoes', JSON.stringify(avaliacoes));
  showToast('Avaliação salva com sucesso!', 'success');
}

// ==================== VO2MAX ====================
const vo2Protocolos = {
  bruce: {
    nome: 'Protocolo de Bruce (1973) – Esteira',
    descricao: 'Protocolo máximo em esteira com estágios de 3 minutos. Amplamente utilizado em populações saudáveis e cardíacas.',
    estagios: [
      { n: 1, vel: '2,7 km/h', inc: '10%', met: 4.6 },
      { n: 2, vel: '4,0 km/h', inc: '12%', met: 7.0 },
      { n: 3, vel: '5,5 km/h', inc: '14%', met: 10.1 },
      { n: 4, vel: '6,8 km/h', inc: '16%', met: 12.9 },
      { n: 5, vel: '8,0 km/h', inc: '18%', met: 15.0 },
      { n: 6, vel: '8,9 km/h', inc: '20%', met: 16.9 },
      { n: 7, vel: '9,7 km/h', inc: '22%', met: 18.8 },
    ],
    campos: [
      { id: 'vo2-bruce-tempo', label: 'Tempo Total (minutos decimais)', type: 'number', step: '0.1', placeholder: 'Ex: 10.5' },
      { id: 'vo2-bruce-sexo', label: 'Sexo', type: 'select', options: [['M','Masculino'],['F','Feminino']] },
    ],
    formula: `VO2máx (Homens) = 14,76 − 1,379 × T + 0,451 × T² − 0,012 × T³
VO2máx (Mulheres) = 4,38 × T − 3,90
Onde T = tempo total em minutos  (Foster et al., 1984)`,
    calc: () => {
      const T = parseFloat(document.getElementById('vo2-bruce-tempo').value);
      const sexo = document.getElementById('vo2-bruce-sexo').value;
      if (isNaN(T)) return null;
      if (sexo === 'M') return 14.76 - 1.379 * T + 0.451 * T * T - 0.012 * T * T * T;
      return 4.38 * T - 3.90;
    }
  },
  bruce_mod: {
    nome: 'Protocolo de Bruce Modificado – Esteira',
    descricao: 'Versão modificada para populações descondicionadas, idosos e cardíacos. Inicia com dois estágios extras de menor intensidade.',
    estagios: [
      { n: 1, vel: '2,7 km/h', inc: '0%' },
      { n: 2, vel: '2,7 km/h', inc: '5%' },
      { n: 3, vel: '2,7 km/h', inc: '10%' },
      { n: 4, vel: '4,0 km/h', inc: '12%' },
      { n: 5, vel: '5,5 km/h', inc: '14%' },
    ],
    campos: [
      { id: 'vo2-brucemod-tempo', label: 'Tempo Total (min)', type: 'number', step: '0.1', placeholder: 'Ex: 12.5' },
      { id: 'vo2-brucemod-sexo', label: 'Sexo', type: 'select', options: [['M','Masculino'],['F','Feminino']] },
    ],
    formula: `VO2máx = 2,282 × T + 8,545  (Homens)
VO2máx = 2,282 × T + 5,342  (Mulheres)`,
    calc: () => {
      const T = parseFloat(document.getElementById('vo2-brucemod-tempo').value);
      const sexo = document.getElementById('vo2-brucemod-sexo').value;
      if (isNaN(T)) return null;
      return sexo === 'M' ? 2.282 * T + 8.545 : 2.282 * T + 5.342;
    }
  },
  balke: {
    nome: 'Protocolo de Balke & Ware (1959) – Esteira',
    descricao: 'Esteira com velocidade constante (5,5 km/h), inclinação aumenta 1% a cada minuto. Protocolo submáximo moderado.',
    campos: [
      { id: 'vo2-balke-tempo', label: 'Tempo Total (min)', type: 'number', step: '0.1', placeholder: 'Ex: 20' },
      { id: 'vo2-balke-sexo', label: 'Sexo', type: 'select', options: [['M','Masculino'],['F','Feminino']] },
    ],
    formula: `VO2máx (Homens) = 1,444 × T + 14,99
VO2máx (Mulheres) = 1,38 × T + 5,22
Onde T = tempo em minutos  (Balke & Ware, 1959)`,
    calc: () => {
      const T = parseFloat(document.getElementById('vo2-balke-tempo').value);
      const sexo = document.getElementById('vo2-balke-sexo').value;
      if (isNaN(T)) return null;
      return sexo === 'M' ? 1.444 * T + 14.99 : 1.38 * T + 5.22;
    }
  },
  naughton: {
    nome: 'Protocolo de Naughton (1964) – Esteira',
    descricao: 'Protocolo de baixa intensidade inicial, para cardíacos e idosos. Estágios de 2 minutos.',
    campos: [
      { id: 'vo2-naughton-estagio', label: 'Estágio Completado (1–10)', type: 'number', placeholder: 'Ex: 6' },
    ],
    formula: `VO2máx ≈ MET × 3,5 mL·kg⁻¹·min⁻¹
Estágios (MET): 1=2,3 | 2=3,5 | 3=4,6 | 4=5,4 | 5=6,4
6=7,5 | 7=8,5 | 8=9,7 | 9=10,7 | 10=12,1`,
    calc: () => {
      const mets = [0, 2.3, 3.5, 4.6, 5.4, 6.4, 7.5, 8.5, 9.7, 10.7, 12.1];
      const est = parseInt(document.getElementById('vo2-naughton-estagio').value);
      if (!est || est < 1 || est > 10) return null;
      return mets[est] * 3.5;
    }
  },
  astrand_treadmill: {
    nome: 'Åstrand Esteira – Submáximo',
    descricao: 'Estimativa via FC submáxima em esteira usando nomograma de Åstrand.',
    campos: [
      { id: 'vo2-at-vo2medido', label: 'VO2 na carga (L/min)', type: 'number', step: '0.01', placeholder: 'Ex: 2.0' },
      { id: 'vo2-at-fc', label: 'FC na carga (bpm)', type: 'number', placeholder: 'Ex: 150' },
      { id: 'vo2-at-sexo', label: 'Sexo', type: 'select', options: [['M','Masculino'],['F','Feminino']] },
      { id: 'vo2-at-peso', label: 'Peso (kg)', type: 'number', step: '0.1', placeholder: 'Ex: 70' },
    ],
    formula: `VO2máx (L/min) = VO2submax × (FCmax − FCrep) / (FCsubmax − FCrep)
Fator de correção por idade (tabela Åstrand-Ryhming, 1954)
VO2máx relativo = VO2máx(L/min) × 1000 / Peso(kg)`,
    calc: () => {
      const vo2sub = parseFloat(document.getElementById('vo2-at-vo2medido').value);
      const fc = parseFloat(document.getElementById('vo2-at-fc').value);
      const sexo = document.getElementById('vo2-at-sexo').value;
      const peso = parseFloat(document.getElementById('vo2-at-peso').value);
      if (isNaN(vo2sub) || isNaN(fc) || isNaN(peso)) return null;
      const fcmax = sexo === 'M' ? 195 : 198;
      const fcRep = 70;
      const vo2maxL = vo2sub * (fcmax - fcRep) / (fc - fcRep);
      return (vo2maxL * 1000) / peso;
    }
  },
  astrand_bike: {
    nome: 'Åstrand-Ryhming Cicloergômetro (1954)',
    descricao: 'Protocolo submáximo em bicicleta. O indivíduo pedala por 6 minutos a carga constante, medindo a FC entre 5º e 6º minuto.',
    campos: [
      { id: 'vo2-ab-carga', label: 'Carga (kgm/min ou Watts×6)', type: 'number', placeholder: 'Ex: 900' },
      { id: 'vo2-ab-fc', label: 'FC no 5º–6º minuto (bpm)', type: 'number', placeholder: 'Ex: 155' },
      { id: 'vo2-ab-sexo', label: 'Sexo', type: 'select', options: [['M','Masculino'],['F','Feminino']] },
      { id: 'vo2-ab-peso', label: 'Peso (kg)', type: 'number', step: '0.1', placeholder: 'Ex: 70' },
      { id: 'vo2-ab-idade', label: 'Idade (para correção)', type: 'number', placeholder: 'Ex: 35' },
    ],
    formula: `VO2submax(L/min) = Carga × 2 / 1000 + 0,3  (Homens)
VO2submax(L/min) = Carga × 2 / 1000 + 0,3  (Mulheres)
VO2máx = VO2sub × (FCmax − 60) / (FC − 60)
FCmax: 195 homens / 198 mulheres
Fator de correção por idade: 15–21=1,10; 22–29=1,00; 30–35=0,94; 36–40=0,87; 41–47=0,83; 48–56=0,78; ≥57=0,75`,
    calc: () => {
      const carga = parseFloat(document.getElementById('vo2-ab-carga').value);
      const fc = parseFloat(document.getElementById('vo2-ab-fc').value);
      const sexo = document.getElementById('vo2-ab-sexo').value;
      const peso = parseFloat(document.getElementById('vo2-ab-peso').value);
      const idade = parseFloat(document.getElementById('vo2-ab-idade').value);
      if (isNaN(carga) || isNaN(fc) || isNaN(peso)) return null;
      const vo2sub = carga * 2 / 1000 + 0.3;
      const fcmax = sexo === 'M' ? 195 : 198;
      let cf = 1.0;
      if (idade < 22) cf = 1.10; else if (idade < 30) cf = 1.00; else if (idade < 36) cf = 0.94;
      else if (idade < 41) cf = 0.87; else if (idade < 48) cf = 0.83; else if (idade < 57) cf = 0.78; else cf = 0.75;
      const vo2maxL = (vo2sub * (fcmax - 60) / (fc - 60)) * cf;
      return (vo2maxL * 1000) / peso;
    }
  },
  ymca_bike: {
    nome: 'Protocolo YMCA – Cicloergômetro',
    descricao: 'Protocolo submáximo em bicicleta com estágios de 3 minutos. A carga é ajustada conforme a FC.',
    campos: [
      { id: 'vo2-ymca-carga2', label: '2ª Carga (kgm/min)', type: 'number', placeholder: 'Ex: 600' },
      { id: 'vo2-ymca-fc2', label: 'FC na 2ª Carga (bpm)', type: 'number', placeholder: 'Ex: 130' },
      { id: 'vo2-ymca-carga3', label: '3ª Carga (kgm/min)', type: 'number', placeholder: 'Ex: 750' },
      { id: 'vo2-ymca-fc3', label: 'FC na 3ª Carga (bpm)', type: 'number', placeholder: 'Ex: 148' },
      { id: 'vo2-ymca-sexo', label: 'Sexo', type: 'select', options: [['M','Masculino'],['F','Feminino']] },
      { id: 'vo2-ymca-peso', label: 'Peso (kg)', type: 'number', step: '0.1', placeholder: 'Ex: 70' },
    ],
    formula: `Extrapolação linear da curva FC × carga até a FCmax estimada (220 − Idade)
VO2máx = (VO2 da carga extrapolada) / Peso(kg) × 1000
VO2 de carga = (Carga × 2 / 1000) + 0,3  (mL/kg/min)`,
    calc: () => {
      const c2 = parseFloat(document.getElementById('vo2-ymca-carga2').value);
      const f2 = parseFloat(document.getElementById('vo2-ymca-fc2').value);
      const c3 = parseFloat(document.getElementById('vo2-ymca-carga3').value);
      const f3 = parseFloat(document.getElementById('vo2-ymca-fc3').value);
      const peso = parseFloat(document.getElementById('vo2-ymca-peso').value);
      const sexo = document.getElementById('vo2-ymca-sexo').value;
      if (isNaN(c2)||isNaN(f2)||isNaN(c3)||isNaN(f3)||isNaN(peso)) return null;
      const fcmax = sexo === 'M' ? 195 : 198;
      const slope = (c3 - c2) / (f3 - f2);
      const cargaMax = c2 + slope * (fcmax - f2);
      const vo2L = cargaMax * 2 / 1000 + 0.3;
      return (vo2L * 1000) / peso;
    }
  },
  fox_bike: {
    nome: 'Fox (1973) – Cicloergômetro',
    descricao: 'Estimativa da potência aeróbica usando FC no 5º minuto a 150 W.',
    campos: [
      { id: 'vo2-fox-fc', label: 'FC no 5º minuto a 150W (bpm)', type: 'number', placeholder: 'Ex: 145' },
    ],
    formula: `VO2máx (mL/min) = 6300 − 19,26 × FC5min
VO2máx relativo = VO2máx(mL/min) / Peso(kg)  (Fox, 1973)`,
    calc: () => {
      const fc = parseFloat(document.getElementById('vo2-fox-fc').value);
      if (isNaN(fc)) return null;
      const sel = document.getElementById('alunoVO2');
      const id = parseInt(sel.value);
      const aluno = id ? alunos.find(a => a.id === id) : null;
      const peso = aluno ? parseFloat(aluno.peso) : 70;
      const vo2abs = 6300 - 19.26 * fc;
      return vo2abs / peso;
    }
  },
  cooper12: {
    nome: 'Teste de Cooper – 12 Minutos (1968)',
    descricao: 'O indivíduo percorre a maior distância possível em 12 minutos. Teste máximo de campo.',
    campos: [
      { id: 'vo2-cooper-dist', label: 'Distância percorrida (metros)', type: 'number', placeholder: 'Ex: 2400' },
    ],
    formula: `VO2máx = (Distância − 504,9) / 44,73
ou
VO2máx = (Distância(m) / 1000 − 0,3138) / 0,0278  (Cooper, 1968)`,
    calc: () => {
      const d = parseFloat(document.getElementById('vo2-cooper-dist').value);
      if (isNaN(d)) return null;
      return (d - 504.9) / 44.73;
    }
  },
  cooper1_5: {
    nome: 'Corrida 1,5 Milha (2,4 km) – Cooper',
    descricao: 'Tempo para percorrer 1,5 milha (2.400 metros) na máxima velocidade.',
    campos: [
      { id: 'vo2-c15-tempo', label: 'Tempo (minutos decimais)', type: 'number', step: '0.01', placeholder: 'Ex: 11.5' },
      { id: 'vo2-c15-sexo', label: 'Sexo', type: 'select', options: [['M','Masculino'],['F','Feminino']] },
    ],
    formula: `VO2máx (Homens) = 3,62989 + 483,840 / Tempo
VO2máx (Mulheres) = 3,26707 + 420,838 / Tempo  (Cooper, 1968)`,
    calc: () => {
      const T = parseFloat(document.getElementById('vo2-c15-tempo').value);
      const sexo = document.getElementById('vo2-c15-sexo').value;
      if (isNaN(T)) return null;
      return sexo === 'M' ? 3.62989 + 483.84 / T : 3.26707 + 420.838 / T;
    }
  },
  rockport: {
    nome: 'Rockport Walking Test (1987)',
    descricao: 'Caminhada de 1 milha (1,6 km) em ritmo máximo. Mede FC ao final. Adequado para idosos e sedentários.',
    campos: [
      { id: 'vo2-rock-tempo', label: 'Tempo (minutos decimais)', type: 'number', step: '0.01', placeholder: 'Ex: 14.5' },
      { id: 'vo2-rock-fc', label: 'FC imediatamente após (bpm)', type: 'number', placeholder: 'Ex: 130' },
      { id: 'vo2-rock-sexo', label: 'Sexo (0=Masc, 1=Fem)', type: 'select', options: [['0','Masculino'],['1','Feminino']] },
      { id: 'vo2-rock-peso', label: 'Peso (kg)', type: 'number', step: '0.1', placeholder: 'Ex: 70' },
      { id: 'vo2-rock-idade', label: 'Idade (anos)', type: 'number', placeholder: 'Ex: 40' },
    ],
    formula: `VO2máx = 132,853 − 0,1692 × Peso(kg) − 0,3877 × Idade + 6,315 × Sexo − 3,2649 × Tempo − 0,1565 × FC
Sexo: 0 = Masculino, 1 = Feminino  (Kline et al., 1987)`,
    calc: () => {
      const T = parseFloat(document.getElementById('vo2-rock-tempo').value);
      const fc = parseFloat(document.getElementById('vo2-rock-fc').value);
      const sexo = parseFloat(document.getElementById('vo2-rock-sexo').value);
      const peso = parseFloat(document.getElementById('vo2-rock-peso').value);
      const idade = parseFloat(document.getElementById('vo2-rock-idade').value);
      if ([T,fc,peso,idade].some(isNaN)) return null;
      return 132.853 - 0.1692 * peso - 0.3877 * idade + 6.315 * sexo - 3.2649 * T - 0.1565 * fc;
    }
  },
  beep: {
    nome: 'Beep Test / 20m Shuttle Run (Léger et al., 1988)',
    descricao: 'Corridas de ida e volta em 20 metros com velocidade progressiva. O estágio completado determina o VO2máx.',
    campos: [
      { id: 'vo2-beep-nivel', label: 'Nível Atingido', type: 'number', placeholder: 'Ex: 10' },
      { id: 'vo2-beep-shuttle', label: 'Shuttle no nível atingido', type: 'number', placeholder: 'Ex: 4' },
      { id: 'vo2-beep-idade', label: 'Idade', type: 'number', placeholder: 'Ex: 25' },
    ],
    formula: `Velocidade (km/h) = 8 + 0,5 × Nível
VO2máx = −27,4 + 6,0 × Velocidade  (adultos, Léger et al., 1988)
VO2máx = 31,025 + 3,238 × V − 3,248 × Idade + 0,1536 × Idade × V  (≤18 anos)`,
    calc: () => {
      const nivel = parseFloat(document.getElementById('vo2-beep-nivel').value);
      const shuttle = parseFloat(document.getElementById('vo2-beep-shuttle').value);
      const idade = parseFloat(document.getElementById('vo2-beep-idade').value);
      if (isNaN(nivel)) return null;
      const vel = 8 + 0.5 * nivel;
      if (!isNaN(idade) && idade <= 18) return 31.025 + 3.238 * vel - 3.248 * idade + 0.1536 * idade * vel;
      return -27.4 + 6.0 * vel;
    }
  },
  queens: {
    nome: 'Queens College Step Test',
    descricao: 'Degrau de 41,3 cm. Homens: 24 passos/min por 3 min. Mulheres: 22 passos/min por 3 min. Medir FC entre 5–20s após.',
    campos: [
      { id: 'vo2-queens-fc', label: 'FC de Recuperação (bpm) – 15s × 4', type: 'number', placeholder: 'Ex: 156' },
      { id: 'vo2-queens-sexo', label: 'Sexo', type: 'select', options: [['M','Masculino'],['F','Feminino']] },
    ],
    formula: `VO2máx (Homens) = 111,33 − 0,42 × FC(bpm)
VO2máx (Mulheres) = 65,81 − 0,1847 × FC(bpm)  (McArdle et al., 1972)`,
    calc: () => {
      const fc = parseFloat(document.getElementById('vo2-queens-fc').value);
      const sexo = document.getElementById('vo2-queens-sexo').value;
      if (isNaN(fc)) return null;
      return sexo === 'M' ? 111.33 - 0.42 * fc : 65.81 - 0.1847 * fc;
    }
  },
  harvard_step: {
    nome: 'Harvard Step Test',
    descricao: 'Degrau de 50,8 cm (homens) ou 43 cm (mulheres), 30 passos/min por até 5 min. Índice de aptidão calculado pela FC.',
    campos: [
      { id: 'vo2-harvard-dur', label: 'Duração exercício (segundos)', type: 'number', placeholder: 'Ex: 300' },
      { id: 'vo2-harvard-fc1', label: 'FC 1–1,5 min recuperação (bpm)', type: 'number', placeholder: 'Ex: 90' },
      { id: 'vo2-harvard-fc2', label: 'FC 2–2,5 min recuperação (bpm)', type: 'number', placeholder: 'Ex: 80' },
      { id: 'vo2-harvard-fc3', label: 'FC 3–3,5 min recuperação (bpm)', type: 'number', placeholder: 'Ex: 70' },
    ],
    formula: `Índice = (Duração(s) × 100) / (2 × (FC1 + FC2 + FC3))
<55: Fraco | 55–64: Abaixo da Média | 65–79: Médio | 80–89: Bom | ≥90: Excelente
VO2máx estimado = Índice × 0,72 − 14,8  (Brouha, 1943)`,
    calc: () => {
      const dur = parseFloat(document.getElementById('vo2-harvard-dur').value);
      const f1 = parseFloat(document.getElementById('vo2-harvard-fc1').value);
      const f2 = parseFloat(document.getElementById('vo2-harvard-fc2').value);
      const f3 = parseFloat(document.getElementById('vo2-harvard-fc3').value);
      if ([dur,f1,f2,f3].some(isNaN)) return null;
      const idx = (dur * 100) / (2 * (f1 + f2 + f3));
      return idx * 0.72 - 14.8;
    }
  },
  kasch_step: {
    nome: 'Kasch Pulse Recovery Step Test',
    descricao: 'Degrau de 30,5 cm, 24 passos/min por 3 minutos. Medir FC de 1 a 1,5 min de recuperação.',
    campos: [
      { id: 'vo2-kasch-fc', label: 'FC 1–1,5 min recuperação (bpm)', type: 'number', placeholder: 'Ex: 88' },
      { id: 'vo2-kasch-sexo', label: 'Sexo', type: 'select', options: [['M','Masculino'],['F','Feminino']] },
    ],
    formula: `VO2máx (Homens) = 111,33 − 0,42 × FC
Classificação pela FC de recuperação (Kasch & Boyer, 1968)`,
    calc: () => {
      const fc = parseFloat(document.getElementById('vo2-kasch-fc').value);
      const sexo = document.getElementById('vo2-kasch-sexo').value;
      if (isNaN(fc)) return null;
      return sexo === 'M' ? 111.33 - 0.42 * fc : 65.81 - 0.1847 * fc;
    }
  },
  ymca_step: {
    nome: 'YMCA Step Test',
    descricao: 'Degrau de 30,5 cm, 24 passos/min por 3 minutos. Medir FC de 1 a 1,5 min de recuperação.',
    campos: [
      { id: 'vo2-ymca-step-fc', label: 'FC de recuperação (bpm)', type: 'number', placeholder: 'Ex: 100' },
      { id: 'vo2-ymca-step-sexo', label: 'Sexo', type: 'select', options: [['M','Masculino'],['F','Feminino']] },
    ],
    formula: `VO2máx (Homens) = 111,33 − 0,42 × FC
VO2máx (Mulheres) = 65,81 − 0,1847 × FC  (YMCA, adaptado)`,
    calc: () => {
      const fc = parseFloat(document.getElementById('vo2-ymca-step-fc').value);
      const sexo = document.getElementById('vo2-ymca-step-sexo').value;
      if (isNaN(fc)) return null;
      return sexo === 'M' ? 111.33 - 0.42 * fc : 65.81 - 0.1847 * fc;
    }
  },
  six_minute_walk: {
    nome: 'Teste de Caminhada de 6 Minutos (TC6)',
    descricao: 'O indivíduo caminha a máxima velocidade tolerada por 6 minutos em corredor de 30 metros. Muito utilizado em cardiopatas e DPOC.',
    campos: [
      { id: 'vo2-tc6-dist', label: 'Distância percorrida (metros)', type: 'number', placeholder: 'Ex: 480' },
      { id: 'vo2-tc6-peso', label: 'Peso (kg)', type: 'number', step: '0.1', placeholder: 'Ex: 70' },
      { id: 'vo2-tc6-altura', label: 'Estatura (cm)', type: 'number', placeholder: 'Ex: 170' },
      { id: 'vo2-tc6-idade', label: 'Idade', type: 'number', placeholder: 'Ex: 60' },
      { id: 'vo2-tc6-sexo', label: 'Sexo', type: 'select', options: [['M','Masculino'],['F','Feminino']] },
    ],
    formula: `Enright & Sherrill (1998):
Homens: D = 7,57 × Alt(cm) − 5,02 × Idade − 1,76 × Peso(kg) − 309
Mulheres: D = 2,11 × Alt(cm) − 5,78 × Idade − 2,29 × Peso(kg) + 667
VO2máx ≈ (Distância(m) × 0,1 + 3,5) × 3,5 / 3,5  (estimativa MET)`,
    calc: () => {
      const d = parseFloat(document.getElementById('vo2-tc6-dist').value);
      if (isNaN(d)) return null;
      return d * 0.0257 + 3.35;
    }
  },
  banco_canadense: {
    nome: 'Canadian Home Fitness Test (Banco Canadense)',
    descricao: 'Degrau de 20,3 cm (mulheres) ou 30,5 cm (homens). Cadência progressiva. Medição da FC de recuperação.',
    campos: [
      { id: 'vo2-cst-fc', label: 'FC recuperação 10s após (bpm)', type: 'number', placeholder: 'Ex: 100' },
      { id: 'vo2-cst-sexo', label: 'Sexo', type: 'select', options: [['M','Masculino'],['F','Feminino']] },
      { id: 'vo2-cst-cadencia', label: 'Cadência atingida (passos/min)', type: 'number', placeholder: 'Ex: 30' },
    ],
    formula: `VO2máx = 42,5 + 16,6 × V − 0,12 × FC − 0,34 × FC × V + 0,38 × Idade  (Bailey et al., 1974)
Onde V = velocidade em m/s (cadência estimada)`,
    calc: () => {
      const fc = parseFloat(document.getElementById('vo2-cst-fc').value);
      const sexo = document.getElementById('vo2-cst-sexo').value;
      if (isNaN(fc)) return null;
      return sexo === 'M' ? 111.33 - 0.42 * fc : 65.81 - 0.1847 * fc;
    }
  },
  non_exercise: {
    nome: 'Non-Exercise Test – Jurca et al. (2005)',
    descricao: 'Estimativa sem teste físico. Usa apenas variáveis de autorrelato.',
    campos: [
      { id: 'vo2-nex-sexo', label: 'Sexo', type: 'select', options: [['1','Masculino'],['0','Feminino']] },
      { id: 'vo2-nex-idade', label: 'Idade', type: 'number', placeholder: 'Ex: 35' },
      { id: 'vo2-nex-imc', label: 'IMC (kg/m²)', type: 'number', step: '0.1', placeholder: 'Ex: 25.0' },
      { id: 'vo2-nex-pa', label: 'Nível de Atividade Física (1–7)', type: 'number', placeholder: '1=Sedentário … 7=Muito ativo' },
    ],
    formula: `VO2máx = 56,363 + 1,921 × PA − 0,381 × Idade − 0,754 × IMC + 10,987 × Sexo
PA: 1=Sedentário, 2=Baixo, 3=Moderado, 4=Ativo, 5=Muito Ativo, 6=Atlético, 7=Elite
Sexo: 1=Masculino, 0=Feminino  (Jurca et al., 2005)`,
    calc: () => {
      const sexo = parseFloat(document.getElementById('vo2-nex-sexo').value);
      const idade = parseFloat(document.getElementById('vo2-nex-idade').value);
      const imc = parseFloat(document.getElementById('vo2-nex-imc').value);
      const pa = parseFloat(document.getElementById('vo2-nex-pa').value);
      if ([sexo,idade,imc,pa].some(isNaN)) return null;
      return 56.363 + 1.921 * pa - 0.381 * idade - 0.754 * imc + 10.987 * sexo;
    }
  },
  george_nex: {
    nome: 'George Non-Exercise Test (1997)',
    descricao: 'Estimativa sem teste físico usando percepção de esforço habitual.',
    campos: [
      { id: 'vo2-gnex-sexo', label: 'Sexo', type: 'select', options: [['1','Masculino'],['0','Feminino']] },
      { id: 'vo2-gnex-peso', label: 'Peso (kg)', type: 'number', step: '0.1', placeholder: 'Ex: 70' },
      { id: 'vo2-gnex-pa', label: 'Índice de Atividade Física (0–10)', type: 'number', placeholder: '0=Sedentário … 10=Muito ativo' },
    ],
    formula: `VO2máx = 3,778 × PA + 0,19 × Peso(lb) × Sexo − 0,117 × Peso(lb) × (1−Sexo) + 56,363
Equação simplificada: VO2máx = 54,07 − 0,1938 × Peso(kg) + 4,47 × PA + 10,78 × Sexo
Sexo: 1=Masculino, 0=Feminino  (George et al., 1997)`,
    calc: () => {
      const sexo = parseFloat(document.getElementById('vo2-gnex-sexo').value);
      const peso = parseFloat(document.getElementById('vo2-gnex-peso').value);
      const pa = parseFloat(document.getElementById('vo2-gnex-pa').value);
      if ([sexo,peso,pa].some(isNaN)) return null;
      return 54.07 - 0.1938 * peso + 4.47 * pa + 10.78 * sexo;
    }
  },
};

function carregarProtocolo() {
  const key = document.getElementById('protocoloVO2').value;
  const p = vo2Protocolos[key];
  if (!p) return;

  document.getElementById('protocolo-descricao').innerHTML = `<strong>${p.nome}</strong><br>${p.descricao}`;

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

  // Estágios
  if (p.estagios) {
    camposHTML += '<h3 style="margin:1rem 0 0.5rem;font-size:0.9rem;color:var(--primary);">Estágios do Protocolo</h3>';
    camposHTML += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Estágio</th><th>Velocidade</th><th>Inclinação</th>' + (p.estagios[0].met ? '<th>MET</th>' : '') + '</tr></thead><tbody>';
    p.estagios.forEach(e => {
      camposHTML += `<tr><td>${e.n}</td><td>${e.vel}</td><td>${e.inc}</td>${e.met ? `<td>${e.met}</td>` : ''}</tr>`;
    });
    camposHTML += '</tbody></table></div>';
  }

  document.getElementById('protocolo-campos').innerHTML = camposHTML;
  const fb = document.getElementById('protocolo-formula');
  fb.style.display = 'block';
  fb.innerHTML = `<strong>Fórmula:</strong><br><pre style="white-space:pre-wrap;font-family:inherit;margin-top:0.5rem;">${p.formula}</pre>`;
}

function calcularVO2() {
  const key = document.getElementById('protocoloVO2').value;
  const p = vo2Protocolos[key];
  if (!p || !p.calc) { showToast('Selecione um protocolo válido', 'error'); return; }
  const vo2 = p.calc();
  if (vo2 === null || isNaN(vo2)) { showToast('Preencha todos os campos necessários', 'error'); return; }
  const sel = document.getElementById('alunoVO2');
  const id = parseInt(sel.value);
  const aluno = id ? alunos.find(a => a.id === id) : null;
  const sexo = aluno ? aluno.sexo : 'M';
  const idade = aluno ? parseInt(aluno.idade) : 30;
  const cls = classificarVO2(vo2, sexo, idade);

  const box = document.getElementById('resultado-vo2');
  box.style.display = 'block';
  box.innerHTML = `
    <h2 class="section-title">Resultado do Teste</h2>
    <div class="result-grid">
      <div class="result-card highlight"><div class="rc-label">VO2máx</div><div class="rc-value">${vo2.toFixed(1)}</div><div class="rc-unit">mL·kg⁻¹·min⁻¹</div></div>
      <div class="result-card highlight"><div class="rc-label">METs</div><div class="rc-value">${(vo2/3.5).toFixed(1)}</div><div class="rc-unit">1 MET = 3,5 mL·kg⁻¹·min⁻¹</div></div>
      <div class="result-card"><div class="rc-label">Protocolo</div><div class="rc-value" style="font-size:0.85rem">${p.nome}</div></div>
      <div class="result-card"><div class="rc-label">Classificação</div><div class="rc-value" style="font-size:1rem">${cls.classe}</div><div class="rc-unit">${sexo === 'M' ? 'Masculino' : 'Feminino'} · ${idade} anos</div></div>
    </div>
    <div class="info-box">
      <strong>Zonas de Treinamento Aeróbio (% VO2máx):</strong><br>
      Zona 1 – Recuperação: ${(vo2*0.5).toFixed(1)} – ${(vo2*0.6).toFixed(1)} mL·kg⁻¹·min⁻¹<br>
      Zona 2 – Aeróbio Base: ${(vo2*0.6).toFixed(1)} – ${(vo2*0.7).toFixed(1)} mL·kg⁻¹·min⁻¹<br>
      Zona 3 – Aeróbio Moderado: ${(vo2*0.7).toFixed(1)} – ${(vo2*0.8).toFixed(1)} mL·kg⁻¹·min⁻¹<br>
      Zona 4 – Limiar Anaeróbio: ${(vo2*0.8).toFixed(1)} – ${(vo2*0.9).toFixed(1)} mL·kg⁻¹·min⁻¹<br>
      Zona 5 – VO2máx: ${(vo2*0.9).toFixed(1)} – ${vo2.toFixed(1)} mL·kg⁻¹·min⁻¹
    </div>`;

  window._ultimoVO2 = { vo2, cls: cls.classe, protocolo: p.nome };
  box.scrollIntoView({ behavior: 'smooth' });
}

function classificarVO2(vo2, sexo, idade) {
  const tbl = {
    M: [
      { faixa: [20,29], limites: [34,38,42,46,51,55] },
      { faixa: [30,39], limites: [30,35,40,44,48,54] },
      { faixa: [40,49], limites: [28,29,32,36,40,46] },
      { faixa: [50,59], limites: [24,25,29,34,38,43] },
      { faixa: [60,69], limites: [21,22,26,32,36,41] },
      { faixa: [70,99], limites: [21,22,25,29,33,37] },
    ],
    F: [
      { faixa: [20,29], limites: [26,27,31,35,39,44] },
      { faixa: [30,39], limites: [22,23,27,31,35,40] },
      { faixa: [40,49], limites: [21,22,25,29,33,37] },
      { faixa: [50,59], limites: [17,18,21,25,29,33] },
      { faixa: [60,69], limites: [14,15,18,22,26,29] },
      { faixa: [70,99], limites: [14,15,17,20,24,26] },
    ]
  };
  const classes = ['Fraco', 'Abaixo da Média', 'Média', 'Acima da Média', 'Bom', 'Excelente', 'Superior'];
  const faixas = tbl[sexo] || tbl['M'];
  const row = faixas.find(r => idade >= r.faixa[0] && idade <= r.faixa[1]) || faixas[faixas.length-1];
  const lims = row.limites;
  let cls = 0;
  for (let i = 0; i < lims.length; i++) { if (vo2 > lims[i]) cls = i + 1; }
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
  testes.push(teste);
  localStorage.setItem('testes', JSON.stringify(testes));
  showToast('Teste salvo com sucesso!', 'success');
}

// ==================== PRESCRIÇÃO ====================
const prescData = {
  hipertrofia: {
    nome: 'Hipertrofia Muscular',
    series: '3–5',
    reps: '6–12',
    carga: '67–85% 1RM',
    descanso: '60–120s',
    vel: 'Moderada (2-0-2)',
    freq: '4–5x/sem (por grupamento)',
    metodo: 'Tradicional, Bi-set, Drop-set, Super-set',
    ref: 'ACSM (2009); Kraemer & Ratamess (2004)',
  },
  forca: {
    nome: 'Força Máxima',
    series: '3–6',
    reps: '1–6',
    carga: '≥85% 1RM',
    descanso: '2–5 min',
    vel: 'Intencional – máxima',
    freq: '3–5x/sem',
    metodo: 'Linear, Ondulante, Conjugada',
    ref: 'Zatsiorsky & Kraemer (2006)',
  },
  resistencia: {
    nome: 'Resistência Muscular',
    series: '2–4',
    reps: '15–25+',
    carga: '40–60% 1RM',
    descanso: '30–60s',
    vel: 'Moderada a rápida',
    freq: '2–3x/sem',
    metodo: 'Circuito, Séries Contínuas',
    ref: 'ACSM (2009)',
  },
  emagrecimento: {
    nome: 'Emagrecimento / Perda de Gordura',
    series: '3–4',
    reps: '12–20',
    carga: '55–70% 1RM',
    descanso: '30–60s',
    vel: 'Moderada',
    freq: '4–5x/sem',
    metodo: 'Circuito, Alta Densidade, HIIT',
    ref: 'Donnelly et al. ACSM (2009)',
  },
  potencia: {
    nome: 'Potência / Performance',
    series: '3–5',
    reps: '3–6 (explosivo)',
    carga: '30–60% 1RM (velocidade máxima)',
    descanso: '2–3 min',
    vel: 'Máxima (concêntrica)',
    freq: '3–4x/sem',
    metodo: 'Pliometria, Olímpico, Complexo',
    ref: 'Kawamori & Haff (2004)',
  }
};

const exerciciosPorGrupo = {
  peito: ['Supino Reto', 'Supino Inclinado', 'Crucifixo', 'Crossover', 'Flexão de Braços'],
  costas: ['Puxada Frontal', 'Remada Curvada', 'Remada Unilateral', 'Pullover', 'Levantamento Terra'],
  ombros: ['Desenvolvimento', 'Elevação Lateral', 'Elevação Frontal', 'Remada Alta', 'Face Pull'],
  biceps: ['Rosca Direta', 'Rosca Alternada', 'Rosca Martelo', 'Rosca Scott', 'Rosca Concentrada'],
  triceps: ['Tríceps Pulley', 'Tríceps Testa', 'Mergulho', 'Tríceps Francês', 'Kickback'],
  pernas: ['Agachamento', 'Leg Press', 'Extensora', 'Flexora', 'Stiff', 'Panturrilha', 'Adutor', 'Abdutor'],
  abdomen: ['Abdominal Crunch', 'Prancha', 'Oblíquo', 'Elevação de Pernas', 'Rotação de Tronco'],
};

const divisoes = {
  fullbody: [{ nome: 'Full Body', grupos: ['peito','costas','ombros','biceps','triceps','pernas','abdomen'] }],
  AB: [
    { nome: 'Treino A', grupos: ['peito','ombros','triceps','abdomen'] },
    { nome: 'Treino B', grupos: ['costas','biceps','pernas'] },
  ],
  ABC: [
    { nome: 'Treino A – Peito/Ombros/Tríceps', grupos: ['peito','ombros','triceps'] },
    { nome: 'Treino B – Costas/Bíceps', grupos: ['costas','biceps'] },
    { nome: 'Treino C – Pernas/Abdômen', grupos: ['pernas','abdomen'] },
  ],
  ABCD: [
    { nome: 'Treino A – Peito', grupos: ['peito','triceps'] },
    { nome: 'Treino B – Costas', grupos: ['costas','biceps'] },
    { nome: 'Treino C – Pernas', grupos: ['pernas','abdomen'] },
    { nome: 'Treino D – Ombros', grupos: ['ombros','abdomen'] },
  ],
  ABCDE: [
    { nome: 'Treino A – Peito', grupos: ['peito'] },
    { nome: 'Treino B – Costas', grupos: ['costas'] },
    { nome: 'Treino C – Ombros', grupos: ['ombros','abdomen'] },
    { nome: 'Treino D – Braços', grupos: ['biceps','triceps'] },
    { nome: 'Treino E – Pernas', grupos: ['pernas'] },
  ],
};

function carregarPresc() {
  const selId = parseInt(document.getElementById('alunoPresc').value);
  if (!selId) {
    document.getElementById('presc-content').style.display = 'none';
    document.getElementById('presc-empty').style.display = 'block';
    return;
  }
  const aluno = alunos.find(a => a.id === selId);
  if (aluno && aluno.objetivo) document.getElementById('presc-objetivo').value = aluno.objetivo;
  document.getElementById('presc-content').style.display = 'block';
  document.getElementById('presc-empty').style.display = 'none';
}

function gerarPresc() {
  const selId = parseInt(document.getElementById('alunoPresc').value);
  const aluno = alunos.find(a => a.id === selId);
  if (!aluno) return;
  const obj = document.getElementById('presc-objetivo').value;
  const div = document.getElementById('presc-divisao').value;
  const dias = parseInt(document.getElementById('presc-dias').value);
  const pd = prescData[obj] || prescData['hipertrofia'];
  const divData = divisoes[div] || divisoes['ABC'];

  let html = `<div class="presc-header">
    <h3>${aluno.nome}</h3>
    <p>${aluno.sexo === 'M' ? 'Masculino' : 'Feminino'} · ${aluno.idade} anos · ${aluno.peso} kg · ${aluno.altura} cm</p>
    <p><strong>Objetivo:</strong> ${pd.nome} | <strong>Divisão:</strong> ${div} | <strong>Frequência:</strong> ${dias}x/semana</p>
    <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
  </div>
  <div class="info-box">
    <strong>Parâmetros Gerais:</strong><br>
    Séries: ${pd.series} | Repetições: ${pd.reps} | Carga: ${pd.carga}<br>
    Descanso: ${pd.descanso} | Velocidade: ${pd.vel} | Frequência: ${pd.freq}<br>
    Método: ${pd.metodo}<br>
    <em>Ref: ${pd.ref}</em>
  </div>`;

  divData.forEach(treino => {
    html += `<h3 style="color:var(--primary);margin:1.5rem 0 0.5rem;">${treino.nome}</h3>`;
    html += `<table class="presc-table"><thead><tr><th>#</th><th>Exercício</th><th>Séries</th><th>Reps</th><th>Carga</th><th>Descanso</th><th>Obs</th></tr></thead><tbody>`;
    let num = 1;
    treino.grupos.forEach(grupo => {
      const exs = exerciciosPorGrupo[grupo] || [];
      const qtd = grupo === 'abdomen' ? 2 : 3;
      exs.slice(0, qtd).forEach(ex => {
        html += `<tr><td>${num++}</td><td><strong>${ex}</strong></td><td>${pd.series}</td><td>${pd.reps}</td><td>${pd.carga}</td><td>${pd.descanso}</td><td></td></tr>`;
      });
    });
    html += '</tbody></table>';
  });

  document.getElementById('presc-ficha').innerHTML = html;
  document.getElementById('presc-resultado').style.display = 'block';
  document.getElementById('presc-resultado').scrollIntoView({ behavior: 'smooth' });
  showToast('Prescrição gerada!', 'success');
}

function imprimirPresc() {
  window.print();
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  renderAlunosGrid();
  const hoje = new Date().toISOString().slice(0, 10);
  document.getElementById('dataVO2').value = hoje;
  document.getElementById('dataAntro').value = hoje;
  mostrarProtocolo();
  carregarProtocolo();
});

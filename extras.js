// ========================================================
// extras.js – Anamnese, 1RM, Aeróbio, Evolução, Relatório
// ========================================================

// ==================== ANAMNESE ====================
const avaliarPARQ = () => {
  let simCount = 0;
  for (let i = 1; i <= 7; i++) {
    const sel = document.querySelector(`input[name="parq${i}"]:checked`);
    if (sel && sel.value === 'sim') simCount++;
  }
  const box = document.getElementById('parq-resultado');
  if (!box) return;
  box.style.display = 'block';
  if (simCount === 0) {
    box.className = 'parq-resultado parq-ok';
    box.innerHTML = '<strong>APTO para atividade física</strong><br>Todas as respostas foram NÃO. O aluno pode iniciar um programa de exercícios de intensidade moderada a vigorosa. Recomenda-se avaliação médica periódica.';
  } else {
    box.className = 'parq-resultado parq-atencao';
    box.innerHTML = `<strong>ATENÇÃO – ${simCount} resposta(s) positiva(s)</strong><br>O aluno deve consultar um médico antes de iniciar ou aumentar a intensidade do treinamento. Prescreva apenas exercícios de baixa intensidade até liberação médica.<br><em>Fonte: PAR-Q – Canadian Society for Exercise Physiology (CSEP)</em>`;
  }
};

const classificarPA = () => {
  const sis = parseFloat(document.getElementById('paSistolica').value);
  const dia = parseFloat(document.getElementById('paDiastolica').value);
  if (isNaN(sis) || isNaN(dia)) return;
  let cls = '';
  if (sis < 120 && dia < 80) cls = 'Normal';
  else if (sis < 130 && dia < 80) cls = 'Elevada';
  else if (sis < 140 || (dia >= 80 && dia < 90)) cls = 'HAS Estágio 1';
  else if (sis < 180 || (dia >= 90 && dia < 120)) cls = 'HAS Estágio 2';
  else cls = 'Crise Hipertensiva';
  document.getElementById('classPA').value = cls;
};

const salvarAnamnese = () => {
  const selId = document.getElementById('alunoAnamnese').value;
  if (!selId) { showToast('Selecione um aluno', 'error'); return; }
  const parqRespostas = {};
  for (let i = 1; i <= 7; i++) {
    const sel = document.querySelector(`input[name="parq${i}"]:checked`);
    parqRespostas[`q${i}`] = sel ? sel.value : 'nao';
  }
  const patologias = [...document.querySelectorAll('input[name="patAnamnese"]:checked')].map(c => c.value);
  const anamnese = {
    id: Date.now(),
    alunoId: selId,
    data: document.getElementById('dataAnamnese').value,
    parq: parqRespostas,
    patologias,
    medicamentos: document.getElementById('medicamentos').value,
    cirurgias: document.getElementById('cirurgias').value,
    tabagismo: document.getElementById('tabagismo').value,
    alcool: document.getElementById('alcool').value,
    sono: document.getElementById('sono').value,
    estresse: document.getElementById('estresse').value,
    alimentacao: document.getElementById('alimentacao').value,
    agua: document.getElementById('agua').value,
    dores: document.getElementById('dores').value,
    expectativas: document.getElementById('expectativas').value,
    paSistolica: document.getElementById('paSistolica').value,
    paDiastolica: document.getElementById('paDiastolica').value,
    classPA: document.getElementById('classPA').value,
    glicemia: document.getElementById('glicemia').value,
    colesterol: document.getElementById('colesterol').value,
    triglicerideos: document.getElementById('triglicerideos').value,
    obsClinicas: document.getElementById('obsClinicas').value,
    assinatura: document.getElementById('assinaturaAnamnese').value,
  };
  const anamneses = JSON.parse(localStorage.getItem('anamneses') || '[]');
  anamneses.push(anamnese);
  localStorage.setItem('anamneses', JSON.stringify(anamneses));
  showToast('Anamnese salva com sucesso!', 'success');
};

function limparAnamnese() {
  document.getElementById('alunoAnamnese').value = '';
  document.querySelectorAll('#page-anamnese input:not([type=radio]):not([type=checkbox])').forEach(el => el.value = '');
  document.querySelectorAll('#page-anamnese input[type=radio]').forEach(el => el.checked = false);
  document.querySelectorAll('#page-anamnese input[type=checkbox]').forEach(el => el.checked = false);
  document.querySelectorAll('#page-anamnese select').forEach(el => el.value = '');
  document.querySelectorAll('#page-anamnese textarea').forEach(el => el.value = '');
  document.getElementById('parq-resultado').style.display = 'none';
}

// ==================== 1RM ====================
function calcularRM() {
  const carga = parseFloat(document.getElementById('rm-carga').value);
  const reps = parseInt(document.getElementById('rm-reps').value);
  if (isNaN(carga) || isNaN(reps) || reps < 1 || reps > 15) {
    showToast('Informe carga e repetições (1–15)', 'error'); return;
  }
  const formulas = [
    { nome: 'Brzycki (1993)',   val: carga / (1.0278 - 0.0278 * reps) },
    { nome: 'Epley (1985)',     val: carga * (1 + 0.0333 * reps) },
    { nome: 'Lander (1985)',    val: carga / (1.013 - 0.0267123 * reps) },
    { nome: 'Lombardi (1989)',  val: carga * Math.pow(reps, 0.10) },
    { nome: 'Mayhew et al. (1992)', val: carga / (0.522 + 0.419 * Math.exp(-0.055 * reps)) },
    { nome: 'O\'Conner et al. (1989)', val: carga * (1 + 0.025 * reps) },
    { nome: 'Wathan (1994)',    val: 100 * carga / (48.8 + 53.8 * Math.exp(-0.075 * reps)) },
  ];
  const media = formulas.reduce((s, f) => s + f.val, 0) / formulas.length;
  const exercicio = document.getElementById('rm-exercicio').value === 'Outro'
    ? document.getElementById('rm-exercicio-custom').value
    : document.getElementById('rm-exercicio').value;

  let html = `<div class="result-grid">`;
  formulas.forEach(f => {
    html += `<div class="result-card"><div class="rc-label">${f.nome}</div><div class="rc-value">${f.val.toFixed(1)}</div><div class="rc-unit">kg</div></div>`;
  });
  html += `<div class="result-card highlight"><div class="rc-label">Média Estimada</div><div class="rc-value">${media.toFixed(1)}</div><div class="rc-unit">kg</div></div>`;
  html += '</div>';
  document.getElementById('rm-tabela-resultado').innerHTML = html;

  const pcts = [100,95,90,85,80,75,70,65,60,55,50];
  const maxReps = [1,2,3,4,5,6,7,8,10,12,15];
  const zonas = [
    { zone:'Força Máxima',pct:90,reps:'1–3',color:'#fee2e2'},
    { zone:'Força/Potência',pct:80,reps:'4–6',color:'#fef3c7'},
    { zone:'Hipertrofia (alta)',pct:75,reps:'6–8',color:'#dbeafe'},
    { zone:'Hipertrofia',pct:70,reps:'8–12',color:'#ede9fe'},
    { zone:'Hipertrofia/Resistência',pct:65,reps:'10–15',color:'#d1fae5'},
    { zone:'Resistência Muscular',pct:60,reps:'15–20',color:'#f0fdf4'},
    { zone:'Resistência',pct:50,reps:'20+',color:'#f8fafc'},
  ];
  let percHtml = '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Zona</th><th>% 1RM</th><th>Carga (kg)</th><th>Reps Alvo</th></tr></thead><tbody>';
  zonas.forEach(z => {
    const c = (media * z.pct / 100).toFixed(1);
    percHtml += `<tr style="background:${z.color}"><td>${z.zone}</td><td>${z.pct}%</td><td>${c}</td><td>${z.reps}</td></tr>`;
  });
  percHtml += '</tbody></table></div>';
  document.getElementById('rm-percentuais').innerHTML = percHtml;
  document.getElementById('resultado-rm').style.display = 'block';

  window._ultimoRM = { carga, reps, media, formulas, exercicio };
  document.getElementById('resultado-rm').scrollIntoView({ behavior: 'smooth' });
}

function salvarRM() {
  const selId = document.getElementById('alunoRM').value;
  if (!selId || !window._ultimoRM) { showToast('Calcule o 1RM primeiro', 'error'); return; }
  let rms = JSON.parse(localStorage.getItem('rms') || '[]');
  rms.push({
    id: Date.now(),
    alunoId: selId,
    data: document.getElementById('dataRM').value,
    exercicio: window._ultimoRM.exercicio,
    carga: window._ultimoRM.carga,
    reps: window._ultimoRM.reps,
    rm: window._ultimoRM.media,
  });
  localStorage.setItem('rms', JSON.stringify(rms));
  showToast('1RM salvo com sucesso!', 'success');
}

// ==================== AERÓBIO ====================
const renderAerobioInit = () => {
  const selId = parseInt(document.getElementById('alunoAerobio').value);
  if (!selId) return;
  const aluno = state.alunos.find(a => a.id === selId);
  if (!aluno) return;
  if (aluno.fcRepouso) document.getElementById('aerobio-fcrep').value = aluno.fcRepouso;
  const tanaka = Math.round(208 - 0.7 * aluno.idade);
  document.getElementById('aerobio-fcmax').value = tanaka;
  const testes = JSON.parse(localStorage.getItem('testes') || '[]');
  const ultimo = testes.filter(t => String(t.alunoId) === String(selId)).slice(-1)[0];
  if (ultimo) document.getElementById('aerobio-vo2max').value = parseFloat(ultimo.vo2).toFixed(1);
};

function carregarAerobio() {
  renderAerobioInit();
}

const ZONAS_DEF = [
  { z:1, nome:'Recuperação Ativa',  fcMin:50, fcMax:60, karvMin:40, karvMax:55, vo2Min:40, vo2Max:55, rpe:'6–9',   obj:'Recuperação, aquecimento' },
  { z:2, nome:'Base Aeróbia',        fcMin:60, fcMax:70, karvMin:55, karvMax:65, vo2Min:55, vo2Max:65, rpe:'10–12', obj:'Resistência aeróbia base, queima de gordura' },
  { z:3, nome:'Aeróbio Moderado',    fcMin:70, fcMax:80, karvMin:65, karvMax:75, vo2Min:65, vo2Max:75, rpe:'13–14', obj:'Melhora do VO2máx, aptidão cardiovascular' },
  { z:4, nome:'Limiar Anaeróbio',    fcMin:80, fcMax:90, karvMin:75, karvMax:85, vo2Min:75, vo2Max:85, rpe:'15–16', obj:'Deslocamento do limiar, performance' },
  { z:5, nome:'VO2máx / Neuro',      fcMin:90, fcMax:100,karvMin:85, karvMax:100,vo2Min:85, vo2Max:100,rpe:'17–20', obj:'Potência aeróbia máxima, HIIT' },
];

function calcularZonasAerobio() {
  const fcRep = parseFloat(document.getElementById('aerobio-fcrep').value);
  const fcMax = parseFloat(document.getElementById('aerobio-fcmax').value);
  const vo2max = parseFloat(document.getElementById('aerobio-vo2max').value);
  if (isNaN(fcMax)) { showToast('Informe a FC máxima', 'error'); return; }
  const tbody = document.getElementById('zonas-tbody');
  tbody.innerHTML = '';
  ZONAS_DEF.forEach(z => {
    const fc1 = Math.round(fcMax * z.fcMin / 100);
    const fc2 = Math.round(fcMax * z.fcMax / 100);
    const reserva = fcMax - (isNaN(fcRep) ? 60 : fcRep);
    const fcrep = isNaN(fcRep) ? 60 : fcRep;
    const kfc1 = Math.round(reserva * z.karvMin / 100 + fcrep);
    const kfc2 = Math.round(reserva * z.karvMax / 100 + fcrep);
    const vo1 = isNaN(vo2max) ? '—' : (vo2max * z.vo2Min / 100).toFixed(1);
    const vo2 = isNaN(vo2max) ? '—' : (vo2max * z.vo2Max / 100).toFixed(1);
    const colors = ['#f0fdf4','#d1fae5','#dbeafe','#fef3c7','#fee2e2'];
    tbody.innerHTML += `<tr style="background:${colors[z.z-1]}">
      <td><strong>Z${z.z}</strong></td>
      <td>${z.nome}</td>
      <td>${z.fcMin}–${z.fcMax}%</td>
      <td>${fc1}–${fc2}</td>
      <td>${z.karvMin}–${z.karvMax}%</td>
      <td>${kfc1}–${kfc2}</td>
      <td>${z.vo2Min}–${z.vo2Max}%</td>
      <td>${vo1}–${vo2}</td>
      <td>${z.rpe}</td>
      <td style="font-size:0.78rem">${z.obj}</td>
    </tr>`;
  });
  document.getElementById('aerobio-zonas').style.display = 'block';
  showToast('Zonas calculadas!', 'success');
}

function gerarPrescricaoAerobio() {
  const fcRep = parseFloat(document.getElementById('aerobio-fcrep').value) || 60;
  const fcMax = parseFloat(document.getElementById('aerobio-fcmax').value);
  const vo2max = parseFloat(document.getElementById('aerobio-vo2max').value);
  const obj = document.getElementById('aerobio-objetivo').value;
  const modal = document.getElementById('aerobio-modalidade').value;
  const nivel = document.getElementById('aerobio-nivel').value;
  if (isNaN(fcMax)) { showToast('Calcule as zonas primeiro', 'error'); return; }

  const prescMap = {
    saude: {
      nome: 'Saúde Geral (ACSM 2022)',
      semanas: '8–12 semanas', freq: '3–5x/sem', duracao: '20–60 min',
      zonas: ['Z2 (60–70% FCmáx)', 'Z3 (70–80% FCmáx)'],
      int: '40–75% FC Reserva (Karvonen)',
      progressao: 'Aumentar 10% da duração a cada 2 semanas',
      ref: 'ACSM (2022); WHO Guidelines on Physical Activity',
    },
    emagrecimento: {
      nome: 'Emagrecimento / Perda de Gordura',
      semanas: '12–24 semanas', freq: '4–5x/sem', duracao: '40–60 min',
      zonas: ['Z2 (60–70% FCmáx) – oxidação lipídica', 'Z3 moderado'],
      int: '50–70% FC Reserva',
      progressao: 'Aumentar duração antes de intensidade; incluir HIIT 1–2x/sem após 4 semanas',
      ref: 'Donnelly et al., ACSM (2009); Tremblay et al. (1994)',
    },
    resistencia: {
      nome: 'Resistência Aeróbia',
      semanas: '12–16 semanas', freq: '4–5x/sem', duracao: '30–90 min',
      zonas: ['Z2–Z3 (65–80%)', 'Z4 1–2x/sem (limiar)'],
      int: '60–85% FC Reserva',
      progressao: 'Modelo Polarizado: 80% Z1-Z2, 20% Z4-Z5',
      ref: 'Seiler & Tønessen (2009); Stoggl & Sperlich (2014)',
    },
    performance: {
      nome: 'Performance / Alto Rendimento',
      semanas: '8–12 semanas', freq: '5–6x/sem', duracao: '45–120 min',
      zonas: ['Z3–Z4 base', 'Z5 HIIT 2x/sem'],
      int: '75–95% FC Reserva',
      progressao: 'Periodização ondulatória; HIIT: 4×4min Z5 / 2×20min Z4',
      ref: 'Helgerud et al. (2007); Laursen & Jenkins (2002)',
    },
  };

  const hiitMap = {
    saude: '2 min aquecimento Z1 → 20–30 min Z2–Z3 → 5 min desaquecimento Z1',
    emagrecimento: '5 min aquecimento → alternância 3 min Z3 / 1 min Z4 × 8–10 ciclos → 5 min desaquecimento',
    resistencia: '10 min Z2 → 20–40 min Z3 → 10 min Z4 (1x/sem) → 10 min Z1',
    performance: '10 min Z2 → 4 × 4 min Z5 (2 min Z1 descanso) → 10 min Z1',
  };

  const p = prescMap[obj];
  const reserva = fcMax - fcRep;
  const z2fc1 = Math.round(0.6 * reserva + fcRep);
  const z2fc2 = Math.round(0.7 * reserva + fcRep);
  const z3fc1 = Math.round(0.7 * reserva + fcRep);
  const z3fc2 = Math.round(0.8 * reserva + fcRep);

  const html = `
  <div class="presc-header">
    <h3>${p.nome}</h3>
    <p><strong>Modalidade:</strong> ${modal.charAt(0).toUpperCase()+modal.slice(1)} | <strong>Nível:</strong> ${nivel.charAt(0).toUpperCase()+nivel.slice(1)}</p>
    <p><strong>Período:</strong> ${p.semanas} | <strong>Frequência:</strong> ${p.freq} | <strong>Duração:</strong> ${p.duracao}</p>
  </div>
  <div class="info-box">
    <strong>Intensidade:</strong> ${p.int}<br>
    <strong>Zonas principais:</strong> ${p.zonas.join(' + ')}<br>
    <strong>FC alvo Z2:</strong> ${z2fc1}–${z2fc2} bpm | <strong>FC alvo Z3:</strong> ${z3fc1}–${z3fc2} bpm<br>
    ${vo2max ? `<strong>VO2máx:</strong> ${vo2max} mL/kg/min` : ''}
  </div>
  <h3 style="margin:1rem 0 0.5rem;color:var(--primary);">Estrutura da Sessão</h3>
  <div class="info-box" style="background:#f8fafc;border-color:#e2e8f0;">
    ${hiitMap[obj]}
  </div>
  <h3 style="margin:1rem 0 0.5rem;color:var(--primary);">Progressão</h3>
  <div class="info-box" style="background:#fef9c3;border-color:#fde68a;color:#78350f;">
    ${p.progressao}
  </div>
  <p style="font-size:0.78rem;color:#64748b;margin-top:0.5rem;">Ref: ${p.ref}</p>`;

  document.getElementById('aerobio-presc-conteudo').innerHTML = html;
  document.getElementById('aerobio-presc-resultado').style.display = 'block';
  document.getElementById('aerobio-presc-resultado').scrollIntoView({ behavior: 'smooth' });
  showToast('Prescrição aeróbia gerada!', 'success');
}

// ==================== EVOLUÇÃO / GRÁFICOS ====================
let chartComposicao = null, chartVo2 = null, chartRmGraf = null;

function carregarEvolucao() {
  const selId = parseInt(document.getElementById('alunoEvolucao').value);
  if (!selId) {
    document.getElementById('evolucao-content').style.display = 'none';
    document.getElementById('evolucao-empty').style.display = 'block';
    return;
  }
  document.getElementById('evolucao-content').style.display = 'block';
  document.getElementById('evolucao-empty').style.display = 'none';
  renderGraficoComposicao(selId);
  renderGraficoVO2(selId);
  renderHistorico(selId);
  preencherFiltroRM(selId);
}

function renderGraficoComposicao(alunoId) {
  const avs = JSON.parse(localStorage.getItem('avaliacoes') || '[]')
    .filter(a => String(a.alunoId) === String(alunoId))
    .sort((a, b) => a.data > b.data ? 1 : -1);

  const labels = avs.map(a => a.data ? new Date(a.data).toLocaleDateString('pt-BR') : '—');
  const gordura = avs.map(a => parseFloat(a.percGordura) || null);
  const magra = avs.map(a => parseFloat(a.massaMagra) || null);

  const ctx = document.getElementById('chart-composicao').getContext('2d');
  if (chartComposicao) chartComposicao.destroy();
  chartComposicao = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: '% Gordura', data: gordura, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.3, yAxisID: 'y' },
        { label: 'Massa Magra (kg)', data: magra, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', tension: 0.3, yAxisID: 'y1' },
      ]
    },
    options: {
      responsive: true, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top' }, title: { display: true, text: 'Evolução da Composição Corporal' } },
      scales: {
        y: { type: 'linear', display: true, position: 'left', title: { display: true, text: '% Gordura' } },
        y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Massa Magra (kg)' }, grid: { drawOnChartArea: false } }
      }
    }
  });
}

function renderGraficoVO2(alunoId) {
  const ts = JSON.parse(localStorage.getItem('testes') || '[]')
    .filter(t => String(t.alunoId) === String(alunoId))
    .sort((a, b) => a.data > b.data ? 1 : -1);

  const labels = ts.map(t => t.data ? new Date(t.data).toLocaleDateString('pt-BR') : '—');
  const valores = ts.map(t => parseFloat(t.vo2) || null);

  const ctx = document.getElementById('chart-vo2').getContext('2d');
  if (chartVo2) chartVo2.destroy();
  chartVo2 = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'VO2máx (mL/kg/min)', data: valores, borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.1)', tension: 0.3, pointRadius: 5 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' }, title: { display: true, text: 'Evolução do VO2máx' } },
      scales: { y: { title: { display: true, text: 'mL·kg⁻¹·min⁻¹' } } }
    }
  });
}

function preencherFiltroRM(alunoId) {
  const rms = JSON.parse(localStorage.getItem('rms') || '[]').filter(r => String(r.alunoId) === String(alunoId));
  const exercicios = [...new Set(rms.map(r => r.exercicio))];
  const sel = document.getElementById('rm-exercicio-graf');
  sel.innerHTML = '<option value="">Selecione o exercício</option>';
  exercicios.forEach(e => { const o = document.createElement('option'); o.value = e; o.textContent = e; sel.appendChild(o); });
}

function carregarGraficoRM() {
  const alunoId = parseInt(document.getElementById('alunoEvolucao').value);
  const exercicio = document.getElementById('rm-exercicio-graf').value;
  if (!exercicio) return;
  const rms = JSON.parse(localStorage.getItem('rms') || '[]')
    .filter(r => String(r.alunoId) === String(alunoId) && r.exercicio === exercicio)
    .sort((a, b) => a.data > b.data ? 1 : -1);

  const labels = rms.map(r => r.data ? new Date(r.data).toLocaleDateString('pt-BR') : '—');
  const valores = rms.map(r => parseFloat(r.rm) || null);

  const ctx = document.getElementById('chart-rm').getContext('2d');
  if (chartRmGraf) chartRmGraf.destroy();
  chartRmGraf = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: `1RM – ${exercicio} (kg)`, data: valores, backgroundColor: 'rgba(124,58,237,0.7)', borderColor: '#7c3aed', borderWidth: 2 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' }, title: { display: true, text: `Evolução do 1RM – ${exercicio}` } },
      scales: { y: { title: { display: true, text: 'kg' } } }
    }
  });
}

function renderHistorico(alunoId) {
  const avs = JSON.parse(localStorage.getItem('avaliacoes') || '[]').filter(a => String(a.alunoId) === String(alunoId));
  const ts  = JSON.parse(localStorage.getItem('testes') || '[]').filter(t => String(t.alunoId) === String(alunoId));
  const rms = JSON.parse(localStorage.getItem('rms') || '[]').filter(r => String(r.alunoId) === String(alunoId));
  const ans = JSON.parse(localStorage.getItem('anamneses') || '[]').filter(a => String(a.alunoId) === String(alunoId));

  let html = '';
  if (ans.length) {
    html += '<h3 style="color:var(--primary);margin:1rem 0 0.5rem;">Anamneses</h3>';
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Data</th><th>PA</th><th>PAR-Q Positivos</th></tr></thead><tbody>';
    ans.forEach(a => {
      const simCount = Object.values(a.parq || {}).filter(v => v === 'sim').length;
      html += `<tr><td>${a.data || '—'}</td><td>${a.paSistolica || '—'}/${a.paDiastolica || '—'} mmHg</td><td>${simCount} positivo(s)</td></tr>`;
    });
    html += '</tbody></table></div>';
  }
  if (avs.length) {
    html += '<h3 style="color:var(--primary);margin:1rem 0 0.5rem;">Avaliações Antropométricas</h3>';
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Data</th><th>% Gordura</th><th>M. Magra</th><th>M. Gorda</th><th>Protocolo</th></tr></thead><tbody>';
    avs.forEach(a => {
      html += `<tr><td>${a.data || '—'}</td><td>${a.percGordura || '—'}</td><td>${a.massaMagra || '—'}</td><td>${a.massaGorda || '—'}</td><td>${a.protocolo || '—'}</td></tr>`;
    });
    html += '</tbody></table></div>';
  }
  if (ts.length) {
    html += '<h3 style="color:var(--primary);margin:1rem 0 0.5rem;">Testes de VO2máx</h3>';
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Data</th><th>VO2máx</th><th>Classificação</th><th>Protocolo</th></tr></thead><tbody>';
    ts.forEach(t => {
      html += `<tr><td>${t.data || '—'}</td><td>${parseFloat(t.vo2).toFixed(1)} mL/kg/min</td><td>${t.classificacao || '—'}</td><td>${t.protocolo || '—'}</td></tr>`;
    });
    html += '</tbody></table></div>';
  }
  if (rms.length) {
    html += '<h3 style="color:var(--primary);margin:1rem 0 0.5rem;">Testes de 1RM</h3>';
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Data</th><th>Exercício</th><th>Carga</th><th>Reps</th><th>1RM Estimado</th></tr></thead><tbody>';
    rms.forEach(r => {
      html += `<tr><td>${r.data || '—'}</td><td>${r.exercicio}</td><td>${r.carga} kg</td><td>${r.reps}</td><td><strong>${parseFloat(r.rm).toFixed(1)} kg</strong></td></tr>`;
    });
    html += '</tbody></table></div>';
  }
  if (!html) html = '<p class="result-placeholder">Nenhum dado registrado para este aluno ainda.</p>';
  document.getElementById('historico-lista').innerHTML = html;
}

// ==================== RELATÓRIO COMPLETO ====================
function gerarRelatorioCompleto() {
  const selId = parseInt(document.getElementById('alunoPresc').value);
  if (!selId) { showToast('Selecione um aluno', 'error'); return; }
  const aluno = state.alunos.find(a => a.id === selId);
  if (!aluno) return;

  const avs = JSON.parse(localStorage.getItem('avaliacoes') || '[]').filter(a => String(a.alunoId) === String(selId));
  const ts  = JSON.parse(localStorage.getItem('testes') || '[]').filter(t => String(t.alunoId) === String(selId));
  const rms = JSON.parse(localStorage.getItem('rms') || '[]').filter(r => String(r.alunoId) === String(selId));
  const ans = JSON.parse(localStorage.getItem('anamneses') || '[]').filter(a => String(a.alunoId) === String(selId));
  const fichaEl = document.getElementById('presc-ficha');

  const hoje = new Date().toLocaleDateString('pt-BR');
  const h = (t) => `<h2 style="color:#1d4ed8;border-bottom:2px solid #1d4ed8;padding-bottom:4px;margin:1.5rem 0 0.8rem;">${t}</h2>`;

  let html = `
  <div style="font-family:'Segoe UI',sans-serif;color:#1e293b;max-width:900px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#1d4ed8,#1e40af);color:white;padding:2rem;border-radius:10px;margin-bottom:1.5rem;text-align:center;">
      <h1 style="font-size:1.8rem;margin-bottom:0.3rem;">Relatório de Avaliação Física</h1>
      <p style="opacity:0.85;">TREINOFITASM – Data: ${hoje}</p>
    </div>

    ${h('1. Dados Pessoais')}
    <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
      <tr><td style="padding:6px;width:50%;"><strong>Nome:</strong> ${aluno.nome}</td><td style="padding:6px;"><strong>Sexo:</strong> ${aluno.sexo === 'M' ? 'Masculino' : 'Feminino'}</td></tr>
      <tr><td style="padding:6px;background:#f8fafc;"><strong>Idade:</strong> ${aluno.idade} anos</td><td style="padding:6px;background:#f8fafc;"><strong>Nascimento:</strong> ${aluno.dataNasc || '—'}</td></tr>
      <tr><td style="padding:6px;"><strong>Peso:</strong> ${aluno.peso} kg</td><td style="padding:6px;"><strong>Estatura:</strong> ${aluno.altura} cm</td></tr>
      <tr><td style="padding:6px;background:#f8fafc;"><strong>IMC:</strong> ${aluno.imc} kg/m² (${aluno.classImc || '—'})</td><td style="padding:6px;background:#f8fafc;"><strong>Objetivo:</strong> ${aluno.objetivo || '—'}</td></tr>
      <tr><td style="padding:6px;"><strong>Nível:</strong> ${aluno.nivel || '—'}</td><td style="padding:6px;"><strong>E-mail:</strong> ${aluno.email || '—'}</td></tr>
    </table>`;

  if (ans.length) {
    const a = ans[ans.length - 1];
    const simCount = Object.values(a.parq || {}).filter(v => v === 'sim').length;
    html += `${h('2. Anamnese e PAR-Q')}
    <p><strong>Data:</strong> ${a.data || '—'} | <strong>PAR-Q:</strong> ${simCount === 0 ? 'Apto (0 respostas positivas)' : `${simCount} resposta(s) positiva(s) – encaminhar médico`}</p>
    <p><strong>PA:</strong> ${a.paSistolica || '—'}/${a.paDiastolica || '—'} mmHg (${a.classPA || '—'}) | <strong>Glicemia:</strong> ${a.glicemia || '—'} mg/dL</p>
    <p><strong>Tabagismo:</strong> ${a.tabagismo || '—'} | <strong>Álcool:</strong> ${a.alcool || '—'} | <strong>Sono:</strong> ${a.sono || '—'}</p>`;
  }

  if (avs.length) {
    const av = avs[avs.length - 1];
    html += `${h('3. Última Avaliação Antropométrica (${av.data || '—'})')}
    <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
      <tr><td style="padding:6px;"><strong>% Gordura:</strong> ${av.percGordura || '—'}</td><td style="padding:6px;"><strong>Massa Gorda:</strong> ${av.massaGorda || '—'}</td></tr>
      <tr><td style="padding:6px;background:#f8fafc;"><strong>Massa Magra:</strong> ${av.massaMagra || '—'}</td><td style="padding:6px;background:#f8fafc;"><strong>Protocolo:</strong> ${av.protocolo || '—'}</td></tr>
      <tr><td style="padding:6px;"><strong>RCQ:</strong> ${av.rcq || '—'}</td></tr>
    </table>`;
  }

  if (ts.length) {
    const t = ts[ts.length - 1];
    html += `${h('4. Último Teste de VO2máx (${t.data || '—'})')}
    <p><strong>VO2máx:</strong> ${parseFloat(t.vo2).toFixed(1)} mL·kg⁻¹·min⁻¹ | <strong>Classificação:</strong> ${t.classificacao || '—'}</p>
    <p><strong>Protocolo:</strong> ${t.protocolo || '—'}</p>`;
  }

  if (rms.length) {
    html += `${h('5. Registros de 1RM')}
    <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
      <thead><tr style="background:#1d4ed8;color:white;"><th style="padding:8px;">Exercício</th><th style="padding:8px;">1RM (kg)</th><th style="padding:8px;">Data</th></tr></thead>
      <tbody>`;
    rms.forEach(r => {
      html += `<tr><td style="padding:6px;border-bottom:1px solid #e2e8f0;">${r.exercicio}</td><td style="padding:6px;border-bottom:1px solid #e2e8f0;">${parseFloat(r.rm).toFixed(1)}</td><td style="padding:6px;border-bottom:1px solid #e2e8f0;">${r.data || '—'}</td></tr>`;
    });
    html += '</tbody></table>';
  }

  if (fichaEl && fichaEl.innerHTML.trim()) {
    html += `${h('6. Prescrição de Treino')}<div style="font-size:0.85rem;">${fichaEl.innerHTML}</div>`;
  }

  html += `<div style="margin-top:2rem;padding:1rem;background:#f8fafc;border-radius:8px;font-size:0.78rem;color:#64748b;text-align:center;">
    Relatório gerado em ${hoje} pelo TREINOFITASM. Prescrição de exercícios supervisionada por Profissional de Educação Física.
  </div></div>`;

  document.getElementById('modal-conteudo').innerHTML = html;
  document.getElementById('modal-relatorio').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modal-relatorio').style.display = 'none';
}

function imprimirRelatorio() {
  const conteudo = document.getElementById('modal-conteudo').innerHTML;
  const janela = window.open('', '_blank');
  janela.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório TREINOFITASM</title>
  <style>body{font-family:'Segoe UI',sans-serif;margin:2rem;color:#1e293b;}table{width:100%;border-collapse:collapse;}
  th,td{padding:8px;text-align:left;}th{background:#1d4ed8;color:white;}@media print{body{margin:0.5rem;}}</style>
  </head><body>${conteudo}</body></html>`);
  janela.document.close();
  janela.focus();
  setTimeout(() => { janela.print(); janela.close(); }, 500);
}

// ==================== INIT EXTRAS ====================
document.addEventListener('DOMContentLoaded', () => {
  const hoje = new Date().toISOString().slice(0, 10);
  if (document.getElementById('dataAnamnese')) document.getElementById('dataAnamnese').value = hoje;
  if (document.getElementById('dataRM')) document.getElementById('dataRM').value = hoje;
  if (document.getElementById('dataAssinatura')) document.getElementById('dataAssinatura').value = hoje;
});

// ========================================================
// extras.js – Anamnese, 1RM, Aeróbio, Evolução, Relatório
// ========================================================

// ==================== ANAMNESE ====================
function avaliarPARQ() {
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
    box.innerHTML = '<strong>APTO para atividade física</strong><br>Todas as respostas foram NÃO. O aluno pode iniciar um programa de exercícios de intensidade moderada a vigorosa.';
  } else {
    box.className = 'parq-resultado parq-atencao';
    box.innerHTML = `<strong>ATENÇÃO – ${simCount} resposta(s) positiva(s)</strong><br>O aluno deve consultar um médico antes de iniciar ou aumentar a intensidade do treinamento.`;
  }
}

function classificarPA() {
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
}

function carregarAnamnese() {
  const selId = document.getElementById('alunoAnamnese').value;
  if (!selId) return;
  
  const anam = state.anamneses.find(a => String(a.alunoId) === String(selId));
  if (anam) {
    document.getElementById('dataAnamnese').value = anam.data || '';
    document.getElementById('glicemia').value = anam.glicemia || '';
    document.getElementById('triglicerideos').value = anam.triglicerideos || '';
    document.getElementById('colesterol').value = anam.colesterol || '';
    document.getElementById('medicamentos').value = anam.medicamentos || '';
    document.getElementById('cirurgias').value = anam.cirurgias || '';
    document.getElementById('tabagismo').value = anam.tabagismo || '';
    document.getElementById('alcool').value = anam.alcool || '';
    document.getElementById('sono').value = anam.sono || '';
    document.getElementById('fez-dieta').value = anam.fezDieta || '';
    document.getElementById('tempo-dieta').value = anam.tempoDieta || '';
    document.getElementById('alimentacao').value = anam.alimentacao || '';
    document.getElementById('estresse').value = anam.estresse || '';
    document.getElementById('agua').value = anam.agua || '';
    document.getElementById('dores').value = anam.dores || '';
    document.getElementById('expectativas').value = anam.expectativas || '';
    document.getElementById('paSistolica').value = anam.paSistolica || '';
    document.getElementById('paDiastolica').value = anam.paDiastolica || '';
    document.getElementById('classPA').value = anam.classPA || '';
    document.getElementById('obsClinicas').value = anam.obsClinicas || '';
    document.getElementById('fcRepouso').value = anam.fcRepouso || '';
    document.getElementById('fcMaxMed').value = anam.fcMaxMed || '';
    document.getElementById('fcMaxTanaka').value = anam.fcMaxTanaka || '';
    document.getElementById('fcMaxFox').value = anam.fcMaxFox || '';
    document.getElementById('fcReserva').value = anam.fcReserva || '';
    document.getElementById('fcZona').value = anam.fcZona || '';
    
    // Checkboxes de patologias
    document.querySelectorAll('input[name="patAnamnese"]').forEach(cb => {
      cb.checked = (anam.doencas || []).includes(cb.value);
    });
    
    // Radios de PAR-Q
    for (let i = 1; i <= 7; i++) {
      const val = anam.parq ? anam.parq[`q${i}`] : 'nao';
      const rad = document.querySelector(`input[name="parq${i}"][value="${val}"]`);
      if (rad) rad.checked = true;
    }
    
    if (document.getElementById('assinaturaAnamnese')) document.getElementById('assinaturaAnamnese').value = anam.assinatura || '';
    if (document.getElementById('dataAssinatura')) document.getElementById('dataAssinatura').value = anam.dataAssinatura || '';
    
    // Atualizar visualização do PAR-Q e PA se existirem
    if (typeof avaliarPARQ === 'function') avaliarPARQ();
  } else {
    limparAnamnese();
    // Tentar carregar a idade do aluno para calcular FC inicial
    const aluno = state.alunos.find(a => String(a.id) === String(selId));
    if (aluno && document.getElementById('idade')) {
      document.getElementById('idade').value = aluno.idade; // Temporário para o cálculo
      if (typeof calcularFC === 'function') calcularFC();
    }
  }
}

function salvarAnamnese() {
  const selId = document.getElementById('alunoAnamnese')?.value || document.getElementById('alunoPresc')?.value;
  if (!selId) { showToast('Selecione um aluno', 'error'); return; }
  
  const parqRespostas = {};
  for (let i = 1; i <= 7; i++) {
    const sel = document.querySelector(`input[name="parq${i}"]:checked`);
    parqRespostas[`q${i}`] = sel ? sel.value : 'nao';
  }

  const doencas = [];
  document.querySelectorAll('input[name="patAnamnese"]:checked').forEach(cb => doencas.push(cb.value));

  const anamnese = {
    id: Date.now(),
    alunoId: parseInt(selId),
    data: new Date().toISOString().slice(0, 10),
    glicemia: document.getElementById('glicemia')?.value || '',
    triglicerideos: document.getElementById('triglicerideos')?.value || '',
    colesterol: document.getElementById('colesterol')?.value || '',
    doencas,
    medicamentos: document.getElementById('medicamentos')?.value || '',
    cirurgias: document.getElementById('cirurgias')?.value || '',
    parq: parqRespostas,
    tabagismo: document.getElementById('tabagismo')?.value || '',
    alcool: document.getElementById('alcool')?.value || '',
    sono: document.getElementById('sono')?.value || '',
    fezDieta: document.getElementById('fez-dieta')?.value || '',
    tempoDieta: document.getElementById('tempo-dieta')?.value || '',
    alimentacao: document.getElementById('alimentacao')?.value || '',
    estresse: document.getElementById('estresse')?.value || '',
    agua: document.getElementById('agua')?.value || '',
    dores: document.getElementById('dores')?.value || '',
    expectativas: document.getElementById('expectativas')?.value || '',
    paSistolica: document.getElementById('paSistolica')?.value || '',
    paDiastolica: document.getElementById('paDiastolica')?.value || '',
    classPA: document.getElementById('classPA')?.value || '',
    obsClinicas: document.getElementById('obsClinicas')?.value || '',
    // Campos de FC movidos do cadastro
    fcRepouso: document.getElementById('fcRepouso')?.value || '',
    fcMaxMed: document.getElementById('fcMaxMed')?.value || '',
    fcMaxTanaka: document.getElementById('fcMaxTanaka')?.value || '',
    fcMaxFox: document.getElementById('fcMaxFox')?.value || '',
    fcReserva: document.getElementById('fcReserva')?.value || '',
    fcZona: document.getElementById('fcZona')?.value || '',
    assinatura: document.getElementById('assinaturaAnamnese')?.value || '',
    dataAssinatura: document.getElementById('dataAssinatura')?.value || ''
  };

  const idx = state.anamneses.findIndex(a => a.alunoId === anamnese.alunoId);
  if (idx >= 0) state.anamneses[idx] = anamnese;
  else state.anamneses.push(anamnese);
  
  saveState();
  showToast('Anamnese salva com sucesso!', 'success');
}

function imprimirAnamnesePDF() {
  const selId = document.getElementById('alunoAnamnese')?.value || document.getElementById('alunoPresc')?.value;
  if (!selId) { showToast('Selecione um aluno primeiro', 'error'); return; }
  
  const aluno = state.alunos.find(a => String(a.id) === String(selId));
  const anam = state.anamneses.find(a => String(a.alunoId) === String(selId));
  
  if (!anam) { showToast('Nenhuma anamnese salva para este aluno', 'error'); return; }

  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>Anamnese - ${aluno.nome}</title>
    <style>
      body{font-family:sans-serif;padding:2rem;color:#333;}
      .header{text-align:center;border-bottom:2px solid #1d4ed8;padding-bottom:1rem;margin-bottom:2rem;position:relative;}
      .logo{max-width:150px;margin-bottom:10px;}
      h1{color:#1d4ed8;margin:0;}
      section{margin-bottom:1.5rem;}
      h3{border-bottom:1px solid #ddd;padding-bottom:5px;color:#1e3a8a;}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
      .full{grid-column:1/-1;}
    </style>
    </head><body>
    <div class="header">
      <img src="logo.png" class="logo" onerror="this.style.display='none'">
      <h1>TREINOFITASM</h1>
      <p>Anamnese e Histórico de Saúde</p>
    </div>
    
    <section>
      <h3>Identificação</h3>
      <div class="grid">
        <p><strong>Nome:</strong> ${aluno.nome}</p>
        <p><strong>Data:</strong> ${anam.data}</p>
      </div>
    </section>

    <section>
      <h3>Hábitos e Nutrição</h3>
      <div class="grid">
        <p><strong>Tabagismo:</strong> ${anam.tabagismo}</p>
        <p><strong>Álcool:</strong> ${anam.alcool}</p>
        <p><strong>Sono:</strong> ${anam.sono}</p>
        <p><strong>Alimentação:</strong> ${anam.alimentacao}</p>
        <p><strong>Já fez dieta?</strong> ${anam.fezDieta} (${anam.tempoDieta})</p>
        <p><strong>Água:</strong> ${anam.agua} L/dia</p>
      </div>
    </section>

    <section>
      <h3>Saúde e Clínica</h3>
      <div class="grid">
        <p><strong>PA:</strong> ${anam.paSistolica}/${anam.paDiastolica} (${anam.classPA})</p>
        <p><strong>FC Repouso:</strong> ${anam.fcRepouso} bpm</p>
        <p><strong>Glicemia:</strong> ${anam.glicemia}</p>
        <p><strong>Colesterol:</strong> ${anam.colesterol}</p>
        <p class="full"><strong>Medicamentos:</strong> ${anam.medicamentos}</p>
        <p class="full"><strong>Patologias:</strong> ${anam.doencas.join(', ')}</p>
      </div>
    </section>

    <section>
      <h3>Observações</h3>
      <p><strong>Expectativas:</strong> ${anam.expectativas}</p>
      <p><strong>Dores:</strong> ${anam.dores}</p>
      <p><strong>Obs:</strong> ${anam.obsClinicas}</p>
    </section>

    <div style="text-align:center;margin-top:4rem;font-size:0.8rem;color:#666;">
      <p>Adriano de Souza - Personal Trainer</p>
    </div>
    </body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

function limparAnamnese() {
  const form = document.querySelector('#page-anamnese');
  if (form) {
    form.querySelectorAll('input:not([type="date"]), textarea, select:not(#alunoAnamnese)').forEach(el => el.value = '');
    form.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(el => el.checked = false);
    const res = document.getElementById('parq-resultado');
    if (res) res.style.display = 'none';
  }
}

// ==================== 1RM ====================
function calcularRM() {
  const carga = parseFloat(document.getElementById('rm-carga').value);
  const reps = parseInt(document.getElementById('rm-reps').value);
  if (isNaN(carga) || isNaN(reps) || reps < 1) {
    showToast('Informe carga e repetições', 'error'); return;
  }
  
  // Brzycki formula
  const rm = carga / (1.0278 - 0.0278 * reps);
  
  const res = document.getElementById('resultado-rm');
  if (res) {
    res.style.display = 'block';
    document.getElementById('rm-tabela-resultado').innerHTML = `
      <div class="result-card highlight">
        <div class="rc-label">1RM Estimado (Brzycki)</div>
        <div class="rc-value">${rm.toFixed(1)}</div>
        <div class="rc-unit">kg</div>
      </div>
    `;
  }
  window._ultimoRM = { carga, reps, rm };
}

function salvarRM() {
  const selId = document.getElementById('alunoRM')?.value || document.getElementById('alunoPresc')?.value;
  if (!selId || !window._ultimoRM) { showToast('Calcule o 1RM primeiro', 'error'); return; }
  
  const registro = {
    id: Date.now(),
    alunoId: parseInt(selId),
    data: new Date().toISOString().slice(0, 10),
    rm: window._ultimoRM.rm,
    carga: window._ultimoRM.carga,
    reps: window._ultimoRM.reps
  };

  state.rms.push(registro);
  saveState();
  showToast('Teste de força salvo!', 'success');
}

// ==================== AERÓBIO ====================
function carregarAerobio() {
  const selId = document.getElementById('alunoAerobio').value;
  if (!selId) return;
  const aluno = state.alunos.find(a => String(a.id) === String(selId));
  if (!aluno) return;

  const fcrep = document.getElementById('aerobio-fcrep');
  const fcmax = document.getElementById('aerobio-fcmax');
  
  if (fcrep) fcrep.value = aluno.fcRepouso || '';
  if (fcmax) fcmax.value = (aluno.fcMaxTanaka || '').replace(' bpm', '') || (aluno.fcMaxFox || '').replace(' bpm', '') || '';
}

function calcularZonasAerobio() {
  const fcrep = parseFloat(document.getElementById('aerobio-fcrep').value);
  const fcmax = parseFloat(document.getElementById('aerobio-fcmax').value);
  const vo2max = parseFloat(document.getElementById('aerobio-vo2max').value);

  if (!fcmax) { showToast('Informe ao menos a FC Máxima', 'error'); return; }

  const zones = [
    { name: 'Zona 1 (Muito Leve)', pct: 50, color: '#94a3b8', objective: 'Recuperação, Aquecimento' },
    { name: 'Zona 2 (Leve)', pct: 60, color: '#22c55e', objective: 'Queima de Gordura, Base' },
    { name: 'Zona 3 (Moderada)', pct: 70, color: '#eab308', objective: 'Resistência Aeróbia' },
    { name: 'Zona 4 (Vigorosa)', pct: 80, color: '#f97316', objective: 'Limiar Anaeróbio' },
    { name: 'Zona 5 (Máxima)', pct: 90, color: '#ef4444', objective: 'Performance Máxima' }
  ];

  const tbody = document.getElementById('zonas-tbody');
  if (!tbody) return;

  tbody.innerHTML = zones.map(z => {
    const fc = Math.round(fcmax * (z.pct / 100));
    let fck = '—', vo2 = '—';
    
    if (fcrep) {
      const reserve = fcmax - fcrep;
      fck = Math.round((reserve * (z.pct / 100)) + fcrep);
    }
    
    if (vo2max) {
      vo2 = (vo2max * (z.pct / 100)).toFixed(1);
    }

    const borg = z.pct < 60 ? '7–10' : z.pct < 70 ? '11–12' : z.pct < 80 ? '13–14' : z.pct < 90 ? '15–16' : '17–20';

    return `
      <tr>
        <td style="border-left: 4px solid ${z.color}; font-weight:600;">${z.pct}%</td>
        <td>${z.name}</td>
        <td>${z.pct}%</td>
        <td>${fc} bpm</td>
        <td>${z.pct}%</td>
        <td>${fck} bpm</td>
        <td>${z.pct}%</td>
        <td>${vo2}</td>
        <td>${borg}</td>
        <td style="font-size:0.75rem;">${z.objective}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('aerobio-zonas').style.display = 'block';
  showToast('Zonas de treinamento calculadas!', 'success');
}

function calcularGastoCalorico() {
  const sessoes = parseInt(document.getElementById('aerobio-sessoes').value) || 0;
  const duracao = parseInt(document.getElementById('aerobio-duracao').value) || 0;
  const selId = document.getElementById('alunoAerobio')?.value || document.getElementById('alunoPresc')?.value;
  if (!selId) return;
  const aluno = state.alunos.find(a => String(a.id) === String(selId));
  if (!aluno) return;

  // Formula: Kcal = (MET * 3.5 * peso / 200) * duracao
  // Usando MET médio de 8 para corrida/treino intenso
  const met = 8;
  const kcalSessao = (met * 3.5 * parseFloat(aluno.peso) / 200) * duracao;
  const kcalSemanal = kcalSessao * sessoes;

  const kSes = document.getElementById('aerobio-kcal-sessao');
  const kSem = document.getElementById('aerobio-kcal-semanal');
  if (kSes) kSes.value = kcalSessao.toFixed(0) + ' kcal';
  if (kSem) kSem.value = kcalSemanal.toFixed(0) + ' kcal';
}

function gerarPrescricaoAerobio() {
  const sessoes = document.getElementById('aerobio-sessoes').value;
  const duracao = document.getElementById('aerobio-duracao').value;
  const kcalSemanal = document.getElementById('aerobio-kcal-semanal').value;
  
  const res = document.getElementById('aerobio-presc-resultado');
  if (res) {
    res.style.display = 'block';
    document.getElementById('aerobio-presc-conteudo').innerHTML = `
      <div class="info-box">
        <strong>Planejamento Aeróbio:</strong><br>
        • Frequência: ${sessoes}x por semana<br>
        • Duração: ${duracao} min por sessão<br>
        • Gasto Semanal Alvo: ${kcalSemanal}<br>
        • Intensidade Sugerida: 60-80% da FCmáx
      </div>
    `;
  }
  showToast('Prescrição aeróbia gerada!', 'success');
}

function imprimirAerobioPDF() {
  const conteudo = document.getElementById('aerobio-presc-conteudo')?.innerHTML;
  if (!conteudo) { showToast('Gere a prescrição primeiro', 'error'); return; }
  const selId = document.getElementById('alunoPresc').value;
  const aluno = state.alunos.find(a => String(a.id) === String(selId));
  
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>TREINOFITASM - Treino Aeróbio</title>
    <style>body{font-family:sans-serif;padding:2rem;} .header{text-align:center;border-bottom:2px solid #1d4ed8;margin-bottom:1rem;}</style>
    </head><body>
    <div class="header"><h1>TREINOFITASM</h1><p>Prescrição Aeróbia - ${aluno ? aluno.nome : ''}</p></div>
    ${conteudo}
    <p style="margin-top:2rem; font-size:0.8rem; color:#666;">Documento gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
    </body></html>
  `);
  win.document.close();
  win.print();
}

// ==================== EVOLUÇÃO ====================
let chartComp = null, chartVO2 = null;

function carregarEvolucao() {
  const selId = document.getElementById('alunoEvolucao').value;
  if (!selId) return;
  const content = document.getElementById('evolucao-content');
  if (content) content.style.display = 'block';
  const avs = state.avaliacoes.filter(a => String(a.alunoId) === String(selId));
  const tsts = state.testes.filter(t => String(t.alunoId) === String(selId));
  renderGraficoComposicao(avs);
  renderGraficoVO2(tsts);
  renderHistorico(selId);
}

function renderGraficoComposicao(avs) {
  const ctx = document.getElementById('chart-composicao');
  if (!ctx) return;
  if (chartComp) chartComp.destroy();
  chartComp = new Chart(ctx, {
    type: 'line',
    data: {
      labels: avs.map(a => a.data),
      datasets: [{ label: '% Gordura', data: avs.map(a => parseFloat(a.percGordura)), borderColor: '#1d4ed8', tension: 0.3 }]
    }
  });
}

function renderGraficoVO2(tsts) {
  const ctx = document.getElementById('chart-vo2');
  if (!ctx) return;
  if (chartVO2) chartVO2.destroy();
  chartVO2 = new Chart(ctx, {
    type: 'line',
    data: {
      labels: tsts.map(t => t.data),
      datasets: [{ label: 'VO2máx', data: tsts.map(t => t.vo2), borderColor: '#16a34a', tension: 0.3 }]
    }
  });
}

function renderHistorico(alunoId) {
  const lista = document.getElementById('historico-lista');
  if (!lista) return;
  const avs = state.avaliacoes.filter(a => String(a.alunoId) === String(alunoId));
  lista.innerHTML = avs.reverse().map(a => `
    <div class="aluno-card" style="margin-bottom:0.5rem;">
      <p><strong>Data: ${a.data}</strong> | Gordura: ${a.percGordura}% | MM: ${a.massaMagra}kg | Prot: ${a.protocolo}</p>
    </div>
  `).join('');
}

// ==================== RELATÓRIO COMPLETO ====================
function gerarRelatorioCompleto() {
  const selId = document.getElementById('alunoPresc')?.value || document.getElementById('alunoEvolucao')?.value || document.getElementById('alunoAnamnese')?.value;
  if (!selId) { showToast('Selecione um aluno primeiro', 'error'); return; }
  
  const aluno = state.alunos.find(a => String(a.id) === String(selId));
  const avs = state.avaliacoes.filter(a => String(a.alunoId) === String(selId));
  const tsts = state.testes.filter(t => String(t.alunoId) === String(selId));
  const anamRegs = state.anamneses.filter(a => String(a.alunoId) === String(selId));
  const pags = state.pagamentos.filter(p => String(p.alunoId) === String(selId));
  
  const lastAv = avs[avs.length - 1];
  const lastTst = tsts[tsts.length - 1];
  const lastAnam = anamRegs[anamRegs.length - 1];
  const lastPag = pags[pags.length - 1];

  let html = `
    <div style="font-family:sans-serif; color:#333; padding:20px; max-width:900px; margin:auto; border:1px solid #eee;">
      <div style="text-align:center; border-bottom:2px solid #1d4ed8; padding-bottom:1rem; margin-bottom:2rem;">
        <img src="logo.png" style="max-width:180px; margin-bottom:10px;" onerror="this.style.display='none'">
        <h1 style="color:#1d4ed8; margin:0;">TREINOFITASM</h1>
        <p style="margin:5px 0; font-weight:bold; font-size:1.2rem;">Relatório Geral de Evolução e Prescrição</p>
        <p style="margin:5px 0; color:#666;">Adriano de Souza - Personal Trainer</p>
      </div>
      
      <section style="margin-bottom:2rem; background:#f8fafc; padding:15px; border-radius:8px;">
        <h3 style="border-bottom:2px solid #1d4ed8; padding-bottom:5px; margin-top:0; color:#1e3a8a;">1. Dados Cadastrais</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <p><strong>Nome:</strong> ${aluno.nome}</p>
          <p><strong>Idade:</strong> ${aluno.idade} anos | <strong>Sexo:</strong> ${aluno.sexo}</p>
          <p><strong>Objetivo:</strong> ${aluno.objetivo || 'Não informado'}</p>
          <p><strong>Nível:</strong> ${aluno.nivel || '—'}</p>
          <p><strong>Email:</strong> ${aluno.email || '—'}</p>
          <p><strong>Telefone:</strong> ${aluno.telefone || '—'}</p>
        </div>
      </section>

      <section style="margin-bottom:2rem;">
        <h3 style="border-bottom:2px solid #1d4ed8; padding-bottom:5px; color:#1e3a8a;">2. Anamnese e Marcadores de Saúde</h3>
        ${lastAnam ? `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <p><strong>PA Repouso:</strong> ${lastAnam.paSistolica}/${lastAnam.paDiastolica} mmHg (${lastAnam.classPA})</p>
            <p><strong>FC Repouso:</strong> ${lastAnam.fcRepouso || '—'} bpm</p>
            <p><strong>Glicemia:</strong> ${lastAnam.glicemia || '—'} mg/dL</p>
            <p><strong>Colesterol:</strong> ${lastAnam.colesterol || '—'} mg/dL</p>
            <p><strong>Tabagismo:</strong> ${lastAnam.tabagismo || '—'}</p>
            <p><strong>Álcool:</strong> ${lastAnam.alcool || '—'}</p>
            <p><strong>Dieta:</strong> ${lastAnam.fezDieta === 'sim' ? 'Já fez (' + lastAnam.tempoDieta + ')' : 'Nunca fez'}</p>
            <p><strong>Sono:</strong> ${lastAnam.sono || '—'}</p>
            <p style="grid-column:1/-1;"><strong>Patologias:</strong> ${lastAnam.doencas.join(', ') || 'Nenhuma informada'}</p>
            <p style="grid-column:1/-1;"><strong>Medicamentos:</strong> ${lastAnam.medicamentos || 'Nenhum'}</p>
          </div>
        ` : '<p>Nenhuma anamnese registrada.</p>'}
      </section>

      <section style="margin-bottom:2rem;">
        <h3 style="border-bottom:2px solid #1d4ed8; padding-bottom:5px; color:#1e3a8a;">3. Composição Corporal (Última Avaliação)</h3>
        ${lastAv ? `
          <p><strong>Data da Avaliação:</strong> ${lastAv.data} | <strong>Protocolo:</strong> ${lastAv.protocolo}</p>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:15px; background:#f0f9ff; padding:15px; border-radius:8px; margin-top:10px; border:1px solid #bae6fd;">
            <div style="text-align:center;"><div style="font-size:0.8rem; color:#0369a1;">PESO</div><div style="font-size:1.3rem; font-weight:800;">${lastAv.peso}kg</div></div>
            <div style="text-align:center;"><div style="font-size:0.8rem; color:#0369a1;">% GORDURA</div><div style="font-size:1.3rem; font-weight:800;">${lastAv.percGordura}%</div></div>
            <div style="text-align:center;"><div style="font-size:0.8rem; color:#0369a1;">MASSA MAGRA</div><div style="font-size:1.3rem; font-weight:800;">${lastAv.massaMagra}kg</div></div>
          </div>
          <div style="margin-top:15px;">
            <strong>Perímetros (cm):</strong>
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; font-size:0.85rem; margin-top:5px;">
              ${Object.entries(lastAv.perimetros || {}).map(([k,v]) => `<span>${k.toUpperCase()}: ${v}</span>`).join('')}
            </div>
          </div>
        ` : '<p>Nenhuma avaliação antropométrica registrada.</p>'}
      </section>

      <section style="margin-bottom:2rem;">
        <h3 style="border-bottom:2px solid #1d4ed8; padding-bottom:5px; color:#1e3a8a;">4. Capacidade Aeróbia</h3>
        ${lastTst ? `
          <div style="background:#f0fdf4; padding:15px; border-radius:8px; border:1px solid #bbf7d0;">
            <p><strong>VO2máx Estimado:</strong> ${lastTst.vo2} mL/kg/min</p>
            <p><strong>Classificação:</strong> ${lastTst.classificacao || '—'}</p>
            <p><strong>Protocolo:</strong> ${lastTst.protocolo}</p>
          </div>
        ` : '<p>Nenhum teste de VO2máx registrado.</p>'}
      </section>

      <section style="margin-bottom:2rem;">
        <h3 style="border-bottom:2px solid #1d4ed8; padding-bottom:5px; color:#1e3a8a;">5. Situação Financeira</h3>
        ${lastPag ? `
          <div style="padding:10px; border-radius:5px; background:${lastPag.status === 'pago' ? '#dcfce7' : '#fee2e2'}; border:1px solid ${lastPag.status === 'pago' ? '#86efac' : '#fca5a5'};">
            <p><strong>Último Pagamento:</strong> R$ ${lastPag.valor} (${lastPag.dataPag})</p>
            <p><strong>Status:</strong> <span style="text-transform:uppercase; font-weight:bold;">${lastPag.status}</span></p>
            <p><strong>Próximo Vencimento:</strong> ${lastPag.dataVenc}</p>
          </div>
        ` : '<p>Nenhum registro de pagamento encontrado.</p>'}
      </section>

      <div style="text-align:center; margin-top:3rem; padding-top:2rem; border-top:1px solid #eee; font-size:0.9rem; color:#666;">
        <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
        <p>Este documento é para uso exclusivo do aluno e seu treinador.</p>
        <p style="font-weight:bold; color:#1d4ed8; margin-top:10px;">TREINOFITASM - Resultados Reais</p>
      </div>
    </div>
  `;

  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>Relatório Completo - ${aluno.nome}</title></head><body style="margin:0;">${html}</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

function imprimirAvaliacaoPDF() {
  const selId = document.getElementById('alunoAntro')?.value;
  if (!selId) { showToast('Selecione um aluno primeiro', 'error'); return; }
  
  const aluno = state.alunos.find(a => String(a.id) === String(selId));
  const av = state.avaliacoes.filter(a => String(a.alunoId) === String(selId)).pop();
  
  if (!av) { showToast('Nenhuma avaliação salva para este aluno', 'error'); return; }

  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>Avaliação Física - ${aluno.nome}</title>
    <style>
      body{font-family:sans-serif;padding:2rem;color:#333;}
      .header{text-align:center;border-bottom:2px solid #1d4ed8;padding-bottom:1rem;margin-bottom:2rem;}
      .logo{max-width:150px;margin-bottom:10px;}
      h1{color:#1d4ed8;margin:0;}
      h2{color:#1e3a8a;border-bottom:1px solid #ddd;padding-bottom:5px;margin-top:1.5rem;}
      .grid{display:grid;grid-template-columns:repeat(3, 1fr);gap:15px;background:#f8fafc;padding:15px;border-radius:8px;}
      .perimetros{display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;font-size:0.85rem;}
      .val{font-weight:bold;font-size:1.1rem;}
    </style>
    </head><body>
    <div class="header">
      <img src="logo.png" class="logo" onerror="this.style.display='none'">
      <h1>TREINOFITASM</h1>
      <p>Relatório de Avaliação Física Antropométrica</p>
    </div>
    
    <p><strong>Aluno:</strong> ${aluno.nome} | <strong>Data:</strong> ${av.data}</p>

    <h2>Composição Corporal</h2>
    <div class="grid">
      <div><small>PESO</small><br><span class="val">${av.peso} kg</span></div>
      <div><small>% GORDURA</small><br><span class="val">${av.percGordura}%</span></div>
      <div><small>MASSA MAGRA</small><br><span class="val">${av.massaMagra} kg</span></div>
      <div><small>MASSA GORDA</small><br><span class="val">${av.massaGorda} kg</span></div>
      <div><small>IMC</small><br><span class="val">${av.imc}</span></div>
      <div><small>PROTOCOLO</small><br><span class="val">${av.protocolo}</span></div>
    </div>

    <h2>Perímetros (cm)</h2>
    <div class="perimetros">
      ${Object.entries(av.perimetros || {}).map(([k,v]) => `<div><strong>${k.toUpperCase()}:</strong> ${v}</div>`).join('')}
    </div>

    <h2>Dobras Cutâneas (mm)</h2>
    <div class="perimetros">
      ${Object.entries(av.dobras || {}).map(([k,v]) => `<div><strong>${k.toUpperCase()}:</strong> ${v}</div>`).join('')}
    </div>

    <div style="text-align:center;margin-top:4rem;font-size:0.8rem;color:#666;">
      <p>Adriano de Souza - Personal Trainer</p>
    </div>
    </body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

function fecharModal() {
  const modal = document.getElementById('modal-relatorio');
  if (modal) modal.style.display = 'none';
}

function renderTreinosProntos() {
  const treinosBase = [
    // INICIANTE - EMAGRECIMENTO (Full Body / Circuitos)
    { id: 1, nivel: 'iniciante', objetivo: 'emagrecimento', nome: 'Full Body Adaptativo A', desc: 'Foco em grandes grupos musculares para alto gasto calórico.', exercicios: ['pg04', 'pe02', 'co10', 'ab01'] },
    { id: 2, nivel: 'iniciante', objetivo: 'emagrecimento', nome: 'Circuito Queima Total', desc: 'Alternado por segmento para manter FC elevada.', exercicios: ['pg05', 'co03', 'pe12', 'ab01'] },
    { id: 3, nivel: 'iniciante', objetivo: 'emagrecimento', nome: 'Cardio Resistido I', desc: 'Mix de força com baixo descanso.', exercicios: ['pg13', 'om02', 'bi01', 'tr01'] },
    
    // ABC / ABCD - MASCULINO E FEMININO
    { id: 10, nivel: 'iniciante', objetivo: 'hipertrofia', nome: 'ABC Feminino Iniciante', desc: 'Foco em glúteos, pernas e tônus superior.', exercicios: ['pg11', 'pg04', 'co01', 'pe12', 'ab01'] },
    { id: 11, nivel: 'iniciante', objetivo: 'hipertrofia', nome: 'ABC Masculino Iniciante', desc: 'Foco em peito, costas e braços.', exercicios: ['pe01', 'co01', 'om01', 'pg01', 'ab01'] },
    
    { id: 20, nivel: 'intermediario', objetivo: 'hipertrofia', nome: 'ABCD Masculino Intermediário', desc: 'Divisão por grupos musculares isolados.', exercicios: ['pe01', 'pe04', 'co01', 'co06', 'om01', 'pg01', 'bi01', 'tr01'] },
    { id: 21, nivel: 'intermediario', objetivo: 'hipertrofia', nome: 'ABCD Feminino Intermediário', desc: 'Foco em MMII e estética abdominal.', exercicios: ['pg01', 'pg05', 'pg07', 'pg11', 'pe04', 'co06', 'ab05', 'ab10'] },

    // AVANÇADO - TÉCNICO (Drop Sets, Bi-Sets)
    { id: 50, nivel: 'avançado', objetivo: 'hipertrofia', nome: 'Peitoral de Ferro (Bi-Set)', desc: 'Técnica Bi-Set: Supino Reto + Crucifixo sem descanso.', exercicios: ['pe01', 'pe07', 'pe09'] },
    { id: 51, nivel: 'avançado', objetivo: 'hipertrofia', nome: 'Dorsais Densas (Rest-Pause)', desc: 'Técnica Rest-Pause na Remada Curvada.', exercicios: ['co06', 'co03', 'co16'] },
    { id: 52, nivel: 'avançado', objetivo: 'hipertrofia', nome: 'Leg Day Brutal (Drop-Set)', desc: 'Foco em falha concêntrica na Extensora.', exercicios: ['pg01', 'pg07', 'pg10', 'pg05'] }
  ];

  // Mesclar com os customizados do banco
  const treinos = [...treinosBase, ...state.treinosCustom];

  const grid = document.getElementById('grid-treinos-prontos');
  if (!grid) return;
  grid.innerHTML = '';

  const nivelFiltro = document.getElementById('nivelTreinoPronto')?.value || 'todos';

  const treinosFiltrados = nivelFiltro === 'todos' 
    ? treinos 
    : treinos.filter(t => t.nivel === nivelFiltro);

  if (treinosFiltrados.length === 0) {
    grid.innerHTML = '<p class="result-placeholder">Nenhum treino encontrado para este nível.</p>';
    return;
  }

  treinosFiltrados.forEach(t => {
    const isCustom = state.treinosCustom.some(c => c.id === t.id);
    const tagClass = t.objetivo === 'emagrecimento' ? 'tag-emagrecimento' : 'tag-hipertrofia';
    
    const nomesExer = t.exercicios.map(id => {
      const ex = EXERCICIOS_DB.find(e => e.id === id);
      return ex ? ex.nome : id;
    });

    const card = `
      <div class="treino-pronto-card" style="position:relative; border: ${isCustom ? '2px solid var(--primary)' : '1px solid var(--border)'}">
        ${isCustom ? '<span style="position:absolute; top:-10px; right:10px; background:var(--primary); color:white; font-size:0.6rem; padding:2px 8px; border-radius:10px;">CUSTOM</span>' : ''}
        <div class="nivel-badge nivel-${t.nivel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}">${t.nivel}</div>
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
          <span class="treino-tag ${tagClass}">${t.objetivo || 'hipertrofia'}</span>
          ${t.id >= 50 ? '<span class="treino-tag tag-tecnico">TÉCNICO</span>' : ''}
        </div>
        <h3 style="color:var(--primary); margin-bottom:0.5rem;">${t.nome}</h3>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">${t.desc || 'Modelo customizado pelo treinador.'}</p>
        <div style="background:#f8fafc; padding:10px; border-radius:8px;">
          <h4 style="font-size:0.75rem; color:var(--secondary); text-transform:uppercase; margin-bottom:5px;">Resumo dos Exercícios:</h4>
          <p style="font-size:0.75rem; color:#666;">${nomesExer.slice(0, 3).join(', ')}${nomesExer.length > 3 ? '...' : ''}</p>
          <button onclick="verExerciciosModelo(${t.id})" style="background:none; border:none; color:var(--primary); font-size:0.75rem; font-weight:700; cursor:pointer; padding:0; margin-top:5px;">Ver Exercícios / Editar</button>
        </div>
        <button class="btn-primary" onclick="aplicarTreinoPronto(${t.id})" style="width:100%; margin-top:1.5rem; padding:10px; font-size:0.9rem;">
          🚀 Aplicar ao Aluno
        </button>
        ${isCustom ? `<button class="btn-del" onclick="removerModeloCustom(${t.id})" style="width:100%; margin-top:0.5rem; padding:5px; font-size:0.7rem; background:none; color:#ef4444; border:1px solid #ef4444;">Excluir Modelo</button>` : ''}
      </div>
    `;
    grid.innerHTML += card;
  });
}

let _modeloEditandoId = null;

function verExerciciosModelo(treinoId) {
  const treinosBase = [
    { id: 1, nome: 'Full Body Adaptativo A', exercicios: ['pg04', 'pe02', 'co10', 'ab01'] },
    { id: 2, nome: 'Circuito Queima Total', exercicios: ['pg05', 'co03', 'pe12', 'ab01'] },
    { id: 3, nome: 'Cardio Resistido I', exercicios: ['pg13', 'om02', 'bi01', 'tr01'] },
    { id: 10, nome: 'ABC Feminino Iniciante', exercicios: ['pg11', 'pg04', 'co01', 'pe12', 'ab01'] },
    { id: 11, nome: 'ABC Masculino Iniciante', exercicios: ['pe01', 'co01', 'om01', 'pg01', 'ab01'] },
    { id: 20, nome: 'ABCD Masculino Intermediário', exercicios: ['pe01', 'pe04', 'co01', 'co06', 'om01', 'pg01', 'bi01', 'tr01'] },
    { id: 21, nome: 'ABCD Feminino Intermediário', exercicios: ['pg01', 'pg05', 'pg07', 'pg11', 'pe04', 'co06', 'ab05', 'ab10'] },
    { id: 50, nome: 'Peitoral de Ferro (Bi-Set)', exercicios: ['pe01', 'pe07', 'pe09'] },
    { id: 51, nome: 'Dorsais Densas (Rest-Pause)', exercicios: ['co06', 'co03', 'co16'] },
    { id: 52, nome: 'Leg Day Brutal (Drop-Set)', exercicios: ['pg01', 'pg07', 'pg10', 'pg05'] }
  ];

  const treinos = [...treinosBase, ...state.treinosCustom];
  const t = treinos.find(x => x.id === treinoId);
  if (!t) return;

  _modeloEditandoId = treinoId;
  const isCustom = state.treinosCustom.some(c => c.id === treinoId);
  
  document.getElementById('modal-ver-titulo').textContent = t.nome;
  const lista = document.getElementById('modal-ver-lista');
  lista.innerHTML = '';

  t.exercicios.forEach((exId, idx) => {
    const ex = EXERCICIOS_DB.find(e => e.id === exId);
    if (ex) {
      lista.innerHTML += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;">
          <div>
            <strong style="font-size:0.9rem;">${ex.nome}</strong><br>
            <small style="color:#666;">${ex.grupo} · ${ex.equip}</small>
          </div>
          ${isCustom ? `<button class="btn-del" onclick="removerExercicioDoModelo(${idx})" style="padding:2px 6px; font-size:0.7rem;">✕</button>` : ''}
        </div>
      `;
    }
  });

  // Povoar select de exercícios extras
  const select = document.getElementById('select-add-extra');
  if (select) {
    select.innerHTML = EXERCICIOS_DB.map(e => `<option value="${e.id}">${e.nome} (${e.grupo})</option>`).join('');
    document.getElementById('secao-add-extra').style.display = isCustom ? 'block' : 'none';
  }

  document.getElementById('modal-ver-exercicios').style.display = 'flex';
}

function adicionarExercicioAoModelo() {
  const exId = document.getElementById('select-add-extra').value;
  const modelo = state.treinosCustom.find(c => c.id === _modeloEditandoId);
  if (!modelo) { showToast('Apenas modelos customizados podem ser editados.', 'error'); return; }

  modelo.exercicios.push(exId);
  saveState();
  verExerciciosModelo(_modeloEditandoId);
  renderTreinosProntos();
  showToast('Exercício adicionado ao modelo!', 'success');
}

function removerExercicioDoModelo(idx) {
  const modelo = state.treinosCustom.find(c => c.id === _modeloEditandoId);
  if (!modelo) return;

  modelo.exercicios.splice(idx, 1);
  saveState();
  verExerciciosModelo(_modeloEditandoId);
  renderTreinosProntos();
  showToast('Exercício removido do modelo.', 'info');
}

function salvarModeloCustomizado() {
  const nome = document.getElementById('novo-modelo-nome').value;
  const nivel = document.getElementById('novo-modelo-nivel').value;
  
  if (!nome) { showToast('Dê um nome ao modelo!', 'error'); return; }
  if (fichaExercicios.length === 0) { showToast('A ficha atual está vazia! Adicione exercícios primeiro.', 'error'); return; }

  const novoModelo = {
    id: Date.now(),
    nome,
    nivel,
    objetivo: document.getElementById('presc-objetivo-pro')?.value || 'hipertrofia',
    desc: 'Modelo criado manualmente pelo treinador.',
    exercicios: fichaExercicios.map(e => e.exId)
  };

  state.treinosCustom.push(novoModelo);
  saveState();
  showToast('Modelo de treino salvo com sucesso!', 'success');
  
  // Limpar form
  document.getElementById('novo-modelo-nome').value = '';
  renderTreinosProntos();
}

function removerModeloCustom(id) {
  if (!confirm('Deseja excluir este modelo permanentemente?')) return;
  state.treinosCustom = state.treinosCustom.filter(c => c.id !== id);
  saveState();
  renderTreinosProntos();
}

function aplicarTreinoPronto(treinoId) {
  const alunoId = document.getElementById('alunoTreinoPronto').value;
  if (!alunoId) { showToast('Selecione um aluno primeiro!', 'error'); return; }

  const protocoloPeriodizacao = document.getElementById('metodoTreinoPronto').value; // 'simples' ou 'ondulatorio'
  
  const treinosBase = [
    { id: 1, nivel: 'iniciante', objetivo: 'emagrecimento', nome: 'Full Body Adaptativo A', exercicios: ['pg04', 'pe02', 'co10', 'ab01'] },
    { id: 2, nivel: 'iniciante', objetivo: 'emagrecimento', nome: 'Circuito Queima Total', exercicios: ['pg05', 'co03', 'pe12', 'ab01'] },
    { id: 3, nivel: 'iniciante', objetivo: 'emagrecimento', nome: 'Cardio Resistido I', exercicios: ['pg13', 'om02', 'bi01', 'tr01'] },
    { id: 10, nivel: 'iniciante', objetivo: 'hipertrofia', nome: 'ABC Feminino Iniciante', exercicios: ['pg11', 'pg04', 'co01', 'pe12', 'ab01'] },
    { id: 11, nivel: 'iniciante', objetivo: 'hipertrofia', nome: 'ABC Masculino Iniciante', exercicios: ['pe01', 'co01', 'om01', 'pg01', 'ab01'] },
    { id: 20, nivel: 'intermediario', objetivo: 'hipertrofia', nome: 'ABCD Masculino Intermediário', exercicios: ['pe01', 'pe04', 'co01', 'co06', 'om01', 'pg01', 'bi01', 'tr01'] },
    { id: 21, nivel: 'intermediario', objetivo: 'hipertrofia', nome: 'ABCD Feminino Intermediário', exercicios: ['pg01', 'pg05', 'pg07', 'pg11', 'pe04', 'co06', 'ab05', 'ab10'] },
    { id: 50, nivel: 'avançado', objetivo: 'hipertrofia', nome: 'Peitoral de Ferro (Bi-Set)', exercicios: ['pe01', 'pe07', 'pe09'] },
    { id: 51, nivel: 'avançado', objetivo: 'hipertrofia', nome: 'Dorsais Densas (Rest-Pause)', exercicios: ['co06', 'co03', 'co16'] },
    { id: 52, nivel: 'avançado', objetivo: 'hipertrofia', nome: 'Leg Day Brutal (Drop-Set)', exercicios: ['pg01', 'pg07', 'pg10', 'pg05'] }
  ];

  const treinos = [...treinosBase, ...state.treinosCustom];
  const t = treinos.find(x => x.id === treinoId);
  if (!t) return;

  if (!confirm(`Deseja aplicar o treino "${t.nome}" (${protocoloPeriodizacao.toUpperCase()}) ao aluno?`)) return;

  currentAlunoId = parseInt(alunoId);
  fichaExercicios = [];

  t.exercicios.forEach(exId => {
    const ex = EXERCICIOS_DB.find(e => e.id === exId);
    if (ex) {
      // Lógica de Periodização Ondulatória Simples (Ciência)
      let series = '3';
      let reps = '12';
      let descanso = '60';
      
      if (protocoloPeriodizacao === 'ondulatorio') {
        // Exemplo: Altera reps/descanso baseado no tipo de exercício
        if (ex.grupo === 'Pernas' || ex.grupo === 'Costas') {
          reps = '8-10 (Força/Hipertrofia)';
          descanso = '90';
        } else {
          reps = '12-15 (Resistência/Sarcoplasmática)';
          descanso = '45';
        }
      }

      fichaExercicios.push({
        id: Date.now() + Math.random(),
        exId: ex.id,
        nome: ex.nome,
        grupo: ex.grupo,
        series: series,
        reps: reps,
        carga: '',
        pct: '',
        tecnica: t.id >= 50 ? 'Técnica Avançada' : 'tradicional',
        descanso: descanso,
        cadencia: protocoloPeriodizacao === 'ondulatorio' ? '2-0-2' : '',
        video: ex.video || '',
        obs: protocoloPeriodizacao === 'ondulatorio' ? 'Foco em controle excêntrico.' : ''
      });
    }
  });

  const ficha = {
    alunoId: currentAlunoId,
    exercicios: fichaExercicios,
    objetivo: t.objetivo || 'hipertrofia',
    semana: `Protocolo ${protocoloPeriodizacao.charAt(0).toUpperCase() + protocoloPeriodizacao.slice(1)}`,
    data: new Date().toISOString().slice(0, 10)
  };

  const idx = state.fichas.findIndex(f => f.alunoId === currentAlunoId);
  if (idx >= 0) state.fichas[idx] = ficha;
  else state.fichas.push(ficha);
  
  saveState();
  showToast('Ficha de treino salva com sucesso!', 'success');
  
  const selectPresc = document.getElementById('alunoPresc');
  if (selectPresc) {
    selectPresc.value = alunoId;
    carregarPresc();
  }

  showToast(`Treino "${t.nome}" aplicado!`, 'success');
  showPage('treino');
  showTab('tab-prescricao');
}

function imprimirRelatorio() {
  const conteudo = document.getElementById('modal-conteudo');
  if (!conteudo) return;
  
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>Relatório de Avaliação Física</title>
    <style>
      body{font-family:sans-serif;padding:2rem;}
      .header{text-align:center;border-bottom:2px solid #1d4ed8;padding-bottom:1rem;margin-bottom:2rem;}
      .logo{max-width:150px;margin-bottom:10px;}
    </style>
    </head><body>
    <div class="header">
      <img src="logo.png" class="logo" onerror="this.style.display='none'">
      <h1>TREINOFITASM</h1>
      <p>Avaliação Física - Adriano de Souza</p>
    </div>
    ${conteudo.innerHTML}
    </body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 500);
}


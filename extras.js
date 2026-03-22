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

function salvarAnamnese() {
  const selId = document.getElementById('alunoAnamnese').value;
  if (!selId) { showToast('Selecione um aluno', 'error'); return; }
  
  const parqRespostas = {};
  for (let i = 1; i <= 7; i++) {
    const sel = document.querySelector(`input[name="parq${i}"]:checked`);
    parqRespostas[`q${i}`] = sel ? sel.value : 'nao';
  }

  const doencas = [];
  document.querySelectorAll('input[name="doenca"]:checked').forEach(cb => doencas.push(cb.value));

  const anamnese = {
    id: Date.now(),
    alunoId: parseInt(selId),
    data: new Date().toISOString().slice(0, 10),
    glicemia: document.getElementById('glicemia').value,
    triglicerideos: document.getElementById('triglicerideos').value,
    colesterolTotal: document.getElementById('colesterol-total').value,
    colesterolHDL: document.getElementById('colesterol-hdl').value,
    colesterolLDL: document.getElementById('colesterol-ldl').value,
    doencas,
    medicamentos: document.getElementById('medicamentos').value,
    parq: parqRespostas,
    paSistolica: document.getElementById('paSistolica').value,
    paDiastolica: document.getElementById('paDiastolica').value,
    classPA: document.getElementById('classPA').value,
    obsClinicas: document.getElementById('obsClinicas').value,
  };

  state.anamneses.push(anamnese);
  saveState();
  showToast('Anamnese completa salva!', 'success');
}

function limparAnamnese() {
  const form = document.querySelector('#page-anamnese');
  if (form) {
    form.querySelectorAll('input:not([type="date"]), textarea, select').forEach(el => el.value = '');
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
  const selId = document.getElementById('alunoPresc')?.value || document.getElementById('alunoEvolucao')?.value;
  if (!selId) { showToast('Selecione um aluno primeiro', 'error'); return; }
  
  const aluno = state.alunos.find(a => String(a.id) === String(selId));
  const avs = state.avaliacoes.filter(a => String(a.alunoId) === String(selId));
  const tsts = state.testes.filter(t => String(t.alunoId) === String(selId));
  const anam = state.anamneses.filter(a => String(a.alunoId) === String(selId));
  
  const lastAv = avs[avs.length - 1];
  const lastTst = tsts[tsts.length - 1];
  const lastAnam = anam[anam.length - 1];

  let html = `
    <div style="font-family:sans-serif; color:#333;">
      <div style="text-align:center; border-bottom:2px solid #1d4ed8; padding-bottom:1rem; margin-bottom:2rem;">
        <h1 style="color:#1d4ed8; margin:0;">TREINOFITASM</h1>
        <p style="margin:5px 0;">Relatório de Avaliação e Evolução</p>
      </div>
      
      <section style="margin-bottom:2rem;">
        <h3 style="border-bottom:1px solid #ddd; padding-bottom:5px;">Dados do Aluno</h3>
        <p><strong>Nome:</strong> ${aluno.nome} | <strong>Idade:</strong> ${aluno.idade} anos | <strong>Sexo:</strong> ${aluno.sexo}</p>
        <p><strong>Objetivo:</strong> ${aluno.objetivo || 'Não informado'}</p>
      </section>

      <section style="margin-bottom:2rem;">
        <h3 style="border-bottom:1px solid #ddd; padding-bottom:5px;">Marcadores de Saúde e Anamnese</h3>
        ${lastAnam ? `
          <p><strong>PA Repouso:</strong> ${lastAnam.paSistolica}/${lastAnam.paDiastolica} mmHg (${lastAnam.classPA})</p>
          <p><strong>Glicemia:</strong> ${lastAnam.glicemia || '—'} mg/dL | <strong>Triglicerídeos:</strong> ${lastAnam.triglicerideos || '—'} mg/dL</p>
          <p><strong>Colesterol Total:</strong> ${lastAnam.colesterolTotal || '—'} | <strong>HDL:</strong> ${lastAnam.colesterolHDL || '—'} | <strong>LDL:</strong> ${lastAnam.colesterolLDL || '—'}</p>
          <p><strong>Doenças/Histórico:</strong> ${lastAnam.doencas.join(', ') || 'Nenhuma'}</p>
          <p><strong>Medicamentos:</strong> ${lastAnam.medicamentos || 'Nenhum'}</p>
        ` : '<p>Nenhuma anamnese registrada.</p>'}
      </section>

      <section style="margin-bottom:2rem;">
        <h3 style="border-bottom:1px solid #ddd; padding-bottom:5px;">Composição Corporal</h3>
        ${lastAv ? `
          <p><strong>Data:</strong> ${lastAv.data} | <strong>Protocolo:</strong> ${lastAv.protocolo}</p>
          <div style="display:flex; gap:20px; background:#f8fafc; padding:10px; border-radius:5px;">
            <div><strong>% Gordura:</strong> ${lastAv.percGordura}%</div>
            <div><strong>Massa Magra:</strong> ${lastAv.massaMagra}kg</div>
            <div><strong>Massa Gorda:</strong> ${lastAv.massaGorda}kg</div>
          </div>
        ` : '<p>Nenhuma avaliação antropométrica registrada.</p>'}
      </section>

      <section style="margin-bottom:2rem;">
        <h3 style="border-bottom:1px solid #ddd; padding-bottom:5px;">Capacidade Cardiorrespiratória</h3>
        ${lastTst ? `
          <p><strong>VO2máx:</strong> ${lastTst.vo2} mL/kg/min | <strong>Protocolo:</strong> ${lastTst.protocolo}</p>
        ` : '<p>Nenhum teste de VO2máx registrado.</p>'}
      </section>

      <div style="text-align:center; margin-top:4rem; font-size:0.9rem; color:#666;">
        <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
        <p>TREINOFITASM - Treinamento Personalizado</p>
      </div>
    </div>
  `;

  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>Relatório TREINOFITASM</title></head><body>${html}</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

function fecharModal() {
  const modal = document.getElementById('modal-relatorio');
  if (modal) modal.style.display = 'none';
}

function imprimirRelatorio() {
  const conteudo = document.getElementById('modal-conteudo');
  if (!conteudo) return;
  
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>Relatório TREINOFITASM</title>
    <style>body{font-family:sans-serif;padding:2rem;}</style>
    </head><body>
    ${conteudo.innerHTML}
    </body></html>
  `);
  win.document.close();
  win.print();
}


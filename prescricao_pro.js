// ============================================================
// prescricao_pro.js – Motor de prescrição avançada
// ============================================================

// ===== LOCAL STATE =====
let fichaExercicios = []; 
let currentAlunoId = null;

// ===== INIT PRESCRIÇÃO =====
function initPresc() {
  const tecSel = document.getElementById('presc-tecnica');
  if (tecSel) {
    tecSel.innerHTML = '<option value="">Tradicional (Série Simples)</option>' + 
      TECNICAS_DB.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
  }

  const protSel = document.getElementById('presc-protocolo');
  if (protSel) {
    protSel.innerHTML = '<option value="">Manual (Personalizado)</option>' + 
      PROTOCOLOS_DB.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
  }

  const tecTbody = document.getElementById('tabela-tecnicas-corpo');
  if (tecTbody) {
    tecTbody.innerHTML = TECNICAS_DB.map(t => `
      <tr>
        <td><strong>${t.nome}</strong></td>
        <td>${t.categoria}</td>
        <td>${t.intensidade}</td>
        <td>${t.series}</td>
        <td>${t.descanso}</td>
        <td>${t.nivel}</td>
      </tr>
    `).join('');
  }

  const protContainer = document.getElementById('tabela-protocolos-corpo');
  if (protContainer) {
    protContainer.innerHTML = PROTOCOLOS_DB.map(p => `
      <div class="aluno-card" style="margin-bottom:1rem;">
        <h4>${p.nome}</h4>
        <p style="font-size:0.85rem; margin:0.5rem 0;">${p.descricao}</p>
        <table class="data-table" style="font-size:0.75rem;">
          <thead><tr><th>Fase/Sem</th><th>Objetivo</th><th>Séries</th><th>Reps</th><th>Intensidade</th></tr></thead>
          <tbody>
            ${p.fase.map(f => `<tr><td>${f.sem}</td><td>${f.obj}</td><td>${f.series}</td><td>${f.reps}</td><td>${f.int}</td></tr>`).join('')}
          </tbody>
        </table>
        <p style="font-size:0.7rem; color:#666; margin-top:0.5rem;">Ref: ${p.ref}</p>
      </div>
    `).join('');
  }
}

function carregarPresc() {
  const selId = document.getElementById('alunoPresc').value;
  if (!selId) {
    document.getElementById('presc-content').style.display = 'none';
    document.getElementById('presc-empty').style.display = 'block';
    currentAlunoId = null;
    return;
  }
  
  currentAlunoId = parseInt(selId);
  document.getElementById('presc-content').style.display = 'block';
  document.getElementById('presc-empty').style.display = 'none';
  
  // Carregar ficha atual do aluno se existir no state
  const fichaExistente = state.fichas.find(f => f.alunoId === currentAlunoId);
  fichaExercicios = fichaExistente ? [...fichaExistente.exercicios] : [];
  
  renderListaExercicios();
  renderFichaTabela();
}

// ===== RENDERIZAR LISTA DE EXERCÍCIOS =====
function renderListaExercicios() {
  const container = document.getElementById('presc-lista-exercicios');
  if (!container) return;
  
  const busca = (document.getElementById('presc-busca')?.value || '').toLowerCase();
  let lista = EXERCICIOS_DB; 
  
  if (busca) {
    lista = lista.filter(e => e.nome.toLowerCase().includes(busca) || e.grupo.toLowerCase().includes(busca));
  }
  
  container.innerHTML = lista.map(e => `
    <div class="exer-item" onclick="selecionarExercicio(${e.id})">
      <div class="exer-nome">${e.nome}</div>
      <div class="exer-meta">${e.grupo} · ${e.equip}</div>
    </div>`).join('');
}

function filtrarExercicios() {
  renderListaExercicios();
}

// ===== SELECIONAR EXERCÍCIO =====
function selecionarExercicio(id) {
  const ex = EXERCICIOS_DB.find(e => e.id === id);
  if (!ex) return;
  
  const painel = document.getElementById('painel-add-exercicio');
  if (painel) {
    document.getElementById('exer-sel-nome').textContent = ex.nome;
    painel.style.display = 'block';
    painel.dataset.exId = id;
    
    // Buscar 1RM do aluno para este exercício no state
    const rmRegs = state.rms.filter(r => r.alunoId === currentAlunoId && r.exercicioId === id);
    const ref = document.getElementById('rm-referencia');
    if (rmRegs.length > 0) {
      const ultimoRM = rmRegs[rmRegs.length - 1].rm;
      ref.textContent = `Último 1RM: ${ultimoRM.toFixed(1)} kg`;
      ref.dataset.rm = ultimoRM;
    } else {
      ref.textContent = 'Sem 1RM registrado para este exercício.';
      ref.dataset.rm = '';
    }
    
    painel.scrollIntoView({ behavior:'smooth' });
  }
}

function calcularCargaPorRM() {
  const pct = parseFloat(document.getElementById('presc-pct-rm').value);
  const rmRef = document.getElementById('rm-referencia');
  const rm = parseFloat(rmRef?.dataset.rm);
  
  if (pct && rm) {
    const carga = (rm * pct / 100).toFixed(1);
    document.getElementById('presc-carga').value = carga;
  }
}

// ===== ADICIONAR EXERCÍCIO =====
function adicionarExercicio() {
  const painel = document.getElementById('painel-add-exercicio');
  const exId = painel.dataset.exId;
  const ex = EXERCICIOS_DB.find(e => e.id == exId);
  
  const item = {
    id: Date.now(),
    exId: parseInt(exId),
    nome: ex.nome,
    grupo: ex.grupo,
    series: document.getElementById('presc-series').value,
    reps: document.getElementById('presc-reps').value,
    carga: document.getElementById('presc-carga').value,
    pct: document.getElementById('presc-pct-rm').value,
    tecnica: document.getElementById('presc-tecnica')?.value || 'tradicional',
    descanso: document.getElementById('presc-descanso').value
  };
  
  fichaExercicios.push(item);
  renderFichaTabela();
  painel.style.display = 'none';
  showToast('Exercício adicionado!', 'success');
}

function renderFichaTabela() {
  const container = document.getElementById('ficha-exercicios-tabela');
  if (!container) return;
  
  if (fichaExercicios.length === 0) {
    container.innerHTML = '<p class="result-placeholder">Nenhum exercício na ficha.</p>';
    return;
  }
  
  let html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Exercício</th>
          <th>Séries</th>
          <th>Reps</th>
          <th>Carga</th>
          <th>% 1RM</th>
          <th>Técnica</th>
          <th>Descanso</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  html += fichaExercicios.map(e => `
    <tr>
      <td>${e.nome}</td>
      <td>${e.series}</td>
      <td>${e.reps}</td>
      <td>${e.carga} kg</td>
      <td>${e.pct ? e.pct + '%' : '—'}</td>
      <td>${e.tecnica ? e.tecnica.charAt(0).toUpperCase() + e.tecnica.slice(1) : 'Tradicional'}</td>
      <td>${e.descanso}s</td>
      <td><button class="btn-del" onclick="removerExercicio(${e.id})">✕</button></td>
    </tr>
  `).join('');
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function removerExercicio(id) {
  fichaExercicios = fichaExercicios.filter(e => e.id !== id);
  renderFichaTabela();
}

function carregarComparativoPresc() {
  const container = document.getElementById('comparativo-fichas');
  if (!container || !currentAlunoId) return;

  const historico = state.fichas.filter(f => f.alunoId === currentAlunoId);
  if (historico.length === 0) {
    container.innerHTML = '<p class="result-placeholder">Nenhuma ficha anterior encontrada.</p>';
    return;
  }

  container.innerHTML = historico.map(f => `
    <div class="aluno-card" style="margin-bottom:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
        <strong>Data: ${new Date(f.data).toLocaleDateString('pt-BR')}</strong>
        <button class="btn-secondary" onclick="carregarFichaHistorico(${f.alunoId}, '${f.data}')" style="padding: 4px 8px; font-size: 0.75rem;">Carregar esta ficha</button>
      </div>
      <div style="font-size:0.8rem; color:#666;">
        ${f.exercicios.map(e => `${e.nome} (${e.series}x${e.reps})`).join(' · ')}
      </div>
    </div>
  `).join('');
}

function carregarFichaHistorico(alunoId, data) {
  const ficha = state.fichas.find(f => f.alunoId === alunoId && f.data === data);
  if (ficha) {
    fichaExercicios = [...ficha.exercicios];
    renderFichaTabela();
    showToast('Ficha carregada do histórico!', 'success');
  }
}

function mostrarInfoProtocolo() {
  const select = document.getElementById('presc-protocolo');
  const infoBox = document.getElementById('protocolo-info-box');
  if (!select || !infoBox) return;

  const protId = select.value;
  if (!protId) {
    infoBox.style.display = 'none';
    return;
  }

  const prot = PROTOCOLOS_DB.find(p => p.id === protId);
  if (prot) {
    infoBox.style.display = 'block';
    infoBox.innerHTML = `
      <strong>${prot.nome}</strong><br>
      <p style="margin: 0.5rem 0; font-size: 0.85rem;">${prot.descricao}</p>
      <div style="font-size: 0.75rem; color: #666;">Ref: ${prot.ref}</div>
    `;
  }
}

function mostrarInfoTecnica() {
  const select = document.getElementById('presc-tecnica');
  const infoBox = document.getElementById('tecnica-info-box');
  if (!select || !infoBox) return;

  const tecId = select.value;
  if (!tecId) {
    infoBox.style.display = 'none';
    return;
  }

  const tec = TECNICAS_DB.find(t => t.id === tecId);
  if (tec) {
    infoBox.style.display = 'block';
    infoBox.innerHTML = `
      <strong>${tec.nome}</strong> (${tec.categoria})<br>
      <p style="margin: 0.3rem 0; font-size: 0.8rem;">${tec.descricao}</p>
      <div style="font-size: 0.75rem;"><strong>Aplicação:</strong> ${tec.aplicacao}</div>
    `;
  }
}

function salvarFichaCompleta() {
  if (!currentAlunoId) { showToast('Selecione um aluno primeiro', 'error'); return; }
  
  const ficha = {
    alunoId: currentAlunoId,
    exercicios: fichaExercicios,
    data: new Date().toISOString().slice(0, 10)
  };
  
  const idx = state.fichas.findIndex(f => f.alunoId === currentAlunoId);
  if (idx >= 0) state.fichas[idx] = ficha;
  else state.fichas.push(ficha);
  
  saveState();
  showToast('Treino salvo com sucesso!', 'success');
}

function imprimirFichaPro() {
  if (!currentAlunoId || fichaExercicios.length === 0) {
    showToast('Selecione um aluno e adicione exercícios', 'error');
    return;
  }
  
  const aluno = state.alunos.find(a => a.id === currentAlunoId);
  const win = window.open('', '_blank');
  
  let rows = fichaExercicios.map(e => `
    <tr>
      <td>${e.nome}</td>
      <td>${e.series}</td>
      <td>${e.reps}</td>
      <td>${e.carga} kg</td>
      <td>${e.pct ? e.pct + '%' : '—'}</td>
      <td>${e.tecnica ? e.tecnica.charAt(0).toUpperCase() + e.tecnica.slice(1) : 'Tradicional'}</td>
      <td>${e.descanso}s</td>
    </tr>
  `).join('');

  win.document.write(`
    <html><head><title>TREINOFITASM - Ficha de Treino</title>
    <style>
      body{font-family:sans-serif;padding:2rem;}
      table{width:100%;border-collapse:collapse;margin-top:1rem;}
      th,td{border:1px solid #ddd;padding:8px;text-align:left;}
      th{background:#1d4ed8;color:white;}
      .header{text-align:center;border-bottom:2px solid #1d4ed8;margin-bottom:1rem;}
      .params{margin-top:2rem; font-size:0.8rem; background:#f1f5f9; padding:10px; border-radius:5px;}
    </style>
    </head><body>
    <div class="header">
      <h1>TREINOFITASM</h1>
      <p>Ficha de Treino - ${aluno ? aluno.nome : 'Aluno'}</p>
      <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
    <table>
      <thead>
        <tr><th>Exercício</th><th>Séries</th><th>Reps</th><th>Carga</th><th>% 1RM</th><th>Técnica</th><th>Descanso</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="params">
      <h4>Parâmetros de Intensidade:</h4>
      <p>Força: 85-100% | Hipertrofia: 70-85% | Resistência: < 60%</p>
      <p><em>* Cargas calculadas com base no seu teste de 1RM.</em></p>
    </div>
    <p style="text-align:center; margin-top:2rem; font-size:0.8rem; color:#666;">TREINOFITASM - Treinamento Personalizado</p>
    </body></html>
  `);
  win.document.close();
  win.print();
}

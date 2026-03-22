// ============================================================
// prescricao_pro.js – Motor de prescrição avançada
// ============================================================

// ===== STATE =====
let fichaExercicios = []; // array de exercícios adicionados na ficha
let fichaAlunoId = null;

// ===== INIT PRESCRIÇÃO PRO =====
function initPrescPro() {
  document.getElementById('presc-content').style.display = 'block';
  document.getElementById('presc-empty').style.display = 'none';
  renderGruposCheckbox();
  renderSeletorTecnica();
  renderSeletorProtocolo();
  fichaExercicios = [];
  renderFichaTabela();
}

// ===== RENDERIZAR GRUPOS =====
function renderGruposCheckbox() {
  const grupos = getGrupos();
  const container = document.getElementById('presc-grupos-filter');
  if (!container) return;
  container.innerHTML = grupos.map(g =>
    `<label class="check-label"><input type="checkbox" class="grp-check" value="${g}" onchange="filtrarExercicios()" /> ${g}</label>`
  ).join('');
}

// ===== FILTRAR EXERCÍCIOS =====
function filtrarExercicios() {
  const grupos = [...document.querySelectorAll('.grp-check:checked')].map(c => c.value);
  const busca = (document.getElementById('presc-busca')?.value || '').toLowerCase();
  let lista = EXERCICIOS_DB;
  if (grupos.length) lista = lista.filter(e => grupos.includes(e.grupo));
  if (busca) lista = lista.filter(e => e.nome.toLowerCase().includes(busca) || e.subgrupo.toLowerCase().includes(busca));
  renderListaExercicios(lista);
}

function renderListaExercicios(lista) {
  const container = document.getElementById('presc-lista-exercicios');
  if (!container) return;
  if (!lista.length) { container.innerHTML = '<p style="color:#64748b;padding:1rem;">Nenhum exercício encontrado.</p>'; return; }
  container.innerHTML = lista.map(e => `
    <div class="exer-item" onclick="selecionarExercicio('${e.id}')">
      <div class="exer-nome">${e.nome}</div>
      <div class="exer-meta">${e.grupo} · ${e.subgrupo} · ${e.equip}</div>
      <span class="nivel-badge nivel-${e.nivel.toLowerCase().replace(' ','')}">${e.nivel}</span>
    </div>`).join('');
}

// ===== SELECIONAR EXERCÍCIO =====
function selecionarExercicio(id) {
  const ex = getExercicioById(id);
  if (!ex) return;
  document.getElementById('exer-sel-nome').textContent = ex.nome;
  document.getElementById('exer-sel-grupo').textContent = ex.grupo + ' · ' + ex.subgrupo;
  document.getElementById('exer-sel-equip').textContent = ex.equip;
  document.getElementById('painel-add-exercicio').style.display = 'block';
  document.getElementById('painel-add-exercicio').dataset.exId = id;
  calcularCargaPorRM();
  document.getElementById('painel-add-exercicio').scrollIntoView({ behavior:'smooth' });
}

// ===== CALCULAR CARGA PELO %1RM =====
function calcularCargaPorRM() {
  const alunoId = fichaAlunoId;
  const exId = document.getElementById('painel-add-exercicio')?.dataset?.exId;
  const pct = parseFloat(document.getElementById('presc-pct-rm')?.value || 0);
  if (!pct) return;
  if (alunoId && exId) {
    const ex = getExercicioById(exId);
    const rms = JSON.parse(localStorage.getItem('rms') || '[]');
    const rmReg = rms.filter(r => String(r.alunoId) === String(alunoId) && r.exercicio === ex.nome);
    if (rmReg.length) {
      const rmVal = parseFloat(rmReg[rmReg.length - 1].rm);
      const carga = (rmVal * pct / 100).toFixed(1);
      document.getElementById('presc-carga').value = carga;
      document.getElementById('rm-referencia').textContent = `1RM registrado: ${rmVal.toFixed(1)} kg → ${pct}% = ${carga} kg`;
    } else {
      document.getElementById('rm-referencia').textContent = 'Sem 1RM registrado para este exercício.';
    }
  }
  // Sugerir reps pelo %1RM
  const repsMap = [[95,1],[90,2],[85,4],[80,6],[75,8],[70,10],[65,12],[60,15],[55,20],[50,25]];
  for (const [p, r] of repsMap) {
    if (pct >= p) { document.getElementById('presc-reps').value = r; break; }
  }
}

// ===== ADICIONAR EXERCÍCIO À FICHA =====
function adicionarExercicio() {
  const painel = document.getElementById('painel-add-exercicio');
  const exId = painel.dataset.exId;
  const ex = getExercicioById(exId);
  if (!ex) return;
  const series = document.getElementById('presc-series').value;
  const reps = document.getElementById('presc-reps').value;
  const carga = document.getElementById('presc-carga').value;
  const pct = document.getElementById('presc-pct-rm').value;
  const tecnica = document.getElementById('presc-tecnica').value;
  const descanso = document.getElementById('presc-descanso').value;
  const cadencia = document.getElementById('presc-cadencia').value;
  const obs = document.getElementById('presc-obs-ex').value;
  if (!series || !reps) { showToast('Informe séries e repetições', 'error'); return; }
  const item = { exId, nome: ex.nome, grupo: ex.grupo, series, reps, carga, pct, tecnica, descanso, cadencia, obs, id: Date.now() };
  fichaExercicios.push(item);
  renderFichaTabela();
  painel.style.display = 'none';
  document.getElementById('rm-referencia').textContent = '';
  showToast(`${ex.nome} adicionado à ficha!`, 'success');
}

// ===== RENDERIZAR FICHA =====
function renderFichaTabela() {
  const container = document.getElementById('ficha-exercicios-tabela');
  if (!container) return;
  if (!fichaExercicios.length) {
    container.innerHTML = '<p style="color:#64748b;padding:1rem;text-align:center;">Nenhum exercício adicionado. Selecione da lista acima.</p>';
    return;
  }
  const grupos = [...new Set(fichaExercicios.map(e => e.grupo))];
  let html = '';
  grupos.forEach(g => {
    html += `<h3 class="ficha-grupo-title">${g}</h3>
    <div class="table-wrapper"><table class="data-table ficha-table">
      <thead><tr><th>#</th><th>Exercício</th><th>Técnica</th><th>Séries</th><th>Reps</th><th>Carga</th><th>% 1RM</th><th>Descanso</th><th>Cadência</th><th>Obs</th><th></th></tr></thead>
      <tbody>`;
    fichaExercicios.filter(e => e.grupo === g).forEach((e, i) => {
      const tec = TECNICAS_DB.find(t => t.id === e.tecnica);
      html += `<tr>
        <td>${i + 1}</td>
        <td><strong>${e.nome}</strong></td>
        <td><span class="tecnica-badge">${tec ? tec.nome : '—'}</span></td>
        <td>${e.series}</td>
        <td>${e.reps}</td>
        <td>${e.carga || '—'} kg</td>
        <td>${e.pct ? e.pct + '%' : '—'}</td>
        <td>${e.descanso || '—'}s</td>
        <td>${e.cadencia || '—'}</td>
        <td style="font-size:0.78rem">${e.obs || '—'}</td>
        <td><button onclick="removerExercicio(${e.id})" class="btn-del">✕</button></td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  });
  container.innerHTML = html;
}

function removerExercicio(id) {
  fichaExercicios = fichaExercicios.filter(e => e.id !== id);
  renderFichaTabela();
}

// ===== SELETOR TÉCNICA =====
function renderSeletorTecnica() {
  const sel = document.getElementById('presc-tecnica');
  if (!sel) return;
  sel.innerHTML = '<option value="">Série Simples (padrão)</option>';
  const cats = [...new Set(TECNICAS_DB.map(t => t.categoria))];
  cats.forEach(cat => {
    const grp = document.createElement('optgroup');
    grp.label = cat;
    TECNICAS_DB.filter(t => t.categoria === cat).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.nome;
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  });
}

function mostrarInfoTecnica() {
  const id = document.getElementById('presc-tecnica').value;
  const box = document.getElementById('tecnica-info-box');
  if (!id || !box) { if(box) box.style.display='none'; return; }
  const t = TECNICAS_DB.find(x => x.id === id);
  if (!t) return;
  box.style.display = 'block';
  box.innerHTML = `<strong>${t.nome}</strong> <span class="badge badge-bom">${t.categoria}</span><br>
    ${t.descricao}<br>
    <strong>Aplicação:</strong> ${t.aplicacao}<br>
    <strong>Intensidade:</strong> ${t.intensidade} | <strong>Séries:</strong> ${t.series} | <strong>Descanso:</strong> ${t.descanso}`;
  // preencher sugestões
  if (t.descanso) {
    const descansoNum = t.descanso.match(/\d+/);
    if (descansoNum) document.getElementById('presc-descanso').value = descansoNum[0];
  }
}

// ===== SELETOR PROTOCOLO =====
function renderSeletorProtocolo() {
  const sel = document.getElementById('presc-protocolo');
  if (!sel) return;
  sel.innerHTML = '<option value="">Manual (personalizado)</option>';
  PROTOCOLOS_DB.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nome;
    sel.appendChild(opt);
  });
}

function mostrarInfoProtocolo() {
  const id = document.getElementById('presc-protocolo')?.value;
  const box = document.getElementById('protocolo-info-box');
  if (!id || !box) { if(box) box.style.display='none'; return; }
  const p = PROTOCOLOS_DB.find(x => x.id === id);
  if (!p) { box.style.display='none'; return; }
  box.style.display = 'block';
  let html = `<strong>${p.nome}</strong><br>${p.descricao}<br><br>
    <div class="table-wrapper"><table class="data-table" style="font-size:0.8rem;">
    <thead><tr><th>Período</th><th>Objetivo</th><th>Séries</th><th>Reps</th><th>Intensidade</th></tr></thead><tbody>`;
  p.fase.forEach(f => {
    html += `<tr><td>${f.sem}</td><td>${f.obj}</td><td>${f.series}</td><td>${f.reps}</td><td>${f.int}</td></tr>`;
  });
  html += `</tbody></table></div><p style="font-size:0.75rem;color:#64748b;margin-top:4px;">Ref: ${p.ref}</p>`;
  box.innerHTML = html;
}

// ===== SALVAR FICHA COMPLETA =====
function salvarFichaCompleta() {
  if (!fichaAlunoId) { showToast('Selecione um aluno', 'error'); return; }
  if (!fichaExercicios.length) { showToast('Adicione exercícios à ficha', 'error'); return; }
  let fichas = JSON.parse(localStorage.getItem('fichas') || '[]');
  const obj = document.getElementById('presc-objetivo-pro')?.value || '';
  const protocolo = document.getElementById('presc-protocolo')?.value || '';
  const semana = document.getElementById('presc-semana')?.value || '';
  const ficha = {
    id: Date.now(),
    alunoId: fichaAlunoId,
    data: new Date().toISOString().slice(0, 10),
    objetivo: obj,
    protocolo,
    semana,
    exercicios: fichaExercicios,
  };
  fichas.push(ficha);
  localStorage.setItem('fichas', JSON.stringify(fichas));
  showToast('Ficha salva com sucesso!', 'success');
}

// ===== IMPRIMIR FICHA =====
function imprimirFichaPro() {
  if (!fichaExercicios.length) { showToast('Adicione exercícios primeiro', 'error'); return; }
  const alunoId = fichaAlunoId;
  const aluno = state.alunos.find(a => a.id === alunoId);
  const hoje = new Date().toLocaleDateString('pt-BR');
  const protocolo = PROTOCOLOS_DB.find(p => p.id === document.getElementById('presc-protocolo')?.value);

  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ficha de Treino</title>
  <style>
    body{font-family:'Segoe UI',sans-serif;margin:1.5rem;color:#1e293b;}
    h1{color:#1d4ed8;} h2{color:#1d4ed8;border-bottom:2px solid #1d4ed8;padding-bottom:4px;margin:1rem 0 0.5rem;}
    table{width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:1rem;}
    th{background:#1d4ed8;color:white;padding:8px;text-align:left;}
    td{padding:7px;border-bottom:1px solid #e2e8f0;}
    tr:nth-child(even) td{background:#f8fafc;}
    .header{background:linear-gradient(135deg,#1d4ed8,#1e40af);color:white;padding:1.5rem;border-radius:8px;margin-bottom:1rem;}
    .header p{margin:3px 0;opacity:0.85;}
    @media print{body{margin:0.5rem;}}
  </style></head><body>
  <div class="header">
    <h1 style="color:white;margin:0 0 0.5rem;">Ficha de Treinamento</h1>
    ${aluno ? `<p>${aluno.nome} · ${aluno.sexo === 'M' ? 'Masculino' : 'Feminino'} · ${aluno.idade} anos · ${aluno.peso}kg · ${aluno.altura}cm</p>` : ''}
    <p>Data: ${hoje} ${protocolo ? `· Protocolo: ${protocolo.nome}` : ''}</p>
  </div>`;

  const grupos = [...new Set(fichaExercicios.map(e => e.grupo))];
  grupos.forEach(g => {
    html += `<h2>${g}</h2><table><thead><tr><th>#</th><th>Exercício</th><th>Técnica</th><th>Séries</th><th>Reps</th><th>Carga (kg)</th><th>% 1RM</th><th>Descanso</th><th>Cadência</th><th>Obs / Feedback</th></tr></thead><tbody>`;
    fichaExercicios.filter(e => e.grupo === g).forEach((e, i) => {
      const tec = TECNICAS_DB.find(t => t.id === e.tecnica);
      html += `<tr><td>${i+1}</td><td><strong>${e.nome}</strong></td><td>${tec ? tec.nome : 'Série Simples'}</td><td>${e.series}</td><td>${e.reps}</td><td>${e.carga || '—'}</td><td>${e.pct ? e.pct+'%' : '—'}</td><td>${e.descanso ? e.descanso+'s' : '—'}</td><td>${e.cadencia || '—'}</td><td style="min-width:120px;"> </td></tr>`;
    });
    html += '</tbody></table>';
  });
  html += `<p style="font-size:0.75rem;color:#64748b;margin-top:1rem;text-align:center;">TREINOFITASM · Prescrição supervisionada por Profissional de Educação Física</p></body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
}

// ===== CARREGAR ALUNO NA PRESCRIÇÃO PRO =====
function carregarPresc() {
  const selId = parseInt(document.getElementById('alunoPresc').value);
  if (!selId) {
    document.getElementById('presc-content').style.display = 'none';
    document.getElementById('presc-empty').style.display = 'block';
    fichaAlunoId = null;
    return;
  }
  fichaAlunoId = selId;
  const aluno = state.alunos.find(a => a.id === selId);
  if (aluno && aluno.objetivo) {
    const sel = document.getElementById('presc-objetivo-pro');
    if (sel) sel.value = aluno.objetivo;
  }
  initPrescPro();
  filtrarExercicios();
}

// ===== COMPARATIVO EVOLUÇÃO =====
function carregarComparativoPresc() {
  const selId = parseInt(document.getElementById('alunoPresc').value);
  if (!selId) return;
  const fichas = JSON.parse(localStorage.getItem('fichas') || '[]').filter(f => String(f.alunoId) === String(selId));
  const box = document.getElementById('comparativo-fichas');
  if (!box) return;
  if (!fichas.length) { box.innerHTML = '<p style="color:#64748b;">Nenhuma ficha anterior salva.</p>'; return; }
  let html = '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Data</th><th>Objetivo</th><th>Protocolo</th><th>Exercícios</th><th>Ação</th></tr></thead><tbody>';
  fichas.reverse().forEach(f => {
    html += `<tr><td>${f.data}</td><td>${f.objetivo || '—'}</td><td>${PROTOCOLOS_DB.find(p=>p.id===f.protocolo)?.nome || '—'}</td><td>${f.exercicios?.length || 0}</td>
      <td><button class="btn-primary" style="padding:4px 10px;font-size:0.78rem;" onclick="carregarFicha(${f.id})">Carregar</button></td></tr>`;
  });
  html += '</tbody></table></div>';
  box.innerHTML = html;
}

function carregarFicha(id) {
  const fichas = JSON.parse(localStorage.getItem('fichas') || '[]');
  const f = fichas.find(x => x.id === id);
  if (!f) return;
  fichaExercicios = f.exercicios || [];
  renderFichaTabela();
  showToast('Ficha carregada!', 'success');
  document.getElementById('ficha-exercicios-tabela').scrollIntoView({ behavior: 'smooth' });
}

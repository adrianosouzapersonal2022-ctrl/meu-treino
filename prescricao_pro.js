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

  // Povoar filtros de grupos musculares
  const filterContainer = document.getElementById('presc-grupos-filter');
  if (filterContainer) {
    const grupos = [...new Set(EXERCICIOS_DB.map(e => e.grupo))].sort();
    filterContainer.innerHTML = grupos.map(g => `
      <label class="check-label">
        <input type="checkbox" name="grupo-filter" value="${g}" onchange="renderListaExercicios()"> ${g}
      </label>
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
  
  currentAlunoId = selId; // Manter como string para consistência
  document.getElementById('presc-content').style.display = 'block';
  document.getElementById('presc-empty').style.display = 'none';
  
  // Carregar ficha atual do aluno se existir no state
  const fichaExistente = state.fichas.find(f => String(f.alunoId) === String(currentAlunoId));
  fichaExercicios = fichaExistente ? [...fichaExistente.exercicios] : [];
  
  if (fichaExistente) {
    if (document.getElementById('presc-objetivo-pro')) document.getElementById('presc-objetivo-pro').value = fichaExistente.objetivo || '';
    if (document.getElementById('presc-semana')) document.getElementById('presc-semana').value = fichaExistente.semana || '';
    if (document.getElementById('presc-meta-sessoes')) document.getElementById('presc-meta-sessoes').value = fichaExistente.metaSessoes || '';
    
    // Mostrar contador de sessões atual
    const sessoesAtuais = fichaExistente.sessoesRealizadas || 0;
    const metaSessoes = fichaExistente.metaSessoes || 0;
    const alertBox = document.getElementById('alerta-vencimento-treino');
    if (alertBox) {
      if (metaSessoes > 0 && sessoesAtuais >= metaSessoes) {
        alertBox.innerHTML = `⚠️ <strong>TREINO VENCIDO!</strong> O aluno já completou ${sessoesAtuais} de ${metaSessoes} sessões. Hora de atualizar a prescrição.`;
        alertBox.style.display = 'block';
        alertBox.className = 'info-box error';
      } else if (metaSessoes > 0 && sessoesAtuais >= (metaSessoes * 0.8)) {
        alertBox.innerHTML = `🔔 <strong>TREINO PRÓXIMO DO VENCIMENTO:</strong> ${sessoesAtuais} de ${metaSessoes} sessões realizadas.`;
        alertBox.style.display = 'block';
        alertBox.className = 'info-box warning';
      } else {
        alertBox.style.display = 'none';
      }
    }
    
    // Carregar dias da semana e mapeamento de divisões
    const dias = fichaExistente.diasTreino || [];
    const mapping = fichaExistente.mapeamentoDias || {};
    
    document.querySelectorAll('input[name="dia-treino"]').forEach(cb => {
      cb.checked = dias.includes(cb.value);
    });
    
    document.querySelectorAll('.day-split').forEach(sel => {
      const day = sel.dataset.day;
      if (mapping[day]) sel.value = mapping[day];
    });
  } else {
    if (document.getElementById('presc-objetivo-pro')) document.getElementById('presc-objetivo-pro').value = '';
    if (document.getElementById('presc-semana')) document.getElementById('presc-semana').value = '';
    document.querySelectorAll('input[name="dia-treino"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('.day-split').forEach(sel => sel.selectedIndex = 0);
  }
  
  renderListaExercicios();
  renderFichaTabela();
}

// ===== RENDERIZAR LISTA DE EXERCÍCIOS =====
function getExerciciosCompletos() {
  const custom = JSON.parse(localStorage.getItem('exercicios_custom') || '[]');
  return [...EXERCICIOS_DB, ...custom];
}

function renderListaExercicios() {
  const container = document.getElementById('presc-lista-exercicios');
  if (!container) return;
  
  const busca = (document.getElementById('presc-busca')?.value || '').toLowerCase();
  const gruposChecked = Array.from(document.querySelectorAll('input[name="grupo-filter"]:checked')).map(cb => cb.value);
  
  let lista = getExerciciosCompletos(); 
  
  if (busca) {
    lista = lista.filter(e => e.nome.toLowerCase().includes(busca) || e.grupo.toLowerCase().includes(busca));
  }
  
  if (gruposChecked.length > 0) {
    lista = lista.filter(e => gruposChecked.includes(e.grupo));
  }
  
  container.innerHTML = lista.map(e => {
    const grupoClass = `grupo-${e.grupo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
    const bgClass = `bg-${e.grupo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
    const nivel = e.nivel || 'Iniciante';
    const nivelClass = `nivel-${nivel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
    
    return `
      <div class="exer-item ${grupoClass}">
        <div class="nivel-badge ${nivelClass}">${nivel}</div>
        <div class="exer-media" onclick="selecionarExercicio('${e.id}')">
          ${e.video ? `<img src="https://img.youtube.com/vi/${getYouTubeID(e.video)}/0.jpg" alt="${e.nome}" onerror="this.src='https://via.placeholder.com/300x150?text=Exerc%C3%ADcio'">` : `<div style="font-size:2rem; color:#cbd5e1;">🏋️</div>`}
        </div>
        <div class="exer-info">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
            <div class="badge-grupo ${bgClass}">${e.grupo}</div>
            ${String(e.id).startsWith('custom_') ? `
              <div style="display: flex; gap: 5px;">
                <button onclick="editarExercicioCustom('${e.id}')" style="background: #3b82f6; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;" title="Editar">✏️</button>
                <button onclick="excluirExercicioCustom('${e.id}')" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;" title="Excluir">🗑️</button>
              </div>
            ` : ''}
          </div>
          <div class="exer-nome" onclick="selecionarExercicio('${e.id}')">${e.nome}</div>
          <div class="exer-meta" onclick="selecionarExercicio('${e.id}')">
            <span>${e.equip || 'Livre'}</span>
            <span>•</span>
            <span>${e.tipo || 'Força'}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function editarExercicioCustom(id) {
  const custom = JSON.parse(localStorage.getItem('exercicios_custom') || '[]');
  const ex = custom.find(e => String(e.id) === String(id));
  if (!ex) return;

  document.getElementById('modal-novo-exer-titulo').textContent = '✏️ Editar Exercício';
  document.getElementById('novo-exer-id').value = id;
  document.getElementById('novo-exer-nome').value = ex.nome;
  document.getElementById('novo-exer-equip').value = ex.equip || '';
  document.getElementById('novo-exer-video').value = ex.video || '';
  
  // Marcar grupos
  const grupos = ex.grupos || [ex.grupo];
  document.querySelectorAll('input[name="novo-grupo"]').forEach(cb => {
    cb.checked = grupos.includes(cb.value);
  });

  abrirModalNovoExercicio();
}

function excluirExercicioCustom(id) {
  if (!confirm('Tem certeza que deseja excluir este exercício do seu banco de dados?')) return;
  
  let custom = JSON.parse(localStorage.getItem('exercicios_custom') || '[]');
  custom = custom.filter(e => String(e.id) !== String(id));
  localStorage.setItem('exercicios_custom', JSON.stringify(custom));
  
  showToast('🗑️ Exercício excluído com sucesso!', 'success');
  renderListaExercicios();
}

function getYouTubeID(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function filtrarExercicios() {
  renderListaExercicios();
}

// ===== SELECIONAR EXERCÍCIO =====
function selecionarExercicio(id) {
  const db = getExerciciosCompletos();
  const ex = db.find(e => String(e.id) === String(id));
  if (!ex) return;
  
  const painel = document.getElementById('painel-add-exercicio');
  if (painel) {
    document.getElementById('exer-sel-nome').textContent = ex.nome;
    document.getElementById('exer-sel-grupo').textContent = ex.grupo;
    document.getElementById('exer-sel-equip').textContent = ex.equip || 'Livre';
    painel.style.display = 'block';
    painel.dataset.exId = id;
    
    // Buscar 1RM do aluno para este exercício no state
    const rmRegs = state.rms.filter(r => String(r.alunoId) === String(currentAlunoId) && String(r.exercicioId) === String(id));
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
  if (!painel) return;
  const exId = painel.dataset.exId;
  const db = getExerciciosCompletos();
  const ex = db.find(e => String(e.id) === String(exId));
  if (!ex) return;
  
  const item = {
    id: Date.now(),
    exId: exId,
    nome: ex.nome,
    grupo: ex.grupo,
    divisao: document.getElementById('presc-divisao')?.value || 'A',
    series: document.getElementById('presc-series')?.value || '',
    reps: document.getElementById('presc-reps')?.value || '',
    carga: document.getElementById('presc-carga')?.value || '',
    pct: document.getElementById('presc-pct-rm')?.value || '',
    tecnica: document.getElementById('presc-tecnica')?.value || 'tradicional',
    descanso: document.getElementById('presc-descanso')?.value || '',
    cadencia: document.getElementById('presc-cadencia')?.value || '',
    video: document.getElementById('presc-video')?.value || ex.video || '',
    obs: document.getElementById('presc-obs-ex')?.value || ''
  };
  
  fichaExercicios.push(item);
  renderFichaTabela();
  painel.style.display = 'none';
  showToast('Exercício adicionado à ficha!', 'success');
  
  // Limpar campos para o próximo
  if (document.getElementById('presc-carga')) document.getElementById('presc-carga').value = '';
  if (document.getElementById('presc-reps')) document.getElementById('presc-reps').value = '';
  if (document.getElementById('presc-pct-rm')) document.getElementById('presc-pct-rm').value = '';
  if (document.getElementById('presc-cadencia')) document.getElementById('presc-cadencia').value = '';
  if (document.getElementById('presc-video')) document.getElementById('presc-video').value = '';
  if (document.getElementById('presc-obs-ex')) document.getElementById('presc-obs-ex').value = '';
}

function focarDivisao(dia) {
  const sel = document.querySelector(`.day-split[data-day="${dia}"]`);
  if (sel && sel.value !== '0') {
    const mainSel = document.getElementById('presc-divisao');
    if (mainSel) {
      mainSel.value = sel.value;
      renderFichaTabela();
    }
  } else {
    showToast(`O dia ${dia} está marcado como descanso ou não possui divisão.`, 'info');
  }
}

function abrirModalNovoExercicio() {
  document.getElementById('modal-novo-exercicio').style.display = 'flex';
}

function salvarNovoExercicioBanco() {
  const idEdicao = document.getElementById('novo-exer-id').value;
  const nome = document.getElementById('novo-exer-nome').value;
  const gruposChecked = Array.from(document.querySelectorAll('input[name="novo-grupo"]:checked')).map(cb => cb.value);
  const equip = document.getElementById('novo-exer-equip').value;
  const video = document.getElementById('novo-exer-video').value;

  if (!nome) { showToast('O nome do exercício é obrigatório!', 'error'); return; }
  if (gruposChecked.length === 0) { showToast('Selecione ao menos um grupo muscular!', 'error'); return; }

  const grupoPrincipal = gruposChecked[0];
  let custom = JSON.parse(localStorage.getItem('exercicios_custom') || '[]');

  if (idEdicao) {
    // Modo Edição
    const idx = custom.findIndex(e => String(e.id) === String(idEdicao));
    if (idx !== -1) {
      custom[idx] = {
        ...custom[idx],
        nome,
        grupo: grupoPrincipal,
        grupos: gruposChecked,
        equip: equip || 'Livre',
        video: video || ''
      };
    }
  } else {
    // Modo Novo
    const novoEx = {
      id: 'custom_' + Date.now(),
      nome,
      grupo: grupoPrincipal,
      grupos: gruposChecked,
      equip: equip || 'Livre',
      nivel: 'Iniciante',
      tipo: 'Força',
      video: video || ''
    };
    custom.push(novoEx);
  }

  localStorage.setItem('exercicios_custom', JSON.stringify(custom));
  
  // Limpar busca e atualizar a lista de exercícios na tela de prescrição
  if (document.getElementById('presc-busca')) document.getElementById('presc-busca').value = '';
  renderListaExercicios();
  
  // Fechar modal e limpar campos
  fecharModalNovoExercicio();
  limparCamposModalNovoExercicio();

  showToast(idEdicao ? '✅ Exercício atualizado com sucesso!' : '✅ Exercício salvo com sucesso!', 'success');
}

function limparCamposModalNovoExercicio() {
  document.getElementById('modal-novo-exer-titulo').textContent = '📝 Cadastrar Exercício';
  document.getElementById('novo-exer-id').value = '';
  document.getElementById('novo-exer-nome').value = '';
  document.getElementById('novo-exer-equip').value = '';
  document.getElementById('novo-exer-video').value = '';
  document.querySelectorAll('input[name="novo-grupo"]').forEach(cb => cb.checked = false);
}

function fecharModalGerenciarBanco() {
  document.getElementById('modal-gerenciar-banco').style.display = 'none';
}

function abrirModalGerenciarBanco() {
  document.getElementById('modal-gerenciar-banco').style.display = 'flex';
  document.getElementById('gerenciar-busca').value = '';
  renderListaGerenciarBanco();
}

function filtrarGerenciarBanco() {
  renderListaGerenciarBanco();
}

function renderListaGerenciarBanco() {
  const container = document.getElementById('gerenciar-lista');
  if (!container) return;
  
  const busca = (document.getElementById('gerenciar-busca')?.value || '').toLowerCase();
  const custom = JSON.parse(localStorage.getItem('exercicios_custom') || '[]');
  
  let lista = custom;
  if (busca) {
    lista = lista.filter(e => e.nome.toLowerCase().includes(busca) || e.grupo.toLowerCase().includes(busca));
  }
  
  if (lista.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: #64748b; padding: 20px;">${busca ? 'Nenhum exercício encontrado.' : 'Nenhum exercício personalizado cadastrado.'}</div>`;
    return;
  }
  
  container.innerHTML = lista.map(e => `
    <div style="display: flex; justify-content: space-between; align-items: center; background: #1a1a1a; padding: 12px; border-radius: 10px; border: 1px solid #333;">
      <div style="flex: 1;">
        <div style="font-weight: 700; color: #fff;">${e.nome}</div>
        <div style="font-size: 0.75rem; color: #94a3b8;">${e.grupo} • ${e.equip || 'Livre'}</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button onclick="editarExercicioGerenciador('${e.id}')" style="background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 5px;" title="Editar">✏️ Editar</button>
        <button onclick="excluirExercicioGerenciador('${e.id}')" style="background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 5px;" title="Excluir">🗑️ Excluir</button>
      </div>
    </div>
  `).join('');
}

function editarExercicioGerenciador(id) {
  fecharModalGerenciarBanco();
  editarExercicioCustom(id);
}

function excluirExercicioGerenciador(id) {
  if (confirm('Tem certeza que deseja excluir este exercício?')) {
    excluirExercicioCustom(id);
    renderListaGerenciarBanco();
  }
}

function fecharModalNovoExercicio() {
  document.getElementById('modal-novo-exercicio').style.display = 'none';
  limparCamposModalNovoExercicio();
}


function moverExercicio(id, direcao) {
  const idx = fichaExercicios.findIndex(e => e.id === id);
  if (idx === -1) return;

  const novaPos = idx + direcao;
  if (novaPos < 0 || novaPos >= fichaExercicios.length) return;

  // Trocar posições
  [fichaExercicios[idx], fichaExercicios[novaPos]] = [fichaExercicios[novaPos], fichaExercicios[idx]];
  
  renderFichaTabela();
}

function renderFichaTabela() {
  const container = document.getElementById('ficha-exercicios-tabela');
  if (!container) return;
  
  const divisaoAtual = document.getElementById('presc-divisao')?.value || 'A';
  const exerciciosFiltrados = fichaExercicios.filter(e => (e.divisao || 'A') === divisaoAtual);

  // Descobrir quais dias da semana usam esta divisão
  const diasVinculados = [];
  document.querySelectorAll('.day-split').forEach(sel => {
    if (sel.value === divisaoAtual) {
      const checkbox = document.querySelector(`input[name="dia-treino"][value="${sel.dataset.day}"]`);
      if (checkbox?.checked) diasVinculados.push(sel.dataset.day.charAt(0).toUpperCase() + sel.dataset.day.slice(1));
    }
  });

  if (fichaExercicios.length === 0) {
    container.innerHTML = '<p class="result-placeholder">Nenhum exercício na ficha.</p>';
    return;
  }
  
  let html = `
    <div style="background: var(--primary); color: white; padding: 12px 15px; border-radius: 8px 8px 0 0; font-weight: 700;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
        <span>TREINO ${divisaoAtual}</span>
        <span style="font-size: 0.75rem; font-weight: 400;">${exerciciosFiltrados.length} exercícios vinculados</span>
      </div>
      <div style="font-size: 0.7rem; font-weight: 400; opacity: 0.9;">
        <strong>Dias Aplicados:</strong> ${diasVinculados.length > 0 ? diasVinculados.join(', ') : 'Nenhum dia marcado para esta divisão'}
      </div>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Exercício</th>
          <th>Séries</th>
          <th>Reps</th>
          <th>Carga</th>
          <th>% 1RM</th>
          <th>Cadência</th>
          <th>Técnica</th>
          <th>Descanso</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  if (exerciciosFiltrados.length === 0) {
    html += `<tr><td colspan="9" style="text-align:center; padding: 2rem; color: #666;">Nenhum exercício adicionado ao Treino ${divisaoAtual} ainda.</td></tr>`;
  } else {
    html += exerciciosFiltrados.map(e => {
      const bgClass = `bg-${e.grupo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
      return `
        <tr>
          <td>
            <div class="badge-grupo ${bgClass}">${e.grupo}</div><br>
            <strong>${e.nome}</strong><br>
            <span style="font-size:0.7rem; color:#666;">${e.obs ? e.obs : ''}</span>
          </td>
          <td>${e.series}</td>
          <td>${e.reps}</td>
          <td>${e.carga} kg</td>
          <td>${e.pct ? e.pct + '%' : '—'}</td>
          <td>${e.cadencia || '—'}</td>
          <td>${e.tecnica ? e.tecnica.charAt(0).toUpperCase() + e.tecnica.slice(1) : 'Tradicional'}</td>
          <td>${e.descanso}s</td>
          <td>
            <div style="display:flex; gap:5px;">
              <button class="btn-secondary" onclick="moverExercicio(${e.id}, -1)" style="padding:2px 6px; font-size:0.7rem;" title="Mover para Cima">↑</button>
              <button class="btn-secondary" onclick="moverExercicio(${e.id}, 1)" style="padding:2px 6px; font-size:0.7rem;" title="Mover para Baixo">↓</button>
              ${e.video ? `<a href="${e.video}" target="_blank" class="btn-secondary" style="padding:2px 6px; font-size:0.7rem; text-decoration:none;">🎥</a>` : ''}
              <button class="btn-del" onclick="removerExercicio(${e.id})">✕</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
  
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

  const historico = state.fichas.filter(f => String(f.alunoId) === String(currentAlunoId));
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
  const ficha = state.fichas.find(f => String(f.alunoId) === String(alunoId) && f.data === data);
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
  
  const diasTreino = Array.from(document.querySelectorAll('input[name="dia-treino"]:checked')).map(cb => cb.value);
  const mapeamentoDias = {};
  document.querySelectorAll('.day-split').forEach(sel => {
    mapeamentoDias[sel.dataset.day] = sel.value;
  });

  const ficha = {
    alunoId: String(currentAlunoId),
    exercicios: fichaExercicios,
    objetivo: document.getElementById('presc-objetivo-pro')?.value || '',
    semana: document.getElementById('presc-semana')?.value || '',
    metaSessoes: parseInt(document.getElementById('presc-meta-sessoes')?.value) || 0,
    sessoesRealizadas: (state.fichas.find(f => String(f.alunoId) === String(currentAlunoId))?.sessoesRealizadas) || 0,
    diasTreino,
    mapeamentoDias,
    data: new Date().toISOString().slice(0, 10)
  };
  
  const idx = state.fichas.findIndex(f => String(f.alunoId) === String(currentAlunoId));
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
  
  const aluno = state.alunos.find(a => String(a.id) === String(currentAlunoId));
  const win = window.open('', '_blank');
  
  // Organizar exercícios por divisão (A, B, C...)
  const divisoes = [...new Set(fichaExercicios.map(e => e.divisao || 'A'))].sort();
  
  let contentHtml = divisoes.map(div => {
    const exs = fichaExercicios.filter(e => (e.divisao || 'A') === div);
    
    // Buscar dias vinculados a esta divisão
    const diasVinculados = [];
    document.querySelectorAll('.day-split').forEach(sel => {
      if (sel.value === div) {
        const checkbox = document.querySelector(`input[name="dia-treino"][value="${sel.dataset.day}"]`);
        if (checkbox?.checked) diasVinculados.push(sel.dataset.day.charAt(0).toUpperCase() + sel.dataset.day.slice(1));
      }
    });

    return `
      <div style="margin-bottom: 30px; page-break-inside: avoid;">
        <div style="background: #1d4ed8; color: white; padding: 12px 15px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; font-size: 1.2rem;">TREINO ${div}</h2>
          <span style="font-size: 0.8rem;">${diasVinculados.join(', ')}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 0;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 0.8rem;">Exercício</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 0.8rem;">Séries</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 0.8rem;">Reps</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 0.8rem;">Carga</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 0.8rem;">% 1RM</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 0.8rem;">Cadência</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 0.8rem;">Descanso</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 0.8rem;">Técnica/Obs</th>
            </tr>
          </thead>
          <tbody>
            ${exs.map(e => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 10px;">
                  <strong style="color: #1d4ed8;">${e.nome}</strong><br>
                  <small style="color: #666;">${e.grupo}</small>
                </td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${e.series}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${e.reps}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${e.carga} kg</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${e.pct ? e.pct + '%' : '—'}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${e.cadencia || '—'}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${e.descanso}s</td>
                <td style="border: 1px solid #ddd; padding: 10px; font-size: 0.75rem;">
                  ${e.tecnica && e.tecnica !== 'tradicional' ? `<strong>${e.tecnica.toUpperCase()}</strong><br>` : ''}
                  ${e.obs || ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  win.document.write(`
    <html><head><title>TREINOFITASM - Ficha de Treino</title>
    <style>
      body{font-family:sans-serif;padding:2rem; color: #1e293b;}
      .header{text-align:center;border-bottom:3px solid #1d4ed8;margin-bottom:2rem; padding-bottom: 1rem;}
      .logo{max-width:180px;margin-bottom:10px;}
      h1{margin: 0; color: #1d4ed8; font-size: 1.8rem;}
      .footer{text-align:center; margin-top:3rem; font-size:0.8rem; color:#64748b; border-top: 1px solid #e2e8f0; padding-top: 1rem;}
    </style>
    </head><body>
    <div class="header">
      <img src="logo.png" class="logo" onerror="this.style.display='none'">
      <h1>TREINOFITASM</h1>
      <p><strong>Ficha de Treino:</strong> ${aluno ? aluno.nome : 'Aluno'}</p>
      <p>Data da Prescrição: ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
    
    ${contentHtml}

    <div class="footer">
      <p>TREINOFITASM - Adriano de Souza - Consultoria Esportiva</p>
      <p>Gere saúde, transforme vidas.</p>
    </div>
    </body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

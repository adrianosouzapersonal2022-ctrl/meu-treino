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

/**
 * Retorna uma URL de GIF baseada no nome do exercício ou grupo muscular
 * URLs atualizadas para maior estabilidade e fallback robusto
 */
function getGifExercicio(exer) {
  // Se o professor inseriu um link manual que não seja do giphy (que costuma dar erro de hotlink)
  if (exer.video && (exer.video.includes('.gif') || exer.video.includes('tenor.com')) && !exer.video.includes('giphy.com')) {
    return exer.video;
  }
  
  const nome = (exer.nome || '').toLowerCase();
  const grupo = (exer.grupo || '').toLowerCase();
  
  // Mapeamento de GIFs de fontes mais estáveis (FitnessProgramer ou placeholders educativos)
  const GIFS_GRUPO = {
    'peito': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-BENCH-PRESS.gif',
    'costas': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/LAT-PULLDOWN.gif',
    'ombros': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/DUMBBELL-LATERAL-RAISE.gif',
    'pernas': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-SQUAT.gif',
    'coxa': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-SQUAT.gif',
    'gluteos': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/HIP-THRUST.gif',
    'gluteo': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/HIP-THRUST.gif',
    'biceps': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-CURL.gif',
    'triceps': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/PULLDOWN.gif',
    'abdomen': 'https://fitnessprogramer.com/wp-content/uploads/2021/02/CRUNCH.gif',
  };

  // Tenta encontrar por palavras-chave no nome
  if (nome.includes('supino')) return 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-BENCH-PRESS.gif';
  if (nome.includes('agachamento')) return 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-SQUAT.gif';
  if (nome.includes('rosca')) return 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-CURL.gif';
  if (nome.includes('puxada')) return 'https://fitnessprogramer.com/wp-content/uploads/2021/02/LAT-PULLDOWN.gif';
  if (nome.includes('leg press')) return 'https://fitnessprogramer.com/wp-content/uploads/2021/02/LEG-PRESS.gif';

  return GIFS_GRUPO[grupo] || 'https://via.placeholder.com/400x300/f1f5f9/64748b?text=Visualização+ASM';
}

/**
 * Calcula a carga baseada no 1RM e preenche repetições sugeridas
 */
function calcularCarga1RM() {
  const carga1RM = parseFloat(document.getElementById('presc-ex-1rm-max')?.value || 0);
  const pct = parseFloat(document.getElementById('presc-ex-pct-1rm')?.value || 0);
  const displayCarga = document.getElementById('presc-ex-carga-calculada');
  const repsInput = document.getElementById('presc-ex-reps');

  // Mapeamento de repetições sugeridas por % do 1RM
  const REPS_SUGERIDAS = {
    100: "1",
    95: "2",
    90: "3",
    85: "5",
    80: "6",
    75: "8",
    70: "10",
    65: "12",
    60: "15",
    55: "20",
    50: "25"
  };

  if (carga1RM > 0 && pct > 0) {
    const final = Math.round(carga1RM * (pct / 100));
    
    if (displayCarga) {
      displayCarga.innerHTML = `Carga Final: <strong style="color: #2563eb;">${final} kg</strong>`;
      
      // Preencher o campo de carga padrão automaticamente
      const cargaInput = document.getElementById('presc-ex-carga');
      if (cargaInput) cargaInput.value = final;
      
      // Preencher repetições sugeridas se o campo estiver vazio
      if (repsInput && REPS_SUGERIDAS[pct]) {
        repsInput.value = REPS_SUGERIDAS[pct];
      }
    }
    return final;
  } else {
    if (displayCarga) displayCarga.innerHTML = '';
    return 0;
  }
}

/**
 * Sugere o grupo muscular automaticamente ao digitar o nome do exercício
 */
function sugerirGrupoMuscular() {
  const nome = document.getElementById('novo-exer-nome').value.toLowerCase();
  const checkboxes = document.querySelectorAll('input[name="novo-grupo"]');
  
  const MAP_SUGESTAO = {
    'peito': ['supino', 'crucifixo', 'voador', 'flexão', 'chest', 'pec'],
    'costas': ['puxada', 'remada', 'barra fixa', 'serrote', 'terra', 'pulldown', 'lat'],
    'ombros': ['desenvolvimento', 'elevação lateral', 'frontal', 'arnold', 'shoulder'],
    'biceps': ['rosca', 'biceps', 'curl'],
    'triceps': ['triceps', 'testa', 'pulley', 'coice'],
    'coxa': ['agachamento', 'leg press', 'extensora', 'flexora', 'stiff', 'afundo', 'passada'],
    'gluteo': ['gluteo', 'pélvica', 'abdução', 'kickback'],
    'abdomen': ['abdominal', 'prancha', 'crunch', 'infra']
  };

  checkboxes.forEach(cb => cb.checked = false); // Limpa

  for (let grupo in MAP_SUGESTAO) {
    if (MAP_SUGESTAO[grupo].some(keyword => nome.includes(keyword))) {
      const target = Array.from(checkboxes).find(cb => cb.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(grupo));
      if (target) {
        target.checked = true;
        // Atualizar visualização de GIF se houver
        atualizarPreviaGifModal();
      }
    }
  }
}

function atualizarPreviaGifModal() {
  const nome = document.getElementById('novo-exer-nome').value;
  const grupos = Array.from(document.querySelectorAll('input[name="novo-grupo"]:checked')).map(cb => cb.value);
  const videoManual = document.getElementById('novo-exer-video').value;
  const previa = document.getElementById('previa-gif-modal');
  
  if (!previa) return;

  const exerMock = { nome, grupo: grupos[0] || '', video: videoManual };
  const url = getGifExercicio(exerMock);
  
  previa.innerHTML = `
    <div style="width: 100%; height: 180px; background: #1a1a1a; border-radius: 10px; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 1px solid #333;">
      <img src="${url}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.src='https://via.placeholder.com/400x300/1a1a1a/ffffff?text=ASM+Fitness'">
    </div>
    <p style="font-size: 0.7rem; color: #94a3b8; margin-top: 5px; text-align: center;">Visualização baseada no nome e grupo muscular</p>
  `;
}

function renderListaExercicios() {
  const container = document.getElementById('presc-lista-exercicios');
  if (!container) return;
  
  const buscaRaw = (document.getElementById('presc-busca')?.value || '').trim();
  const busca = buscaRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const gruposChecked = Array.from(document.querySelectorAll('input[name="grupo-filter"]:checked')).map(cb => cb.value);
  
  let lista = getExerciciosCompletos(); 
  
  if (busca) {
    lista = lista.filter(e => {
      const nomeNorm = e.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const grupoNorm = e.grupo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const equipNorm = (e.equip || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return nomeNorm.includes(busca) || grupoNorm.includes(busca) || equipNorm.includes(busca);
    });
  }

  if (gruposChecked.length > 0) {
    lista = lista.filter(e => gruposChecked.includes(e.grupo));
  }

  if (lista.length === 0) {
    container.innerHTML = '<p class="result-placeholder">Nenhum exercício encontrado.</p>';
    return;
  }

  container.innerHTML = lista.map(e => {
    const bgClass = `bg-${e.grupo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
    const gifUrl = getGifExercicio(e);
    
    return `
      <div class="exer-item" onclick="selecionarExercicio('${e.id}')">
        <div class="exer-media">
          <img src="${gifUrl}" alt="${e.nome}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300/f1f5f9/64748b?text=Erro+Imagem'">
          <div class="nivel-badge nivel-${e.nivel.toLowerCase().replace('ç', 'c')}">${e.nivel}</div>
        </div>
        <div class="exer-info">
          <span class="badge-grupo ${bgClass}">${e.grupo}</span>
          <div class="exer-nome">${e.nome}</div>
          <div class="exer-meta">
            <span>⚙️ ${e.equip || 'Livre'}</span>
            <span>⚡ ${e.tipo}</span>
          </div>
        </div>
      </div>
    `;
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
    // Resetar o botão para o modo "Adicionar" caso estivesse em modo "Edição"
    const btnAdd = painel.querySelector('.btn-primary');
    if (btnAdd) {
      btnAdd.textContent = 'Adicionar à Ficha';
      btnAdd.setAttribute('onclick', 'adicionarExercicio()');
    }

    document.getElementById('exer-sel-nome').textContent = ex.nome;
    document.getElementById('exer-sel-grupo').textContent = ex.grupo;
    document.getElementById('exer-sel-equip').textContent = ex.equip || 'Livre';
    painel.style.display = 'block';
    painel.dataset.exId = id;
    
    // Limpar campos de entrada para novo exercício
    if (document.getElementById('presc-ex-carga')) document.getElementById('presc-ex-carga').value = '';
    if (document.getElementById('presc-ex-reps')) document.getElementById('presc-ex-reps').value = '';
    if (document.getElementById('presc-ex-1rm-max')) document.getElementById('presc-ex-1rm-max').value = '';
    if (document.getElementById('presc-ex-pct-1rm')) document.getElementById('presc-ex-pct-1rm').value = '';
    if (document.getElementById('presc-cadencia')) document.getElementById('presc-cadencia').value = '';
    if (document.getElementById('presc-video')) document.getElementById('presc-video').value = ex.video || '';
    if (document.getElementById('presc-obs-ex')) document.getElementById('presc-obs-ex').value = '';
    if (document.getElementById('presc-ex-carga-calculada')) document.getElementById('presc-ex-carga-calculada').innerHTML = '';
    
    // Buscar 1RM do aluno para este exercício no state
    const rmRegs = (state.rms || []).filter(r => String(r.alunoId) === String(currentAlunoId) && String(r.exercicioId) === String(id));
    const ref = document.getElementById('rm-referencia');
    if (ref) {
      if (rmRegs.length > 0) {
        const ultimoRM = rmRegs[rmRegs.length - 1].rm;
        ref.textContent = `Último 1RM registrado: ${ultimoRM.toFixed(1)} kg`;
        ref.dataset.rm = ultimoRM;
        // Sugerir este valor como 1RM Máximo inicial
        if (document.getElementById('presc-ex-1rm-max')) document.getElementById('presc-ex-1rm-max').value = ultimoRM;
      } else {
        ref.textContent = 'Sem 1RM registrado para este exercício.';
        ref.dataset.rm = '';
      }
    }
    
    painel.scrollIntoView({ behavior:'smooth' });
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
    series: document.getElementById('presc-ex-series')?.value || '4',
    reps: document.getElementById('presc-ex-reps')?.value || '',
    carga: document.getElementById('presc-ex-carga')?.value || '',
    carga1RM: document.getElementById('presc-ex-1rm-max')?.value || '',
    perc1RM: document.getElementById('presc-ex-pct-1rm')?.value || '',
    tecnica: document.getElementById('presc-tecnica')?.value || 'tradicional',
    descanso: document.getElementById('presc-ex-descanso')?.value || '',
    cadencia: document.getElementById('presc-cadencia')?.value || '',
    video: document.getElementById('presc-video')?.value || ex.video || '',
    obs: document.getElementById('presc-obs-ex')?.value || ''
  };
  
  fichaExercicios.push(item);
  renderFichaTabela();
  painel.style.display = 'none';
  showToast('Exercício adicionado à ficha!', 'success');
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
  const modal = document.getElementById('modal-novo-exercicio');
  if (modal) {
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.zIndex = '9999';
    limparCamposModalNovoExercicio();
    
    const buscaPrincipal = document.getElementById('presc-busca');
    if (buscaPrincipal && buscaPrincipal.value.trim().length > 0) {
      const nomeField = document.getElementById('novo-exer-nome');
      if (nomeField) nomeField.value = buscaPrincipal.value.trim();
    }
  }
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
  
  // Atualizar também a lista na aba de testes 1RM
  if (typeof populateRMExercises === 'function') populateRMExercises();
  
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
  const modal = document.getElementById('modal-gerenciar-banco');
  if (modal) {
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.zIndex = '9998';
    const buscaInput = document.getElementById('gerenciar-busca');
    if (buscaInput) buscaInput.value = '';
    renderListaGerenciarBanco();
  }
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
  
  container.innerHTML = lista.map(e => {
    const cor = typeof getCorGrupo === 'function' ? getCorGrupo(e.grupo) : '#333';
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 12px; border-radius: 10px; border: 1px solid #cbd5e1; border-left: 5px solid ${cor};">
        <div style="flex: 1;">
          <div style="font-weight: 700; color: #1e293b;">${e.nome}</div>
          <div style="font-size: 0.75rem; color: #64748b;">${e.grupo} • ${e.equip || 'Livre'}</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="editarExercicioGerenciador('${e.id}')" style="background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 5px;" title="Editar">✏️ Editar</button>
          <button onclick="excluirExercicioGerenciador('${e.id}')" style="background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 5px;" title="Excluir">🗑️ Excluir</button>
        </div>
      </div>
    `;
  }).join('');
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
  const modal = document.getElementById('modal-novo-exercicio');
  if (modal) modal.style.setProperty('display', 'none', 'important');
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

function getCorGrupo(grupo) {
  const g = String(grupo).toLowerCase();
  if (g.includes('ombro')) return '#f59e0b';
  if (g.includes('peito')) return '#ef4444';
  if (g.includes('costa')) return '#3b82f6';
  if (g.includes('biceps')) return '#8b5cf6';
  if (g.includes('triceps')) return '#ec4899';
  if (g.includes('coxa') || g.includes('perna')) return '#10b981';
  if (g.includes('gluteo')) return '#6366f1';
  if (g.includes('abdomen')) return '#64748b';
  return '#333';
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
        <div style="display: flex; align-items: center; gap: 10px;">
          <span>TREINO ${divisaoAtual}</span>
          <button onclick="editarPlanilhaTreino('${divisaoAtual}')" style="background: white; color: var(--primary); border: none; padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            ✏️ EDITAR PLANILHA ${divisaoAtual}
          </button>
        </div>
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
      
      // Cálculo de carga exibida se houver 1RM
      let cargaDisplay = `${e.carga || 0} kg`;
      if (e.perc1RM && e.perc1RM > 0 && e.carga1RM && e.carga1RM > 0) {
        const cargaCalc = Math.round(e.carga1RM * (e.perc1RM / 100));
        cargaDisplay = `<strong>${cargaCalc} kg</strong><br><span style="font-size:0.6rem; color:#2563eb;">(${e.perc1RM}% de ${e.carga1RM}kg)</span>`;
      }

      return `
        <tr>
          <td>
            <div class="badge-grupo ${bgClass}">${e.grupo}</div><br>
            <strong>${e.nome}</strong><br>
            <span style="font-size:0.7rem; color:#666;">${e.obs ? e.obs : ''}</span>
          </td>
          <td>${e.series}</td>
          <td>${e.reps}</td>
          <td>${cargaDisplay}</td>
          <td>${e.perc1RM ? e.perc1RM + '%' : '—'}</td>
          <td>${e.cadencia || '—'}</td>
          <td>${e.tecnica ? e.tecnica.charAt(0).toUpperCase() + e.tecnica.slice(1) : 'Tradicional'}</td>
          <td>${e.descanso}s</td>
          <td>
            <div style="display:flex; gap:5px;">
              <button class="btn-secondary" onclick="carregarDadosEdicaoExercicio(${e.id})" style="padding:2px 6px; font-size:0.7rem; background:#3b82f6; color:white; border:none;" title="Editar Exercício">✏️</button>
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
  
  // Adicionar botão de edição de exercício (não apenas remoção)
  if (exerciciosFiltrados.length > 0) {
    html += `
      <div style="margin-top: 15px; padding: 15px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center;">
        <p style="font-size: 0.8rem; color: #64748b; margin-bottom: 10px;">Clique no ícone de lápis ✏️ para editar detalhes de um exercício já adicionado.</p>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

function carregarDadosEdicaoExercicio(id) {
  const ex = fichaExercicios.find(e => e.id === id);
  if (!ex) return;

  const painel = document.getElementById('painel-add-exercicio');
  if (!painel) return;

  // Preencher os campos do painel com os dados do exercício
  document.getElementById('exer-sel-nome').textContent = ex.nome;
  document.getElementById('exer-sel-grupo').textContent = ex.grupo;
  document.getElementById('exer-sel-equip').textContent = ex.equip || 'Livre';
  
  if (document.getElementById('presc-ex-series')) document.getElementById('presc-ex-series').value = ex.series || '';
  if (document.getElementById('presc-ex-reps')) document.getElementById('presc-ex-reps').value = ex.reps || '';
  if (document.getElementById('presc-ex-carga')) document.getElementById('presc-ex-carga').value = ex.carga || '';
  if (document.getElementById('presc-ex-1rm-max')) document.getElementById('presc-ex-1rm-max').value = ex.carga1RM || '';
  if (document.getElementById('presc-ex-pct-1rm')) document.getElementById('presc-ex-pct-1rm').value = ex.perc1RM || '';
  
  document.getElementById('presc-tecnica').value = ex.tecnica || 'tradicional';
  if (document.getElementById('presc-ex-descanso')) document.getElementById('presc-ex-descanso').value = ex.descanso || '';
  document.getElementById('presc-cadencia').value = ex.cadencia || '';
  document.getElementById('presc-video').value = ex.video || '';
  document.getElementById('presc-obs-ex').value = ex.obs || '';
  
  // Calcular carga exibida se houver 1RM
  calcularCarga1RM();

  // Buscar 1RM do aluno para este exercício para referência
  const rmRegs = (state.rms || []).filter(r => String(r.alunoId) === String(currentAlunoId) && String(r.exercicioId) === String(ex.exId));
  const ref = document.getElementById('rm-referencia');
  if (ref) {
    if (rmRegs.length > 0) {
      const ultimoRM = rmRegs[rmRegs.length - 1].rm;
      ref.textContent = `Último 1RM registrado: ${ultimoRM.toFixed(1)} kg`;
      ref.dataset.rm = ultimoRM;
    } else {
      ref.textContent = 'Sem 1RM registrado para este exercício.';
      ref.dataset.rm = '';
    }
  }

  // Mostrar info da técnica se houver
  if (typeof mostrarInfoTecnica === 'function') mostrarInfoTecnica();
  
  // Alterar o comportamento do botão "Adicionar" para "Atualizar" temporariamente
  const btnAdd = painel.querySelector('.btn-primary');
  const originalOnClick = btnAdd.getAttribute('onclick');
  const originalText = btnAdd.textContent;

  btnAdd.textContent = '💾 Atualizar Exercício';
  btnAdd.setAttribute('onclick', `atualizarExercicioFicha(${id}, '${originalOnClick.replace(/'/g, "\\'")}', '${originalText}')`);

  painel.style.display = 'block';
  painel.scrollIntoView({ behavior: 'smooth' });
}

function atualizarExercicioFicha(id, originalOnClick, originalText) {
  const idx = fichaExercicios.findIndex(e => e.id === id);
  if (idx === -1) return;

  // Capturar os novos valores
  fichaExercicios[idx].series = document.getElementById('presc-ex-series')?.value || '';
  fichaExercicios[idx].reps = document.getElementById('presc-ex-reps')?.value || '';
  fichaExercicios[idx].carga = document.getElementById('presc-ex-carga')?.value || '';
  fichaExercicios[idx].carga1RM = document.getElementById('presc-ex-1rm-max')?.value || '';
  fichaExercicios[idx].perc1RM = document.getElementById('presc-ex-pct-1rm')?.value || '';
  
  fichaExercicios[idx].tecnica = document.getElementById('presc-tecnica').value;
  fichaExercicios[idx].descanso = document.getElementById('presc-ex-descanso')?.value || '';
  fichaExercicios[idx].cadencia = document.getElementById('presc-cadencia').value;
  fichaExercicios[idx].video = document.getElementById('presc-video').value;
  fichaExercicios[idx].obs = document.getElementById('presc-obs-ex').value;

  // Restaurar o botão original
  const btnAdd = document.querySelector('#painel-add-exercicio .btn-primary');
  btnAdd.textContent = originalText;
  btnAdd.setAttribute('onclick', originalOnClick);

  document.getElementById('painel-add-exercicio').style.display = 'none';
  renderFichaTabela();
  showToast('✅ Exercício atualizado na ficha!', 'success');
}

function removerExercicio(id) {
  fichaExercicios = fichaExercicios.filter(e => e.id !== id);
  renderFichaTabela();
}

function editarPlanilhaTreino(divisao) {
  const container = document.getElementById('ficha-exercicios-tabela');
  if (!container) return;

  const exerciciosDaDivisao = fichaExercicios.filter(e => (e.divisao || 'A') === divisao);

  if (exerciciosDaDivisao.length === 0) {
    showToast(`Não há exercícios no Treino ${divisao} para editar.`, 'warning');
    return;
  }

  let html = `
    <div style="background: #1e293b; color: white; padding: 15px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin:0; font-size: 1rem;">📝 Editando Planilha: Treino ${divisao}</h3>
      <button onclick="renderFichaTabela()" style="background: #ef4444; color: white; border: none; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 700;">CANCELAR</button>
    </div>
    <div style="background: white; border: 1px solid #e2e8f0; border-top: none; padding: 15px; border-radius: 0 0 8px 8px;">
      <table class="data-table" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 10px; text-align: left; font-size: 0.8rem;">Exercício</th>
            <th style="padding: 10px; text-align: center; font-size: 0.8rem;">Séries</th>
            <th style="padding: 10px; text-align: center; font-size: 0.8rem;">Reps</th>
            <th style="padding: 10px; text-align: center; font-size: 0.8rem;">Carga (kg)</th>
            <th style="padding: 10px; text-align: center; font-size: 0.8rem;">Descanso (s)</th>
            <th style="padding: 10px; text-align: left; font-size: 0.8rem;">Observação</th>
          </tr>
        </thead>
        <tbody>
  `;

  exerciciosDaDivisao.forEach(e => {
    html += `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px; font-weight: 600; font-size: 0.9rem; color: #1e3a8a;">${e.nome}</td>
        <td style="padding: 10px; text-align: center;">
          <input type="text" value="${e.series}" onchange="atualizarCampoPlanilha(${e.id}, 'series', this.value)" style="width: 50px; text-align: center; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px;">
        </td>
        <td style="padding: 10px; text-align: center;">
          <input type="text" value="${e.reps}" onchange="atualizarCampoPlanilha(${e.id}, 'reps', this.value)" style="width: 70px; text-align: center; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px;">
        </td>
        <td style="padding: 10px; text-align: center;">
          <input type="text" value="${e.carga}" onchange="atualizarCampoPlanilha(${e.id}, 'carga', this.value)" style="width: 60px; text-align: center; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px;">
        </td>
        <td style="padding: 10px; text-align: center;">
          <input type="number" value="${e.descanso}" onchange="atualizarCampoPlanilha(${e.id}, 'descanso', this.value)" style="width: 60px; text-align: center; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px;">
        </td>
        <td style="padding: 10px;">
          <input type="text" value="${e.obs || ''}" onchange="atualizarCampoPlanilha(${e.id}, 'obs', this.value)" style="width: 100%; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px;" placeholder="Ex: Foco no pico...">
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
      <div style="margin-top: 20px; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        <button onclick="renderFichaTabela()" class="btn-primary" style="background: #16a34a; font-weight: 800; padding: 10px 25px;">CONCLUIR EDIÇÃO DA PLANILHA ${divisao}</button>
      </div>
    </div>
  `;

  container.innerHTML = html;
  container.scrollIntoView({ behavior: 'smooth' });
}

function atualizarCampoPlanilha(id, campo, valor) {
  const idx = fichaExercicios.findIndex(e => e.id === id);
  if (idx !== -1) {
    fichaExercicios[idx][campo] = valor;
    showToast('Alteração salva na planilha!', 'info');
  }
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
  if (!currentAlunoId) { 
    alert('⚠️ Erro: Selecione um aluno primeiro para salvar o treino.');
    showToast('Selecione um aluno primeiro', 'error'); 
    return; 
  }
  
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
  
  // Garantir que estamos atualizando o state global corretamente
  const idx = state.fichas.findIndex(f => String(f.alunoId) === String(currentAlunoId));
  if (idx >= 0) {
    state.fichas[idx] = ficha;
  } else {
    state.fichas.push(ficha);
  }
  
  // Forçar salvamento imediato e redundante para garantir persistência
  saveState();
  localStorage.setItem('fichas', JSON.stringify(state.fichas));
  
  alert('✅ SUCESSO!\nO treino foi cadastrado e salvo no banco de dados.\nO aluno já pode visualizar no app dele.');
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

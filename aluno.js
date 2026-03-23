// ============================================================
// aluno.js – Lógica do App Mobile do Aluno (TREINOFITASM)
// ============================================================

let alunoLogado = null;
let chartAlunoComp = null;
let divisaoAtiva = 'A'; // Divisão padrão
let divisaoSelecionadaManualmente = false;

// PWA Install Logic para o Aluno
let deferredPromptAluno;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPromptAluno = e;
  const banner = document.getElementById('pwa-banner-aluno');
  if (banner) {
    banner.style.display = 'block';
    // Se o botão de instalar sumiu (porque já instalou ou algo assim), garantir que o texto do banner ajude
    document.getElementById('btn-pwa-install-aluno').style.display = 'block';
    document.getElementById('ios-install-hint').style.display = 'none';
  }
});

// Lógica especial para iOS (onde o beforeinstallprompt não existe)
window.addEventListener('load', () => {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  
  if (isIos && !isStandalone) {
    const banner = document.getElementById('pwa-banner-aluno');
    const installBtn = document.getElementById('btn-pwa-install-aluno');
    const iosHint = document.getElementById('ios-install-hint');
    
    if (banner) {
      banner.style.display = 'block';
      if (installBtn) installBtn.style.display = 'none';
      if (iosHint) iosHint.style.display = 'block';
    }
  }
});

document.getElementById('btn-pwa-install-aluno')?.addEventListener('click', async () => {
  if (deferredPromptAluno) {
    deferredPromptAluno.prompt();
    const { outcome } = await deferredPromptAluno.userChoice;
    console.log('User choice:', outcome);
    if (outcome === 'accepted') {
      const banner = document.getElementById('pwa-banner-aluno');
      if (banner) banner.style.display = 'none';
      toast('App instalado com sucesso! Verifique sua tela de início.', 'success');
    }
    deferredPromptAluno = null;
  } else {
    // Se o prompt não estiver disponível, pode ser que já esteja instalado ou o navegador não suporte
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      toast('O app já está instalado!', 'info');
      document.getElementById('pwa-banner-aluno').style.display = 'none';
    } else {
      toast('Siga as instruções para instalar no seu dispositivo.', 'info');
    }
  }
});

// Detectar quando o app foi instalado
window.addEventListener('appinstalled', (evt) => {
  console.log('App instalado!');
  const banner = document.getElementById('pwa-banner-aluno');
  if (banner) banner.style.display = 'none';
  toast('App instalado! Atalho criado na tela inicial.', 'success');
});

// ===== TOAST =====
function toast(msg, type = '') {
  const t = document.getElementById('toast-aluno');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast-aluno show ' + type;
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== LOGIN =====
function fazerLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const senha = document.getElementById('login-senha').value;
  const error = document.getElementById('login-erro');

  if (!email || !senha) {
    error.style.display = 'block';
    error.textContent = 'Informe e-mail e senha.';
    return;
  }
  
  const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
  const aluno = alunos.find(a => (a.email && a.email.toLowerCase() === email) && (String(a.senha) === String(senha)));
  
  if (!aluno) {
    error.style.display = 'block';
    error.textContent = 'E-mail ou senha incorretos.';
    return;
  }
  
  alunoLogado = aluno;
  localStorage.setItem('alunoLogadoId', aluno.id);
  entrarNoApp();
}

function entrarNoApp() {
  divisaoSelecionadaManualmente = false; // Resetar seleção automática ao entrar
  document.getElementById('screen-login').style.display = 'none';
  if (document.getElementById('screen-cadastro-online')) document.getElementById('screen-cadastro-online').style.display = 'none';
  document.getElementById('screen-app').style.display = 'block';
  
  const nome = alunoLogado.nome || 'Aluno';
  document.getElementById('header-nome').textContent = nome;
  document.getElementById('av-inicial').textContent = nome.charAt(0).toUpperCase();
  document.getElementById('header-sub').textContent = 'Seu treino está pronto!';
  
  // Mensagem de Acesso Liberado
  toast('✅ Acesso liberado com sucesso! Verifique seu treino.', 'success');
  
  // Verificar Acesso (Pagamento) e esconder aba se for gratuito
  verificarAcesso();

  // ABA PRINCIPAL AGORA É TREINO
  showTab('treino');

  carregarInicio();
  carregarTreino();
  carregarAvaliacao();
  carregarPerfil();
  carregarHistoricoPagamentos();
}

function abrirModalEsqueciSenha() {
  document.getElementById('modal-esqueci-senha').style.display = 'flex';
}

function fecharModalEsqueciSenha() {
  document.getElementById('modal-esqueci-senha').style.display = 'none';
  document.getElementById('reset-email').value = '';
  document.getElementById('reset-senha-nova').value = '';
  document.getElementById('reset-erro').style.display = 'none';
}

function processarRecuperarSenha() {
  const email = document.getElementById('reset-email').value.trim().toLowerCase();
  const novaSenha = document.getElementById('reset-senha-nova').value;
  const erro = document.getElementById('reset-erro');

  if (!email || !novaSenha) {
    erro.textContent = 'Informe e-mail e a nova senha.';
    erro.style.display = 'block';
    return;
  }

  if (novaSenha.length < 6) {
    erro.textContent = 'A nova senha deve ter pelo menos 6 caracteres.';
    erro.style.display = 'block';
    return;
  }

  const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
  const idx = alunos.findIndex(a => a.email && a.email.toLowerCase() === email);

  if (idx === -1) {
    erro.textContent = 'E-mail não encontrado no sistema.';
    erro.style.display = 'block';
    return;
  }

  // Atualizar senha
  alunos[idx].senha = novaSenha;
  localStorage.setItem('alunos', JSON.stringify(alunos));

  toast('✅ Senha alterada com sucesso! Faça login.', 'success');
  fecharModalEsqueciSenha();
}

function verificarAcesso() {
  // ACESSO TOTAL LIBERADO PARA TODOS OS ALUNOS
  // Removemos as verificações de bloqueio para garantir acesso imediato
  const bnavPagamento = document.getElementById('bnav-pagamento');
  if (bnavPagamento) {
    bnavPagamento.style.display = 'none';
  }
}

// ===== CADASTRO ONLINE =====
function showOnlineRegistration() {
  document.getElementById('screen-login').style.display = 'none';
  document.getElementById('screen-cadastro-online').style.display = 'block';
}

function voltarLogin() {
  document.getElementById('screen-cadastro-online').style.display = 'none';
  document.getElementById('screen-login').style.display = 'block';
}

function realizarCadastroOnline() {
  const nome = document.getElementById('reg-nome').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const senha = document.getElementById('reg-senha').value;
  const dataNasc = document.getElementById('reg-dataNasc').value;
  const sexo = document.getElementById('reg-sexo').value;
  const telefone = document.getElementById('reg-telefone').value;
  const objetivo = document.getElementById('reg-objetivo').value;

  if (!nome || !email || !senha || !dataNasc || !sexo || !telefone) {
    const erro = document.getElementById('reg-erro');
    erro.style.display = 'block';
    erro.textContent = 'Preencha todos os campos obrigatórios (*).';
    return;
  }

  if (senha.length < 6) {
    const erro = document.getElementById('reg-erro');
    erro.style.display = 'block';
    erro.textContent = 'A senha deve ter pelo menos 6 caracteres.';
    return;
  }

  const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
  
  // Verificar se e-mail já existe
  const alunoExistenteIdx = alunos.findIndex(a => a.email === email);
  
  if (alunoExistenteIdx !== -1) {
    const alunoExistente = alunos[alunoExistenteIdx];
    
    // Se o aluno já existia (criado pelo professor), vamos apenas atualizar os dados e a senha
    // Isso garante que ele mantenha o mesmo ID e, consequentemente, os mesmos treinos/testes
    alunos[alunoExistenteIdx] = {
      ...alunoExistente,
      nome,
      senha,
      dataNasc,
      sexo,
      telefone,
      objetivo,
      idade: calcularIdade(dataNasc),
      origem: 'online'
      // Mantemos o ID original e o tipo (gratuito/pago) definido pelo professor
    };
    
    localStorage.setItem('alunos', JSON.stringify(alunos));
    toast('Cadastro vinculado ao registro do seu professor! Agora faça login.', 'success');
    voltarLogin();
    return;
  }

  const novoAluno = {
    id: Date.now(),
    nome,
    email,
    senha,
    dataNasc,
    sexo,
    telefone,
    objetivo,
    idade: calcularIdade(dataNasc),
    origem: 'online',
    tipo: 'gratuito' // Padrão agora é gratuito conforme solicitado
  };

  alunos.push(novoAluno);
  localStorage.setItem('alunos', JSON.stringify(alunos));
  
  toast('Cadastro realizado! Agora faça login.', 'success');
  voltarLogin();
}

function calcularIdade(dn) {
  const hoje = new Date();
  const nasc = new Date(dn);
  let age = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) age--;
  return age;
}

function fazerLogout() {
  alunoLogado = null;
  localStorage.removeItem('alunoLogadoId');
  document.getElementById('screen-app').style.display = 'none';
  document.getElementById('screen-login').style.display = 'block';
}

// ===== NAVEGAÇÃO ABAS =====
function showTab(tab) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
  
  const targetTab = document.getElementById('tab-' + tab);
  const targetBtn = document.getElementById('bnav-' + tab);
  
  if (targetTab) targetTab.classList.add('active');
  if (targetBtn) targetBtn.classList.add('active');

  // Ao mudar de aba, sempre recarregar os dados para garantir que pegamos as atualizações do professor
  if (tab === 'inicio') carregarInicio();
  if (tab === 'treino') carregarTreino();
  if (tab === 'avaliacao') carregarAvaliacao();
  if (tab === 'perfil') carregarPerfil();
  if (tab === 'pagamento') carregarHistoricoPagamentos();
}

// ===== CARREGAR DADOS =====
function carregarInicio() {
  const a = alunoLogado;
  
  // Garantir que a mensagem de instalação apareça como prioridade
  const pwaBanner = document.getElementById('pwa-banner-aluno');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (pwaBanner && !isStandalone) {
    pwaBanner.style.display = 'block';
  }

  // Recarregar dados do aluno do localStorage para garantir que pegamos mudanças de gratuidade
  const todosAlunos = JSON.parse(localStorage.getItem('alunos') || '[]');
  const alunoAtualizado = todosAlunos.find(x => String(x.id) === String(a.id));
  if (alunoAtualizado) {
    alunoLogado = alunoAtualizado;
    verificarAcesso(); // Re-validar acesso com dados novos
  }

  const avs = JSON.parse(localStorage.getItem('avaliacoes') || '[]').filter(x => String(x.alunoId) === String(a.id));
  const lastAv = avs[avs.length - 1];

  // Verificar se já tem anamnese
  const anamneses = JSON.parse(localStorage.getItem('anamneses') || '[]');
  const jaTemAnamnese = anamneses.some(an => String(an.alunoId) === String(a.id));
  document.getElementById('anamnese-pendente-alert').style.display = jaTemAnamnese ? 'none' : 'block';

  document.getElementById('resumo-grid').innerHTML = `
    <div class="resumo-item"><div class="resumo-label">Peso</div><div class="resumo-valor">${a.peso || (lastAv ? lastAv.peso : '—')}</div><div class="resumo-unit">kg</div></div>
    <div class="resumo-item"><div class="resumo-label">% Gordura</div><div class="resumo-valor">${lastAv ? lastAv.percGordura : '—'}</div></div>
  `;

  document.getElementById('resumo-objetivo').textContent = a.objetivo || 'Foco no Treino';

  const todasFichas = JSON.parse(localStorage.getItem('fichas') || '[]');
  const ficha = todasFichas.find(f => String(f.alunoId) === String(a.id));
  const prox = document.getElementById('proximo-treino');

  if (ficha && ficha.exercicios && ficha.exercicios.length > 0) {
    // Alerta de vencimento de treino para o aluno
    const sAtuais = ficha.sessoesRealizadas || 0;
    const sMeta = ficha.metaSessoes || 0;
    const alertAluno = document.getElementById('alerta-treino-vencido-aluno');
    const msgAluno = document.getElementById('msg-treino-vencido-aluno');

    if (alertAluno && msgAluno && sMeta > 0) {
      if (sAtuais >= sMeta) {
        msgAluno.innerHTML = `⚠️ <strong>Seu treino venceu!</strong> Você completou as ${sMeta} sessões planejadas. Fale com seu professor para atualizar sua ficha.`;
        alertAluno.style.display = 'block';
      } else if (sAtuais >= (sMeta * 0.8)) {
        msgAluno.innerHTML = `🔔 <strong>Faltam poucas sessões!</strong> Você já realizou ${sAtuais} de ${sMeta} sessões deste treino.`;
        alertAluno.style.display = 'block';
      } else {
        alertAluno.style.display = 'none';
      }
    }

    // Identificar o treino sugerido (hoje ou o primeiro disponível)
    const diasSemanaFim = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    const hojeIdx = (new Date().getDay() + 6) % 7; // Ajustar para 0=Segunda
    const hojeNome = diasSemanaFim[hojeIdx];
    
    // Obter divisões únicas disponíveis (A, B, C...)
    const divUnicas = [...new Set(ficha.exercicios.map(e => e.divisao || 'A'))].sort();
    const dTreino = ficha.diasTreino || [];
    
    // Mapear hoje
    let divHoje = 'OFF';
    let divIdx = 0;
    for (const dia of diasSemanaFim) {
      if (dTreino.includes(dia)) {
        if (dia === hojeNome) {
          divHoje = divUnicas[divIdx % divUnicas.length];
          break;
        }
        divIdx++;
      }
    }

    if (divHoje !== 'OFF') {
      prox.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-size:2rem;">🔥</div>
          <div>
            <strong>Treino de Hoje: Divisão ${divHoje}</strong><br>
            <span style="font-size:0.8rem;">Sua prescrição está pronta. Toque em "Treino" abaixo para começar!</span>
          </div>
        </div>
      `;
    } else {
      const divSug = divUnicas[0] || 'A';
      prox.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-size:2rem;">🏋️</div>
          <div>
            <strong>Treino Disponível: Divisão ${divSug}</strong><br>
            <span style="font-size:0.8rem;">Hoje seria descanso, mas seu treino está liberado se quiser treinar!</span>
          </div>
        </div>
      `;
    }
  } else {
    prox.textContent = 'Aguarde a prescrição do professor.';
  }
}

// ===== ANAMNESE ALUNO =====
function abrirAnamneseInicial() {
  showTab('anamnese-aluno');
}

function salvarAnamneseAluno() {
  const doencas = [...document.querySelectorAll('.anam-doenca:checked')].map(cb => cb.value);
  const meds = document.getElementById('anam-meds').value;
  const dorPeito = document.getElementById('anam-dor-peito').value;

  const anamnese = {
    id: Date.now(),
    alunoId: alunoLogado.id,
    data: new Date().toISOString().slice(0, 10),
    doencas,
    medicamentos: meds,
    dorPeito,
    paSistolica: '', // Preenchido depois pelo professor
    paDiastolica: '',
    classPA: '',
    origem: 'aluno'
  };

  const anamneses = JSON.parse(localStorage.getItem('anamneses') || '[]');
  anamneses.push(anamnese);
  localStorage.setItem('anamneses', JSON.stringify(anamneses));

  toast('Dados de saúde salvos! Obrigado.', 'success');
  showTab('inicio');
  carregarInicio();
}

function carregarTreino() {
  const a = alunoLogado;
  const todasFichas = JSON.parse(localStorage.getItem('fichas') || '[]');
  const ficha = todasFichas.find(f => String(f.alunoId) === String(a.id));
  const container = document.getElementById('ficha-treino-content');
  const selectDivisao = document.getElementById('select-divisao-treino');
  const cronogramaContainer = document.getElementById('cronograma-semanal-aluno');
  
  if (!ficha || !ficha.exercicios || ficha.exercicios.length === 0) {
    container.innerHTML = '<p class="empty-msg">Nenhum treino prescrito ainda.</p>';
    if (selectDivisao) selectDivisao.innerHTML = '<option value="">Sem Treino</option>';
    if (cronogramaContainer) cronogramaContainer.innerHTML = '<p class="empty-msg">Aguarde a definição dos dias de treino.</p>';
    return;
  }

  // 1. Renderizar Cronograma Semanal e definir divisaoAtiva automática se não selecionada manualmente
  if (cronogramaContainer) {
    const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    const diasLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const hojeIdx = (new Date().getDay() + 6) % 7; // Ajustar para 0=Segunda
    const hojeNome = diasSemana[hojeIdx];
    
    // Obter divisões únicas disponíveis (A, B, C...)
    const divisoesUnicas = [...new Set(ficha.exercicios.map(e => e.divisao || 'A'))].sort();
    const diasTreino = ficha.diasTreino || [];
    
    // Mapear cada dia de treino para uma divisão (A, B, C...) em sequência
    const mapeamentoAuto = {};
    let divIdx = 0;
    diasSemana.forEach(dia => {
      if (diasTreino.includes(dia)) {
        mapeamentoAuto[dia] = divisoesUnicas[divIdx % divisoesUnicas.length];
        divIdx++;
      } else {
        mapeamentoAuto[dia] = 'OFF';
      }
    });

    // Se não foi selecionado manualmente, definir divisaoAtiva para o treino de HOJE (se houver)
    if (!divisaoSelecionadaManualmente) {
      if (diasTreino.includes(hojeNome)) {
        divisaoAtiva = mapeamentoAuto[hojeNome];
      } else {
        // Se hoje for descanso, sugerir a primeira divisão disponível
        divisaoAtiva = divisoesUnicas[0] || 'A';
      }
    }
    
    cronogramaContainer.innerHTML = diasSemana.map((dia, idx) => {
      const treina = diasTreino.includes(dia);
      const div = mapeamentoAuto[dia];
      const isHoje = idx === hojeIdx;
      
      return `
        <div class="cron-dia ${treina ? 'treino' : 'descanso'} ${isHoje ? 'hoje' : ''}" onclick="mudarDivisao('${treina && div !== 'OFF' ? div : (divisoesUnicas[0] || 'A')}')" style="cursor: pointer;">
          <div class="dia-nome">${diasLabels[idx]}</div>
          <div class="dia-divisao">${div}</div>
        </div>
      `;
    }).join('');
  }

  // 2. Renderizar Dropdown de Divisões (A, B, C...)
  if (selectDivisao) {
    const divisoesPresentes = [...new Set(ficha.exercicios.map(e => e.divisao || 'A'))].sort();
    
    // Se a divisão ativa não estiver presente, resetar para a primeira
    if (!divisoesPresentes.includes(divisaoAtiva)) {
      divisaoAtiva = divisoesPresentes[0] || 'A';
    }

    selectDivisao.innerHTML = divisoesPresentes.map(div => `
      <option value="${div}" ${div === divisaoAtiva ? 'selected' : ''}>TREINO ${div}</option>
    `).join('');
  }

  // 3. Renderizar Exercícios da Divisão Ativa
  const exerciciosFiltrados = ficha.exercicios.filter(e => (e.divisao || 'A') === divisaoAtiva);
  
  if (exerciciosFiltrados.length === 0) {
    container.innerHTML = `<p class="empty-msg">Nenhum exercício na Divisão ${divisaoAtiva}.</p>`;
  } else {
    container.innerHTML = exerciciosFiltrados.map(e => {
      // Cores por agrupamento (mesma lógica do admin)
      const grupoNormalizado = e.grupo ? e.grupo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : 'geral';
      const bgClass = `bg-${grupoNormalizado}`;
      
      return `
        <div class="exercicio-card">
          <div class="ex-header">
            <span class="badge-grupo ${bgClass}">${e.grupo || 'Geral'}</span>
            <div class="ex-nome">${e.nome}</div>
          </div>
          <div class="ex-body">
            <div class="ex-info-grid">
              <div class="ex-info-item"><strong>Séries:</strong> ${e.series}</div>
              <div class="ex-info-item"><strong>Reps:</strong> ${e.reps}</div>
              <div class="ex-info-item"><strong>Carga:</strong> ${e.carga} kg</div>
              ${e.pct ? `<div class="ex-info-item"><strong>% 1RM:</strong> ${e.pct}%</div>` : ''}
              <div class="ex-info-item"><strong>Descanso:</strong> ${e.descanso}s</div>
              ${e.cadencia ? `<div class="ex-info-item"><strong>Cadência:</strong> ${e.cadencia}</div>` : ''}
              <div class="ex-info-item"><strong>Técnica:</strong> ${e.tecnica ? e.tecnica.charAt(0).toUpperCase() + e.tecnica.slice(1) : 'Tradicional'}</div>
            </div>
            ${e.obs ? `<div class="ex-obs"><strong>Obs:</strong> ${e.obs}</div>` : ''}
            ${e.video ? `
              <div class="ex-video">
                <a href="${e.video}" target="_blank" class="btn-video">🎥 Ver Execução</a>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
}

function mudarDivisao(div) {
  divisaoAtiva = div;
  divisaoSelecionadaManualmente = true;
  carregarTreino();
}

function carregarAvaliacao() {
  const a = alunoLogado;
  // Buscar avaliações e garantir que estão ordenadas pela data mais recente
  const avs = JSON.parse(localStorage.getItem('avaliacoes') || '[]')
    .filter(x => String(x.alunoId) === String(a.id))
    .sort((a, b) => new Date(b.data) - new Date(a.data));
    
  const anam = JSON.parse(localStorage.getItem('anamneses') || '[]')
    .filter(x => String(x.alunoId) === String(a.id))
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  const compBox = document.getElementById('aval-composicao');
  if (!compBox) return;

  let html = '';

  if (avs.length > 0) {
    const lastAv = avs[0]; // Pegar a mais recente devido ao sort
    html += `
      <div class="aval-grid">
        <div class="aval-item"><div class="aval-label">% Gordura</div><div class="aval-valor">${lastAv.percGordura || '—'}%</div></div>
        <div class="aval-item"><div class="aval-label">Massa Magra</div><div class="aval-valor">${lastAv.massaMagra || '—'} kg</div></div>
        <div class="aval-item"><div class="aval-label">Massa Gorda</div><div class="aval-valor">${lastAv.massaGorda || '—'} kg</div></div>
      </div>
    `;

    if (lastAv.perimetros) {
      html += `
        <h4 style="margin-top:1.5rem; color: var(--primary); font-weight: 800; font-size: 0.9rem;">📏 Circunferências (cm)</h4>
        <div class="circ-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.85rem; background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:4px 0;"><span>Pescoço:</span> <strong>${lastAv.perimetros.pescoco || '—'}</strong></div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:4px 0;"><span>Ombro:</span> <strong>${lastAv.perimetros.ombro || '—'}</strong></div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:4px 0;"><span>Peito:</span> <strong>${lastAv.perimetros['peito-normal'] || '—'}</strong></div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:4px 0;"><span>Cintura:</span> <strong>${lastAv.perimetros.cintura || '—'}</strong></div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:4px 0;"><span>Abdômen:</span> <strong>${lastAv.perimetros.abdomen || '—'}</strong></div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:4px 0;"><span>Quadril:</span> <strong>${lastAv.perimetros.quadril || '—'}</strong></div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:4px 0;"><span>Braço D:</span> <strong>${lastAv.perimetros['braco-dir'] || '—'}</strong></div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:4px 0;"><span>Braço E:</span> <strong>${lastAv.perimetros['braco-esq'] || '—'}</strong></div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:4px 0;"><span>Coxa D:</span> <strong>${lastAv.perimetros['coxa-dir'] || '—'}</strong></div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:4px 0;"><span>Coxa E:</span> <strong>${lastAv.perimetros['coxa-esq'] || '—'}</strong></div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:4px 0;"><span>Panturrilha D:</span> <strong>${lastAv.perimetros['panturrilha-dir'] || '—'}</strong></div>
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:4px 0;"><span>Panturrilha E:</span> <strong>${lastAv.perimetros['panturrilha-esq'] || '—'}</strong></div>
        </div>
      `;
    }
  }

  if (anam.length > 0) {
    const lastAnam = anam[0]; // Pegar a mais recente devido ao sort
    html += `
      <h4 style="margin-top:1.5rem; color: var(--primary); font-weight: 800; font-size: 0.9rem;">🩺 Marcadores de Saúde</h4>
      <div class="health-grid" style="font-size:0.85rem; background: #fff1f2; padding: 12px; border-radius: 10px; border: 1px solid #fecaca; display: grid; grid-template-columns: 1fr; gap: 8px;">
        <div style="display:flex; justify-content:space-between;"><span>Glicemia:</span> <strong>${lastAnam.glicemia || '—'} mg/dL</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Colesterol:</span> <strong>${lastAnam.colesterolTotal || '—'} mg/dL</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Pressão Arterial:</span> <strong>${lastAnam.paSistolica || '—'}/${lastAnam.paDiastolica || '—'} mmHg</strong></div>
      </div>
    `;
  }

  if (!html) {
    compBox.innerHTML = `
      <div style="text-align:center; padding: 2rem; color: var(--muted);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📏</div>
        <p>Nenhuma avaliação ou teste físico registrado ainda.</p>
        <p style="font-size: 0.8rem; margin-top: 0.5rem;">Fale com seu professor para lançar seus resultados.</p>
      </div>
    `;
  } else {
    compBox.innerHTML = html;
    renderGraficoEvolucao(avs);
  }
}

function renderGraficoEvolucao(avs) {
  const ctx = document.getElementById('chart-aluno-composicao');
  if (!ctx) return;
  if (chartAlunoComp) chartAlunoComp.destroy();
  
  chartAlunoComp = new Chart(ctx, {
    type: 'line',
    data: {
      labels: avs.map(a => a.data),
      datasets: [{
        label: '% Gordura',
        data: avs.map(a => parseFloat(a.percGordura)),
        borderColor: '#2563eb',
        tension: 0.3
      }]
    },
    options: { responsive: true }
  });
}

function carregarPerfil() {
  const a = alunoLogado;
  document.getElementById('perfil-view').innerHTML = `
    <div class="perfil-row"><span>Nome</span><span>${a.nome}</span></div>
    <div class="perfil-row"><span>Idade</span><span>${a.idade} anos</span></div>
    <div class="perfil-row"><span>Objetivo</span><span>${a.objetivo || '—'}</span></div>
  `;
}

function carregarHistoricoPagamentos() {
  const container = document.getElementById('historico-pagamentos');
  
  // Se for aluno gratuito, mostrar mensagem informativa
  if (alunoLogado.tipo === 'gratuito') {
    container.innerHTML = `
      <div style="text-align:center; padding: 2rem; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
        <div style="font-size: 2.5rem; margin-bottom: 1rem;">✅</div>
        <h3 style="color: #166534; margin-bottom: 0.5rem;">Acesso Gratuito Liberado</h3>
        <p style="color: #15803d; font-size: 0.9rem;">Você possui acesso ilimitado e gratuito à plataforma TREINOFITASM.</p>
      </div>
    `;
    return;
  }

  const pags = JSON.parse(localStorage.getItem('pagamentos') || '[]').filter(p => String(p.alunoId) === String(alunoLogado.id));
  
  if (pags.length === 0) {
    container.innerHTML = '<p class="empty-msg">Nenhum pagamento registrado.</p>';
    return;
  }

  container.innerHTML = pags.map(p => `
    <div class="pag-item">
      <span>${new Date(p.vencimento).toLocaleDateString('pt-BR')}</span>
      <span>R$ ${parseFloat(p.valor).toFixed(2)}</span>
      <span class="badge badge-${p.status}">${p.status.toUpperCase()}</span>
      <div style="font-size:0.7rem; color:#666;">Método: ${p.metodo || '—'}</div>
    </div>
  `).join('');
}

// ===== PDF DOWNLOADS =====
function baixarTreinoPDF() {
  const a = alunoLogado;
  const todasFichas = JSON.parse(localStorage.getItem('fichas') || '[]');
  const ficha = todasFichas.find(f => String(f.alunoId) === String(a.id));
  
  if (!ficha || !ficha.exercicios || ficha.exercicios.length === 0) {
    toast('Sem treino para baixar', 'error');
    return;
  }
  
  const win = window.open('', '_blank');
  
  // Organizar exercícios por divisão para o PDF
  const divisoes = [...new Set(ficha.exercicios.map(e => e.divisao || 'A'))].sort();
  
  let contentHtml = divisoes.map(div => {
    const exs = ficha.exercicios.filter(e => (e.divisao || 'A') === div);
    return `
      <div style="margin-top: 20px;">
        <h2 style="background: #2563eb; color: white; padding: 10px; border-radius: 5px;">TREINO ${div}</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Exercício</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Séries x Reps</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Carga</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Descanso</th>
            </tr>
          </thead>
          <tbody>
            ${exs.map(e => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">
                  <strong>${e.nome}</strong><br>
                  <small style="color: #666;">${e.grupo} ${e.tecnica && e.tecnica !== 'tradicional' ? '· ' + e.tecnica : ''}</small>
                </td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${e.series} x ${e.reps}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${e.carga} kg</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${e.descanso}s</td>
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
      body{font-family: sans-serif; padding: 20px; color: #333;}
      .header{text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px;}
      h1{margin: 0; color: #2563eb;}
      table{font-size: 14px;}
      th{font-size: 12px; text-transform: uppercase;}
    </style>
    </head><body>
    <div class="header">
      <h1>TREINOFITASM</h1>
      <p><strong>Ficha de Treino:</strong> ${alunoLogado.nome}</p>
      <p><strong>Data da Prescrição:</strong> ${new Date(ficha.data).toLocaleDateString('pt-BR')}</p>
    </div>
    ${contentHtml}
    <p style="text-align: center; font-size: 12px; color: #666; margin-top: 30px;">TREINOFITASM - Consultoria Esportiva</p>
    </body></html>
  `);
  win.document.close();
  win.print();
}

function baixarAvaliacaoPDF() {
  const container = document.getElementById('aval-composicao');
  if (!container.innerHTML || container.innerHTML.includes('Nenhuma avaliação')) {
    toast('Sem avaliação para baixar', 'error');
    return;
  }
  
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>TREINOFITASM - Avaliação</title>
    <style>body{font-family:sans-serif;padding:2rem;} .aval-item{margin-bottom:10px;}</style>
    </head><body>
    <h1>TREINOFITASM - Minha Avaliação</h1>
    <p>Aluno: ${alunoLogado.nome}</p>
    ${container.innerHTML}
    </body></html>
  `);
  win.document.close();
  win.print();
}

function copiarPix() {
  const chave = document.getElementById('pix-chave-box').textContent;
  navigator.clipboard.writeText(chave).then(() => toast('Chave PIX copiada!', 'success'));
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'register') {
    showOnlineRegistration();
  }

  const savedId = localStorage.getItem('alunoLogadoId');
  if (savedId) {
    const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
    const aluno = alunos.find(a => String(a.id) === String(savedId));
    if (aluno) {
      alunoLogado = aluno;
      entrarNoApp();
    }
  }
});

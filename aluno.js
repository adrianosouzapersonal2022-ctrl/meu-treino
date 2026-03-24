// ============================================================
// aluno.js – Lógica do App Mobile do Aluno (TREINOFITASM)
// ============================================================

let alunoLogado = null;
let chartAlunoComp = null;
let divisaoAtiva = 'A'; // Divisão padrão
let diaAtivo = ''; // Dia selecionado no cronograma
let divisaoSelecionadaManualmente = false;

// PWA Install Logic para o Aluno
let deferredPromptAluno;

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker registrado!', reg))
      .catch(err => console.log('Erro ao registrar Service Worker:', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPromptAluno = e;
  const container = document.getElementById('pwa-install-container');
  if (container) {
    container.style.display = 'block';
    document.getElementById('btn-pwa-install-aluno').style.display = 'flex';
    document.getElementById('ios-install-hint').style.display = 'none';
  }
});

// Lógica especial para iOS
window.addEventListener('load', () => {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  
  if (isIos && !isStandalone) {
    const container = document.getElementById('pwa-install-container');
    const installBtn = document.getElementById('btn-pwa-install-aluno');
    const iosHint = document.getElementById('ios-install-hint');
    
    if (container) {
      container.style.display = 'block';
      if (installBtn) installBtn.style.display = 'none';
      if (iosHint) iosHint.style.display = 'block';
    }
  }
});

document.getElementById('btn-pwa-install-aluno')?.addEventListener('click', async () => {
  if (deferredPromptAluno) {
    deferredPromptAluno.prompt();
    const { outcome } = await deferredPromptAluno.userChoice;
    if (outcome === 'accepted') {
      const container = document.getElementById('pwa-install-container');
      if (container) container.style.display = 'none';
      toast('App instalado com sucesso! Performance máxima liberada.', 'success');
    }
    deferredPromptAluno = null;
  } else {
    // Se não houver o prompt automático (Android/Chrome), orientamos o método nativo
    toast('Para instalar: Toque nos 3 pontos ⋮ do Chrome e selecione "Instalar Aplicativo" ou "Adicionar à Tela Inicial".', 'info');
  }
});

// Detectar quando o app foi instalado
window.addEventListener('appinstalled', (evt) => {
  const container = document.getElementById('pwa-install-container');
  if (container) container.style.display = 'none';
  toast('App instalado! Iniciando experiência premium.', 'success');
});

// ===== UTIL =====
function getClassificacaoIMC(imc) {
  if (imc < 18.5) return 'Abaixo do peso';
  if (imc < 25) return 'Peso normal';
  if (imc < 30) return 'Sobrepeso (Pré-obesidade)';
  if (imc < 35) return 'Obesidade Grau I';
  if (imc < 40) return 'Obesidade Grau II';
  return 'Obesidade Grau III (Mórbida)';
}

// ===== TOAST =====
function toast(msg, type = '') {
  const t = document.getElementById('toast-aluno');
  if (!t) return;
  
  let icon = '';
  if (type === 'success') icon = '✅ ';
  if (type === 'error') icon = '❌ ';
  
  t.textContent = icon + msg;
  t.className = 'toast-aluno show ' + type;
  setTimeout(() => t.classList.remove('show'), 4000);
}

// ===== LOGIN =====
function fazerLogin() {
  const identificador = document.getElementById('login-identificador').value.trim().toLowerCase();
  const senha = document.getElementById('login-senha').value;
  const error = document.getElementById('login-erro');

  if (!identificador || !senha) {
    error.style.display = 'block';
    error.textContent = 'Informe e-mail/CPF e senha.';
    return;
  }
  
  const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
  
  // Buscar por e-mail ou CPF (removendo pontos e traços do identificador se for CPF)
  const idLimpo = identificador.replace(/\D/g, '');
  
  const aluno = alunos.find(a => {
    const emailMatch = a.email && a.email.toLowerCase() === identificador;
    const cpfMatch = a.cpf && a.cpf.replace(/\D/g, '') === idLimpo;
    return (emailMatch || cpfMatch) && (String(a.senha) === String(senha));
  });
  
  if (!aluno) {
    error.style.display = 'block';
    error.textContent = 'E-mail/CPF ou senha incorretos.';
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
  const a = alunoLogado;
  if (!a) return;

  const treinoLiberado = document.getElementById('treino-liberado');
  const treinoBloqueado = document.getElementById('treino-bloqueado');
  const avalLiberada = document.getElementById('avaliacao-liberada');
  const avalBloqueada = document.getElementById('avaliacao-bloqueada');

  // Se for gratuito, liberação TOTAL imediata e remove qualquer bloqueio
  if (a.tipo === 'gratuito') {
    if (treinoLiberado) treinoLiberado.style.display = 'block';
    if (treinoBloqueado) treinoBloqueado.style.display = 'none';
    if (avalLiberada) avalLiberada.style.display = 'block';
    if (avalBloqueada) avalBloqueada.style.display = 'none';
    
    // Garantir que os botões de navegação estejam visíveis
    const bnavPagamento = document.getElementById('bnav-pagamento');
    if (bnavPagamento) bnavPagamento.style.display = 'flex';
    
    return;
  }

  // Se for pago, verificar se tem algum pagamento com status "pago" e dentro do vencimento
  const todosPags = JSON.parse(localStorage.getItem('pagamentos') || '[]');
  const pagsAluno = todosPags.filter(p => String(p.alunoId) === String(a.id));
  
  const temPagamentoAtivo = pagsAluno.some(p => {
    const hoje = new Date().toISOString().slice(0, 10);
    return p.status === 'pago' && p.vencimento >= hoje;
  });

  if (temPagamentoAtivo) {
    if (treinoLiberado) treinoLiberado.style.display = 'block';
    if (treinoBloqueado) treinoBloqueado.style.display = 'none';
    if (avalLiberada) avalLiberada.style.display = 'block';
    if (avalBloqueada) avalBloqueada.style.display = 'none';
  } else {
    if (treinoLiberado) treinoLiberado.style.display = 'none';
    if (treinoBloqueado) treinoBloqueado.style.display = 'block';
    if (avalLiberada) avalLiberada.style.display = 'none';
    if (avalBloqueada) avalBloqueada.style.display = 'block';
    
    // Toast só se estiver na aba de treino ou avaliação
    const activeTab = document.querySelector('.tab-pane.active')?.id;
    if (activeTab === 'tab-treino' || activeTab === 'tab-avaliacao') {
      toast('⚠️ Seu acesso está suspenso por falta de pagamento.', 'error');
    }
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
  const cpf = document.getElementById('reg-cpf').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const senha = document.getElementById('reg-senha').value;
  const dataNasc = document.getElementById('reg-dataNasc').value;
  const sexo = document.getElementById('reg-sexo').value;
  const telefone = document.getElementById('reg-telefone').value;
  const objetivo = document.getElementById('reg-objetivo').value;

  if (!nome || !cpf || !email || !senha || !dataNasc || !sexo || !telefone) {
    const erro = document.getElementById('reg-erro');
    erro.style.display = 'block';
    erro.textContent = 'Preencha todos os campos obrigatórios (*).';
    return;
  }

  if (cpf.replace(/\D/g, '').length !== 11) {
    const erro = document.getElementById('reg-erro');
    erro.style.display = 'block';
    erro.textContent = 'Informe um CPF válido (11 dígitos).';
    return;
  }

  if (senha.length < 6) {
    const erro = document.getElementById('reg-erro');
    erro.style.display = 'block';
    erro.textContent = 'A senha deve ter pelo menos 6 caracteres.';
    return;
  }

  const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
  
  // Verificar se e-mail ou CPF já existe
  const idLimpo = cpf.replace(/\D/g, '');
  const alunoExistenteIdx = alunos.findIndex(a => 
    (a.email && a.email.toLowerCase() === email) || 
    (a.cpf && a.cpf.replace(/\D/g, '') === idLimpo)
  );
  
  if (alunoExistenteIdx !== -1) {
    const alunoExistente = alunos[alunoExistenteIdx];
    
    // Se o aluno já existia (criado pelo professor), vamos apenas atualizar os dados e a senha
    alunos[alunoExistenteIdx] = {
      ...alunoExistente,
      nome,
      cpf,
      senha,
      dataNasc,
      sexo,
      telefone,
      objetivo,
      idade: calcularIdade(dataNasc),
      origem: 'online'
    };
    
    localStorage.setItem('alunos', JSON.stringify(alunos));
    toast('Cadastro vinculado com sucesso! Agora faça login.', 'success');
    voltarLogin();
    return;
  }

  const novoAluno = {
    id: Date.now(),
    nome,
    cpf,
    email,
    senha,
    dataNasc,
    sexo,
    telefone,
    objetivo,
    idade: calcularIdade(dataNasc),
    origem: 'online',
    tipo: 'pago'
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

  // Re-validar acesso ao trocar de aba para garantir que mudanças administrativas (gratuidade) sejam aplicadas
  verificarAcesso();

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
  
  // Garantir que o banner de instalação premium apareça se necessário
  const pwaContainer = document.getElementById('pwa-install-container');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (pwaContainer && !isStandalone) {
    pwaContainer.style.display = 'block';
    
    if (isIos) {
      document.getElementById('btn-pwa-install-aluno').style.display = 'none';
      document.getElementById('ios-install-hint').style.display = 'block';
    } else {
      document.getElementById('btn-pwa-install-aluno').style.display = 'flex';
      document.getElementById('ios-install-hint').style.display = 'none';
    }
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
      const pct = Math.min(100, Math.round((sAtuais / sMeta) * 100));
      const barra = document.getElementById('progresso-treino-barra');
      const texto = document.getElementById('progresso-treino-texto');
      
      if (barra) barra.style.width = pct + '%';
      if (texto) texto.textContent = `${sAtuais} de ${sMeta} sessões (${pct}%)`;

      if (sAtuais >= sMeta) {
        msgAluno.innerHTML = `⚠️ <strong>Seu treino venceu!</strong> Você completou as ${sMeta} sessões planejadas. Fale com seu professor para atualizar sua ficha.`;
        alertAluno.style.display = 'block';
        alertAluno.style.background = '#fef2f2';
        alertAluno.style.borderColor = '#fecaca';
        if (barra) barra.style.background = '#ef4444';
      } else if (sAtuais >= (sMeta * 0.8)) {
        msgAluno.innerHTML = `🔔 <strong>Faltam poucas sessões!</strong> Você já realizou ${sAtuais} de ${sMeta} sessões deste treino.`;
        alertAluno.style.display = 'block';
        alertAluno.style.background = '#fffbeb';
        alertAluno.style.borderColor = '#fef3c7';
        if (barra) barra.style.background = '#f59e0b';
      } else {
        // Mostrar progresso mesmo que não esteja perto de vencer, mas com cor azul
        msgAluno.innerHTML = `💪 <strong>Continue assim!</strong> Você está no caminho certo.`;
        alertAluno.style.display = 'block';
        alertAluno.style.background = '#f0f9ff';
        alertAluno.style.borderColor = '#bae6fd';
        if (barra) barra.style.background = '#3b82f6';
      }
    }

    // Identificar o treino sugerido (hoje ou o primeiro disponível)
    const diasSemanaFim = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    const hojeIdx = (new Date().getDay() + 6) % 7; // Ajustar para 0=Segunda
    const hojeNome = diasSemanaFim[hojeIdx];
    
    // Obter divisões únicas disponíveis (A, B, C...)
    const divUnicas = [...new Set(ficha.exercicios.map(e => e.divisao || 'A'))].sort();
    const dTreino = ficha.diasTreino || [];
    
    // Mapear hoje na sequência contínua
    const divHoje = divUnicas[hojeIdx % divUnicas.length];
    const treinaHoje = dTreino.includes(hojeNome);

    if (treinaHoje) {
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
      prox.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-size:2rem;">🏋️</div>
          <div>
            <strong>Treino Disponível: Divisão ${divHoje}</strong><br>
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
  if (!alunoLogado) {
    toast('❌ Erro: Aluno não identificado. Faça login novamente.', 'error');
    return;
  }

  const btn = document.getElementById('btnSalvarAnamneseAluno');
  if (btn) btn.textContent = "⏳ Salvando...";

  const doencas = [...document.querySelectorAll('.anam-doenca:checked')].map(cb => cb.value);
  const meds = document.getElementById('anam-meds').value;
  const dorPeito = document.getElementById('anam-dor-peito').value;

  const anamnese = {
    id: Date.now(),
    alunoId: String(alunoLogado.id),
    data: new Date().toISOString().slice(0, 10),
    doencas,
    medicamentos: meds,
    dorPeito,
    paSistolica: '', // Preenchido depois pelo professor
    paDiastolica: '',
    classPA: '',
    origem: 'aluno'
  };

  // 1. Sincronizar Anamneses
  const anamneses = JSON.parse(localStorage.getItem('anamneses') || '[]');
  const idx = anamneses.findIndex(a => String(a.alunoId) === String(alunoLogado.id));
  
  if (idx >= 0) {
    const old = anamneses[idx];
    anamnese.paSistolica = old.paSistolica || '';
    anamnese.paDiastolica = old.paDiastolica || '';
    anamnese.classPA = old.classPA || '';
    anamneses[idx] = anamnese;
  } else {
    anamneses.push(anamnese);
  }
  localStorage.setItem('anamneses', JSON.stringify(anamneses));

  // 2. Sincronizar no Cadastro do Aluno (conforme solicitado)
  const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
  const alunoIdx = alunos.findIndex(a => String(a.id) === String(alunoLogado.id));
  if (alunoIdx >= 0) {
    alunos[alunoIdx].anamnese = anamnese;
    alunos[alunoIdx].ultimaAnamnese = anamnese.data;
    localStorage.setItem('alunos', JSON.stringify(alunos));
    // Atualizar objeto em memória
    alunoLogado = alunos[alunoIdx];
  }

  if (btn) {
    btn.textContent = "Salvar e Finalizar";
    btn.style.background = "";
  }

  // Caixa de diálogo de confirmação conforme solicitado pelo usuário
  alert('✅ Suas informações de saúde foram salvas com sucesso no seu cadastro!');

  toast('✅ Anamnese salva com sucesso no seu cadastro!', 'success');
  
  setTimeout(() => {
    showTab('inicio');
    carregarInicio();
  }, 1200);
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
    if (document.getElementById('btn-concluir-container')) document.getElementById('btn-concluir-container').style.display = 'none';
    return;
  }

  // Mostrar botão de conclusão
  if (document.getElementById('btn-concluir-container')) {
    document.getElementById('btn-concluir-container').style.display = 'block';
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
    
    // Mapear cada dia de treino para uma divisão (A, B, C...) em sequência CONTÍNUA de 7 dias
    const mapeamentoAuto = {};
    if (divisoesUnicas.length > 0) {
      diasSemana.forEach((dia, idx) => {
        mapeamentoAuto[dia] = divisoesUnicas[idx % divisoesUnicas.length];
      });
    } else {
      diasSemana.forEach(dia => mapeamentoAuto[dia] = '-');
    }

    // Se não foi selecionado manualmente, definir divisaoAtiva para o treino de HOJE
    if (!divisaoSelecionadaManualmente) {
      diaAtivo = hojeNome;
      divisaoAtiva = mapeamentoAuto[hojeNome];
    }
    
    cronogramaContainer.innerHTML = diasSemana.map((dia, idx) => {
      const treina = diasTreino.includes(dia);
      const div = mapeamentoAuto[dia];
      const isHoje = idx === hojeIdx;
      const isAtiva = dia === diaAtivo;
      
      return `
        <div class="cron-dia ${treina ? 'treino' : 'descanso'} ${isHoje ? 'hoje' : ''} ${isAtiva ? 'ativa' : ''}" onclick="mudarDiaTreino('${dia}', '${div}')" style="cursor: pointer;">
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

function mudarDiaTreino(dia, div) {
  diaAtivo = dia;
  divisaoAtiva = div;
  divisaoSelecionadaManualmente = true;
  carregarTreino();
}

function mudarDivisao(div) {
  divisaoAtiva = div;
  divisaoSelecionadaManualmente = true;
  // Ao mudar pelo dropdown, o diaAtivo perde o foco no cronograma
  diaAtivo = '';
  carregarTreino();
}

function concluirTreino() {
  const a = alunoLogado;
  const todasFichas = JSON.parse(localStorage.getItem('fichas') || '[]');
  const idx = todasFichas.findIndex(f => String(f.alunoId) === String(a.id));
  
  if (idx === -1) {
    toast('Nenhum treino encontrado para registrar.', 'error');
    return;
  }
  
  const ficha = todasFichas[idx];
  ficha.sessoesRealizadas = (ficha.sessoesRealizadas || 0) + 1;
  
  localStorage.setItem('fichas', JSON.stringify(todasFichas));
  
  toast(`🔥 Sessão #${ficha.sessoesRealizadas} registrada com sucesso!`, 'success');
  
  // Atualizar tela de início e treino para mostrar progresso novo
  carregarInicio();
  carregarTreino();
  
  // Rolar para o topo para ver o alerta de progresso se houver
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function carregarAvaliacao() {
  const a = alunoLogado;
  // Buscar avaliações e garantir que estão ordenadas pela data mais recente
  const avs = JSON.parse(localStorage.getItem('avaliacoes') || '[]')
    .filter(x => String(x.alunoId) === String(a.id))
    .sort((a, b) => new Date(b.data + 'T00:00:00') - new Date(a.data + 'T00:00:00'));
    
  const anam = JSON.parse(localStorage.getItem('anamneses') || '[]')
    .filter(x => String(x.alunoId) === String(a.id))
    .sort((a, b) => new Date(b.data + 'T00:00:00') - new Date(a.data + 'T00:00:00'));

  const compBox = document.getElementById('aval-composicao');
  if (!compBox) return;

  let html = '';

  if (avs.length > 0) {
    const lastAv = avs[0]; // Pegar a mais recente devido ao sort
    
    // Calcular IMC para exibição se não estiver no objeto
    let imcHtml = '';
    if (lastAv.imc) {
      const imcVal = parseFloat(lastAv.imc);
      const imcCls = getClassificacaoIMC(imcVal);
      imcHtml = `<div class="aval-item"><div class="aval-label">IMC</div><div class="aval-valor">${lastAv.imc}</div><div style="font-size:0.65rem; color:var(--primary); font-weight:bold;">${imcCls}</div></div>`;
    }

    html += `
      <div class="aval-grid">
        <div class="aval-item"><div class="aval-label">% Gordura</div><div class="aval-valor">${lastAv.percGordura || '—'}%</div></div>
        ${imcHtml}
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
  
  // Inverter para mostrar da mais antiga para a mais recente no gráfico
  const avsSorted = [...avs].reverse();

  chartAlunoComp = new Chart(ctx, {
    type: 'line',
    data: {
      labels: avsSorted.map(a => new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR')),
      datasets: [{
        label: '% Gordura',
        data: avsSorted.map(a => parseFloat(a.percGordura)),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    options: { 
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: false }
      }
    }
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
  const planosSection = document.getElementById('secao-planos-pagamento');
  const pixSection = document.getElementById('secao-pix-pagamento');
  
  // Mensagem informativa para todos (incluindo gratuitos)
  let headerHtml = '';
  if (alunoLogado.tipo === 'gratuito') {
    headerHtml = `
      <div style="text-align:center; padding: 1.5rem; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0; margin-bottom: 1rem;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">✅</div>
        <h3 style="color: #166534; margin-bottom: 0.3rem; font-size: 1rem;">Acesso Liberado (Gratuidade)</h3>
        <p style="color: #15803d; font-size: 0.8rem;">Você possui acesso total ao sistema concedido pelo seu treinador. Aproveite seu treino!</p>
      </div>
    `;
    if (planosSection) planosSection.style.display = 'none';
    if (pixSection) pixSection.style.display = 'none';
  } else {
    if (planosSection) planosSection.style.display = 'block';
    if (pixSection) pixSection.style.display = 'block';
  }

  const pags = JSON.parse(localStorage.getItem('pagamentos') || '[]').filter(p => String(p.alunoId) === String(alunoLogado.id));
  
  if (pags.length === 0) {
    container.innerHTML = headerHtml + '<p class="empty-msg">Nenhum histórico de pagamento.</p>';
    return;
  }

  container.innerHTML = headerHtml + pags.map(p => `
    <div class="pag-item">
      <span>${new Date(p.vencimento).toLocaleDateString('pt-BR')}</span>
      <span>R$ ${parseFloat(p.valor).toFixed(2)}</span>
      <span class="badge badge-${p.status}">${p.status.toUpperCase()}</span>
      <div style="font-size:0.7rem; color:#666;">Método: ${p.metodo || '—'}</div>
    </div>
  `).join('');
}

// Navegação por teclado nos planos
let planoFocadoIdx = -1;
document.addEventListener('keydown', (e) => {
  const tabPagamento = document.getElementById('tab-pagamento');
  if (!tabPagamento || !tabPagamento.classList.contains('active')) return;

  const cards = document.querySelectorAll('.selectable-plano');
  if (cards.length === 0) return;

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (e.key === 'ArrowDown') planoFocadoIdx = (planoFocadoIdx + 1) % cards.length;
    else planoFocadoIdx = (planoFocadoIdx - 1 + cards.length) % cards.length;
    
    cards.forEach((c, i) => {
      c.style.transform = i === planoFocadoIdx ? 'scale(1.02)' : 'scale(1)';
      c.style.borderColor = i === planoFocadoIdx ? '#2563eb' : (i === 1 ? '#2563eb' : '#e2e8f0');
      c.style.boxShadow = i === planoFocadoIdx ? '0 10px 15px -3px rgba(37, 99, 235, 0.2)' : 'none';
      if (i === planoFocadoIdx) c.focus();
    });
  }
});

function selecionarPlanoManual(el) {
  const cards = document.querySelectorAll('.selectable-plano');
  cards.forEach(c => {
    c.style.transform = 'scale(1)';
    c.style.borderColor = c === cards[1] ? '#2563eb' : '#e2e8f0';
    c.style.boxShadow = 'none';
  });
  
  el.style.transform = 'scale(1.05)';
  el.style.borderColor = '#2563eb';
  el.style.boxShadow = '0 10px 15px -3px rgba(37, 99, 235, 0.3)';
  
  const nomePlano = el.querySelector('strong').textContent;
  window._planoSelecionado = nomePlano;
  
  const btnIr = document.getElementById('btn-ir-pagamento');
  if (btnIr) {
    btnIr.style.display = 'block';
    btnIr.innerHTML = `💳 PROSSEGUIR COM PLANO ${nomePlano}`;
  }

  toast(`📍 Plano ${nomePlano} selecionado! Clique no botão abaixo para escolher a forma de pagamento.`, 'success');
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

// ===== PAGAMENTO ONLINE =====
function abrirPagamento() {
  const nomePlano = window._planoSelecionado || 'Mensal';
  document.getElementById('screen-login').style.display = 'none';
  document.getElementById('screen-cadastro-online').style.display = 'none';
  document.getElementById('screen-app').style.display = 'none';
  document.getElementById('screen-selecao-pagamento').style.display = 'block';
  document.getElementById('plano-escolhido-texto').textContent = `Plano Selecionado: ${nomePlano}`;
}

function fecharPagamento() {
  document.getElementById('screen-selecao-pagamento').style.display = 'none';
  document.getElementById('screen-app').style.display = 'block';
  showTab('pagamento');
}

function mostrarFormCartao(tipo) {
  const form = document.getElementById('form-cartao');
  const titulo = document.getElementById('titulo-cartao');
  const parcelas = document.getElementById('parcelas-container');
  
  form.style.display = 'block';
  titulo.textContent = tipo === 'credito' ? 'Dados do Cartão de Crédito' : 'Dados do Cartão de Débito';
  parcelas.style.display = tipo === 'credito' ? 'block' : 'none';
  
  form.scrollIntoView({ behavior: 'smooth' });
}

function mostrarMetodoPix() {
  document.getElementById('form-cartao').style.display = 'none';
  fecharPagamento();
  // Rolar até a seção de PIX que já existe na aba de pagamento
  const pixSection = document.querySelector('.pix-container');
  if (pixSection) pixSection.scrollIntoView({ behavior: 'smooth' });
  toast('Utilize a chave PIX abaixo para realizar o pagamento.', 'info');
}

function processarPagamentoCartao() {
  const num = document.getElementById('card-number').value;
  const exp = document.getElementById('card-expiry').value;
  const cvv = document.getElementById('card-cvv').value;
  const name = document.getElementById('card-name').value;
  
  if (num.length < 16 || exp.length < 5 || cvv.length < 3 || !name) {
    toast('Preencha todos os campos do cartão corretamente.', 'error');
    return;
  }
  
  toast('⏳ Processando pagamento...', 'info');
  
  setTimeout(() => {
    // Simular aprovação e registrar no localStorage
    const todosPags = JSON.parse(localStorage.getItem('pagamentos') || '[]');
    const novoPag = {
      id: Date.now(),
      alunoId: String(alunoLogado.id),
      alunoNome: alunoLogado.nome,
      valor: window._planoSelecionado === 'TRIMESTRAL' ? 390 : (window._planoSelecionado === 'SEMESTRAL' ? 720 : 150),
      dataPag: new Date().toISOString().slice(0, 10),
      vencimento: new Date(new Date().setMonth(new Date().getMonth() + (window._planoSelecionado === 'TRIMESTRAL' ? 3 : (window._planoSelecionado === 'SEMESTRAL' ? 6 : 1)))).toISOString().slice(0, 10),
      status: 'pago',
      metodo: 'cartao'
    };
    
    todosPags.push(novoPag);
    localStorage.setItem('pagamentos', JSON.stringify(todosPags));
    
    toast('✅ Pagamento aprovado com sucesso! Seu acesso foi liberado.', 'success');
    fecharPagamento();
    verificarAcesso();
    carregarHistoricoPagamentos();
  }, 2500);
}

function maskCard(el) {
  let v = el.value.replace(/\D/g, '');
  v = v.replace(/(\d{4})(\d)/g, '$1 $2').trim();
  el.value = v;
}

function maskExpiry(el) {
  let v = el.value.replace(/\D/g, '');
  if (v.length > 2) v = v.substring(0, 2) + '/' + v.substring(2, 4);
  el.value = v;
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

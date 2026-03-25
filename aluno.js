// ============================================================
// aluno.js – Lógica do App Mobile do Aluno (TREINOFITASM)
// ============================================================

let alunoLogado = null;
let chartAlunoComp = null;
let divisaoAtiva = 'A'; // Divisão padrão
let divisaoSelecionadaManualmente = false;
let diaSelecionadoIdx = null; // Índice do dia selecionado no cronograma (0-6)

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
  
  // Enviar mensagem automática de boas-vindas se for o primeiro login do dia
  enviarMensagemAutomaticaBoasVindas();

  // Verificar Acesso (Pagamento) e esconder aba se for gratuito
  verificarAcesso();

  // ABA PRINCIPAL AGORA É TREINO
  showTab('treino');

  carregarInicio();
  carregarTreino();
  carregarAvaliacao();
  carregarPerfil();
  carregarHistoricoPagamentos();
  carregarMensagensMural();
}

function enviarMensagemAutomaticaBoasVindas() {
  const hoje = new Date().getDay();
  const mensagensDiarias = {
    0: "☀️ Domingo de descanso merecido! Aproveite para recarregar as energias e preparar a mente para a nova semana! 🔋",
    1: "🚀 Segunda-feira: Dia de começar com tudo! O treino de hoje é a base para uma semana incrível. Vamos pra cima! 💪",
    2: "🔥 Terça-feira no foco total! A constância é o que traz o resultado. Não pare agora! ⚡",
    3: "🎯 Quarta-feira: Metade da semana já foi! Mantenha a disciplina e o ritmo. Cada repetição conta! 🏋️",
    4: "⚡ Quinta-feira: O cansaço tenta parar, mas sua meta é maior! Bora esmagar esse treino! 👊",
    5: "🌟 Sexta-feira: Dia de fechar a semana com chave de ouro! Sensação de dever cumprido é a melhor recompensa. Bora! 🏆",
    6: "🔥 Sábado também é dia! Quem treina no fim de semana chega mais rápido no objetivo. Foco total! 🚀"
  };

  const textoMsg = mensagensDiarias[hoje];
  const muralKey = 'mural_feedbacks';
  const mensagens = JSON.parse(localStorage.getItem(muralKey) || '[]');
  
  // Verificar se o sistema já enviou a mensagem de hoje para evitar duplicidade
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const jaEnviada = mensagens.some(m => m.isAdmin && m.data.startsWith(dataHoje) && m.texto === textoMsg);

  if (!jaEnviada) {
    const novaMsg = {
      id: Date.now(),
      alunoId: 'system',
      nome: 'Sistema TREINOFIT',
      texto: textoMsg,
      data: dataHoje + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isAdmin: true,
      reacoes: []
    };
    mensagens.push(novaMsg);
    localStorage.setItem(muralKey, JSON.stringify(mensagens));
    console.log('Mensagem automática diária enviada ao mural.');
  }
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
  // ABA DE PAGAMENTO SEMPRE DISPONÍVEL CONFORME SOLICITADO
  const bnavPagamento = document.getElementById('bnav-pagamento');
  if (bnavPagamento) {
    bnavPagamento.style.display = 'flex';
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

  // 1. Renderizar Cronograma Semanal com Datas e Divisões
  if (cronogramaContainer) {
    const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    const diasLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    
    // 1.1 Cálculo de Datas e Índices
    const hoje = new Date();
    const diaSemanaHoje = (hoje.getDay() + 6) % 7; // 0=Seg, 1=Ter...
    const segundaFeira = new Date(hoje);
    segundaFeira.setDate(hoje.getDate() - diaSemanaHoje);

    const divisoesUnicas = [...new Set(ficha.exercicios.map(e => (e.divisao || 'A').toUpperCase()))].sort();
    const diasTreino = ficha.diasTreino || [];
    
    // Mapeamento de fluxo contínuo (A, B, C, D... A, B...) de Segunda a Domingo
    const mapeamentoAuto = {};
    diasSemana.forEach((dia, idx) => {
      mapeamentoAuto[dia] = divisoesUnicas[idx % divisoesUnicas.length] || 'A';
    });

    // Se for a primeira carga do app (ou após login), definir para o dia de HOJE
    if (diaSelecionadoIdx === null) {
      diaSelecionadoIdx = diaSemanaHoje;
      if (!divisaoSelecionadaManualmente) {
        const hojeNome = diasSemana[diaSemanaHoje];
        divisaoAtiva = mapeamentoAuto[hojeNome] || divisoesUnicas[0] || 'A';
      }
    }
    
    cronogramaContainer.innerHTML = diasSemana.map((dia, idx) => {
      const treina = diasTreino.includes(dia);
      const div = mapeamentoAuto[dia];
      const isHoje = idx === diaSemanaHoje;
      const isAtivo = (idx === diaSelecionadoIdx);

      // Calcular a data específica de cada dia da semana atual
      const dataDia = new Date(segundaFeira);
      dataDia.setDate(segundaFeira.getDate() + idx);
      const dataFormatada = dataDia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      return `
        <div class="cron-dia ${isAtivo ? 'ativo-azul' : (treina ? 'treino' : 'descanso')} ${isHoje ? 'hoje' : ''}" 
             onclick="mudarDivisao('${div}', ${idx})" 
             style="cursor: pointer; min-width: 60px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
                    background: ${isAtivo ? 'var(--primary)' : '#ffffff'}; 
                    color: ${isAtivo ? '#fff' : '#1e293b'}; 
                    border: ${isAtivo ? '2px solid var(--primary)' : '1px solid #cbd5e1'};
                    transform: ${isAtivo ? 'scale(1.05)' : 'scale(1)'};
                    box-shadow: ${isAtivo ? '0 4px 15px rgba(37,99,235,0.3)' : '0 2px 5px rgba(0,0,0,0.05)'};
                    display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px 5px; border-radius: 12px;">
          <div class="dia-nome" style="font-weight: 800; font-size: 0.75rem; color: inherit;">${diasLabels[idx]} ${isHoje ? '⭐' : ''}</div>
          <div class="dia-data" style="font-size: 0.65rem; opacity: ${isAtivo ? '1' : '0.7'}; margin-bottom: 6px; color: inherit;">${dataFormatada}</div>
          <div class="dia-divisao" style="background: ${isAtivo ? '#fff' : '#f1f5f9'}; 
               color: ${isAtivo ? 'var(--primary)' : '#1e293b'}; 
               border-radius: 50%; width: 28px; height: 28px; display: flex; 
               align-items: center; justify-content: center; font-weight: 900; margin: 0 auto;
               box-shadow: ${isAtivo ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'}; border: 1px solid ${isAtivo ? '#fff' : '#cbd5e1'};">
            ${div}
          </div>
        </div>
      `;
    }).join('');
  }

  // 2. Renderizar Dropdown de Divisões (A, B, C...)
  if (selectDivisao) {
    const divisoesPresentes = [...new Set(ficha.exercicios.map(e => (e.divisao || 'A').toUpperCase()))].sort();
    
    if (!divisoesPresentes.includes(divisaoAtiva.toUpperCase())) {
      divisaoAtiva = divisoesPresentes[0] || 'A';
    }

    selectDivisao.innerHTML = divisoesPresentes.map(div => `
      <option value="${div}" ${div.toUpperCase() === divisaoAtiva.toUpperCase() ? 'selected' : ''}>TREINO ${div}</option>
    `).join('');
  }

  // 3. Renderizar Exercícios da Divisão Ativa
  const exerciciosFiltrados = ficha.exercicios.filter(e => (e.divisao || 'A').toUpperCase() === divisaoAtiva.toUpperCase());
  
  let html = '';
  
  if (exerciciosFiltrados.length === 0) {
    html = `<div class="section-card" style="text-align: center; padding: 3rem;">
              <p class="empty-msg">Nenhum exercício cadastrado para o <strong>TREINO ${divisaoAtiva}</strong>.</p>
              <p style="font-size: 0.85rem; color: var(--muted); margin-top: 10px;">Selecione outro dia no cronograma acima.</p>
            </div>`;
  } else {
    html = exerciciosFiltrados.map(e => {
      const grupoNormalizado = e.grupo ? e.grupo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : 'geral';
      const bgClass = `bg-${grupoNormalizado}`;
      const gifUrl = getGifExercicio(e);
      
      // Cálculo de Carga baseada em 1RM se houver
      let cargaDisplay = `${e.carga || 0} kg`;
      let info1RM = '';
      if (e.perc1RM && e.perc1RM > 0 && e.carga1RM && e.carga1RM > 0) {
        const cargaCalc = Math.round(e.carga1RM * (e.perc1RM / 100));
        cargaDisplay = `${cargaCalc} kg`;
        info1RM = `<div style="font-size: 0.65rem; color: #2563eb; font-weight: 700; margin-top: 2px;">${e.perc1RM}% de ${e.carga1RM}kg</div>`;
      }

      return `
        <div class="exercicio-card" style="margin-bottom: 20px; border-radius: 15px; overflow: hidden; border: 1px solid #e2e8f0; background: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="height: 180px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; position: relative;">
            <img src="${gifUrl}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.src='https://via.placeholder.com/400x300/f1f5f9/64748b?text=ASM+Fitness'">
            <span class="badge-grupo ${bgClass}" style="position: absolute; top: 10px; left: 10px;">${e.grupo || 'Geral'}</span>
          </div>
          <div class="ex-body" style="padding: 15px;">
            <div class="ex-nome" style="font-size: 1.1rem; font-weight: 800; color: #1e293b; margin-bottom: 12px;">${e.nome}</div>
            <div class="ex-info-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; padding: 12px; border-radius: 12px;">
              <div class="ex-info-item" style="text-align: center; border-right: 1px solid #e2e8f0;">
                <div style="font-size: 0.6rem; color: #64748b; text-transform: uppercase;">Séries</div>
                <div style="font-size: 1rem; font-weight: 900;">${e.series}</div>
              </div>
              <div class="ex-info-item" style="text-align: center; border-right: 1px solid #e2e8f0;">
                <div style="font-size: 0.6rem; color: #64748b; text-transform: uppercase;">Reps</div>
                <div style="font-size: 1rem; font-weight: 900;">${e.reps}</div>
              </div>
              <div class="ex-info-item" style="text-align: center;">
                <div style="font-size: 0.6rem; color: #64748b; text-transform: uppercase;">Carga</div>
                <div style="font-size: 1rem; font-weight: 900; color: #2563eb;">${cargaDisplay}</div>
                ${info1RM}
              </div>
            </div>
            
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px;">
              ${e.tecnica ? `<div style="background: #eff6ff; color: #1e40af; font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 6px;">🔥 ${e.tecnica}</div>` : ''}
              ${e.cadencia ? `<div style="background: #f1f5f9; color: #475569; font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 6px;">⏱️ ${e.cadencia}</div>` : ''}
            </div>

            ${e.obs ? `<div style="font-size: 0.8rem; color: #64748b; margin-top: 12px; padding: 8px; background: #fffbeb; border-radius: 8px; border-left: 3px solid #f59e0b;">${e.obs}</div>` : ''}

            <div class="ex-actions" style="margin-top: 15px; display: flex; gap: 8px;">
              <button onclick="iniciarCronometro(${e.descanso || 60})" class="btn-timer" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; background: #f8fafc; color: #1e293b; border: 1px solid #cbd5e1; padding: 10px; border-radius: 10px; font-weight: 800; cursor: pointer;">
                ⏱️ ${e.descanso || 60}s
              </button>
              <button class="btn-check" id="check-${e.id}" style="flex: 2; background: #2563eb; color: white; border: none; padding: 10px; border-radius: 10px; font-weight: 800; cursor: pointer;">Concluir</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    html += `
      <div style="margin-top: 2rem; padding: 0 1rem 2rem;">
        <button class="btn-full" onclick="concluirTreino()" style="background: #10b981; height: 55px; font-size: 1.1rem; font-weight: 800; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">✅ CONCLUIR TREINO ${divisaoAtiva} DE HOJE</button>
      </div>
    `;
  }
  container.innerHTML = html;
}

    html += `
      <div style="margin-top: 2rem; padding: 0 1rem 2rem;">
        <button class="btn-full" onclick="concluirTreino()" style="background: #10b981; height: 55px; font-size: 1.1rem; font-weight: 800; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">✅ CONCLUIR TREINO ${divisaoAtiva} DE HOJE</button>
      </div>
    `;
  }
  container.innerHTML = html;
}

function mudarDivisao(div, idx) {
  if (!div) return;
  
  // Normalizar para maiúsculo para evitar problemas de comparação
  const divUpper = div.toUpperCase();
  divisaoAtiva = divUpper;
  
  if (idx !== undefined) {
    // Caso tenha vindo do clique no cronograma
    diaSelecionadoIdx = parseInt(idx);
  } else {
    // Caso tenha vindo do dropdown (select)
    // Precisamos encontrar o dia no cronograma que corresponde a esta letra de treino (A, B, C...)
    const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    const todasFichas = JSON.parse(localStorage.getItem('fichas') || '[]');
    const ficha = todasFichas.find(f => String(f.alunoId) === String(alunoLogado.id));
    
    if (ficha && ficha.exercicios) {
      const divisoesUnicas = [...new Set(ficha.exercicios.map(e => (e.divisao || 'A').toUpperCase()))].sort();
      
      // Tentar encontrar um dia que combine com a divisão selecionada
      const hojeIdx = (new Date().getDay() + 6) % 7;
      
      let novoIdx = -1;
      // Primeiro checa se hoje é essa divisão
      if ((divisoesUnicas[hojeIdx % divisoesUnicas.length] || 'A') === divUpper) {
        novoIdx = hojeIdx;
      } else {
        // Senão procura o primeiro dia da semana que seja essa divisão
        novoIdx = diasSemana.findIndex((dia, i) => {
          const letraDoDia = divisoesUnicas[i % divisoesUnicas.length] || 'A';
          return letraDoDia === divUpper;
        });
      }
      
      if (novoIdx !== -1) diaSelecionadoIdx = novoIdx;
    }
  }
  
  divisaoSelecionadaManualmente = true;
  carregarTreino();
}

function concluirTreino() {
  const a = alunoLogado;
  const todasFichas = JSON.parse(localStorage.getItem('fichas') || '[]');
  const idx = todasFichas.findIndex(f => String(f.alunoId) === String(a.id));
  
  if (idx === -1) {
    toast('Erro ao localizar sua ficha.', 'error');
    return;
  }

  // Incrementar sessões realizadas
  todasFichas[idx].sessoesRealizadas = (todasFichas[idx].sessoesRealizadas || 0) + 1;
  localStorage.setItem('fichas', JSON.stringify(todasFichas));

  // Feedback visual
  const meta = todasFichas[idx].metaSessoes || 0;
  const atual = todasFichas[idx].sessoesRealizadas;
  
  alert(`🔥 Parabéns! Treino concluído.\nVocê já realizou ${atual}${meta > 0 ? ' de ' + meta : ''} sessões.`);
  
  toast('✅ Treino registrado com sucesso!', 'success');
  carregarInicio();
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
  
  // Mostrar resumo de planos se for aluno gratuito ou pago
  // Agora todos podem ver e selecionar planos
  
  const pags = JSON.parse(localStorage.getItem('pagamentos') || '[]').filter(p => String(p.alunoId) === String(alunoLogado.id));
  
  if (pags.length === 0) {
    container.innerHTML = '<p class="empty-msg">Nenhum pagamento registrado.</p>';
    return;
  }

  container.innerHTML = pags.map(p => `
    <div class="pag-item">
      <span>${new Date(p.vencimento).toLocaleDateString('pt-BR')}</span>
      <span>R$ ${parseFloat(p.valor).toFixed(2)}</span>
      <span class="badge-pag badge-${p.status || 'pendente'}">${(p.status || 'pendente').toUpperCase()}</span>
      <div style="font-size:0.7rem; color:#666;">Método: ${p.metodo || '—'}</div>
    </div>
  `).join('');
}

// ===== NOVAS FUNÇÕES DE PAGAMENTO =====
let planoSelecionado = null;

function selecionarPlano(nome, preco) {
  planoSelecionado = { nome, preco };
  
  // Destacar visualmente o plano selecionado
  document.querySelectorAll('.plano-card-select').forEach(el => el.classList.remove('ativo'));
  event.currentTarget.classList.add('ativo');

  // Rolar até os métodos de pagamento
  document.getElementById('sessao-metodos-pagamento').style.display = 'block';
  document.getElementById('sessao-metodos-pagamento').scrollIntoView({ behavior: 'smooth' });
}

function selecionarMetodo(metodo) {
  if (!planoSelecionado) {
    toast('Selecione um plano primeiro!', 'warning');
    return;
  }

  // Esconder formulários anteriores
  document.getElementById('form-cartao').style.display = 'none';
  document.getElementById('sessao-pix').style.display = 'none';

  if (metodo === 'pix') {
    document.getElementById('sessao-pix').style.display = 'block';
    document.getElementById('sessao-pix').scrollIntoView({ behavior: 'smooth' });
  } else if (metodo === 'credito' || metodo === 'debito') {
    document.getElementById('tipo-cartao-texto').textContent = metodo === 'credito' ? 'Crédito' : 'Débito';
    document.getElementById('form-cartao').style.display = 'block';
    document.getElementById('form-cartao').scrollIntoView({ behavior: 'smooth' });
  }
}

function processarPagamentoCartao() {
  const nro = document.getElementById('card-number').value;
  const nome = document.getElementById('card-name').value;
  const val = document.getElementById('card-expiry').value;
  const cvc = document.getElementById('card-cvc').value;

  if (!nro || !nome || !val || !cvc) {
    toast('Preencha todos os campos do cartão!', 'error');
    return;
  }

  // Simulação de processamento online
  toast('Processando pagamento...', 'info');
  
  setTimeout(() => {
    const pagamentos = JSON.parse(localStorage.getItem('pagamentos') || '[]');
    const novoPag = {
      id: Date.now(),
      alunoId: alunoLogado.id,
      valor: planoSelecionado.preco,
      plano: planoSelecionado.nome,
      metodo: 'Cartão',
      status: 'pago',
      data: new Date().toISOString().slice(0, 10),
      vencimento: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10)
    };

    pagamentos.push(novoPag);
    localStorage.setItem('pagamentos', JSON.stringify(pagamentos));
    
    toast('✅ Pagamento aprovado! Plano ativado.', 'success');
    
    // Notificação via WhatsApp para o Administrador
    setTimeout(() => {
      enviarNotificacaoWhats(alunoLogado, planoSelecionado.nome, planoSelecionado.preco);
    }, 1500);

    // Resetar UI
    document.getElementById('form-cartao').style.display = 'none';
    document.getElementById('sessao-metodos-pagamento').style.display = 'none';
    carregarHistoricoPagamentos();
  }, 2000);
}

function enviarNotificacaoWhats(aluno, plano, valor) {
  const foneAdmin = '5585989265728';
  const data = new Date().toLocaleDateString('pt-BR');
  const msg = `🔔 *NOTIFICAÇÃO DE PAGAMENTO - TREINOFITASM*\n\n` +
              `👤 *Aluno:* ${aluno.nome}\n` +
              `📧 *E-mail:* ${aluno.email}\n` +
              `📞 *Telefone:* ${aluno.telefone || 'Não informado'}\n` +
              `🎯 *Objetivo:* ${aluno.objetivo || 'Não informado'}\n` +
              `💎 *Plano:* ${plano || 'Personalizado'}\n` +
              `💰 *Valor:* R$ ${valor ? parseFloat(valor).toFixed(2) : 'A combinar'}\n` +
              `📅 *Data:* ${data}\n\n` +
              `✅ O pagamento foi efetivado com sucesso no aplicativo!`;
  
  const url = `https://api.whatsapp.com/send?phone=${foneAdmin}&text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

function suporteWhats() {
  const foneAdmin = '5585989265728';
  const a = alunoLogado;
  const msg = `Olá! Sou o aluno *${a.nome}*\n` +
              `📧 E-mail: ${a.email}\n` +
              `📞 Telefone: ${a.telefone || 'Não informado'}\n` +
              `🎯 Objetivo: ${a.objetivo || 'Não informado'}\n\n` +
              `Preciso de suporte com meu plano/pagamento no app TREINOFITASM.`;
  const url = `https://api.whatsapp.com/send?phone=${foneAdmin}&text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

function notificarPagamentoJaFeito() {
  const foneAdmin = '5585989265728';
  const a = alunoLogado;
  const data = new Date().toLocaleDateString('pt-BR');
  const msg = `💳 *CONFIRMAÇÃO DE PAGAMENTO REALIZADO*\n\n` +
              `👤 *Aluno:* ${a.nome}\n` +
              `📧 *E-mail:* ${a.email}\n` +
              `📞 *Telefone:* ${a.telefone || 'Não informado'}\n` +
              `🎯 *Objetivo:* ${a.objetivo || 'Não informado'}\n\n` +
              `Olá! Gostaria de avisar que já realizei o pagamento da minha mensalidade/plano. Por favor, verifique para liberar/atualizar meu acesso.\n\n` +
              `📅 Enviado em: ${data}`;
  
  const url = `https://api.whatsapp.com/send?phone=${foneAdmin}&text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

function notificarPixManual() {
  if (!planoSelecionado) {
    toast('Selecione um plano primeiro!', 'warning');
    return;
  }
  enviarNotificacaoWhats(alunoLogado, planoSelecionado.nome, planoSelecionado.preco);
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

// ===== CRONÔMETRO DE DESCANSO =====
let timerInterval = null;
let timerSeconds = 0;

function iniciarCronometro(segundos) {
  const overlay = document.getElementById('timer-overlay');
  const display = document.getElementById('timer-display');
  
  if (!overlay || !display) return;
  
  timerSeconds = segundos;
  display.textContent = formatarTempo(timerSeconds);
  overlay.style.display = 'flex';
  
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    timerSeconds--;
    display.textContent = formatarTempo(timerSeconds);
    
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      finalizarCronometro();
    }
  }, 1000);
}

function formatarTempo(s) {
  const min = Math.floor(s / 60);
  const seg = s % 60;
  return `${min}:${seg < 10 ? '0' : ''}${seg}`;
}

function fecharCronometro() {
  const overlay = document.getElementById('timer-overlay');
  if (overlay) overlay.style.display = 'none';
  if (timerInterval) clearInterval(timerInterval);
}

function finalizarCronometro() {
  // Som de aviso ou vibração (se suportado)
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  
  const display = document.getElementById('timer-display');
  if (display) display.textContent = "FIM! 💪";
  
  setTimeout(() => {
    fecharCronometro();
  }, 2000);
}

function copiarPix() {
  const chave = document.getElementById('pix-chave-box').textContent;
  navigator.clipboard.writeText(chave).then(() => toast('Chave PIX copiada!', 'success'));
}

// ===== MURAL DE FEEDBACK (CHAT) =====
function carregarMensagensMural() {
  const mural = document.getElementById('mural-mensagens');
  if (!mural) return;

  const mensagens = JSON.parse(localStorage.getItem('mural_feedbacks') || '[]');
  
  if (mensagens.length === 0) {
    mural.innerHTML = `<p style="text-align: center; color: #94a3b8; font-size: 0.8rem; padding: 20px;">Nenhuma mensagem enviada ainda. Seja o primeiro!</p>`;
    return;
  }

  mural.innerHTML = mensagens.map(m => `
    <div style="background: ${m.isAdmin ? '#eff6ff' : 'white'}; padding: 15px; border-radius: 16px; border: 1px solid ${m.isAdmin ? '#bfdbfe' : '#e2e8f0'}; align-self: ${m.alunoId === alunoLogado.id ? 'flex-end' : 'flex-start'}; max-width: 90%; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 5px;">
      <div style="display: flex; justify-content: space-between; gap: 15px; margin-bottom: 6px; align-items: center;">
        <strong style="font-size: 0.8rem; color: ${m.isAdmin ? '#2563eb' : '#1e293b'}; display: flex; align-items: center; gap: 5px;">
          ${m.isAdmin ? '⭐' : ''} ${m.nome}
        </strong>
        <span style="font-size: 0.65rem; color: #94a3b8;">${m.data}</span>
      </div>
      
      <div style="font-size: 0.9rem; color: #334155; line-height: 1.5;">${m.texto}</div>
      
      <!-- RESPOSTA DO PROFESSOR (SE HOUVER) -->
      ${m.respostaProfessor ? `
        <div style="margin-top: 10px; background: #f0fdf4; border-left: 3px solid #16a34a; padding: 8px 12px; border-radius: 8px;">
          <div style="font-size: 0.7rem; color: #166534; font-weight: 800; text-transform: uppercase; margin-bottom: 2px;">Resposta do Professor:</div>
          <div style="font-size: 0.85rem; color: #14532d; font-style: italic;">"${m.respostaProfessor}"</div>
        </div>
      ` : ''}

      ${m.reacoes && m.reacoes.length > 0 ? `
        <div style="margin-top: 8px; display: flex; gap: 5px; flex-wrap: wrap;">
          ${m.reacoes.map(r => `<span title="Reação do Professor" style="background: white; padding: 2px 8px; border-radius: 20px; border: 1px solid #e2e8f0; font-size: 0.85rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">${r}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');

  mural.scrollTop = mural.scrollHeight;
}

function enviarMensagemMural() {
  const input = document.getElementById('input-msg-mural');
  const texto = input.value.trim();
  
  if (!texto || !alunoLogado) {
    if (!alunoLogado) console.error('Erro: Nenhum aluno logado para enviar mensagem.');
    return;
  }

  const mensagens = JSON.parse(localStorage.getItem('mural_feedbacks') || '[]');
  const novaMsg = {
    id: Date.now(),
    alunoId: alunoLogado.id,
    nome: alunoLogado.nome.split(' ')[0], // Só o primeiro nome
    texto: texto,
    data: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    isAdmin: false,
    reacoes: []
  };

  mensagens.push(novaMsg);
  // Manter apenas as últimas 50 mensagens para não sobrecarregar
  if (mensagens.length > 50) mensagens.shift();
  
  localStorage.setItem('mural_feedbacks', JSON.stringify(mensagens));
  input.value = '';
  carregarMensagensMural();
}

// Chamar carregarMensagensMural quando a aba treino for aberta
const originalShowTab = window.showTab;
window.showTab = function(id) {
  if (typeof originalShowTab === 'function') originalShowTab(id);
  if (id === 'treino') {
    setTimeout(carregarMensagensMural, 100);
  }
};

// Listener para mensagens em tempo real
window.addEventListener('storage', (e) => {
  if (e.key === 'mural_feedbacks') {
    carregarMensagensMural();
  }
});

// Suporte ao Enter no Mural
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && document.activeElement.id === 'input-msg-mural') {
    enviarMensagemMural();
  }
});

// ===== INIT =====
window.addEventListener('scroll', () => {
  const btnTop = document.getElementById('btn-top-aluno');
  if (btnTop) {
    if (window.pageYOffset > 300) {
      btnTop.style.display = 'flex';
    } else {
      btnTop.style.display = 'none';
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Suporte ao Enter no Login Aluno
  const loginEmailInput = document.getElementById('login-email');
  const loginSenhaInput = document.getElementById('login-senha');
  if (loginEmailInput && loginSenhaInput) {
    [loginEmailInput, loginSenhaInput].forEach(el => {
      el.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fazerLogin();
      });
    });
  }

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

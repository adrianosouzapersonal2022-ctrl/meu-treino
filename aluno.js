// ============================================================
// aluno.js – Lógica do App Mobile do Aluno (TREINOFITASM)
// ============================================================

let alunoLogado = null;
let chartAlunoComp = null;
let divisaoAtiva = 'A'; // Divisão padrão

// PWA Install Logic para o Aluno
let deferredPromptAluno;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPromptAluno = e;
  const banner = document.getElementById('pwa-banner-aluno');
  if (banner) banner.style.display = 'block';
});

document.getElementById('btn-pwa-install-aluno')?.addEventListener('click', async () => {
  if (deferredPromptAluno) {
    deferredPromptAluno.prompt();
    const { outcome } = await deferredPromptAluno.userChoice;
    if (outcome === 'accepted') {
      const banner = document.getElementById('pwa-banner-aluno');
      if (banner) banner.style.display = 'none';
    }
    deferredPromptAluno = null;
  }
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
  const aluno = alunos.find(a => (a.email && a.email.toLowerCase() === email) && (a.senha === senha));
  
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
  document.getElementById('screen-login').style.display = 'none';
  if (document.getElementById('screen-cadastro-online')) document.getElementById('screen-cadastro-online').style.display = 'none';
  document.getElementById('screen-app').style.display = 'block';
  
  const nome = alunoLogado.nome || 'Aluno';
  document.getElementById('header-nome').textContent = nome;
  document.getElementById('av-inicial').textContent = nome.charAt(0).toUpperCase();
  document.getElementById('header-sub').textContent = 'Seu treino está pronto!';
  
  // Verificar Acesso (Pagamento)
  verificarAcesso();

  carregarInicio();
  carregarTreino();
  carregarAvaliacao();
  carregarPerfil();
  carregarHistoricoPagamentos();
}

function verificarAcesso() {
  const pagamentos = JSON.parse(localStorage.getItem('pagamentos') || '[]');
  const alunoPags = pagamentos.filter(p => p.alunoId == alunoLogado.id && p.status === 'pago');
  
  // Se for aluno gratuito (definido pelo admin) ou tiver pagamento pago
  const temAcesso = alunoLogado.tipo === 'gratuito' || alunoPags.length > 0;

  if (temAcesso) {
    document.getElementById('treino-liberado').style.display = 'block';
    document.getElementById('treino-bloqueado').style.display = 'none';
    document.getElementById('avaliacao-liberada').style.display = 'block';
    document.getElementById('avaliacao-bloqueada').style.display = 'none';
  } else {
    document.getElementById('treino-liberado').style.display = 'none';
    document.getElementById('treino-bloqueado').style.display = 'block';
    document.getElementById('avaliacao-liberada').style.display = 'none';
    document.getElementById('avaliacao-bloqueada').style.display = 'block';
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
  if (alunos.some(a => a.email === email)) {
    const erro = document.getElementById('reg-erro');
    erro.style.display = 'block';
    erro.textContent = 'Este e-mail já está cadastrado.';
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
    tipo: 'pago' // Padrão para cadastro online
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
  
  document.getElementById('tab-' + tab)?.classList.add('active');
  document.getElementById('bnav-' + tab)?.classList.add('active');
}

// ===== CARREGAR DADOS =====
function carregarInicio() {
  const a = alunoLogado;
  
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
    // Tentar identificar o treino do dia
    const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const hoje = diasSemana[new Date().getDay()];
    const divHoje = (ficha.mapeamentoDias || {})[hoje] || '0';
    const treinaHoje = (ficha.diasTreino || []).includes(hoje);

    if (treinaHoje && divHoje !== '0') {
      prox.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-size:2rem;">🔥</div>
          <div>
            <strong>Treino de Hoje: Divisão ${divHoje}</strong><br>
            <span style="font-size:0.8rem;">Toque em "Treino" para ver os exercícios.</span>
          </div>
        </div>
      `;
    } else {
      prox.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-size:2rem;">🛌</div>
          <div>
            <strong>Hoje é dia de Descanso</strong><br>
            <span style="font-size:0.8rem;">Aproveite para recuperar suas energias!</span>
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
  const tabsContainer = document.getElementById('divisoes-tabs-container');
  const cronogramaContainer = document.getElementById('cronograma-semanal-aluno');
  
  if (!ficha || !ficha.exercicios || ficha.exercicios.length === 0) {
    container.innerHTML = '<p class="empty-msg">Nenhum treino prescrito ainda.</p>';
    if (tabsContainer) tabsContainer.innerHTML = '';
    if (cronogramaContainer) cronogramaContainer.innerHTML = '<p class="empty-msg">Aguarde a definição dos dias de treino.</p>';
    return;
  }

  // 1. Renderizar Cronograma Semanal
  if (cronogramaContainer) {
    const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    const diasLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const hojeIdx = (new Date().getDay() + 6) % 7; // Ajustar para 0=Segunda
    
    cronogramaContainer.innerHTML = diasSemana.map((dia, idx) => {
      const treina = (ficha.diasTreino || []).includes(dia);
      const div = (ficha.mapeamentoDias || {})[dia] || '0';
      const isHoje = idx === hojeIdx;
      
      return `
        <div class="cron-dia ${treina ? 'treino' : 'descanso'} ${isHoje ? 'hoje' : ''}">
          <div class="dia-nome">${diasLabels[idx]}</div>
          <div class="dia-divisao">${treina && div !== '0' ? div : (treina ? '?' : 'OFF')}</div>
        </div>
      `;
    }).join('');
  }

  // 2. Renderizar Abas de Divisões (A, B, C...)
  if (tabsContainer) {
    const divisoesPresentes = [...new Set(ficha.exercicios.map(e => e.divisao || 'A'))].sort();
    
    // Se a divisão ativa não estiver presente (ex: mudou o treino), resetar para a primeira
    if (!divisoesPresentes.includes(divisaoAtiva)) {
      divisaoAtiva = divisoesPresentes[0] || 'A';
    }

    tabsContainer.innerHTML = divisoesPresentes.map(div => `
      <button class="tab-div ${div === divisaoAtiva ? 'active' : ''}" onclick="mudarDivisao('${div}')">
        Treino ${div}
      </button>
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
  carregarTreino();
}

function carregarAvaliacao() {
  const a = alunoLogado;
  const avs = JSON.parse(localStorage.getItem('avaliacoes') || '[]').filter(x => String(x.alunoId) === String(a.id));
  const anam = JSON.parse(localStorage.getItem('anamneses') || '[]').filter(x => String(x.alunoId) === String(a.id));
  const compBox = document.getElementById('aval-composicao');

  let html = '';

  if (avs.length > 0) {
    const lastAv = avs[avs.length - 1];
    html += `
      <div class="aval-grid">
        <div class="aval-item"><div class="aval-label">% Gordura</div><div class="aval-valor">${lastAv.percGordura}</div></div>
        <div class="aval-item"><div class="aval-label">Massa Magra</div><div class="aval-valor">${lastAv.massaMagra}</div></div>
        <div class="aval-item"><div class="aval-label">Massa Gorda</div><div class="aval-valor">${lastAv.massaGorda}</div></div>
      </div>
    `;

    if (lastAv.circunferencias) {
      html += `
        <h4 style="margin-top:1rem;">Circunferências (cm)</h4>
        <div class="circ-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:5px; font-size:0.8rem;">
          <div>Pescoço: ${lastAv.circunferencias.pescoco || '—'}</div>
          <div>Cintura: ${lastAv.circunferencias.cintura || '—'}</div>
          <div>Abdômen: ${lastAv.circunferencias.abdomen || '—'}</div>
          <div>Quadril: ${lastAv.circunferencias.quadril || '—'}</div>
          <div>Braço D: ${lastAv.circunferencias.bracoD || '—'}</div>
          <div>Braço E: ${lastAv.circunferencias.bracoE || '—'}</div>
        </div>
      `;
    }
  }

  if (anam.length > 0) {
    const lastAnam = anam[anam.length - 1];
    html += `
      <h4 style="margin-top:1rem;">Marcadores de Saúde</h4>
      <div class="health-grid" style="font-size:0.8rem;">
        <div>Glicemia: ${lastAnam.glicemia || '—'} mg/dL</div>
        <div>Colesterol: ${lastAnam.colesterolTotal || '—'} mg/dL</div>
        <div>PA: ${lastAnam.paSistolica}/${lastAnam.paDiastolica} mmHg</div>
      </div>
    `;
  }

  if (!html) {
    compBox.innerHTML = '<p class="empty-msg">Nenhuma avaliação registrada.</p>';
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

// ============================================================
// aluno.js – Lógica do App Mobile do Aluno (TREINOFITASM)
// ============================================================

let alunoLogado = null;
let chartAlunoComp = null;

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
  const nomeBusca = document.getElementById('login-nome').value.trim().toLowerCase();
  if (!nomeBusca) {
    const erro = document.getElementById('login-erro');
    erro.style.display = 'block';
    erro.textContent = 'Informe seu nome completo.';
    return;
  }
  
  const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
  const aluno = alunos.find(a => a.nome.toLowerCase().includes(nomeBusca));
  
  if (!aluno) {
    const erro = document.getElementById('login-erro');
    erro.style.display = 'block';
    erro.textContent = 'Aluno não encontrado. Verifique com seu professor.';
    return;
  }
  
  alunoLogado = aluno;
  localStorage.setItem('alunoLogadoId', aluno.id);
  entrarNoApp();
}

function entrarNoApp() {
  document.getElementById('screen-login').style.display = 'none';
  document.getElementById('screen-app').style.display = 'block';
  
  const nome = alunoLogado.nome || 'Aluno';
  document.getElementById('header-nome').textContent = nome;
  document.getElementById('av-inicial').textContent = nome.charAt(0).toUpperCase();
  document.getElementById('header-sub').textContent = 'Seu treino está pronto!';
  
  carregarInicio();
  carregarTreino();
  carregarAvaliacao();
  carregarPerfil();
  carregarHistoricoPagamentos();
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
  const avs = JSON.parse(localStorage.getItem('avaliacoes') || '[]').filter(x => String(x.alunoId) === String(a.id));
  const lastAv = avs[avs.length - 1];

  document.getElementById('resumo-grid').innerHTML = `
    <div class="resumo-item"><div class="resumo-label">Peso</div><div class="resumo-valor">${a.peso || '—'}</div><div class="resumo-unit">kg</div></div>
    <div class="resumo-item"><div class="resumo-label">% Gordura</div><div class="resumo-valor">${lastAv ? lastAv.percGordura : '—'}</div></div>
  `;

  document.getElementById('resumo-objetivo').textContent = a.objetivo || 'Foco no Treino';

  const fichas = JSON.parse(localStorage.getItem('fichas') || '[]').filter(f => String(f.alunoId) === String(a.id));
  const prox = document.getElementById('proximo-treino');
  if (fichas.length) {
    const f = fichas[fichas.length - 1];
    prox.innerHTML = `<strong>${f.data}</strong><br>${f.exercicios.length} exercícios prescritos.`;
  } else {
    prox.textContent = 'Aguarde a prescrição do professor.';
  }
}

function carregarTreino() {
  const a = alunoLogado;
  const fichas = JSON.parse(localStorage.getItem('fichas') || '[]').filter(f => String(f.alunoId) === String(a.id));
  const container = document.getElementById('ficha-treino-content');
  
  if (fichas.length === 0) {
    container.innerHTML = '<p class="empty-msg">Nenhum treino prescrito ainda.</p>';
    return;
  }

  const ficha = fichas[fichas.length - 1];
  container.innerHTML = ficha.exercicios.map(e => `
    <div class="exercicio-card">
      <div class="ex-nome">${e.nome}</div>
      <div class="ex-detalhe">${e.series} séries × ${e.reps} reps</div>
      <div class="ex-tecnica">Técnica: ${e.tecnica ? e.tecnica.charAt(0).toUpperCase() + e.tecnica.slice(1) : 'Tradicional'}</div>
      <div class="ex-carga">Carga: ${e.carga} kg ${e.pct ? '('+e.pct+'% 1RM)' : ''}</div>
      <div class="ex-descanso">Descanso: ${e.descanso}s</div>
    </div>
  `).join('');
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
  const container = document.getElementById('ficha-treino-content');
  if (!container.innerHTML || container.innerHTML.includes('Nenhum treino')) {
    toast('Sem treino para baixar', 'error');
    return;
  }
  
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>TREINOFITASM - Treino</title>
    <style>body{font-family:sans-serif;padding:2rem;} .card{border:1px solid #ddd;padding:10px;margin-bottom:10px;}</style>
    </head><body>
    <h1>TREINOFITASM - Meu Treino</h1>
    <p>Aluno: ${alunoLogado.nome}</p>
    ${container.innerHTML.replace(/class="exercicio-card"/g, 'class="card"')}
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

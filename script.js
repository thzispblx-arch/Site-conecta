'use strict';

const DIESEL_DEFAULT = 7.36;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const state = { free: 0, paid: 0, photos: [], objectUrls: new Map(), toastTimer: null };
const HISTORY_KEY = 'grupoConect.tripHistory.v1';
const PHOTO_DB_NAME = 'grupoConectSchedulePhotos';
const PHOTO_STORE_NAME = 'photos';

const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0);
const numberPt = (value, digits = 1) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(value);

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function switchScreen(screenId) {
  $$('.screen').forEach((screen) => {
    const active = screen.id === screenId;
    screen.classList.toggle('active', active);
    screen.hidden = !active;
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (screenId === 'calculatorScreen') updateCalculation();
}

$$('[data-screen]').forEach((button) => button.addEventListener('click', () => switchScreen(button.dataset.screen)));
$('#brandHome').addEventListener('click', () => switchScreen('homeScreen'));

function readNonNegative(input) {
  const raw = input.value.trim().replace(',', '.');
  if (raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function getCalculation() {
  const fare = readNonNegative($('#fareValue'));
  const liters = readNonNegative($('#dieselLiters'));
  const dieselPrice = readNonNegative($('#dieselPrice'));
  const revenue = (fare ?? 0) * state.paid;
  const fuelCost = (liters ?? 0) * (dieselPrice ?? DIESEL_DEFAULT);
  const net = revenue - fuelCost;
  const valid = fare !== null && liters !== null && dieselPrice !== null;
  return { fare, liters, dieselPrice, revenue, fuelCost, net, valid, total: state.free + state.paid };
}

function updateCalculation() {
  $('#freeCount').textContent = state.free;
  $('#paidCount').textContent = state.paid;
  $('#totalCount').textContent = state.free + state.paid;
  $('#freeSummary').textContent = state.free;
  $('#paidSummary').textContent = state.paid;

  const result = getCalculation();
  $('#revenueValue').textContent = money(result.revenue);
  $('#fuelCostValue').textContent = money(result.fuelCost);
  const net = $('#liveNet');
  net.textContent = money(result.net);
  net.classList.remove('positive', 'negative', 'neutral');
  const status = $('#liveStatus');

  if (!result.valid) {
    net.classList.add('neutral');
    status.textContent = 'Informe passagem e litros de diesel para calcular.';
  } else if (result.net > 0.004) {
    net.classList.add('positive');
    status.textContent = 'Resultado positivo antes de outras despesas.';
  } else if (result.net < -0.004) {
    net.classList.add('negative');
    status.textContent = 'Resultado negativo considerando apenas o diesel.';
  } else {
    net.classList.add('neutral');
    status.textContent = 'A arrecadação cobre exatamente o diesel informado.';
  }
}

$$('[data-counter]').forEach((button) => {
  button.addEventListener('click', () => {
    const key = button.dataset.counter;
    const change = Number(button.dataset.change);
    state[key] = Math.max(0, state[key] + change);
    updateCalculation();
  });
});
['fareValue', 'dieselLiters', 'dieselPrice'].forEach((id) => {
  $('#' + id).addEventListener('input', updateCalculation);
  $('#' + id).addEventListener('change', updateCalculation);
});

function buildReportMarkup(trip) {
  const amountPerPassenger = trip.fare === null ? 'Não informado' : money(trip.fare);
  const liters = trip.liters === null ? 'Não informado' : `${numberPt(trip.liters, 2)} L`;
  const price = trip.dieselPrice === null ? 'Não informado' : `${money(trip.dieselPrice)}/L`;
  const verdictClass = trip.net > 0.004 ? '' : (trip.net < -0.004 ? ' loss' : ' neutral');
  let verdict = 'A arrecadação cobriu o custo do diesel informado.';
  if (trip.net > 0.004) verdict = `Lucro de ${money(trip.net)} antes de outras despesas.`;
  if (trip.net < -0.004) verdict = `Prejuízo de ${money(Math.abs(trip.net))} considerando o diesel informado.`;
  return `
    <div class="report-summary">
      <div class="report-stat"><span>Gratuidades</span><strong>${trip.free}</strong></div>
      <div class="report-stat"><span>Passagens vendidas</span><strong>${trip.paid}</strong></div>
      <div class="report-stat"><span>Total de passageiros</span><strong>${trip.total}</strong></div>
      <div class="report-stat"><span>Valor da passagem</span><strong>${amountPerPassenger}</strong></div>
      <div class="report-stat"><span>Arrecadação</span><strong>${money(trip.revenue)}</strong></div>
      <div class="report-stat"><span>Diesel consumido</span><strong>${liters}</strong></div>
      <div class="report-stat"><span>Preço do diesel</span><strong>${price}</strong></div>
      <div class="report-stat"><span>Custo do diesel</span><strong>${money(trip.fuelCost)}</strong></div>
    </div>
    <div class="report-verdict${verdictClass}">${verdict}</div>`;
}

function loadHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
    return true;
  } catch (error) {
    showToast('Não foi possível salvar o histórico neste navegador.');
    return false;
  }
}

function renderHistory() {
  const history = loadHistory();
  const container = $('#tripHistory');
  if (!history.length) {
    container.innerHTML = '<p class="history-empty">Nenhuma viagem finalizada neste navegador.</p>';
    return;
  }
  container.innerHTML = history.map((trip) => {
    const date = new Date(trip.timestamp);
    const dateText = Number.isNaN(date.getTime()) ? 'Data não disponível' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const klass = trip.net > 0.004 ? 'positive' : (trip.net < -0.004 ? 'negative' : '');
    const label = trip.net > 0.004 ? 'Lucro' : (trip.net < -0.004 ? 'Prejuízo' : 'Equilíbrio');
    return `<div class="history-item"><div class="history-left"><strong>${label} · ${trip.total} passageiros</strong><small>${dateText} · ${trip.free} gratuidades · ${trip.paid} pagantes</small></div><div class="history-net ${klass}">${money(trip.net)}</div></div>`;
  }).join('');
}

let lastReportText = '';
$('#finishTrip').addEventListener('click', () => {
  const calc = getCalculation();
  if (calc.fare === null) {
    $('#fareValue').focus();
    showToast('Informe o valor da passagem para finalizar.');
    return;
  }
  if (calc.liters === null) {
    $('#dieselLiters').focus();
    showToast('Informe quantos litros de diesel foram gastos.');
    return;
  }
  if (calc.dieselPrice === null) {
    $('#dieselPrice').focus();
    showToast('Confira o preço do diesel por litro.');
    return;
  }

  const trip = {
    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    fare: calc.fare,
    liters: calc.liters,
    dieselPrice: calc.dieselPrice,
    free: state.free,
    paid: state.paid,
    total: calc.total,
    revenue: calc.revenue,
    fuelCost: calc.fuelCost,
    net: calc.net
  };
  $('#reportContent').innerHTML = buildReportMarkup(trip);
  $('#tripReport').hidden = false;
  let verdict = trip.net > 0.004 ? `Lucro: ${money(trip.net)}` : (trip.net < -0.004 ? `Prejuízo: ${money(Math.abs(trip.net))}` : 'Resultado equilibrado');
  lastReportText = [
    'GRUPO CONECT — RESUMO DA VIAGEM',
    `Data: ${new Date(trip.timestamp).toLocaleString('pt-BR')}`,
    `Gratuidades: ${trip.free}`,
    `Passagens vendidas: ${trip.paid}`,
    `Total de passageiros: ${trip.total}`,
    `Valor da passagem: ${money(trip.fare)}`,
    `Arrecadação: ${money(trip.revenue)}`,
    `Diesel consumido: ${numberPt(trip.liters, 2)} L`,
    `Preço do diesel: ${money(trip.dieselPrice)}/L`,
    `Custo do diesel: ${money(trip.fuelCost)}`,
    `${verdict} (antes de outras despesas).`
  ].join('\n');
  const history = loadHistory();
  history.unshift(trip);
  saveHistory(history);
  renderHistory();
  $('#tripReport').scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Resumo da viagem gerado.');
});

$('#copyReport').addEventListener('click', async () => {
  if (!lastReportText) return;
  try {
    await navigator.clipboard.writeText(lastReportText);
    showToast('Resumo copiado.');
  } catch (error) {
    const area = document.createElement('textarea');
    area.value = lastReportText;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed'; area.style.opacity = '0';
    document.body.appendChild(area); area.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (copyError) { copied = false; }
    area.remove();
    showToast(copied ? 'Resumo copiado.' : 'Não foi possível copiar automaticamente.');
  }
});

$('#newTrip').addEventListener('click', () => {
  state.free = 0;
  state.paid = 0;
  $('#fareValue').value = '';
  $('#dieselLiters').value = '';
  $('#dieselPrice').value = DIESEL_DEFAULT.toFixed(2);
  $('#tripReport').hidden = true;
  lastReportText = '';
  updateCalculation();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('Contagem zerada. Pronto para uma nova viagem.');
});

$('#clearHistory').addEventListener('click', () => {
  const history = loadHistory();
  if (!history.length) {
    showToast('O histórico já está vazio.');
    return;
  }
  if (window.confirm('Deseja apagar o histórico de viagens deste navegador?')) {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    showToast('Histórico apagado.');
  }
});

// Banco local do navegador para que as fotos de horários continuem disponíveis após recarregar a página.
function openPhotoDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB indisponível'));
    const request = indexedDB.open(PHOTO_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE_NAME)) db.createObjectStore(PHOTO_STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha ao abrir banco de fotos'));
  });
}

async function dbPutPhoto(photo) {
  const db = await openPhotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
    tx.objectStore(PHOTO_STORE_NAME).put(photo);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { const err = tx.error; db.close(); reject(err); };
  });
}
async function dbGetPhotos() {
  const db = await openPhotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE_NAME, 'readonly');
    const req = tx.objectStore(PHOTO_STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error || new Error('Falha ao ler fotos'));
    tx.oncomplete = () => db.close();
  });
}
async function dbDeletePhoto(id) {
  const db = await openPhotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
    tx.objectStore(PHOTO_STORE_NAME).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { const err = tx.error; db.close(); reject(err); };
  });
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const tempUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(tempUrl);
      const maxSide = 1800;
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('Não foi possível processar a imagem'));
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Não foi possível salvar esta imagem'));
        resolve(blob);
      }, 'image/jpeg', 0.84);
    };
    img.onerror = () => { URL.revokeObjectURL(tempUrl); reject(new Error('Arquivo de imagem inválido')); };
    img.src = tempUrl;
  });
}

function revokePhotoUrl(id) {
  const url = state.objectUrls.get(id);
  if (url) URL.revokeObjectURL(url);
  state.objectUrls.delete(id);
}

function renderPhotos() {
  const grid = $('#photoGrid');
  grid.innerHTML = '';
  $('#photoCount').textContent = `${state.photos.length} ${state.photos.length === 1 ? 'foto' : 'fotos'}`;
  if (!state.photos.length) {
    grid.innerHTML = '<div class="empty-state" id="emptyPhotos"><div class="empty-icon" aria-hidden="true">▧</div><strong>Nenhuma foto por enquanto</strong><span>As fotos que você adicionar aparecerão aqui.</span></div>';
    return;
  }
  state.photos.forEach((photo) => {
    let url = state.objectUrls.get(photo.id);
    if (!url) {
      url = URL.createObjectURL(photo.blob);
      state.objectUrls.set(photo.id, url);
    }
    const card = document.createElement('article');
    card.className = 'photo-card';
    const img = document.createElement('img');
    img.src = url; img.alt = `Foto de horário: ${photo.name}`; img.loading = 'lazy';
    const caption = document.createElement('div'); caption.className = 'photo-card-caption';
    const name = document.createElement('span'); name.className = 'photo-name'; name.textContent = photo.name;
    name.title = photo.name;
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'delete-photo'; remove.textContent = 'Remover';
    remove.addEventListener('click', async () => {
      try { await dbDeletePhoto(photo.id); } catch (error) { /* a remoção visual ainda pode prosseguir */ }
      revokePhotoUrl(photo.id);
      state.photos = state.photos.filter((item) => item.id !== photo.id);
      renderPhotos();
      showToast('Foto removida.');
    });
    caption.append(name, remove); card.append(img, caption); grid.append(card);
  });
}

$('#scheduleUpload').addEventListener('change', async (event) => {
  const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
  if (!files.length) return;
  let added = 0;
  for (const file of files) {
    try {
      const blob = await compressImage(file);
      const photo = {
        id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name || `horario-${added + 1}.jpg`,
        blob,
        addedAt: new Date().toISOString()
      };
      await dbPutPhoto(photo);
      state.photos.push(photo);
      added += 1;
    } catch (error) {
      showToast('Uma foto não pôde ser salva neste navegador.');
    }
  }
  renderPhotos();
  if (added) showToast(`${added} ${added === 1 ? 'foto adicionada' : 'fotos adicionadas'}.`);
  event.target.value = '';
});

async function initializePhotos() {
  try {
    state.photos = await dbGetPhotos();
    renderPhotos();
  } catch (error) {
    renderPhotos();
    showToast('O salvamento de fotos não está disponível neste navegador.');
  }
}

$('#currentYear').textContent = new Date().getFullYear();
updateCalculation();
renderHistory();
initializePhotos();

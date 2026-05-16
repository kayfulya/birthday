// ============ Бронирование через jsonblob.com ============
// BLOB_URL задан в data.js. Используем Content-Type: text/plain — это «simple
// request» по CORS, браузер не делает preflight OPTIONS.

const STORAGE_KEY = 'wishlist:mine';

const State = {
  reserved: new Set(),
  mine: new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')),
};

const BLOB_ENABLED = typeof BLOB_URL !== 'undefined' && Boolean(BLOB_URL);

async function fetchReserved() {
  if (!BLOB_ENABLED) return [];
  try {
    const res = await fetch(BLOB_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const arr = data && data.reserved;
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error('blob read error:', e);
    return [];
  }
}

async function pushReserved() {
  if (!BLOB_ENABLED) return false;
  try {
    const res = await fetch(BLOB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ reserved: [...State.reserved] }),
    });
    return res.ok;
  } catch (e) {
    console.error('blob write error:', e);
    return false;
  }
}

function saveMine() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...State.mine]));
}

// ============ Рендер ============

const TYPE_CHIP = {
  gift: null,
  collect: { cls: 'wish__chip--collect', label: 'сбор' },
  experience: { cls: 'wish__chip--exp', label: 'впечатление' },
  sweet: { cls: 'wish__chip--sweet', label: 'просто так' },
  social: { cls: 'wish__chip--social', label: 'в инсте' },
};

function fmtMoney(n) { return n.toLocaleString('ru-RU') + ' ₽'; }

function linkHost(url) {
  if (!url) return 'ссылку';
  if (url.includes('wildberries')) return 'Wildberries';
  if (url.includes('bubnovsky')) return 'центр Бубновского';
  if (url.includes('vintagedresses')) return 'VintageDresses';
  if (url.includes('primuladesign')) return 'Primula Design';
  return 'сайт';
}

function renderReserveBtn(wish) {
  const isReserved = State.reserved.has(wish.id);
  const isMine = State.mine.has(wish.id);

  if (!BLOB_ENABLED) {
    return `<button class="btn btn--disabled" disabled>Бронь — скоро</button>`;
  }
  if (isReserved && isMine) {
    return `<button class="btn btn--reserved" data-toggle="${wish.id}">Это я · снять бронь</button>`;
  }
  if (isReserved) {
    return `<button class="btn btn--disabled" disabled>Уже занято</button>`;
  }
  return `<button class="btn" data-toggle="${wish.id}">Забронировать</button>`;
}

function renderAction(wish) {
  if (wish.type === 'collect') {
    const pct = Math.min(100, Math.round((wish.raised / wish.target) * 100));
    return `
      <div class="wish__progress">
        <div class="wish__progress-bar">
          <div class="wish__progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="wish__progress-text">
          <span>${fmtMoney(wish.raised)} из ${fmtMoney(wish.target)}</span>
          <span>${pct}%</span>
        </div>
      </div>
      <button class="btn btn--ghost" data-copy="${wish.payment.value.replace(/\s/g, '')}">
        Перевести → ${wish.payment.method}
      </button>
      <p class="wish__hint">${wish.payment.value}</p>
    `;
  }
  if (wish.type === 'sweet') {
    return `<p class="wish__hint">Без брони, сколько угодно.</p>`;
  }
  if (wish.type === 'social') {
    return `<p class="wish__hint">Без брони — можно вместе.</p>`;
  }
  return renderReserveBtn(wish);
}

function renderMeta(wish) {
  const bits = [];
  if (wish.price) bits.push(`<span class="wish__price">${wish.price}</span>`);
  if (wish.link) {
    bits.push(`<a class="wish__link" href="${wish.link}" target="_blank" rel="noopener">Открыть на ${linkHost(wish.link)} →</a>`);
  }
  if (!bits.length) return '';
  return `<div class="wish__meta">${bits.join('')}</div>`;
}

function renderWish(wish, idx) {
  const num = String(idx + 1).padStart(2, '0');
  const chip = TYPE_CHIP[wish.type];
  const chipHtml = chip ? `<span class="wish__chip ${chip.cls}">${chip.label}</span>` : '';
  const subHtml = wish.subtitle ? `<span class="wish__sub">${wish.subtitle}</span>` : '';
  const noteHtml = wish.note ? `<p class="wish__note">«${wish.note}»</p>` : '';
  const mediaHtml = wish.image
    ? `<div class="wish__media"><img src="${wish.image}" alt="${wish.title}" loading="lazy"></div>`
    : '';
  const classes = ['wish'];
  if (wish.image) classes.push('wish--with-media');
  if (wish.favorite) classes.push('wish--favorite');

  return `
    <li class="${classes.join(' ')}" id="wish-${wish.id}">
      <div class="wish__num">${num}</div>
      <div class="wish__body">
        ${mediaHtml}
        <div class="wish__text">
          ${chipHtml}
          <h3 class="wish__title">${wish.title}</h3>
          ${subHtml}
          ${noteHtml}
          ${renderMeta(wish)}
        </div>
      </div>
      <div class="wish__action" data-action="${wish.id}">
        ${renderAction(wish)}
      </div>
    </li>
  `;
}

function renderAll() {
  const wishesEl = document.getElementById('wishes');
  const favorites = WISHES.filter(w => w.favorite);
  const rest = WISHES.filter(w => !w.favorite);

  let html = '';
  if (favorites.length) {
    html += `<li class="wishes__section"><h2 class="wishes__section-title">Очень хочу!</h2></li>`;
    html += favorites.map((w, i) => renderWish(w, i)).join('');
  }
  if (rest.length) {
    html += `<li class="wishes__section wishes__section--soft"><h2 class="wishes__section-title">По вашему желанию</h2></li>`;
    html += rest.map((w, i) => renderWish(w, favorites.length + i)).join('');
  }
  wishesEl.innerHTML = html;
  document.getElementById('count').textContent = WISHES.length;
}

function refreshActionFor(wishId) {
  const wish = WISHES.find(w => w.id === wishId);
  if (!wish) return;
  const el = document.querySelector(`[data-action="${wishId}"]`);
  if (!el) return;
  el.innerHTML = renderAction(wish);
}

// ============ Бронирование ============

async function toggleReservation(wishId, btn) {
  if (!BLOB_ENABLED) return;
  btn.classList.add('btn--loading');
  const wasReserved = State.reserved.has(wishId);

  if (wasReserved && !State.mine.has(wishId)) {
    btn.classList.remove('btn--loading');
    return;
  }

  if (wasReserved) {
    State.reserved.delete(wishId);
    State.mine.delete(wishId);
  } else {
    State.reserved.add(wishId);
    State.mine.add(wishId);
  }
  refreshActionFor(wishId);

  const ok = await pushReserved();
  if (!ok) {
    if (wasReserved) {
      State.reserved.add(wishId);
      State.mine.add(wishId);
    } else {
      State.reserved.delete(wishId);
      State.mine.delete(wishId);
    }
    refreshActionFor(wishId);
    alert('Не удалось сохранить бронь. Попробуй ещё раз через минуту.');
    return;
  }
  saveMine();
}

// ============ Старт ============

document.addEventListener('click', (e) => {
  const copy = e.target.closest('[data-copy]');
  if (copy) {
    navigator.clipboard.writeText(copy.dataset.copy).then(() => {
      const original = copy.textContent;
      copy.classList.add('is-copied');
      copy.textContent = 'Скопировано';
      setTimeout(() => { copy.classList.remove('is-copied'); copy.textContent = original; }, 1600);
    });
    return;
  }
  const toggle = e.target.closest('[data-toggle]');
  if (toggle) toggleReservation(toggle.dataset.toggle, toggle);
});

(async function init() {
  renderAll();
  if (!BLOB_ENABLED) return;
  const arr = await fetchReserved();
  State.reserved = new Set(arr);
  WISHES.filter(w => w.reservable).forEach(w => refreshActionFor(w.id));
})();

// ============ «Я беру» → WhatsApp ============
function whatsappLink(wishTitle) {
  const text = `Привет! Я беру со списка: ${wishTitle}`;
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
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
  return `<a class="btn" href="${whatsappLink(wish.title)}" target="_blank" rel="noopener">Я беру → в WhatsApp</a>`;
}

function renderAction(wish) {
  if (wish.type === 'collect') {
    const pct = Math.min(100, Math.round((wish.raised / wish.target) * 100));
    return `
      <div class="wish__progress">
        <div class="wish__progress-bar"><div class="wish__progress-fill" style="width: ${pct}%"></div></div>
        <div class="wish__progress-text"><span>${fmtMoney(wish.raised)} из ${fmtMoney(wish.target)}</span><span>${pct}%</span></div>
      </div>
      <button class="btn btn--ghost" data-copy="${wish.payment.value.replace(/\s/g, '')}">Перевести → ${wish.payment.method}</button>
      <p class="wish__hint">${wish.payment.value}</p>
    `;
  }
  if (wish.type === 'sweet') return `<p class="wish__hint">Без брони, сколько угодно.</p>`;
  if (wish.type === 'social') return `<p class="wish__hint">Без брони — можно вместе.</p>`;
  return renderReserveBtn(wish);
}

function renderMeta(wish) {
  const bits = [];
  if (wish.price) bits.push(`<span class="wish__price">${wish.price}</span>`);
  if (wish.link) bits.push(`<a class="wish__link" href="${wish.link}" target="_blank" rel="noopener">Открыть на ${linkHost(wish.link)} →</a>`);
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

function renderSmallAction(w) {
  return `<a class="small-wish__btn" href="${whatsappLink(w.title)}" target="_blank" rel="noopener">беру</a>`;
}

function renderSmall(w) {
  const subHtml = w.subtitle ? `<span class="small-wish__sub">${w.subtitle}</span>` : '';
  return `
    <li class="small-wish" id="wish-${w.id}">
      <div class="small-wish__text">
        <span class="small-wish__title">${w.title}</span>
        ${subHtml}
      </div>
      <span class="small-wish__action" data-action="${w.id}">${renderSmallAction(w)}</span>
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

  const smallEl = document.getElementById('small-wishes');
  if (smallEl && typeof SMALL_WISHES !== 'undefined') {
    smallEl.innerHTML = SMALL_WISHES.map(renderSmall).join('');
  }

  const total = WISHES.length + (typeof SMALL_WISHES !== 'undefined' ? SMALL_WISHES.length : 0);
  document.getElementById('count').textContent = total;
}

function refreshActionFor(wishId) {
  const big = WISHES.find(w => w.id === wishId);
  const small = (typeof SMALL_WISHES !== 'undefined') ? SMALL_WISHES.find(w => w.id === wishId) : null;
  const el = document.querySelector(`[data-action="${wishId}"]`);
  if (!el) return;
  if (big) el.innerHTML = renderAction(big);
  else if (small) el.innerHTML = renderSmallAction(small);
}

// ============ Клики (копирование номера) ============

document.addEventListener('click', (e) => {
  const copy = e.target.closest('[data-copy]');
  if (!copy) return;
  navigator.clipboard.writeText(copy.dataset.copy).then(() => {
    const original = copy.textContent;
    copy.classList.add('is-copied');
    copy.textContent = 'Скопировано';
    setTimeout(() => { copy.classList.remove('is-copied'); copy.textContent = original; }, 1600);
  });
});

renderAll();

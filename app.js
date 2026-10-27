'use strict';

const icons = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowUp: '<path d="M6 18 18 6M6 6h12v12"/>',
  camera: '<path d="M8 5 9.5 3h5L16 5h4a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/><circle cx="12" cy="12" r="4"/>',
  bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  search: '<circle cx="10.7" cy="10.7" r="6.7"/><path d="m16 16 5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  shield: '<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6Z"/><path d="m8 12 3 3 5-6"/>',
  sparkle: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.sparkle}</svg>`;
const money = amount => new Intl.NumberFormat('ru').format(amount) + ' у.е.';
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const products = [
  { id: 'runner', name: 'Кроссовки Red Runner', category: 'shoes', label: 'Кроссовки', price: 6490, old: 7990, image: 'sneakers', badge: 'ХИТ', colors: ['#b9352d', '#242720', '#e1dbca'], sizes: ['37','38','39','40','41','42','43'], description: 'Яркий акцент для повседневных маршрутов. Лёгкий верх, мягкая стелька и гибкая подошва — для долгих прогулок и больших планов.' },
  { id: 'essential', name: 'Футболка Essential', category: 'clothing', label: 'Футболки', price: 1990, image: 'tshirt', badge: 'NEW', colors: ['#f7f5eb', '#3c4035', '#aab29c'], sizes: ['XS','S','M','L','XL'], isNew: true, description: 'Та самая белая футболка, с которой начинается гардероб. Мягкий хлопок, свободная посадка и минимум деталей. Легко сочетается со всем, что вам нравится.' },
  { id: 'everyday', name: 'Рюкзак Everyday', category: 'accessories', label: 'Рюкзаки', price: 4290, image: 'backpack', colors: ['#30352c', '#b5a58d', '#77816b'], sizes: ['Единый'], description: 'Всё нужное — с собой. Вместительное основное отделение, удобные лямки и лаконичный дизайн для города, работы и спонтанных поездок.' },
  { id: 'comfort', name: 'Худи Comfort Club', category: 'clothing', label: 'Худи и свитшоты', price: 3990, old: 4990, image: 'hoodie', badge: '−20%', colors: ['#c698a4', '#c6c6b9', '#383a34'], sizes: ['XS','S','M','L','XL'], description: 'Ваш личный режим комфорта. Объёмный крой, уютный капюшон и мягкая ткань. Для прохладных вечеров и дней, когда хочется просто быть собой.' },
  { id: 'sunday', name: 'Очки Sunday Mood', category: 'accessories', label: 'Солнцезащитные очки', price: 2490, image: 'sunglasses', badge: 'NEW', colors: ['#b08b58', '#353b31'], sizes: ['Единый'], isNew: true, description: 'Немного солнца в повседневных образах. Выразительная оправа в тёплом оттенке и удобная посадка — для прогулок без спешки.' },
  { id: 'urban', name: 'Куртка Urban Layer', category: 'clothing', label: 'Верхняя одежда', price: 7990, image: 'jacket', colors: ['#b9a07b', '#364034', '#d7d4c6'], sizes: ['S','M','L','XL'], description: 'Ещё один любимый слой. Универсальная куртка свободного силуэта для переменчивой погоды и многослойных сочетаний.' },
  { id: 'daily', name: 'Кроссовки Daily Step', category: 'shoes', label: 'Кроссовки', price: 5490, image: 'sneakers-white', badge: 'NEW', colors: ['#c9ab84', '#f5f3e9'], sizes: ['36','37','38','39','40','41','42'], isNew: true, description: 'Классическая форма и спокойные оттенки. Удобная пара на каждый день, которая одинаково хорошо смотрится с джинсами и свободными брюками.' },
  { id: 'mini', name: 'Сумка Mini Story', category: 'accessories', label: 'Сумки', price: 3490, image: 'bag', colors: ['#2c302b', '#b1997b'], sizes: ['Единый'], description: 'Маленькая сумка для важных мелочей. Компактная форма, аккуратная фурнитура и характер, который завершает образ.' }
];
const categories = [['all', 'Все товары'], ['clothing', 'Одежда'], ['shoes', 'Обувь'], ['accessories', 'Аксессуары']];
const main = document.querySelector('main');
let storageAvailable = true;
function loadState(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
const loadedCart = loadState('fartoviy-cart', []);
let cart = Array.isArray(loadedCart) ? loadedCart.filter(item => {
  const product = products.find(p => p.id === item?.id);
  return product && product.sizes.includes(item.size) && Number.isInteger(item.qty) && item.qty > 0 && item.qty <= 99;
}) : [];
const loadedFavorites = loadState('fartoviy-favorites', []);
let favorites = Array.isArray(loadedFavorites) ? [...new Set(loadedFavorites.filter(id => products.some(p => p.id === id)))] : [];
let category = 'all';
let search = '';
let sort = 'popular';
let selectedSize = '';
let cameraStream = null;
let cameraGeneration = 0;
let photoURL = null;
let toastTimeout;
let lastRoute = '';
const getProduct = id => products.find(p => p.id === id);
const cartCount = () => cart.reduce((sum, item) => sum + item.qty, 0);
const subtotal = () => cart.reduce((sum, item) => sum + getProduct(item.id).price * item.qty, 0);
function persist() {
  try {
    localStorage.setItem('fartoviy-cart', JSON.stringify(cart));
    localStorage.setItem('fartoviy-favorites', JSON.stringify(favorites));
  } catch { storageAvailable = false; }
  updateHeader();
}
function updateHeader() {
  document.querySelector('.cart-count').textContent = cartCount();
  document.querySelector('.cart-link').setAttribute('aria-label', `Корзина: ${cartCount()} товаров`);
  const counter = document.querySelector('.favorite-count');
  counter.textContent = favorites.length;
  counter.hidden = !favorites.length;
}
function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
}
function toast(message) {
  const node = document.querySelector('#toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => node.classList.remove('show'), 3200);
}
function saveButton(product) {
  const saved = favorites.includes(product.id);
  return `<button class="icon-button save-button ${saved ? 'saved' : ''}" data-save="${product.id}" aria-label="${saved ? 'Убрать из избранного' : 'В избранное'}: ${product.name}" aria-pressed="${saved}">${icon('heart')}</button>`;
}
function productCard(product) {
  return `<article class="product-card"><div class="product-image"><a href="#product/${product.id}" aria-label="${product.name}"><img src="assets/${product.image}.jpg" alt="${product.name}" loading="lazy" width="800" height="950"></a>${product.badge ? `<span class="product-badge ${product.badge === 'NEW' ? 'neutral' : ''}">${product.badge}</span>` : ''}${saveButton(product)}<button class="quick-add" data-quick="${product.id}" aria-label="Выбрать размер и добавить ${product.name}" title="Выбрать размер">${icon('plus')}</button></div><p class="product-category">${product.label}</p><a class="product-title" href="#product/${product.id}">${product.name}</a><div class="product-meta"><span class="price">${money(product.price)}${product.old ? `<span class="old-price">${money(product.old)}</span>` : ''}</span><div class="color-swatches" aria-hidden="true">${product.colors.map(c => `<span class="swatch" style="background:${c}"></span>`).join('')}</div></div></article>`;
}
function hero() {
  return `<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><span class="eyebrow"><span class="tiny-star" aria-hidden="true">✳</span> НА ТВОЕЙ СТОРОНЕ СТИЛЯ</span><h1 id="hero-title">Твой стиль.<br>Твоя <em>удача.</em></h1><p>Вещи, которые совпадают с тобой.<br>Находи любимое — в каталоге или по фото.</p><div class="hero-buttons"><a href="#catalog" class="button button-dark">Найти своё ${icon('arrow')}</a><button class="text-button" data-action="camera">${icon('camera')} Поиск по фото</button></div><div class="hero-footnote"><span class="mini-avatars" aria-hidden="true"><span class="mini-avatar">☺</span><span class="mini-avatar">☺</span><span class="mini-avatar">☺</span></span>Для тех, кто носит свой характер</div></div><div class="hero-photo"><img src="assets/hero.jpg" alt="Уличный образ: голубое пальто и розовая сумка на фоне Миланского собора" fetchpriority="high" width="1400" height="1800"><div class="photo-topline"><span class="round-badge">THE EVERYDAY EDIT</span><span class="photo-counter">01 / 01</span></div><div class="floating-label">ХОРОШО БЫТЬ<strong>СОБОЙ</strong>ОСТАЛЬНОЕ НАЙДЁТСЯ</div><div class="photo-caption"><span>МЕНЬШЕ ПРАВИЛ. БОЛЬШЕ ТЕБЯ.</span><p>На каждый твой день.</p></div><a class="photo-arrow" href="#new" aria-label="Посмотреть новинки">${icon('arrowUp')}</a></div></section><div class="benefits"><div class="benefit">${icon('bag')}<div><strong>Находки на любой вкус</strong><p>Одежда, обувь и аксессуары</p></div></div><div class="benefit">${icon('shield')}<div><strong>Только удачные находки</strong><p>Отбираем вещи с характером</p></div></div><div class="benefit">${icon('heart')}<div><strong>Любимое — под рукой</strong><p>Сохраняй свои находки</p></div></div><div class="benefit">${icon('camera')}<div><strong>Увидел — нашёл</strong><p>Попробуй поиск по фото</p></div></div></div>`;
}
function catalogPage(mode) {
  const home = mode === 'home';
  const title = mode === 'favorites' ? 'Твои находки' : mode === 'new' ? 'Свежий взгляд' : home ? 'Возможно, это твоё' : 'Найди своё';
  main.innerHTML = `<div class="page-width">${home ? hero() : ''}<section class="catalog" aria-labelledby="catalog-title"><div class="section-top"><div><p class="section-kicker">${mode === 'favorites' ? 'СОХРАНИ НА ПОТОМ' : mode === 'new' ? 'ТОЛЬКО ПОЯВИЛИСЬ' : 'ОТБИРАЕМ С ХАРАКТЕРОМ'}</p><h${home ? '2' : '1'} id="catalog-title">${title}<span style="color:#8b9f6c">.</span></h${home ? '2' : '1'}></div><p>${mode === 'favorites' ? 'То, что хочется не потерять' : 'Хорошие вещи. Без лишнего шума.'}</p></div><div class="catalog-tools"><label class="search-box">${icon('search')}<input id="search" type="search" placeholder="Что будем искать?" aria-label="Поиск по названию товара" value="${escapeHTML(search)}"><button type="button" class="icon-button" data-action="camera" aria-label="Поиск по фото">${icon('camera')}</button></label><label class="sort-wrap"><span>Сортировать:</span><select id="sort" aria-label="Сортировка товаров"><option value="popular">По популярности</option><option value="price-up">Сначала дешевле</option><option value="price-down">Сначала дороже</option><option value="new">Сначала новинки</option></select></label></div><div class="category-row"><div class="categories">${categories.map(([id,label]) => `<button class="chip ${id === category ? 'active' : ''}" data-category="${id}" aria-pressed="${id === category}">${label}${id === 'all' ? '<span class="chip-count">08</span>' : ''}</button>`).join('')}</div><span class="results-count" aria-live="polite"></span></div><div id="product-grid" class="product-grid"></div>${home ? '<div class="collection-end"><a class="button" href="#catalog">Весь каталог ' + icon('arrow') + '</a></div>' : ''}</section>${home || mode === 'catalog' ? `<section class="discovery-banner"><div class="discovery-icon">${icon('camera')}</div><div><h2>Понравилось где-то? Найдётся здесь.</h2><p>Покажите нам фото — попробуем найти вашу следующую любимую вещь.</p></div><button class="button button-dark" data-action="camera">Попробовать поиск по фото ${icon('arrowUp')}</button></section>` : ''}</div>`;
  document.querySelector('#sort').value = sort;
  renderProducts();
}
function getMode() {
  return location.hash.replace(/^#/, '').split('/')[0] || 'home';
}
function renderProducts() {
  const mode = getMode();
  let list = products.filter(p => (category === 'all' || p.category === category) && (mode !== 'new' || p.isNew) && (mode !== 'favorites' || favorites.includes(p.id)) && `${p.name} ${p.label} ${categories.find(c => c[0] === p.category)[1]} ${window.FartoviyI18n.text(p.name, 'uk')} ${window.FartoviyI18n.text(p.label, 'uk')} ${window.FartoviyI18n.text(categories.find(c => c[0] === p.category)[1], 'uk')}`.toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru').trim()));
  if (sort === 'price-up') list.sort((a,b) => a.price - b.price);
  if (sort === 'price-down') list.sort((a,b) => b.price - a.price);
  if (sort === 'new') list.sort((a,b) => Number(!!b.isNew) - Number(!!a.isNew));
  const grid = document.querySelector('#product-grid');
  if (!grid) return;
  grid.innerHTML = list.length ? list.map(productCard).join('') : `<div class="empty-state">${icon(mode === 'favorites' && !favorites.length ? 'heart' : 'search')}<h2>${mode === 'favorites' && !favorites.length ? 'Сохраним что-нибудь классное?' : 'Пока ничего не нашлось'}</h2><p>${mode === 'favorites' && !favorites.length ? 'Нажмите на сердечко у понравившейся вещи — она появится здесь.' : 'Попробуйте другое название или посмотрите все товары.'}</p><button class="button button-dark" data-action="reset-filters">Смотреть все товары ${icon('arrow')}</button></div>`;
  document.querySelector('.results-count').textContent = `Найдено: ${list.length}`;
}
function detailPage(id) {
  const p = getProduct(id);
  if (!p) { notFound(); return; }
  selectedSize = p.sizes.includes('M') ? 'M' : p.sizes[Math.floor(p.sizes.length / 2)];
  main.innerHTML = `<div class="page-width"><nav class="breadcrumb" aria-label="Хлебные крошки"><a href="#">Главная</a><span>/</span><a href="#catalog">Каталог</a><span>/</span><span>${p.name}</span></nav><section class="detail-layout"><div class="detail-image"><img src="assets/${p.image}.jpg" alt="${p.name}" width="800" height="950"></div><div class="detail-info"><span class="eyebrow">${p.label} ${p.isNew ? '· НОВИНКА' : ''}</span><h1>${p.name}</h1><span class="price">${money(p.price)}${p.old ? `<span class="old-price">${money(p.old)}</span>` : ''}</span><p class="detail-description">${p.description}</p><p class="option-label">Размер: <strong id="size-label">${selectedSize}</strong></p><div class="sizes" role="group" aria-label="Выбор размера">${p.sizes.map(size => `<button class="size-button ${size === selectedSize ? 'active' : ''}" data-size="${size}" aria-pressed="${size === selectedSize}">${size}</button>`).join('')}</div><div class="detail-actions"><button class="button button-dark" data-add="${p.id}">В корзину ${icon('bag')}</button>${saveButton(p)}</div><button class="button button-outline buy-now" data-buy="${p.id}">Купить сейчас ${icon('arrow')}</button><div class="detail-perks"><div>${icon('bag')}Выберите свой размер</div><div>${icon('heart')}Сохраните понравившееся в избранное</div><div>${icon('shield')}Это демо: покупка не требует оплаты</div></div></div></section><section class="catalog"><div class="section-top"><div><p class="section-kicker">В ХОРОШЕЙ КОМПАНИИ</p><h2>Ещё немного твоего</h2></div></div><div class="product-grid" style="margin-top:25px">${products.filter(item => item.id !== p.id).slice(0,4).map(productCard).join('')}</div></section></div>`;
}
function cartPage() {
  if (!cart.length) {
    main.innerHTML = `<div class="page-width cart-page"><h1>Твоя корзина<span style="color:#8b9f6c">.</span></h1><div class="empty-state">${icon('bag')}<h2>Здесь будет что-то твоё</h2><p>Самое время найти любимую вещь.<br>Начнём с каталога?</p><a class="button button-dark" href="#catalog">За находками ${icon('arrow')}</a></div></div>`;
    return;
  }
  const total = subtotal();
  main.innerHTML = `<div class="page-width cart-page"><p class="section-kicker">ХОРОШИЙ ВЫБОР</p><h1>Твоя корзина<span style="color:#8b9f6c">.</span></h1><div class="cart-layout"><div><div class="cart-items">${cart.map(item => {
    const p = getProduct(item.id);
    return `<article class="cart-item"><a href="#product/${p.id}"><img src="assets/${p.image}.jpg" alt="${p.name}" width="110" height="130"></a><div class="cart-item-body"><h2><a href="#product/${p.id}">${p.name}</a></h2><p>Размер: ${item.size}</p><div class="cart-item-bottom"><div class="quantity" aria-label="Количество ${p.name}"><button data-quantity="-1" data-id="${p.id}" data-item-size="${item.size}" aria-label="Уменьшить количество ${p.name}">${icon('minus')}</button><span>${item.qty}</span><button data-quantity="1" data-id="${p.id}" data-item-size="${item.size}" aria-label="Увеличить количество ${p.name}" ${item.qty >= 99 ? 'disabled' : ''}>${icon('plus')}</button></div><span class="price">${money(p.price * item.qty)}</span></div></div><button class="icon-button remove-item" data-remove="${p.id}" data-item-size="${item.size}" aria-label="Удалить ${p.name}">${icon('trash')}</button></article>`;
  }).join('')}</div><a class="continue-shopping" href="#catalog">${icon('arrow')} Продолжить выбирать</a></div><aside class="order-summary"><h2>Всё сошлось</h2><div class="summary-row"><span>Товары (${cartCount()})</span><span>${money(total)}</span></div><div class="summary-row total"><span>Итого</span><span>${money(total)}</span></div><button class="button button-dark" data-action="checkout">Оформить заказ ${icon('arrow')}</button><p>Демонстрационный заказ. Оплата не требуется, товары не отправляются.</p></aside></div></div>`;
}
function aboutPage() {
  main.innerHTML = `<section class="about-page"><span class="eyebrow">ПРИЯТНО ПОЗНАКОМИТЬСЯ · FARTOVIY</span><h1>Удача — найти<br>что-то по себе.</h1><p class="lead">Мы придумали место, где можно спокойно выбрать одежду, обувь и аксессуары с характером. Без лишнего шума. С вниманием к тому, что нравится именно вам.</p><div class="about-cards"><div class="about-card">${icon('bag')}<h2>Выбирайте в каталоге</h2><p>Категории, поиск, сортировка, карточки товаров и выбор размера. Всё знакомо — и всё под рукой.</p></div><div class="about-card">${icon('camera')}<h2>Начните с фотографии</h2><p>Откройте камеру или загрузите изображение. В демо подборка открывается после выбора категории.</p></div><div class="about-card">${icon('heart')}<h2>Сохраняйте своё</h2><p>Добавляйте находки в избранное и собирайте корзину. Они сохранятся в браузере до следующего визита.</p></div></div><p class="about-note"><strong>Это интерактивный прототип магазина.</strong> Здесь можно пройти путь от выбора вещи до тестового заказа. Каталог и цены — демонстрационные. Цены указаны в условных единицах и не привязаны к валюте. Реальные платежи, отправка заказов и автоматическое распознавание изображений не подключены. Контактные данные из формы не сохраняются и никуда не отправляются.</p><a href="#catalog" class="button button-dark">Посмотреть, что внутри ${icon('arrow')}</a></section>`;
}
function notFound() {
  main.innerHTML = `<div class="empty-state"><h1>Эта находка потерялась</h1><p>Такой страницы пока нет. В каталоге точно найдётся что-то интересное.</p><a class="button button-dark" href="#catalog">В каталог ${icon('arrow')}</a></div>`;
}
function route() {
  const routeValue = location.hash.slice(1);
  const [mode,id] = routeValue.split('/');
  if (routeValue !== lastRoute) {
    search = '';
    sort = 'popular';
    category = 'all';
  }
  lastRoute = routeValue;
  if (mode === 'product') detailPage(id);
  else if (mode === 'cart') cartPage();
  else if (mode === 'about') aboutPage();
  else if (['','catalog','new','favorites'].includes(mode)) catalogPage(mode || 'home');
  else notFound();
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === mode));
  const titles = { catalog: 'Каталог', cart: 'Корзина', new: 'Новинки', favorites: 'Избранное', about: 'О проекте', product: getProduct(id)?.name || 'Товар не найден' };
  document.title = `${titles[mode] || 'На твоей стороне стиля'} — FARTOVIY`;
  updateHeader();
}
function addToCart(id, size) {
  const p = getProduct(id);
  if (!p || !p.sizes.includes(size)) return;
  const existing = cart.find(item => item.id === id && item.size === size);
  if (existing && existing.qty >= 99) { toast('Максимум 99 вещей одного размера'); return; }
  if (existing) existing.qty++;
  else cart.push({ id, size, qty: 1 });
  persist();
  toast(storageAvailable ? `${p.name} · ${size} — в корзине` : 'Добавлено в корзину. Браузер не разрешает сохранение после закрытия.');
}
function toggleFavorite(id) {
  const saved = favorites.includes(id);
  favorites = saved ? favorites.filter(item => item !== id) : [...favorites,id];
  persist();
  if (getMode() === 'favorites') renderProducts();
  else document.querySelectorAll(`[data-save="${id}"]`).forEach(button => {
    button.classList.toggle('saved', !saved);
    button.setAttribute('aria-pressed', String(!saved));
    button.setAttribute('aria-label', `${!saved ? 'Убрать из избранного' : 'В избранное'}: ${getProduct(id).name}`);
  });
  toast(saved ? 'Убрано из избранного' : 'Сохранено в твоих находках');
}
function openCheckout() {
  if (!cart.length) return;
  document.querySelector('#checkout-content').innerHTML = `<h2 id="checkout-title">Почти ваша находка.</h2><p class="muted">Проверим, как будет выглядеть оформление заказа.</p><form id="checkout-form" class="checkout-form"><label class="field">Как к вам обращаться<input name="customer" autocomplete="given-name" placeholder="Ваше имя" required maxlength="60"></label><label class="field">Телефон<input type="tel" name="phone" autocomplete="tel" placeholder="Номер телефона" required pattern="[+0-9\\(\\) .\\-]{7,25}" maxlength="25" title="Введите телефон: от 7 до 25 символов, цифры, +, пробелы, скобки и дефисы"></label><div class="checkout-notice"><strong>Способ оплаты: демо-оплата.</strong><br>Без ввода банковской карты и списания денег.</div><div class="checkout-notice">Это демозаказ. Можно указать вымышленные данные. Они не сохраняются и никуда не отправляются. Списания денег не будет.</div><div class="summary-row total"><span>Итого</span><strong>${money(subtotal())}</strong></div><button class="button button-dark" type="submit">Оплатить демо ${icon('check')}</button></form>`;
  document.querySelector('#checkout-dialog').showModal();
}
function completeOrder(event) {
  event.preventDefault();
  const number = `FT-${Date.now().toString().slice(-6)}`;
  cart = [];
  persist();
  document.querySelector('#checkout-content').innerHTML = `<div class="checkout-success"><div class="success-icon">${icon('check')}</div><p class="section-kicker">ДЕМОЗАКАЗ ${number}</p><h2 id="checkout-title">Демо-оплата прошла!</h2><p class="muted">Вы прошли весь путь от находки до оформления.<br>Это тест: деньги не списаны, товары не отправляются.</p><button class="button button-dark" data-action="finish-order">За новыми находками ${icon('arrow')}</button></div>`;
  cartPage();
}
function stopCamera() {
  cameraGeneration++;
  cameraStream?.getTracks().forEach(track => track.stop());
  cameraStream = null;
  const video = document.querySelector('#camera-stage video');
  if (video) video.srcObject = null;
  document.querySelector('.capture-button').hidden = true;
}
function openCamera() {
  stopCamera();
  if (photoURL) { URL.revokeObjectURL(photoURL); photoURL = null; }
  document.querySelector('#camera-stage').innerHTML = `${icon('camera')}<p>Ваша следующая находка —<br>по ту сторону камеры</p>`;
  document.querySelector('#camera-status').textContent = '';
  document.querySelector('#photo-results').hidden = true;
  document.querySelector('#photo-input').value = '';
  document.querySelector('#camera-dialog').showModal();
}
async function startCamera() {
  stopCamera();
  const currentGeneration = cameraGeneration;
  const status = document.querySelector('#camera-status');
  if (!navigator.mediaDevices?.getUserMedia) {
    status.textContent = 'Камера доступна через localhost или HTTPS. Вы также можете загрузить фото.';
    return;
  }
  status.textContent = 'Разрешите доступ к камере в браузере…';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    if (currentGeneration !== cameraGeneration || !document.querySelector('#camera-dialog').open) { stream.getTracks().forEach(track => track.stop()); return; }
    cameraStream = stream;
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    document.querySelector('#camera-stage').replaceChildren(video);
    await video.play();
    if (currentGeneration !== cameraGeneration) return;
    document.querySelector('.capture-button').hidden = false;
    document.querySelector('#photo-results').hidden = true;
    status.textContent = 'Наведите камеру на вещь и сделайте снимок.';
  } catch (error) {
    if (currentGeneration !== cameraGeneration) return;
    stopCamera();
    status.textContent = error.name === 'NotAllowedError' ? 'Нет доступа к камере. Разрешите его в браузере или загрузите фото.' : 'Не получилось включить камеру. Попробуйте загрузить готовое фото.';
  }
}
function showPhoto(src) {
  stopCamera();
  const image = new Image();
  image.alt = 'Ваш снимок для демонстрации поиска';
  image.onload = () => {
    document.querySelector('#camera-stage').replaceChildren(image);
    document.querySelector('#photo-results').hidden = false;
    document.querySelector('#camera-status').textContent = 'Фото готово. Выберите категорию ниже.';
  };
  image.onerror = () => { document.querySelector('#camera-status').textContent = 'Не удалось прочитать фото. Попробуйте JPEG, PNG или WebP.'; };
  image.src = src;
}
function capture() {
  const video = document.querySelector('#camera-stage video');
  if (!video?.videoWidth) { toast('Подождите, пока камера будет готова'); return; }
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1600 / video.videoWidth);
  canvas.width = video.videoWidth * scale;
  canvas.height = video.videoHeight * scale;
  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
  showPhoto(canvas.toDataURL('image/jpeg', .85));
}
document.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.category) {
    category = target.dataset.category;
    document.querySelectorAll('[data-category]').forEach(b => { b.classList.toggle('active', b.dataset.category === category); b.setAttribute('aria-pressed', String(b.dataset.category === category)); });
    renderProducts();
  }
  if (target.dataset.save) toggleFavorite(target.dataset.save);
  if (target.dataset.quick) location.hash = `product/${target.dataset.quick}`;
  if (target.dataset.size) {
    selectedSize = target.dataset.size;
    document.querySelector('#size-label').textContent = selectedSize;
    document.querySelectorAll('[data-size]').forEach(b => { b.classList.toggle('active', b.dataset.size === selectedSize); b.setAttribute('aria-pressed', String(b.dataset.size === selectedSize)); });
  }
  if (target.dataset.add) addToCart(target.dataset.add, selectedSize);
  if (target.dataset.buy) {
    addToCart(target.dataset.buy, selectedSize);
    history.pushState(null, '', '#cart');
    route();
    window.scrollTo(0, 0);
    openCheckout();
  }
  if (target.dataset.quantity) {
    const item = cart.find(i => i.id === target.dataset.id && i.size === target.dataset.itemSize);
    if (item) {
      item.qty = Math.min(99, item.qty + Number(target.dataset.quantity));
      cart = cart.filter(i => i.qty > 0);
      persist();
      cartPage();
    }
  }
  if (target.dataset.remove) {
    cart = cart.filter(i => !(i.id === target.dataset.remove && i.size === target.dataset.itemSize));
    persist();
    cartPage();
    toast('Товар убран из корзины');
  }
  if (target.dataset.photoCategory) {
    const nextCategory = target.dataset.photoCategory;
    document.querySelector('#camera-dialog').close();
    if (location.hash !== '#catalog') { history.pushState(null, '', '#catalog'); route(); }
    category = nextCategory;
    search = '';
    catalogPage('catalog');
    document.querySelector('#main').scrollIntoView({ behavior: 'instant' });
    toast('Демоподборка по выбранной категории');
  }
  switch (target.dataset.action) {
    case 'camera': openCamera(); break;
    case 'start-camera': startCamera(); break;
    case 'capture': capture(); break;
    case 'upload': document.querySelector('#photo-input').click(); break;
    case 'close-dialog': target.closest('dialog').close(); break;
    case 'checkout': openCheckout(); break;
    case 'finish-order': document.querySelector('#checkout-dialog').close(); location.hash = 'catalog'; break;
    case 'reset-filters':
      category = 'all'; search = ''; sort = 'popular';
      if (location.hash !== '#catalog') location.hash = 'catalog';
      else catalogPage('catalog');
      break;
  }
});
document.addEventListener('input', event => {
  if (event.target.id === 'search') { search = event.target.value; renderProducts(); }
});
document.addEventListener('change', event => {
  if (event.target.id === 'sort') { sort = event.target.value; renderProducts(); }
  if (event.target.id === 'photo-input') {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Выберите файл изображения'); return; }
    if (file.size > 15 * 1024 * 1024) { toast('Выберите фото размером до 15 МБ'); return; }
    if (photoURL) URL.revokeObjectURL(photoURL);
    photoURL = URL.createObjectURL(file);
    showPhoto(photoURL);
  }
});
document.addEventListener('submit', event => {
  if (event.target.id === 'checkout-form') completeOrder(event);
});
document.querySelector('#camera-dialog').addEventListener('close', () => {
  stopCamera();
  if (photoURL) { URL.revokeObjectURL(photoURL); photoURL = null; }
  document.querySelector('#camera-stage').replaceChildren();
});
document.querySelector('#checkout-dialog').addEventListener('close', () => { document.querySelector('#checkout-content').replaceChildren(); });
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
});
window.addEventListener('hashchange', () => { route(); window.scrollTo(0,0); main.focus({ preventScroll: true }); });
window.addEventListener('storage', event => {
  if (event.key === 'fartoviy-cart' || event.key === 'fartoviy-favorites') location.reload();
});
window.addEventListener('pagehide', stopCamera);
hydrateIcons();
route();

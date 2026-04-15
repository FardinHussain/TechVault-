/* ── Configuration ───────────────────────────────────────────── */
const API_URL = 'https://techvault-acl4.onrender.com';

/* ── Auth helpers ────────────────────────────────────────────── */
const getToken = () => localStorage.getItem('tvToken');
const getUser  = () => {
  try { return JSON.parse(localStorage.getItem('tvUser')); } catch { return null; }
};

/* ── API fetch wrapper ───────────────────────────────────────── */
const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  try {
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
  } catch (err) {
    console.error("Fetch Error:", err);
    return null;
  }
};

/* ── Helpers ─────────────────────────────────────────────────── */
const fmt = (n) => '$' + Number(n || 0).toFixed(2);
const discountedPrice = (price, pct) => price * (1 - (pct || 0) / 100);

const renderStars = (rating) => {
  const full = Math.round(rating || 0);
  let s = '';
  for (let i = 1; i <= 5; i++) s += i <= full ? '★' : '☆';
  return s;
};

/* ── Product Card Builder ────────────────────────────────────── */
const buildProductCard = (p) => {
  const id = p._id;
  const dp = discountedPrice(p.price, p.discountPercentage);
  const hasDis = (p.discountPercentage || 0) >= 1;

  const card = document.createElement('div');
  card.className = 'product-card';
  card.innerHTML = `
    <div class="product-card-img" onclick="location.href='product.html?id=${id}'">
      ${hasDis ? `<div class="product-card-discount">-${Math.round(p.discountPercentage)}%</div>` : ''}
      <img src="${p.thumbnail || 'https://via.placeholder.com/300x300?text=No+Image'}" alt="${p.title}">
    </div>
    <div class="product-card-body" onclick="location.href='product.html?id=${id}'">
      <div class="product-card-brand">${p.brand || 'Generic'}</div>
      <div class="product-card-title">${p.title}</div>
      <div class="product-card-rating">
        <span class="stars stars-sm">${renderStars(p.rating)}</span>
        <span>${Number(p.rating || 0).toFixed(1)}</span>
      </div>
      <div class="product-card-price">
        <span class="current">${fmt(hasDis ? dp : p.price)}</span>
        ${hasDis ? `<span class="original">${fmt(p.price)}</span>` : ''}
      </div>
    </div>
    <div class="product-card-footer">
      <button class="btn btn-primary btn-sm btn-full add-to-cart-btn" data-id="${id}" ${p.stock === 0 ? 'disabled' : ''}>
        ${p.stock === 0 ? 'Out of Stock' : '🛒 Add to Cart'}
      </button>
    </div>`;
  return card;
};

/* ── Skeleton Loaders ────────────────────────────────────────── */
const buildSkeletons = (n = 8) => {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'skeleton-card';
    el.innerHTML = `
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>`;
    frag.appendChild(el);
  }
  return frag;
};

/* ── Navbar Logic ────────────────────────────────────────────── */
const hydrateNavbar = () => {
  const user = getUser();
  const loginLink = document.getElementById('nav-login-link');
  const userMenu  = document.getElementById('nav-user-menu');
  const userNameEl= document.getElementById('nav-user-name');

  if (loginLink && user) {
    loginLink.classList.add('hidden');
    if (userMenu) userMenu.classList.remove('hidden');
    if (userNameEl) userNameEl.textContent = user.name.split(' ')[0];
  }

  const ham = document.getElementById('hamburger');
  const mMenu = document.getElementById('mobile-menu');
  if (ham && mMenu) {
    ham.onclick = () => {
      ham.classList.toggle('open');
      mMenu.classList.toggle('open');
    };
  }
};

/* ── Load Data ───────────────────────────────────────────────── */
const loadCategories = async () => {
  const container = document.getElementById('categories-container');
  if (!container) return;

  const data = await apiFetch('/api/products/categories');
  if (data && data.status === 'success') {
    container.innerHTML = data.categories.map(c => 
      `<button class="category-btn" onclick="location.href='search.html?category=${c}'">${c}</button>`
    ).join('');
  }
};

/* ── Initialize ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  hydrateNavbar();
  loadCategories(); // This will fetch your categories
  console.log("App Initialized. Connected to:", API_URL);
});

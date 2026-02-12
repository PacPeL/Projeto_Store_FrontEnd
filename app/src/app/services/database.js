// src/services/database.js
// Interfaz estable (auth, users, products, reviews, wishlist, cart, notifications)
// Implementación TEMPORAL MOCK usando localStorage.
// Más adelante, reemplazás cada método por fetch a tu API (MongoDB).

// -------- helpers de almacenamiento local --------
const LS = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

const KEYS = {
  USERS: 'db_users',
  PRODUCTS: 'db_products',
  REVIEWS: 'db_reviews',           // { [productId]: Review[] }
  CARTS: 'db_carts',               // { [uid]: { [productId]: qty } }
  WISHLISTS: 'db_wishlists',       // { [uid]: string[] }
  NOTIFS: 'db_notifications',      // { [uid]: Notification[] }
  SESSION: 'db_session',           // { uid }
};

// -------- util ids --------
const uid = () => crypto.randomUUID();

// -------- auth --------
export const auth = {
  async signIn(email, password) {
    const users = LS.get(KEYS.USERS, []);
    const found = users.find(u => u.email === email && u.password === password);
    if (!found) throw new Error('Credenciales inválidas');
    LS.set(KEYS.SESSION, { uid: found.uid });
    return sanitizeUser(found);
  },

  async register({ name, email, password }) {
    const users = LS.get(KEYS.USERS, []);
    if (users.some(u => u.email === email)) {
      throw new Error('El email ya está registrado');
    }
    const user = {
      uid: uid(),
      name,
      email,
      password, // ❗ en real: NUNCA guardar plano (hash en el backend)
      role: 'user',
      photoURL: '',
      settings: { theme: 'light', lang: 'es' },
      createdAt: Date.now(),
    };
    users.push(user);
    LS.set(KEYS.USERS, users);
    LS.set(KEYS.SESSION, { uid: user.uid });
    return sanitizeUser(user);
  },

  async signOut() {
    LS.set(KEYS.SESSION, null);
  },

  async currentUser() {
    const session = LS.get(KEYS.SESSION, null);
    if (!session?.uid) return null;
    const users = LS.get(KEYS.USERS, []);
    const u = users.find(x => x.uid === session.uid);
    return u ? sanitizeUser(u) : null;
  },
};

// -------- users --------
export const users = {
  async get(uid) {
    const list = LS.get(KEYS.USERS, []);
    return sanitizeUser(list.find(u => u.uid === uid) || null);
  },
  async update(uid, patch) {
    const list = LS.get(KEYS.USERS, []);
    const idx = list.findIndex(u => u.uid === uid);
    if (idx === -1) throw new Error('Usuario no encontrado');
    list[idx] = { ...list[idx], ...patch };
    LS.set(KEYS.USERS, list);
    return sanitizeUser(list[idx]);
  },
};

// -------- products --------
export const products = {
  async list() {
    return LS.get(KEYS.PRODUCTS, []);
  },
  async create(p) {
    const list = LS.get(KEYS.PRODUCTS, []);
    const now = Date.now();
    const item = {
      id: uid(),
      ownerUid: p.ownerUid,
      title: p.title,
      description: p.description || '',
      category: p.category || 'general',
      price: Number(p.price || 0),
      discount: Number(p.discount || 0),
      stock: Number(p.stock || 0),
      imageBase64: p.imageBase64 || '',
      createdAt: now,
      updatedAt: now,
      active: true,
    };
    list.push(item);
    LS.set(KEYS.PRODUCTS, list);
    return item;
  },
  async update(id, patch) {
    const list = LS.get(KEYS.PRODUCTS, []);
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Producto no encontrado');
    list[idx] = { ...list[idx], ...patch, updatedAt: Date.now() };
    LS.set(KEYS.PRODUCTS, list);
    return list[idx];
  },
  async remove(id) {
    const list = LS.get(KEYS.PRODUCTS, []);
    LS.set(KEYS.PRODUCTS, list.filter(p => p.id !== id));
  },
  async clearAll() {
    LS.set(KEYS.PRODUCTS, []);
  },
};

// -------- reviews (promedio 0.5 steps lo calculás en UI con util) --------
export const reviews = {
  async list(productId) {
    const map = LS.get(KEYS.REVIEWS, {});
    return map[productId] || [];
  },
  async add(productId, review) {
    const map = LS.get(KEYS.REVIEWS, {});
    const arr = map[productId] || [];
    arr.push({ id: uid(), ...review, createdAt: Date.now() });
    map[productId] = arr;
    LS.set(KEYS.REVIEWS, map);
    return arr[arr.length - 1];
  },
};

// -------- cart --------
export const cart = {
  async get(uid) {
    const map = LS.get(KEYS.CARTS, {});
    return map[uid] || {};
  },
  async set(uid, newCart) {
    const map = LS.get(KEYS.CARTS, {});
    map[uid] = newCart;
    LS.set(KEYS.CARTS, map);
  },
  async clear(uid) {
    const map = LS.get(KEYS.CARTS, {});
    delete map[uid];
    LS.set(KEYS.CARTS, map);
  },
};

// -------- wishlist --------
export const wishlist = {
  async list(uid) {
    const map = LS.get(KEYS.WISHLISTS, {});
    return map[uid] || [];
  },
  async add(uid, productId) {
    const map = LS.get(KEYS.WISHLISTS, {});
    const arr = new Set(map[uid] || []);
    arr.add(productId);
    map[uid] = Array.from(arr);
    LS.set(KEYS.WISHLISTS, map);
  },
  async remove(uid, productId) {
    const map = LS.get(KEYS.WISHLISTS, {});
    const arr = new Set(map[uid] || []);
    arr.delete(productId);
    map[uid] = Array.from(arr);
    LS.set(KEYS.WISHLISTS, map);
  },
};

// -------- notifications (simuladas) --------
export const notifications = {
  async list(uid) {
    const map = LS.get(KEYS.NOTIFS, {});
    return map[uid] || [];
  },
  async push(uid, notif) {
    const map = LS.get(KEYS.NOTIFS, {});
    const arr = map[uid] || [];
    arr.push({ id: uidv4(), read: false, createdAt: Date.now(), ...notif });
    map[uid] = arr;
    LS.set(KEYS.NOTIFS, map);
  },
  async markRead(uid, id) {
    const map = LS.get(KEYS.NOTIFS, {});
    const arr = map[uid] || [];
    const idx = arr.findIndex(n => n.id === id);
    if (idx !== -1) arr[idx].read = true;
    map[uid] = arr;
    LS.set(KEYS.NOTIFS, map);
  },
};

// -------- utils --------
function sanitizeUser(u) {
  if (!u) return null;
  const { password, ...safe } = u;
  return safe;
}
function uidv4() {
  return crypto.randomUUID();
}
``
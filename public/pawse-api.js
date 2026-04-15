// pawse-api.js — shared API helper for pawse media
// replaces localStorage with Cloudflare KV via Worker API

window.PAWSE_API = 'https://pawse-api.pawse-media.workers.dev';
window._pawseCache = {};
window._pawsePassword = '';

window.pawseApi = {
  // read a key — uses cache first, then fetches
  async get(key) {
    if (window._pawseCache[key] !== undefined) return window._pawseCache[key];
    try {
      var res = await fetch(window.PAWSE_API + '/api/data/' + key);
      var data = await res.json();
      window._pawseCache[key] = data;
      return data;
    } catch(e) {
      // fallback to localStorage
      try { return JSON.parse(localStorage.getItem('pawse_' + key)); } catch(e2) { return null; }
    }
  },

  // write a key — requires password
  async set(key, value) {
    try {
      var res = await fetch(window.PAWSE_API + '/api/data/' + key, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: value, password: window._pawsePassword })
      });
      var data = await res.json();
      if (data.success) {
        window._pawseCache[key] = value;
        // also save to localStorage as fallback
        try { localStorage.setItem('pawse_' + key, JSON.stringify(value)); } catch(e) {}
        return true;
      }
      return false;
    } catch(e) {
      // fallback to localStorage
      try { localStorage.setItem('pawse_' + key, JSON.stringify(value)); } catch(e2) {}
      return true;
    }
  },

  // login — check password
  async login(password) {
    try {
      var res = await fetch(window.PAWSE_API + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password })
      });
      var data = await res.json();
      if (data.success) {
        window._pawsePassword = password;
        return true;
      }
      return false;
    } catch(e) {
      // fallback to localStorage check
      var stored = null;
      try { stored = JSON.parse(localStorage.getItem('pawse_password')); } catch(e2) {}
      if (password === (stored || 'pawse2026')) {
        window._pawsePassword = password;
        return true;
      }
      return false;
    }
  },

  // load all data at once (for pages that need everything)
  async loadAll() {
    try {
      var res = await fetch(window.PAWSE_API + '/api/all');
      var data = await res.json();
      Object.keys(data).forEach(function(k) {
        window._pawseCache[k] = data[k];
      });
      return data;
    } catch(e) {
      return null;
    }
  },

  // init defaults on the server
  async init() {
    try {
      await fetch(window.PAWSE_API + '/api/init', { method: 'POST' });
    } catch(e) {}
  }
};

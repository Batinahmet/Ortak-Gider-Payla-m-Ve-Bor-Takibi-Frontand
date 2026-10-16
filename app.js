'use strict';

const API = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || 'http://localhost:3000/api';
const app = document.getElementById('app');
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tl = (k) => `${(k / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
const toKurus = (v) => Math.round(parseFloat(String(v).replace(',', '.')) * 100);

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* depolama kapalı olabilir */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* yoksay */ } },
};
let token = store.get('token');
let me = null;
let aiAvailable = false;

async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) { token = null; me = null; store.del('token'); }
  if (!res.ok) throw new Error(data.error || `Hata (${res.status})`);
  return data;
}

const showError = (el, e) => { el.textContent = e.message || String(e); el.className = 'error'; };

// ---------- Giriş / kayıt ----------
function authView(mode = 'login') {
  const reg = mode === 'register';
  app.innerHTML = `<h1>Ortak Gider</h1><div class="card"><h2>${reg ? 'Kayıt ol' : 'Giriş yap'}</h2>
    <form id="f">${reg ? '<input name="name" placeholder="Adın" required maxlength="50">' : ''}
    <input name="email" type="email" placeholder="E-posta" required>
    <input name="password" type="password" placeholder="Şifre (en az 8 karakter)" required minlength="8">
    <button>${reg ? 'Kayıt ol' : 'Giriş yap'}</button><div id="err"></div></form>
    <button class="ghost" id="sw">${reg ? 'Hesabım var' : 'Yeni hesap oluştur'}</button></div>`;
  $('#sw').onclick = () => authView(reg ? 'login' : 'register');
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    try {
      const r = await api('POST', reg ? '/auth/register' : '/auth/login', d);
      token = r.token; me = r.user; store.set('token', token);
      route();
    } catch (err) { showError($('#err'), err); }
  };
}

// ---------- Ana sayfa ----------
async function homeView() {
  const { groups } = await api('GET', '/groups');
  app.innerHTML = `<div class="top"><h1>Merhaba ${esc(me.name)}</h1><button class="ghost small" id="out">Çıkış</button></div>
    <div class="card"><h2>Yeni grup</h2><input id="gn" placeholder="Grup adı (ör. Ev arkadaşları)" maxlength="60"><button id="mk">Grup oluştur</button></div>
    <div class="card"><h2>Davet koduyla katıl</h2><input id="code" placeholder="Davet kodu" maxlength="20"><button class="ghost" id="jn">Katıl</button><div id="err"></div></div>
    <div class="card"><h2>Gruplarım</h2>${groups.length
      ? groups.map((g) => `<div class="row"><span>${esc(g.name)}</span><a href="#/g/${esc(g.id)}">Aç</a></div>`).join('')
      : '<p class="muted">Henüz grubun yok.</p>'}</div>`;
  $('#out').onclick = async () => { try { await api('POST', '/auth/logout'); } catch { /* yoksay */ } token = null; store.del('token'); route(); };
  $('#mk').onclick = async () => {
    const name = $('#gn').value.trim();
    if (!name) return;
    try { const g = await api('POST', '/groups', { name }); location.hash = `#/g/${g.id}`; } catch (e) { showError($('#err'), e); }
  };
  $('#jn').onclick = async () => {
    try { const g = await api('POST', '/groups/join', { code: $('#code').value.trim() }); location.hash = `#/g/${g.id}`; } catch (e) { showError($('#err'), e); }
  };
}

// ---------- Grup sayfası ----------
async function groupView(gid) {
  const g = await api('GET', `/groups/${gid}`);
  const names = Object.fromEntries(g.members.map((m) => [m.id, m.name]));
  const nm = (u) => (u === me.id ? 'Sen' : names[u] || '?');
  const inviteLink = `${location.origin}${location.pathname}#join=${g.inviteCode}`;
  const memberOpts = (sel) => g.members.map((m) => `<option value="${esc(m.id)}" ${m.id === sel ? 'selected' : ''}>${esc(nm(m.id))}</option>`).join('');

  app.innerHTML = `<a href="#/">← Gruplar</a><h1>${esc(g.name)}</h1>
  <section class="card"><h2>Davet</h2><p>Kod: <b>${esc(g.inviteCode)}</b></p>
    <input id="link" readonly value="${esc(inviteLink)}"><button class="ghost" id="copy">Linki kopyala</button></section>

  <section class="card"><h2>Harcama ekle</h2><form id="ef">
    <input name="title" placeholder="Ne için? (market, elektrik…)" required maxlength="120">
    <input name="amount" type="text" inputmode="decimal" placeholder="Tutar (₺)" required>
    <select name="paidBy">${g.members.map((m) => `<option value="${esc(m.id)}" ${m.id === me.id ? 'selected' : ''}>${esc(nm(m.id))} ödedi</option>`).join('')}</select>
    <select name="type"><option value="equal">Eşit böl</option><option value="percent">Yüzdeyle böl</option><option value="exact">Tutarla böl</option></select>
    <div id="parts">${g.members.map((m) => `<label class="member-row"><input type="checkbox" checked value="${esc(m.id)}">${esc(nm(m.id))}<input type="number" step="0.01" min="0" placeholder="" hidden></label>`).join('')}</div>
    <button>Ekle</button><div id="eerr"></div></form></section>

  <section class="card"><h2>🤖 Fişten ekle</h2>
    <input id="file" type="file" accept="image/*"><button id="scan">Fişi oku</button><div id="scanout" class="muted"></div></section>

  <section class="card"><h2>🤖 Borç özeti</h2><button class="ghost" id="sum">Özet oluştur</button><div id="sumout" class="muted"></div></section>
  <div id="live"></div>`;

  $('#copy').onclick = () => { $('#link').select(); try { navigator.clipboard.writeText(inviteLink); } catch { document.execCommand('copy'); } };

  // Bölüşüm tipine göre kişi başı alan göster
  const typeSel = $('#ef select[name=type]');
  typeSel.onchange = () => {
    const t = typeSel.value;
    document.querySelectorAll('#parts input[type=number]').forEach((i) => {
      i.hidden = t === 'equal';
      i.placeholder = t === 'percent' ? '%' : '₺';
    });
  };
  $('#ef').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const rows = [...document.querySelectorAll('#parts .member-row')].filter((r) => r.querySelector('[type=checkbox]').checked);
    const type = f.type.value;
    const body = { title: f.title.value.trim(), amount: toKurus(f.amount.value), paidBy: f.paidBy.value, splitType: type };
    if (type === 'equal') body.participants = rows.map((r) => r.querySelector('[type=checkbox]').value);
    else body.shares = Object.fromEntries(rows.map((r) => {
      const v = r.querySelector('[type=number]').value;
      return [r.querySelector('[type=checkbox]').value, type === 'percent' ? parseFloat(v) : toKurus(v)];
    }));
    try { await api('POST', `/groups/${gid}/expenses`, body); f.title.value = ''; f.amount.value = ''; $('#eerr').textContent = ''; refresh(); }
    catch (err) { showError($('#eerr'), err); }
  };

  // Fiş okuma (yapay zeka)
  let scanned = null;
  const drawScan = () => {
    const out = $('#scanout');
    const sum = scanned.items.reduce((a, i) => a + i.price, 0);
    out.innerHTML = scanned.items.map((i, k) => `<div class="row"><span>${esc(i.name)}<br><b>${tl(i.price)}</b></span>
        <select data-k="${k}"><option value="all" ${i.to === 'all' ? 'selected' : ''}>Herkes (ortak)</option>${g.members.map((m) => `<option value="${esc(m.id)}" ${i.to === m.id ? 'selected' : ''}>${esc(nm(m.id))} (kişisel)</option>`).join('')}</select></div>`).join('')
      + (scanned.total && Math.abs(sum - scanned.total) > 1 ? `<p class="neg">Kalem toplamı ${tl(sum)}, fiş toplamı ${tl(scanned.total)}: farklı, kontrol et.</p>` : `<p class="pos">Toplam: ${tl(sum)}</p>`)
      + `<select id="sp">${memberOpts(me.id)}</select><button id="save">Harcamaya ekle</button><div id="serr"></div>`;
    out.querySelectorAll('select[data-k]').forEach((s) => {
      s.onchange = async () => {
        const it = scanned.items[s.dataset.k];
        it.to = s.value;
        const kind = s.value === 'all' ? 'ortak' : 'kisisel';
        if (kind !== it.suggestion) {
          it.suggestion = kind;
          try { await api('POST', `/groups/${gid}/rules`, { item: it.name, kind }); } catch { /* kural kaydı başarısız olsa da devam */ }
        }
      };
    });
    $('#save').onclick = async () => {
      try {
        await api('POST', `/groups/${gid}/expenses`, {
          title: `Fiş ${new Date().toLocaleDateString('tr-TR')}`, splitType: 'items', paidBy: $('#sp').value,
          items: scanned.items.map((i) => ({ name: i.name, price: i.price, to: i.to === 'all' ? 'all' : [i.to] })),
        });
        scanned = null; out.textContent = 'Eklendi ✓'; refresh();
      } catch (err) { showError($('#serr'), err); }
    };
  };
  $('#scan').onclick = async () => {
    const out = $('#scanout');
    const file = $('#file').files[0];
    if (!file) { out.textContent = 'Önce bir fiş fotoğrafı seç.'; return; }
    out.className = 'muted'; out.textContent = 'Fiş okunuyor…';
    try {
      const image = await shrinkImage(file);
      const r = await api('POST', `/groups/${gid}/receipts/scan`, { image, mediaType: 'image/jpeg' });
      scanned = { total: r.total, items: r.items.map((i) => ({ ...i, to: i.suggestion === 'kisisel' ? me.id : 'all' })) };
      if (!scanned.items.length) { out.textContent = 'Fişte kalem bulunamadı. Daha net bir fotoğraf dene.'; return; }
      drawScan();
    } catch (err) { showError(out, err); }
  };
  $('#sum').onclick = async () => {
    const out = $('#sumout');
    out.className = 'muted'; out.textContent = 'Hazırlanıyor…';
    try { out.textContent = (await api('POST', `/groups/${gid}/summary`, {})).summary; } catch (err) { showError(out, err); }
  };

  async function refresh() {
    const [bal, exp, act] = await Promise.all([
      api('GET', `/groups/${gid}/balances`), api('GET', `/groups/${gid}/expenses`), api('GET', `/groups/${gid}/activity`),
    ]);
    $('#live').innerHTML = `
      <section class="card"><h2>Kim kime ne kadar</h2>${bal.transfers.length
        ? bal.transfers.map((t, k) => `<div class="row"><span>${esc(nm(t.from))} → ${esc(nm(t.to))}</span><span><b>${tl(t.amount)}</b>
            ${t.from === me.id ? `<button class="small ghost" data-pay="${k}">Ödedim</button>` : ''}</span></div>`).join('')
        : '<p class="muted">Borç yok, hesap denk.</p>'}</section>
      <section class="card"><h2>Bakiyeler</h2>${g.members.map((m) => {
        const b = bal.balances[m.id] || 0;
        return `<div class="row"><span>${esc(nm(m.id))}</span><b class="${b >= 0 ? 'pos' : 'neg'}">${b >= 0 ? '+' : '−'}${tl(Math.abs(b))}</b></div>`;
      }).join('')}</section>
      <section class="card"><h2>Geçmiş</h2>${exp.expenses.length ? exp.expenses.map((x) => `<div class="row"><span>${esc(x.title)}<br>
        <span class="muted">${esc(nm(x.paidBy))} ödedi · ${new Date(x.createdAt).toLocaleDateString('tr-TR')}</span></span>
        <span><b>${tl(x.amount)}</b> ${x.createdBy === me.id || g.ownerId === me.id ? `<button class="small ghost" data-del="${esc(x.id)}">Sil</button>` : ''}</span></div>`).join('') : '<p class="muted">Henüz harcama yok.</p>'}</section>
      <section class="card"><h2>Etkinlik</h2>${act.activity.length ? act.activity.map((a) => `<div class="row"><span>${esc(a.message)}</span><span class="muted">${new Date(a.createdAt).toLocaleString('tr-TR')}</span></div>`).join('') : '<p class="muted">Henüz etkinlik yok.</p>'}</section>`;
    document.querySelectorAll('[data-pay]').forEach((b) => {
      b.onclick = async () => {
        const t = bal.transfers[b.dataset.pay];
        if (!confirm(`${nm(t.to)} kişisine ${tl(t.amount)} ödediğini kaydet?`)) return;
        try { await api('POST', `/groups/${gid}/settlements`, { to: t.to, amount: t.amount }); refresh(); } catch (err) { alert(err.message); }
      };
    });
    document.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        if (!confirm('Bu harcama silinsin mi?')) return;
        try { await api('DELETE', `/groups/${gid}/expenses/${b.dataset.del}`); refresh(); } catch (err) { alert(err.message); }
      };
    });
  }
  await refresh();
}

// Fotoğrafı sunucuya göndermeden önce küçült (hız ve boyut sınırı için)
async function shrinkImage(file) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
  const dataUrl = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
  return String(dataUrl).split(',')[1];
}

// ---------- Yönlendirme ----------
async function route() {
  try {
    const hash = location.hash;
    if (hash.startsWith('#join=')) { sessionStorage.setItem('pendingJoin', hash.slice(6)); history.replaceState(null, '', location.pathname); }
    if (token && !me) {
      try { me = (await api('GET', '/me')).user; } catch { /* oturum geçersiz */ }
    }
    if (!me) return authView();
    const pending = sessionStorage.getItem('pendingJoin');
    if (pending) {
      sessionStorage.removeItem('pendingJoin');
      try { const g = await api('POST', '/groups/join', { code: pending }); location.hash = `#/g/${g.id}`; return; } catch { /* kod geçersizse ana sayfaya düş */ }
    }
    const m = location.hash.match(/^#\/g\/(\w+)/);
    if (m) await groupView(m[1]); else await homeView();
  } catch (e) {
    app.innerHTML = `<h1>Ortak Gider</h1><p class="error">${esc(e.message)}</p><p class="muted">Backend çalışıyor mu? (${esc(API)})</p><button id="retry">Tekrar dene</button>`;
    $('#retry').onclick = route;
  }
}

window.addEventListener('hashchange', route);
fetch(`${API}/health`).then((r) => r.json()).then((h) => { aiAvailable = !!h.ai; }).catch(() => {});
route();

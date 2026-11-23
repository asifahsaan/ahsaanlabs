/* Ahsaan Labs: sign-in with UOL Google accounts + anonymous usage stats (Firebase free tier).
   Until the firebase config below is filled in, this file does nothing and the labs stay open. */
(function () {
  'use strict';
  var CFG = {
    /* --- paste your Firebase web app config here (Project settings > General > Your apps > Web app) --- */
    firebase: { apiKey: 'AIzaSyA-Xf6KvYwp7shiC0_4dr59lFscVLlY-9o', authDomain: 'ahsaanlabs.firebaseapp.com', projectId: 'ahsaanlabs', appId: '1:970245536767:web:872880fbc87cac8f7645ca' },
    /* allowed sign-in domains */
    domains: { teacher: 'cs.uol.edu.pk', student: 'student.uol.edu.pk' },
    /* admin Google accounts (can open admin.html). Must match the admin email in firestore.rules */
    admins: ['asifahsaan1@gmail.com'],
    sdk: '10.14.1'
  };
  var TEST = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && (location.search.match(/[?&]authtest=(\w+)/) || [])[1];
  var ENABLED = !!(CFG.firebase.apiKey && CFG.firebase.projectId) || !!TEST;
  var path = location.pathname;
  var IS_LAB = /\/dl\/[\w-]+\.html$/.test(path);
  var LAB = (path.match(/\/dl\/([\w-]+)\.html$/) || [])[1] || (/admin\.html$/.test(path) ? 'admin' : 'hub');
  var TEST_QH = parseFloat((location.search.match(/[?&]qh=([\d.]+)/) || [])[1]) || 5;
  var FREE = false;
  try { if (IS_LAB && ENABLED && !localStorage.getItem('labs_free_' + LAB)) { FREE = true; localStorage.setItem('labs_free_' + LAB, String(Date.now())); } } catch (e) { }
  var state = { ready: false, user: null, ok: false, msg: '', free: FREE, quota: null };
  var listeners = [];
  var api = { cfg: CFG, test: TEST, enabled: ENABLED, state: state, onChange: function (f) { listeners.push(f); if (state.ready) f(state); }, signIn: signIn, signOut: signOut, firebase: function () { return fbP; }, isAdmin: isAdmin, roleOf: roleOf };
  window.LabsAuth = api;
  if (!ENABLED) return;

  /* ---------- helpers ---------- */
  function roleOf(email) {
    email = (email || '').toLowerCase();
    if (CFG.admins.map(function (a) { return a.toLowerCase(); }).indexOf(email) >= 0) return 'admin';
    if (email.slice(-('@' + CFG.domains.teacher).length) === '@' + CFG.domains.teacher) return 'teacher';
    if (email.slice(-('@' + CFG.domains.student).length) === '@' + CFG.domains.student) return 'student';
    return null;
  }
  function isAdmin() { return state.user && roleOf(state.user.email) === 'admin'; }
  function anonId() { try { var k = localStorage.getItem('labs_anon'); if (!k) { k = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/-/g, ''); localStorage.setItem('labs_anon', k); localStorage.setItem('labs_anon_new', '1'); } return k; } catch (e) { return 'noid' + Math.random().toString(36).slice(2, 12) + Date.now(); } }
  function emit() { listeners.forEach(function (f) { try { f(state); } catch (e) { console.error(e); } }); }
  var pendingMsg = '';
  function setUser(u) {
    var keep = pendingMsg; pendingMsg = '';
    state.user = null; state.ok = false; state.msg = keep;
    if (u) {
      var r = roleOf(u.email);
      if (r) { state.user = { uid: u.uid, name: u.name || u.email, email: (u.email || '').toLowerCase(), role: r }; state.ok = true; state.msg = ''; }
      else { pendingMsg = state.msg = 'Please sign in with your UOL account (@' + CFG.domains.teacher + ' or @' + CFG.domains.student + '). ' + (u.email || 'That account') + ' is not allowed.'; backend.signOut(); }
    }
    state.ready = true; emit();
  }

  /* ---------- backends: real Firebase, or a fake one for local testing ---------- */
  var backend, fbP = null;
  function realBackend() {
    var base = 'https://www.gstatic.com/firebasejs/' + CFG.sdk + '/';
    fbP = Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]).then(function (m) {
      var app = m[0].initializeApp(CFG.firebase);
      return { app: app, authM: m[1], fs: m[2], auth: m[1].getAuth(app), db: m[2].getFirestore(app) };
    });
    var b = {
      init: function () {
        fbP.then(function (f) {
          f.authM.onAuthStateChanged(f.auth, function (u) { setUser(u ? { uid: u.uid, name: u.displayName, email: u.email } : null); });
        }).catch(function (e) { console.warn('Sign-in is unavailable:', e); state.ready = true; state.msg = ''; state.failOpen = true; emit(); });
      },
      signIn: function () {
        return fbP.then(function (f) {
          var p = new f.authM.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
          return f.authM.signInWithPopup(f.auth, p).catch(function (e) {
            if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) return f.authM.signInWithRedirect(f.auth, p);
            if (e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request')) return;
            throw e;
          });
        });
      },
      signOut: function () { return fbP.then(function (f) { return f.authM.signOut(f.auth); }); },
      quota: {
        status: function () {
          return fbP.then(function (f) {
            var u = state.user;
            return Promise.all([f.fs.getDoc(f.fs.doc(f.db, 'quota', u.uid)), f.fs.getDoc(f.fs.doc(f.db, 'plans', u.uid))]).then(function (r) {
              var q = r[0], p = r[1], lim = (p.exists() && p.data().downloads != null) ? p.data().downloads : 2, hrs = (p.exists() && p.data().hours != null) ? p.data().hours : 5;
              var n = 0, start = null, active = false;
              if (q.exists()) { var dd = q.data(); start = dd.start.toDate(); if (Date.now() < start.getTime() + hrs * 3600e3) { n = dd.n; active = true; } }
              return { limit: lim, hours: hrs, n: n, active: active, left: Math.max(0, lim - n), resetsAt: active ? new Date(start.getTime() + hrs * 3600e3) : null };
            });
          });
        },
        take: function (q) {
          return fbP.then(function (f) {
            var ref = f.fs.doc(f.db, 'quota', state.user.uid);
            var w = q.active ? f.fs.updateDoc(ref, { n: q.n + 1 }) : f.fs.setDoc(ref, { n: 1, start: f.fs.serverTimestamp() });
            return w.then(function () { return true; }).catch(function () { return false; });
          });
        }
      },
      log: function (type, detail) {
        fbP.then(function (f) {
          var u = state.user, ts = f.fs.serverTimestamp(), ev = { type: type, lab: LAB, detail: detail || '', uid: u ? u.uid : null, anon: anonId(), role: u ? u.role : 'guest', ts: ts };
          f.fs.addDoc(f.fs.collection(f.db, 'events'), ev).catch(function () { });
          if (type === 'visit') {
            var v = { lastSeen: ts, lab: LAB }; try { if (localStorage.getItem('labs_anon_new')) { v.firstSeen = ts; localStorage.removeItem('labs_anon_new'); } } catch (e) { }
            f.fs.setDoc(f.fs.doc(f.db, 'visitors', anonId()), v, { merge: true }).catch(function () { });
          }
          if (type === 'login' && u) {
            var ref = f.fs.doc(f.db, 'users', u.uid);
            f.fs.getDoc(ref).then(function (s) {
              var d = { name: u.name, email: u.email, role: u.role, lastLogin: ts, loginCount: f.fs.increment(1) };
              if (!s.exists()) d.firstLogin = ts;
              return f.fs.setDoc(ref, d, { merge: true });
            }).catch(function () { });
          }
        });
      }
    };
    return b;
  }
  function fakeBackend() {
    var role = TEST, evs = [];
    try { evs = JSON.parse(localStorage.getItem('labs_test_events') || '[]'); } catch (e) { }
    var emails = { teacher: 'sara@cs.uol.edu.pk', student: 'ali@student.uol.edu.pk', admin: 'asif@example.com', bad: 'someone@gmail.com', out: null };
    var cur = (sessionStorage.getItem('labs_test_user') !== null ? sessionStorage.getItem('labs_test_user') : (role === 'out' ? '' : role));
    if (role === 'admin') CFG.admins.push('asif@example.com');
    return {
      init: function () { var e = emails[cur]; setTimeout(function () { setUser(e ? { uid: 'test-' + cur, name: cur === 'bad' ? 'Someone' : cur[0].toUpperCase() + cur.slice(1) + ' Test', email: e } : null); }, 50); },
      signIn: function () { var r = (role === 'out' || role === 'bad') ? 'student' : role; sessionStorage.setItem('labs_test_user', r); cur = r; var e = emails[r]; setUser({ uid: 'test-' + r, name: r[0].toUpperCase() + r.slice(1) + ' Test', email: e }); return Promise.resolve(); },
      signOut: function () { sessionStorage.setItem('labs_test_user', ''); cur = ''; setUser(null); return Promise.resolve(); },
      quota: {
        status: function () {
          var s = null; try { s = JSON.parse(localStorage.getItem('labs_test_quota') || 'null'); } catch (e) { }
          var lim = 2, n = 0, active = false, start = null;
          if (s && Date.now() < s.start + TEST_QH * 3600e3) { n = s.n; active = true; start = s.start; }
          return Promise.resolve({ limit: lim, hours: TEST_QH, n: n, active: active, left: Math.max(0, lim - n), resetsAt: active ? new Date(start + TEST_QH * 3600e3) : null });
        },
        take: function (q) {
          var s = null; try { s = JSON.parse(localStorage.getItem('labs_test_quota') || 'null'); } catch (e) { }
          localStorage.setItem('labs_test_quota', JSON.stringify(q.active && s ? { n: q.n + 1, start: s.start } : { n: 1, start: Date.now() }));
          return Promise.resolve(true);
        }
      },
      log: function (type, detail) { evs.push({ type: type, lab: LAB, detail: detail || '', role: state.user ? state.user.role : 'guest', t: Date.now() }); try { localStorage.setItem('labs_test_events', JSON.stringify(evs.slice(-100))); } catch (e) { } }
    };
  }
  backend = TEST ? fakeBackend() : realBackend();
  function signIn() { state.msg = ''; return backend.signIn().catch(function (e) { state.msg = 'Sign-in failed: ' + ((e && e.message) || e); emit(); }); }
  function signOut() { return backend.signOut(); }
  api.log = function (t, d) { backend.log(t, d); };

  /* ---------- UI (labs and hub only; the admin page draws its own) ---------- */
  var css = '#authroot *{box-sizing:border-box;font-family:inherit}' +
    '#authchip{position:fixed;left:12px;bottom:12px;z-index:2147483000;background:#fff;color:#1b2430;border:1px solid #cfd8e3;border-radius:999px;padding:6px 8px 6px 12px;font:600 13px system-ui,sans-serif;box-shadow:0 4px 18px rgba(15,23,42,.18);display:flex;gap:8px;align-items:center}' +
    '#authchip button{font:600 12px system-ui,sans-serif;border:1px solid #cfd8e3;background:#f5f8fb;border-radius:999px;padding:5px 11px;cursor:pointer;color:#1b2430}#authchip button.p{background:#2B7A9B;color:#fff;border-color:#2B7A9B}' +
    '#authbar{position:sticky;top:0;z-index:2147482000;background:linear-gradient(90deg,#EEF6FB,#F4F0FD);border-bottom:1px solid #DCE6F0;color:#1b2430;font:500 14px system-ui,sans-serif;padding:8px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center}' +
    '#authbar button{font:600 13px system-ui,sans-serif;border:0;background:#2B7A9B;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer}' +
    '#authmodal{position:fixed;inset:0;z-index:2147483600;background:rgba(15,23,42,.55);display:none;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)}#authmodal.on{display:flex}' +
    '#authmodal .box{background:#fff;color:#1b2430;border-radius:16px;max-width:440px;width:100%;padding:22px 24px;box-shadow:0 20px 60px rgba(0,0,0,.35);font:15px/1.5 system-ui,sans-serif}' +
    '#authmodal h3{margin:0 0 6px;font-size:20px}#authmodal .g{display:flex;gap:10px;align-items:center;justify-content:center;width:100%;margin:14px 0 8px;padding:11px;border:1px solid #cfd8e3;border-radius:10px;background:#fff;font:600 15px system-ui,sans-serif;cursor:pointer}#authmodal .g:hover{background:#f5f8fb}' +
    'body.nodl #pdfbtn,body.nodl #pptxbtn{display:none!important}' +
    '#authmodal .s{font-size:12.5px;color:#5c6b7a}#authmodal .err{background:#FDECEA;color:#8E2A1F;border-radius:8px;padding:8px 10px;margin:8px 0;font-size:13.5px}#authmodal .x{float:right;border:0;background:none;font-size:20px;cursor:pointer;color:#5c6b7a}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var root = document.createElement('div'); root.id = 'authroot';
  root.innerHTML = '<div id="authchip"></div><div id="authmodal"><div class="box"><button class="x" aria-label="Close">×</button><div id="authbody"></div></div></div>';
  function mount() {
    document.body.appendChild(root);
    root.querySelector('.x').onclick = closeModal; root.querySelector('#authmodal').onclick = function (e) { if (e.target.id === 'authmodal') closeModal(); };
    render();
  }
  function closeModal() { root.querySelector('#authmodal').classList.remove('on'); }
  function openModal() {
    var m = root.querySelector('#authmodal'); if (state.ok || state.failOpen) return;
    root.querySelector('#authbody').innerHTML = '<h3>Sign in to run this lab</h3><p style="margin:4px 0">You can look around freely. To run the lab, sign in with your UOL Google account.</p>' +
      (state.msg ? '<div class="err">' + esc2(state.msg) + '</div>' : '') +
      '<button class="g" id="authgo"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.3.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>Continue with Google</button>' +
      '<div class="s">Allowed: <b>@' + CFG.domains.teacher + '</b> (teachers) and <b>@' + CFG.domains.student + '</b> (students).</div>' +
      '<div class="s" style="margin-top:8px">We record your name, UOL email, role and usage (visits, runs, downloads) to see how the labs are used. Only the site admin can see it. <a href="' + rel('privacy.html') + '">Privacy</a></div>';
    root.querySelector('#authgo').onclick = function () { signIn(); };
    m.classList.add('on');
  }
  function rel(p) { return (IS_LAB ? '../' : '') + p; }
  function esc2(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function untilTxt(d) { var ms = Math.max(0, d.getTime() - Date.now()), m = Math.ceil(ms / 60000), h = Math.floor(m / 60); return 'resets in ' + (h ? h + 'h ' : '') + (m % 60) + 'm'; }
  function showMsg(html) { root.querySelector('#authbody').innerHTML = html; root.querySelector('#authmodal').classList.add('on'); }
  function showLimit(q) {
    showMsg('<h3>Download limit reached</h3><p style="margin:4px 0">You have used your ' + q.limit + ' downloads for now. You can download again in <b>' + untilTxt(q.resetsAt).replace('resets in ', '') + '</b> (at ' + q.resetsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ').</p><div class="s">Free teacher plan: ' + q.limit + ' downloads every ' + q.hours + ' hours (PDF and PowerPoint count the same). Paid plans with more downloads are coming soon.</div>');
  }
  var bar = null;
  function render() {
    if (!root.isConnected) return;
    var chip = root.querySelector('#authchip');
    var qtxt = '';
    if (state.ok && state.user.role === 'teacher' && state.quota) qtxt = ' · ⬇ ' + state.quota.left + '/' + state.quota.limit + (state.quota.left === 0 && state.quota.resetsAt ? ' (' + untilTxt(state.quota.resetsAt) + ')' : '');
    if (state.ok) chip.innerHTML = '<span>👤 ' + esc2(state.user.name) + ' · ' + state.user.role + qtxt + '</span><button id="authout">Sign out</button>';
    else if (state.failOpen) chip.innerHTML = '';
    else chip.innerHTML = '<span>' + (FREE ? '🎁 First run is free' : '🔒 Sign in to run the labs') + '</span><button class="p" id="authin">Sign in</button>';
    var o = chip.querySelector('#authout'); if (o) o.onclick = signOut; var i = chip.querySelector('#authin'); if (i) i.onclick = openModal;
    if (state.ok) closeModal();
    else if (state.msg && state.ready) openModal();
    if (IS_LAB) {
      if (!state.ok && state.ready && !state.failOpen && !bar) { bar = document.createElement('div'); bar.id = 'authbar'; bar.innerHTML = FREE ? '<span>🎁 <b>Your first run is free.</b> Next time, sign in with your UOL Google account to keep using the labs.</span><button>Sign in now</button>' : '<span>👀 You are looking around. <b>Sign in with your UOL Google account to run this lab.</b></span><button>Sign in</button>'; bar.querySelector('button').onclick = openModal; document.body.insertBefore(bar, document.body.firstChild); }
      if ((state.ok || state.failOpen) && bar) { bar.remove(); bar = null; }
    }
  }

  /* ---------- gate: in a lab, any interaction needs sign-in ---------- */
  function inside(el, sel) { return el && el.closest && el.closest(sel); }
  function gate(e) {
    if (!IS_LAB || !state.ready || state.ok || state.failOpen || FREE) return;
    var t = e.target;
    if (inside(t, '#authroot') || inside(t, '.topnav') || inside(t, '#authbar')) return;
    if (e.type === 'keydown' && (e.key === 'Tab' || e.key === 'Escape' || e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || (e.ctrlKey || e.metaKey))) return;
    if (inside(t, 'a[href]') && e.type !== 'keydown') return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.type === 'click' || e.type === 'keydown') openModal();
  }
  ['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown', 'input', 'change'].forEach(function (n) { document.addEventListener(n, gate, true); });

  /* ---------- downloads: teachers only, limited; usage logging ---------- */
  var ran = false, bypass = false, busy = false;
  function logDl(btn) { api.log('download', (btn.id === 'po-dl' ? 'pdf:' : 'pptx:') + LAB); }
  function refreshQuota() { if (state.ok && state.user.role === 'teacher') backend.quota.status().then(function (q) { state.quota = q; render(); }).catch(function () { }); }
  document.addEventListener('click', function (e) {
    if (bypass) return;
    var t = e.target, btn = inside(t, '#po-dl') || inside(t, '#px-go') || inside(t, '#pdfbtn') || inside(t, '#pptxbtn');
    if (!btn) {
      if (IS_LAB && !ran && !inside(t, '#authroot') && !inside(t, '.topnav') && !inside(t, '#authbar') && (state.ok || (FREE && state.ready))) { ran = true; api.log('run', state.ok ? '' : 'free'); }
      return;
    }
    var role = state.user && state.user.role, isDl = btn.id === 'po-dl' || btn.id === 'px-go';
    if (!state.ok || (role !== 'teacher' && role !== 'admin')) { e.preventDefault(); e.stopImmediatePropagation(); if (root.isConnected) showMsg('<h3>Downloads are for teachers</h3><p style="margin:4px 0">PDF and PowerPoint downloads are available to teachers (@' + CFG.domains.teacher + ').</p>'); return; }
    if (role === 'admin') { if (isDl) logDl(btn); return; }
    e.preventDefault(); e.stopImmediatePropagation();
    if (busy) return; busy = true;
    backend.quota.status().then(function (q) {
      state.quota = q; render();
      if (q.left <= 0) { busy = false; showLimit(q); return; }
      if (!isDl) { busy = false; bypass = true; try { btn.click(); } finally { bypass = false; } return; }
      return backend.quota.take(q).then(function (ok) {
        busy = false;
        if (!ok) { showLimit(q); return; }
        bypass = true; try { btn.click(); } finally { bypass = false; }
        logDl(btn); refreshQuota();
      });
    }).catch(function () { busy = false; showMsg('<h3>Could not check your download limit</h3><p style="margin:4px 0">Please try again in a moment.</p>'); });
  }, true);
  var lastUid = null;
  api.onChange(function (s) {
    var okDl = s.ok && (s.user.role === 'teacher' || s.user.role === 'admin');
    if (document.body) document.body.classList.toggle('nodl', !okDl);
    if (s.ok && s.user.role === 'teacher' && !s.quota) refreshQuota();
    render();
    if (s.ok && s.user.uid !== lastUid) { lastUid = s.user.uid; var key = 'labs_logged_' + s.user.uid; try { if (!sessionStorage.getItem(key)) { sessionStorage.setItem(key, '1'); api.log('login', ''); } } catch (e) { api.log('login', ''); } }
    if (!s.ok) lastUid = null;
  });

  var visited = false;
  api.onChange(function (s) { if (s.ready && !visited) { visited = true; api.log('visit', ''); } });
  function start() { if (IS_LAB) document.body.classList.add('nodl'); if (!/admin\.html$/.test(path)) mount(); backend.init(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

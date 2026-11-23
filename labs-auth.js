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
  var state = { ready: false, user: null, ok: false, msg: '' };
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
  var bar = null;
  function render() {
    if (!root.isConnected) return;
    var chip = root.querySelector('#authchip');
    if (state.ok) chip.innerHTML = '<span>👤 ' + esc2(state.user.name) + ' · ' + state.user.role + '</span><button id="authout">Sign out</button>';
    else if (state.failOpen) chip.innerHTML = '';
    else chip.innerHTML = '<span>🔒 Sign in to run the labs</span><button class="p" id="authin">Sign in</button>';
    var o = chip.querySelector('#authout'); if (o) o.onclick = signOut; var i = chip.querySelector('#authin'); if (i) i.onclick = openModal;
    if (state.ok) closeModal();
    else if (state.msg && state.ready) openModal();
    if (IS_LAB) {
      if (!state.ok && state.ready && !state.failOpen && !bar) { bar = document.createElement('div'); bar.id = 'authbar'; bar.innerHTML = '<span>👀 You are looking around. <b>Sign in with your UOL Google account to run this lab.</b></span><button>Sign in</button>'; bar.querySelector('button').onclick = openModal; document.body.insertBefore(bar, document.body.firstChild); }
      if ((state.ok || state.failOpen) && bar) { bar.remove(); bar = null; }
    }
  }

  /* ---------- gate: in a lab, any interaction needs sign-in ---------- */
  function inside(el, sel) { return el && el.closest && el.closest(sel); }
  function gate(e) {
    if (!IS_LAB || !state.ready || state.ok || state.failOpen) return;
    var t = e.target;
    if (inside(t, '#authroot') || inside(t, '.topnav') || inside(t, '#authbar')) return;
    if (e.type === 'keydown' && (e.key === 'Tab' || e.key === 'Escape' || e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || (e.ctrlKey || e.metaKey))) return;
    if (inside(t, 'a[href]') && e.type !== 'keydown') return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.type === 'click' || e.type === 'keydown') openModal();
  }
  ['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown', 'input', 'change'].forEach(function (n) { document.addEventListener(n, gate, true); });

  /* ---------- usage logging ---------- */
  var ran = false;
  document.addEventListener('click', function (e) {
    if (!state.ok) return; var t = e.target;
    if (inside(t, '#po-dl')) api.log('download', 'pdf:' + LAB);
    else if (inside(t, '#px-go')) api.log('download', 'pptx:' + LAB);
    else if (IS_LAB && !ran && !inside(t, '#authroot') && !inside(t, '.topnav')) { ran = true; api.log('run', ''); }
  }, true);
  var lastUid = null;
  api.onChange(function (s) {
    render();
    if (s.ok && s.user.uid !== lastUid) { lastUid = s.user.uid; var key = 'labs_logged_' + s.user.uid; try { if (!sessionStorage.getItem(key)) { sessionStorage.setItem(key, '1'); api.log('login', ''); } } catch (e) { api.log('login', ''); } }
    if (!s.ok) lastUid = null;
  });

  var visited = false;
  api.onChange(function (s) { if (s.ready && !visited) { visited = true; api.log('visit', ''); } });
  function start() { if (!/admin\.html$/.test(path)) mount(); backend.init(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

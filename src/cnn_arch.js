/* ================= CNN Architecture Builder: shapes, parameters and formulas for any CNN ================= */
(function () {
  const esc2 = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const fmt = v => v >= 1e6 ? (v / 1e6).toFixed(v >= 1e8 ? 0 : 2).replace(/\.?0+$/, '') + ' M' : v >= 1e4 ? (v / 1e3).toFixed(1).replace(/\.0$/, '') + ' k' : String(v);
  const nf = v => Number(v).toLocaleString('en-US');
  const PRESETS = {
    'Lecture table: 32×32×3 (LeNet-style)': { n: 32, c: 3, L: [{ t: 'conv', f: 5, s: 1, p: 0, k: 8 }, { t: 'pool', kind: 'max', f: 2, s: 2 }, { t: 'conv', f: 5, s: 1, p: 0, k: 16 }, { t: 'pool', kind: 'max', f: 2, s: 2 }, { t: 'flatten' }, { t: 'fc', n: 120, act: 'relu' }, { t: 'fc', n: 84, act: 'relu' }, { t: 'fc', n: 10, act: 'softmax' }] },
    'AlexNet (lecture slide): 227×227×3': { n: 227, c: 3, L: [{ t: 'conv', f: 11, s: 4, p: 0, k: 96 }, { t: 'pool', kind: 'max', f: 3, s: 2 }, { t: 'conv', f: 5, s: 1, p: 2, k: 256 }, { t: 'pool', kind: 'max', f: 3, s: 2 }, { t: 'conv', f: 3, s: 1, p: 1, k: 384 }, { t: 'conv', f: 3, s: 1, p: 1, k: 384 }, { t: 'conv', f: 3, s: 1, p: 1, k: 256 }, { t: 'pool', kind: 'max', f: 3, s: 2 }, { t: 'flatten' }, { t: 'fc', n: 4096, act: 'relu' }, { t: 'fc', n: 4096, act: 'relu' }, { t: 'fc', n: 1000, act: 'softmax' }] },
    'Small digits net: 28×28×1': { n: 28, c: 1, L: [{ t: 'conv', f: 3, s: 1, p: 1, k: 8 }, { t: 'pool', kind: 'max', f: 2, s: 2 }, { t: 'conv', f: 3, s: 1, p: 1, k: 16 }, { t: 'pool', kind: 'max', f: 2, s: 2 }, { t: 'flatten' }, { t: 'fc', n: 10, act: 'softmax' }] },
    'VGG-mini with global average pooling: 64×64×3': { n: 64, c: 3, L: [{ t: 'conv', f: 3, s: 1, p: 1, k: 16 }, { t: 'conv', f: 3, s: 1, p: 1, k: 16 }, { t: 'pool', kind: 'max', f: 2, s: 2 }, { t: 'conv', f: 3, s: 1, p: 1, k: 32 }, { t: 'conv', f: 3, s: 1, p: 1, k: 32 }, { t: 'pool', kind: 'max', f: 2, s: 2 }, { t: 'conv', f: 3, s: 1, p: 1, k: 64 }, { t: 'gap' }, { t: 'flatten' }, { t: 'fc', n: 10, act: 'softmax' }] },
    'Empty: just the input': { n: 32, c: 3, L: [] }
  };
  const clone = o => JSON.parse(JSON.stringify(o));
  const CB = { preset: Object.keys(PRESETS)[0], n: 32, c: 3, L: [], sel: null, zoom: null, timer: null };
  function load(name) { const p = clone(PRESETS[name]); CB.preset = name; CB.n = p.n; CB.c = p.c; CB.L = p.L; CB.sel = null; }
  /* ---------- the engine: shapes, activation sizes, parameters, receptive field ---------- */
  function compute() {
    const out = [], warn = []; let st = { kind: 'vol', n: CB.n, c: CB.c }, rf = 1, jump = 1, bad = false;
    const cnt = { conv: 0, pool: 0, gap: 0, fc: 0, flatten: 0 };
    out.push({ idx: -1, name: 'Input', type: 'input', outShape: st, outSize: st.n * st.n * st.c, params: 0, rf: 1, label: ['INPUT'] });
    CB.L.forEach((ly, i) => {
      const prev = st, r = { idx: i, type: ly.t, params: 0, warn: [], inShape: prev };
      if (bad || !prev) { r.invalid = true; r.name = ly.t.toUpperCase(); r.outShape = null; r.outSize = 0; r.label = [ly.t.toUpperCase()]; out.push(r); return; }
      const fail = msg => { r.warn.push(msg); warn.push(`${r.name}: ${msg}`); r.invalid = true; r.outShape = null; r.outSize = 0; bad = true; };
      if (ly.t === 'conv' || ly.t === 'pool') {
        r.name = ly.t === 'conv' ? 'CONV' + (++cnt.conv) : 'POOL' + (++cnt.pool);
        if (prev.kind !== 'vol') { r.label = [r.name]; fail('needs an image-like input (width × height × depth), but it receives a flat vector.'); out.push(r); return; }
        const f = ly.f, s = ly.s, p = ly.t === 'conv' ? ly.p : 0, n = prev.n, num = n + 2 * p - f;
        r.f = f; r.s = s; r.p = p; r.num = num;
        if (num < 0) { r.label = [r.name]; fail(`the window (${f}) is larger than the padded input (${n + 2 * p}).`); out.push(r); return; }
        const o = Math.floor(num / s) + 1; r.nOut = o;
        if (num % s !== 0) { r.warn.push(`(n + 2p − f)/s = ${num}/${s} = ${(num / s).toFixed(2)} is not a whole number, so the last ${num % s} row(s)/column(s) are skipped (floor).`); warn.push(`${r.name}: ${r.warn[0]}`); }
        if (ly.t === 'conv') { r.k = ly.k; r.cin = prev.c; r.wts = f * f * prev.c * ly.k; r.biases = ly.k; r.params = r.wts + r.biases; st = { kind: 'vol', n: o, c: ly.k }; r.label = ['CONV', `${f}×${f}, s=${s}${p ? ', p=' + p : ''}`, `${ly.k} kernels`]; }
        else { st = { kind: 'vol', n: o, c: prev.c }; r.label = [ly.kind === 'max' ? 'MAX POOL' : 'AVG POOL', `${f}×${f}, s=${s}`]; r.kind = ly.kind; }
        rf = rf + (f - 1) * jump; jump = jump * s; r.rf = rf;
      } else if (ly.t === 'gap') {
        r.name = 'GAP' + (++cnt.gap); r.label = ['GLOBAL AVG', 'POOL'];
        if (prev.kind !== 'vol') { fail('needs an image-like input.'); out.push(r); return; }
        r.nIn = prev.n; st = { kind: 'vol', n: 1, c: prev.c }; rf = CB.n; r.rf = rf;
      } else if (ly.t === 'flatten') {
        r.name = 'FLATTEN' + (++cnt.flatten); r.label = ['FLATTEN'];
        if (prev.kind !== 'vol') { r.warn.push('the input is already a vector, so flatten changes nothing.'); warn.push(`${r.name}: ${r.warn[0]}`); st = prev; } else { r.nIn = prev.n; r.cIn = prev.c; st = { kind: 'vec', len: prev.n * prev.n * prev.c }; }
        r.rf = rf;
      } else if (ly.t === 'fc') {
        const soft = ly.act === 'softmax'; r.name = soft ? 'SOFTMAX' : 'FC' + (++cnt.fc); r.label = [soft ? 'SOFTMAX' : 'FC', `${ly.n} neurons`]; r.act = ly.act;
        let nin; if (prev.kind === 'vol') { nin = prev.n * prev.n * prev.c; r.implied = true; r.warn.push(`a fully connected layer needs a vector, so the ${prev.n}×${prev.n}×${prev.c} volume is flattened first (${nf(nin)} numbers). Add a Flatten layer to make this explicit.`); warn.push(`${r.name}: ${r.warn[0]}`); } else nin = prev.len;
        r.nin = nin; r.nout = ly.n; r.wts = nin * ly.n; r.biases = ly.n; r.params = r.wts + r.biases; st = { kind: 'vec', len: ly.n }; rf = CB.n; r.rf = rf;
      }
      r.outShape = st; r.outSize = st.kind === 'vol' ? st.n * st.n * st.c : st.len; out.push(r);
    });
    const totalParams = out.reduce((s, r) => s + r.params, 0), totalAct = out.reduce((s, r) => s + (r.outSize || 0), 0);
    return { rows: out, warn, totalParams, totalAct };
  }
  const shapeTxt = s => !s ? '—' : s.kind === 'vol' ? `(${s.n}, ${s.n}, ${s.c})` : `(${s.len}, 1)`;
  /* ---------- drawing: 3D blocks like the AlexNet slide ---------- */
  const COL = { conv: ['#F6A735', '#FBC56B', '#D98A14'], pool: ['#F4C95D', '#FADF93', '#D9AE3A'], input: ['#F7E08A', '#FBEFB6', '#DCC25F'], gap: ['#F4C95D', '#FADF93', '#D9AE3A'] };
  function diagram(M) {
    const rows = M.rows, maxN = Math.max(8, ...rows.filter(r => r.outShape && r.outShape.kind === 'vol').map(r => r.outShape.n)), maxC = Math.max(2, ...rows.filter(r => r.outShape && r.outShape.kind === 'vol').map(r => r.outShape.c));
    const maxLen = Math.max(10, ...rows.filter(r => r.outShape && r.outShape.kind === 'vec').map(r => r.outShape.len));
    const side = n => 22 + 98 * Math.sqrt(n / maxN), thick = c => 10 + 62 * Math.log(c + 1) / Math.log(maxC + 1);
    const GAP = 104, H = 360, cy = 190; let x = 24, s = '', arrows = '', labels = '';
    const nodes = rows.map(r => {
      const o = r.outShape; let w, nodeSvg = '';
      const sel = CB.sel === r.idx;
      if (r.invalid || !o) { w = 54; nodeSvg = `<rect x="${x}" y="${cy - 30}" width="54" height="60" rx="8" fill="#FDECEA" stroke="#C0392B" stroke-dasharray="4 3"/><text x="${x + 27}" y="${cy + 5}" text-anchor="middle" font-size="18" fill="#C0392B" font-weight="700">!</text>`; }
      else if (o.kind === 'vol') {
        const sd = side(o.n), t = thick(o.c), dx = t * .6, dy = t * .45, col = COL[r.type] || COL.conv, y0 = cy - sd / 2;
        w = sd + dx;
        nodeSvg = `<polygon points="${x},${y0} ${x + dx},${y0 - dy} ${x + sd + dx},${y0 - dy} ${x + sd},${y0}" fill="${col[1]}" stroke="#fff" stroke-width="1"/>` +
          `<polygon points="${x + sd},${y0} ${x + sd + dx},${y0 - dy} ${x + sd + dx},${y0 + sd - dy} ${x + sd},${y0 + sd}" fill="${col[2]}" stroke="#fff" stroke-width="1"/>` +
          `<rect x="${x}" y="${y0}" width="${sd}" height="${sd}" fill="${col[0]}" stroke="#fff" stroke-width="1"/>` + (sel ? `<rect x="${x - 4}" y="${y0 - dy - 4}" width="${sd + dx + 8}" height="${sd + dy + 8}" rx="6" fill="none" stroke="#2B7A9B" stroke-width="3"/>` : '');
      } else {
        const isFlat = r.type === 'flatten', soft = r.act === 'softmax', col = soft ? '#16A34A' : '#F59E0B';
        const hh = Math.min(250, 70 + 55 * Math.log10(Math.max(2, o.len)) * 1.0), ww = isFlat ? 16 : 40; w = ww; const y0 = cy - hh / 2;
        nodeSvg = `<rect x="${x}" y="${y0}" width="${ww}" height="${hh}" rx="${isFlat ? 4 : 8}" fill="${isFlat ? '#FCD9A6' : '#fff'}" stroke="${col}" stroke-width="3"/>` +
          (isFlat ? '' : [y0 + 24, y0 + 56, y0 + hh - 56, y0 + hh - 24].map((yy, k) => (k === 1 && hh > 140) ? `<text x="${x + ww / 2}" y="${yy + 6}" text-anchor="middle" font-size="16" fill="${col}">⋮</text>` : (k === 2 && hh <= 140) ? '' : `<circle cx="${x + ww / 2}" cy="${yy}" r="9" fill="#fff" stroke="${col}" stroke-width="2.5"/>`).join('')) + (sel ? `<rect x="${x - 5}" y="${y0 - 5}" width="${ww + 10}" height="${hh + 10}" rx="9" fill="none" stroke="#2B7A9B" stroke-width="3"/>` : '');
      }
      const sh = r.outShape ? (r.outShape.kind === 'vol' ? `${r.outShape.n}×${r.outShape.n}×${r.outShape.c}` : String(r.outShape.len)) : 'invalid';
      const node = { x, w, cxm: x + w / 2, r };
      s += `<g class="cbnode" data-i="${r.idx}" style="cursor:pointer">${nodeSvg}<rect x="${x - 6}" y="${cy - 150}" width="${w + 12}" height="300" fill="transparent"/><text x="${x + w / 2}" y="${cy + 168}" text-anchor="middle" font-size="15" font-weight="700" fill="#1b2430">${esc2(r.name)}</text><text x="${x + w / 2}" y="${cy + 185}" text-anchor="middle" font-size="13.5" fill="#475569">${sh}</text></g>`;
      x += w + GAP; return node;
    });
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1], b = nodes[i], x1 = a.x + a.w + 6, x2 = b.x - 8, mid = (x1 + x2) / 2, lab = b.r.label || [];
      arrows += `<line x1="${x1}" y1="${cy}" x2="${x2}" y2="${cy}" stroke="#334155" stroke-width="2"/><path d="M${x2} ${cy} l-8 -5 v10 z" fill="#334155"/>`;
      labels += lab.map((t, k) => `<text x="${mid}" y="${cy - 112 + k * 18}" text-anchor="middle" font-size="${k === 0 ? 15 : 13.5}" font-weight="${k === 0 ? 700 : 500}" fill="${k === 0 ? '#1b2430' : '#475569'}">${esc2(t)}</text>`).join('');
    }
    return { W: x - GAP + 40, H, html: arrows + labels + s };
  }
  /* ---------- explanations with numbers ---------- */
  function detail(M, idx) {
    const r = M.rows.find(q => q.idx === idx); if (!r) return '<p class="note">Click a block or a table row to see how its numbers are calculated.</p>';
    const D = s => K(s, true); let h = `<h3>${esc2(r.name)}</h3>`, tex = [], note = '';
    if (r.type === 'input') { tex = [R`\text{activation size}=n\times n\times c=${CB.n}\times${CB.n}\times${CB.c}=${r.outSize}`]; note = 'The input image. It has no parameters.'; }
    else if (r.invalid) { note = r.warn.join(' ') || 'This layer cannot be computed because an earlier layer is invalid.'; }
    else if (r.type === 'conv') {
      tex = [R`n_{out}=\left\lfloor\dfrac{n+2p-f}{s}\right\rfloor+1=\left\lfloor\dfrac{${r.inShape.n}+2\cdot ${r.p}-${r.f}}{${r.s}}\right\rfloor+1=${r.nOut}`,
        R`\text{activation size}=n_{out}\times n_{out}\times k=${r.nOut}\times${r.nOut}\times${r.k}=${nf(r.outSize)}`,
        R`\text{parameters}=\big((f\times f\times c_{in})+1\big)\times k=\big((${r.f}\times${r.f}\times${r.cin})+1\big)\times${r.k}=${nf(r.params)}`,
        R`\text{weights}=${r.f}\cdot${r.f}\cdot${r.cin}\cdot${r.k}=${nf(r.wts)},\quad \text{biases}=${r.k}`];
      note = `Each of the ${r.k} kernels has ${r.f}×${r.f}×${r.cin} weights plus 1 bias, and the same kernel slides over the whole image (weight sharing). Receptive field after this layer: ${r.rf}×${r.rf} pixels of the input. Padding: p = (f−1)/2 = ${(r.f - 1) / 2} keeps the size when s = 1 ("same"), p = 0 is "valid".`;
    } else if (r.type === 'pool') {
      tex = [R`n_{out}=\left\lfloor\dfrac{n-f}{s}\right\rfloor+1=\left\lfloor\dfrac{${r.inShape.n}-${r.f}}{${r.s}}\right\rfloor+1=${r.nOut}`, R`\text{activation size}=${r.nOut}\times${r.nOut}\times${r.inShape.c}=${nf(r.outSize)}`, R`\text{parameters}=0`];
      note = `${r.kind === 'max' ? 'Max' : 'Average'} pooling takes the ${r.kind === 'max' ? 'largest' : 'average'} value in each ${r.f}×${r.f} window. It has nothing to learn, so it has 0 parameters, and the depth stays ${r.inShape.c}. Receptive field: ${r.rf}×${r.rf}.`;
    } else if (r.type === 'gap') {
      tex = [R`\text{activation size}=1\times1\times c=1\times1\times${r.inShape.c}=${r.outSize}`, R`\text{parameters}=0`]; note = `Global average pooling averages each of the ${r.inShape.c} feature maps (${r.nIn}×${r.nIn}) into one number, with no window and no stride. It has 0 parameters.`;
    } else if (r.type === 'flatten') { tex = r.nIn ? [R`\text{length}=n\times n\times c=${r.nIn}\times${r.nIn}\times${r.cIn}=${nf(r.outSize)}`, R`\text{parameters}=0`] : [R`\text{parameters}=0`]; note = 'Flatten lines all numbers up in one long vector so a fully connected layer can read them.'; }
    else if (r.type === 'fc') {
      tex = [R`\text{activation size}=${r.nout}`, R`\text{parameters}=(n_{in}+1)\times n_{out}=(${nf(r.nin)}+1)\times${nf(r.nout)}=${nf(r.params)}`, R`\text{weights}=${nf(r.nin)}\cdot${nf(r.nout)}=${nf(r.wts)},\quad\text{biases}=${nf(r.biases)}`];
      note = `Every one of the ${nf(r.nout)} neurons is connected to all ${nf(r.nin)} inputs (one weight each) and has one bias.` + (r.act === 'softmax' ? ' Softmax turns the outputs into probabilities that add up to 1.' : '');
    }
    h += tex.map(D).join('') + (note ? `<p class="why">${esc2(note)}</p>` : '');
    if (r.warn && r.warn.length && !r.invalid) h += r.warn.map(w => `<div class="read warnbox">⚠ ${esc2(w)}</div>`).join('');
    if (r.type === 'conv' || r.type === 'pool') h += `<div class="slidebox"><div class="ik">How the ${r.f}×${r.f} window moves (stride ${r.s})</div><div id="cb-slide"></div></div>`;
    return h;
  }
  /* sliding-window animation on a small grid */
  function slide(r) {
    const host = $('#cb-slide'); if (!host || !r) return; clearInterval(CB.timer);
    const n0 = r.inShape.n, p = r.p || 0, f0 = r.f, s0 = r.s; let scale = 1, n = n0, f = f0, s = s0, note = '';
    if (n0 + 2 * p > 12) { n = 10; f = Math.max(2, Math.min(5, f0)); s = Math.max(1, Math.min(3, s0)); note = `Shown on a small ${n}×${n} grid with the same idea (the real input is ${n0}×${n0}).`; }
    const pp = n0 + 2 * p > 12 ? 0 : p, N = n + 2 * pp, cell = Math.min(26, 260 / N), o = Math.floor((N - f) / s) + 1; if (o < 1) { host.innerHTML = ''; return; }
    const pos = []; for (let i = 0; i < o; i++) for (let j = 0; j < o; j++) pos.push([i, j]);
    let g = `<svg viewBox="0 0 ${N * cell * 2 + 60} ${Math.max(N, o) * cell + 24}" style="width:100%;max-width:560px;height:auto">`;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const pad = i < pp || j < pp || i >= N - pp || j >= N - pp; g += `<rect x="${j * cell + 4}" y="${i * cell + 4}" width="${cell - 2}" height="${cell - 2}" rx="3" fill="${pad ? '#EEF1F5' : '#fff'}" stroke="#CBD5E1"/>`; }
    const ox = N * cell + 40; for (let i = 0; i < o; i++) for (let j = 0; j < o; j++) g += `<rect class="oc" data-k="${i * o + j}" x="${ox + j * cell + 4}" y="${i * cell + 4}" width="${cell - 2}" height="${cell - 2}" rx="3" fill="#fff" stroke="#CBD5E1"/>`;
    g += `<rect id="cbwin" x="4" y="4" width="${f * cell - 2}" height="${f * cell - 2}" rx="4" fill="rgba(246,167,53,.35)" stroke="#D98A14" stroke-width="2.5"/><text x="${N * cell + 12}" y="${N * cell / 2}" font-size="20" fill="#475569">➜</text></svg>${note ? `<div class="note">${esc2(note)}</div>` : ''}`;
    host.innerHTML = g; let k = 0; const win = $('#cbwin');
    const step = () => { const [i, j] = pos[k % pos.length]; win.setAttribute('x', j * s * cell + 4); win.setAttribute('y', i * s * cell + 4); host.querySelectorAll('.oc').forEach((e, q) => e.setAttribute('fill', q <= k % pos.length ? '#FBE3B0' : '#fff')); k++; };
    step(); CB.timer = setInterval(() => { if (!document.contains(host)) { clearInterval(CB.timer); return; } step(); }, 700);
  }
  /* ---------- editor ---------- */
  const numIn = (i, key, v, min, w) => `<label class="cbf"><span>${w}</span><input type="number" min="${min}" step="1" data-i="${i}" data-k="${key}" value="${v}"></label>`;
  function editor() {
    let h = `<div class="cbcard"><div class="cbh">Input image</div>${numIn(-1, 'n', CB.n, 1, 'size n×n')}${numIn(-1, 'c', CB.c, 1, 'depth c')}</div>`;
    CB.L.forEach((ly, i) => {
      let f = '';
      if (ly.t === 'conv') f = numIn(i, 'f', ly.f, 1, 'kernel f×f') + numIn(i, 's', ly.s, 1, 'stride s') + numIn(i, 'p', ly.p, 0, 'padding p') + numIn(i, 'k', ly.k, 1, 'kernels k') + `<button class="btn tiny" data-same="${i}" title="p = (f−1)/2 keeps the size">same padding</button>`;
      else if (ly.t === 'pool') f = `<label class="cbf"><span>type</span><select data-i="${i}" data-k="kind"><option value="max"${ly.kind === 'max' ? ' selected' : ''}>max</option><option value="avg"${ly.kind === 'avg' ? ' selected' : ''}>average</option></select></label>` + numIn(i, 'f', ly.f, 1, 'window f×f') + numIn(i, 's', ly.s, 1, 'stride s');
      else if (ly.t === 'fc') f = numIn(i, 'n', ly.n, 1, 'neurons') + `<label class="cbf"><span>activation</span><select data-i="${i}" data-k="act"><option value="relu"${ly.act === 'relu' ? ' selected' : ''}>ReLU</option><option value="softmax"${ly.act === 'softmax' ? ' selected' : ''}>softmax</option></select></label>`;
      else f = '<span class="note">no settings</span>';
      h += `<div class="cbcard" data-card="${i}"><div class="cbh"><b>${i + 1}</b> ${esc2(({ conv: 'Convolution', pool: 'Pooling', gap: 'Global average pooling', flatten: 'Flatten', fc: 'Fully connected' })[ly.t])}<span class="cbtools"><button class="btn tiny" data-up="${i}" title="move left">◀</button><button class="btn tiny" data-down="${i}" title="move right">▶</button><button class="btn tiny" data-del="${i}" title="remove">✕</button></span></div>${f}</div>`;
    });
    return h;
  }
  function results() {
    const M = compute(), D = diagram(M);
    const svg = $('#cb-svg'), z = CB.zoom || fitZ(D.W, D.H); svg.setAttribute('viewBox', `0 0 ${D.W} ${D.H}`); svg.style.width = Math.round(D.W * z) + 'px'; svg.style.height = Math.round(D.H * z) + 'px'; svg.innerHTML = D.html; CB._W = D.W; CB._H = D.H;
    const maxP = Math.max(1, ...M.rows.map(r => r.params));
    $('#cb-kpi').innerHTML = `<div class="kpi"><span>Total parameters</span><b>${nf(M.totalParams)}</b></div><div class="kpi"><span>Layers</span><b>${CB.L.length}</b></div><div class="kpi"><span>Total activations</span><b>${nf(M.totalAct)}</b></div><div class="kpi"><span>Memory (float32)</span><b>${((M.totalParams + M.totalAct) * 4 / 1e6).toFixed(2)} MB</b></div>`;
    $('#cb-table').innerHTML = `<table class="cbt"><tr><th>#</th><th>Layer</th><th>Activation shape</th><th>Activation size</th><th># Parameters</th><th>Receptive field</th><th>Share of parameters</th></tr>` +
      M.rows.map((r, i) => `<tr data-i="${r.idx}" class="${CB.sel === r.idx ? 'on' : ''}${r.invalid ? ' bad' : ''}"><td>${i + 1}</td><td><b>${esc2(r.name)}</b>${r.type === 'conv' ? `<br><span class="note">f=${r.f}, s=${r.s}${r.p ? ', p=' + r.p : ''}, ${r.k} kernels</span>` : r.type === 'pool' ? `<br><span class="note">${r.kind}, f=${r.f}, s=${r.s}</span>` : r.type === 'fc' ? `<br><span class="note">${nf(r.nout)} neurons</span>` : ''}</td><td>${shapeTxt(r.outShape)}</td><td>${r.invalid ? '—' : nf(r.outSize)}</td><td>${nf(r.params)}</td><td>${r.rf && !r.invalid ? r.rf + '×' + r.rf : '—'}</td><td>${r.params ? `<span class="pbar"><i style="width:${Math.max(2, r.params / maxP * 100)}%"></i></span> ${(M.totalParams ? r.params / M.totalParams * 100 : 0).toFixed(r.params / M.totalParams < .01 ? 2 : 1)}%` : ''}</td></tr>`).join('') +
      `<tr class="tot"><td></td><td><b>Total</b></td><td></td><td>${nf(M.totalAct)}</td><td><b>${nf(M.totalParams)}</b></td><td></td><td></td></tr></table>`;
    $('#cb-warn').innerHTML = M.warn.length ? M.warn.map(w => `<div class="read warnbox">⚠ ${esc2(w)}</div>`).join('') : '';
    const sel = CB.sel == null ? null : CB.sel;
    $('#cb-detail').innerHTML = sel == null ? '<h3>Click a block or a table row</h3><p class="note">You will see the formula with your numbers: output size, activation size, parameters (weights + biases) and the receptive field. Change any setting in the cards below and everything recalculates.</p><p class="note">Try the presets: the lecture table (32×32×3 → 850 softmax parameters) and AlexNet from the slide.</p>' : detail(M, sel);
    const r = M.rows.find(q => q.idx === sel); if (r && (r.type === 'conv' || r.type === 'pool') && !r.invalid) slide(r); else clearInterval(CB.timer);
    return M;
  }
  function fitZ(W, H) { const w = ($('#cb-wrap') && $('#cb-wrap').clientWidth) || 900; return Math.max(.25, Math.min(1.1, (w - 8) / W)); }
  function build() {
    const root = $('#cbroot');
    if (!root.dataset.ready) {
      root.dataset.ready = '1'; load(CB.preset);
      root.innerHTML = `<div class="cbbar"><label class="cbf big"><span>Example</span><select id="cb-pre">${Object.keys(PRESETS).map(k => `<option>${esc2(k)}</option>`).join('')}</select></label>
        <div class="cbadd"><span class="note">Add a layer:</span><button class="btn" data-add="conv">+ Conv</button><button class="btn" data-add="pool">+ Pool</button><button class="btn" data-add="gap">+ Global avg</button><button class="btn" data-add="flatten">+ Flatten</button><button class="btn" data-add="fc">+ FC</button><button class="btn" data-add="softmax">+ Softmax</button></div>
        <span class="zoomb"><button class="btn" id="cb-zm">−</button><button class="btn" id="cb-fit">Fit</button><button class="btn" id="cb-zp">+</button></span></div>
        <div class="cbintro">Build any CNN, or load a lecture example. Every block shows its shape; every layer shows its formula with numbers and its parameters. <b>Convolution:</b> ((n + 2p − f) / s) + 1 &nbsp;·&nbsp; <b>Parameters:</b> ((f × f × c<sub>in</sub>) + 1) × k &nbsp;·&nbsp; <b>FC:</b> (n<sub>in</sub> + 1) × n<sub>out</sub></div>
        <div class="kpis" id="cb-kpi"></div>
        <div class="cbwrap" id="cb-wrap"><svg id="cb-svg"></svg></div>
        <div id="cb-warn"></div>
        <div class="cbgrid"><div><h3 class="cbh3">Layer table</h3><div class="cbtw" id="cb-table"></div></div><aside class="cbdetail" id="cb-detail"></aside></div>
        <h3 class="cbh3">Layers (edit anything)</h3><div class="cbeditor" id="cb-editor"></div>`;
      $('#cb-pre').onchange = e => { load(e.target.value); CB.zoom = null; full(); };
      root.addEventListener('click', e => {
        const t = e.target;
        const add = t.closest('[data-add]'); if (add) { const k = add.dataset.add, last = [...CB.L].reverse().find(l => l.t === 'conv'); CB.L.push(k === 'conv' ? { t: 'conv', f: 3, s: 1, p: 1, k: last ? last.k : 16 } : k === 'pool' ? { t: 'pool', kind: 'max', f: 2, s: 2 } : k === 'fc' ? { t: 'fc', n: 64, act: 'relu' } : k === 'softmax' ? { t: 'fc', n: 10, act: 'softmax' } : { t: k }); CB.zoom = null; full(); return; }
        const up = t.closest('[data-up]'); if (up) { const i = +up.dataset.up; if (i > 0) { [CB.L[i - 1], CB.L[i]] = [CB.L[i], CB.L[i - 1]]; full(); } return; }
        const dn = t.closest('[data-down]'); if (dn) { const i = +dn.dataset.down; if (i < CB.L.length - 1) { [CB.L[i + 1], CB.L[i]] = [CB.L[i], CB.L[i + 1]]; full(); } return; }
        const del = t.closest('[data-del]'); if (del) { CB.L.splice(+del.dataset.del, 1); CB.sel = null; CB.zoom = null; full(); return; }
        const same = t.closest('[data-same]'); if (same) { const ly = CB.L[+same.dataset.same]; ly.p = Math.floor((ly.f - 1) / 2); full(); return; }
        const node = t.closest('.cbnode'), row = t.closest('tr[data-i]'); const el = node || row; if (el) { CB.sel = +el.dataset.i; results(); }
      });
      root.addEventListener('input', e => {
        const t = e.target; if (!t.dataset || t.dataset.k == null) return; const i = +t.dataset.i, k = t.dataset.k;
        let v = t.tagName === 'SELECT' ? t.value : Math.max(+t.min || 0, Math.round(+t.value || 0));
        if (t.tagName !== 'SELECT' && t.value === '') return;
        if (i === -1) CB[k] = v; else CB.L[i][k] = v; results();
      });
      $('#cb-zp').onclick = () => { CB.zoom = (CB.zoom || fitZ(CB._W, CB._H)) * 1.2; results(); }; $('#cb-zm').onclick = () => { CB.zoom = (CB.zoom || fitZ(CB._W, CB._H)) / 1.2; results(); }; $('#cb-fit').onclick = () => { CB.zoom = null; results(); };
      window.addEventListener('resize', () => { if (tab === 'arch' && CB.zoom == null) results(); });
    }
    $('#cb-pre').value = CB.preset; full();
  }
  function full() { $('#cb-editor').innerHTML = editor(); results(); }
  window.renderArch = build; window.__CB = { CB, compute, load, PRESETS };
})();

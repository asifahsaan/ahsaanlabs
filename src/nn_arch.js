/* ================= Neural Network: Architecture tab (one split node per neuron: z | a, function badge on top) =================
   Fully dynamic: any number of layers and neurons. Density, spacing, labels and step granularity adapt to the size. */
(function () {
  const AC = { x: '#475569', hid: '#2B7A9B', out: '#7C3AED', sig: '#F5B50A', tan: '#10B981', relu: '#F97316', box: '#E8EEF6', gray: '#94A3B8', loss: '#B7791F', g: '#C0392B', pos: '#2B7A9B', neg: '#E07B39', bias: '#F472B6' };
  const MKS = { p: AC.pos, n: AC.neg, g: AC.g, l: AC.loss, e: '#334155' };
  const NA = { sel: null, zoom: null, vals: true, g: { on: false, back: false, s: 0, play: null }, m: null, gr: null, inside: null };
  const esc2 = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const UC = ['#D9730D', '#7C3AED', '#16A34A', '#0E7490', '#B7791F', '#C0392B'];
  const short = (v, k = 4) => v.length > k ? v.slice(0, k).map(N).join(', ') + ', …' : v.map(N).join(', ');
  /* ---------- numbering: neurons 1..N and weights w1..wW (input by input) ---------- */
  function info() {
    const cfg = S.cfg, sz = cfg.sizes, L = sz.length - 1, nIdx = [], wIdx = [];
    let n = 0, w = 0;
    for (let l = 1; l <= L; l++) {
      nIdx[l] = []; wIdx[l] = [];
      for (let j = 0; j < sz[l]; j++) nIdx[l][j] = ++n;
      for (let i = 0; i < sz[l - 1]; i++) for (let j = 0; j < sz[l]; j++) { (wIdx[l][j] = wIdx[l][j] || [])[i] = ++w; }
    }
    return { cfg, sz, L, nIdx, wIdx, N: n, W: w };
  }
  const actName = l => { const c = S.cfg; return l === c.sizes.length - 1 ? c.out : c.act; };
  const actTex = l => { const a = actName(l); return a === 'sigmoid' ? R`\sigma` : a === 'tanh' ? R`\tanh` : a === 'relu' ? R`\mathrm{ReLU}` : a === 'softmax' ? R`\mathrm{softmax}` : R`\mathrm{id}`; };
  const actLabel = l => { const a = actName(l); return a === 'sigmoid' ? 'σ' : a === 'tanh' ? 'tanh' : a === 'relu' ? 'ReLU' : a === 'softmax' ? 'softmax' : 'id'; };
  const actCol = l => { const a = actName(l); return a === 'sigmoid' ? AC.sig : a === 'tanh' ? AC.tan : a === 'relu' ? AC.relu : a === 'softmax' ? AC.sig : AC.gray; };
  const actDark = l => { const a = actName(l); return a === 'sigmoid' || a === 'softmax'; };
  /* ---------- density level: 0 roomy, 1 medium, 2 large ---------- */
  function level() { const I = info(); let E = 0; for (let l = 1; l <= I.L; l++) E += I.sz[l - 1] * I.sz[l]; const mx = Math.max(...I.sz); return (E <= 14 && mx <= 4) ? 0 : (E <= 70 && mx <= 8) ? 1 : 2; }
  /* ---------- steps (per neuron for small nets, per layer for big ones) ---------- */
  function fwdSteps() {
    const I = info(), { sz, L, nIdx } = I, out = [], per = I.N <= 8; let id = 0; const rv = { z: [], a: [] };
    out.push({ id, t: 'The inputs arrive', from: 'the data', to: 'the input nodes', k: ['x'], say: 'The numbers you give the network enter here. Nothing is calculated yet.' }); rv.x = id++;
    for (let l = 1; l <= L; l++) {
      rv.z[l] = []; rv.a[l] = []; const n1 = nIdx[l][0], nK = nIdx[l][sz[l] - 1], soft = actName(l) === 'softmax';
      if (per) {
        for (let j = 0; j < sz[l]; j++) {
          const n = nIdx[l][j];
          rv.z[l][j] = id; out.push({ id: id++, t: `z${n}: add up the weighted inputs`, from: `${l === 1 ? 'the inputs' : 'the previous layer'} and the weights`, to: `z${n}`, k: ['n' + n], part: 'z', say: `Neuron ${n} multiplies each incoming value by its weight, adds them up and adds its bias. The left half of the node shows this sum, **z${n}**.` });
          if (!soft) { rv.a[l][j] = id; out.push({ id: id++, t: `a${n}: pass z${n} through ${actName(l) === 'linear' || actName(l) === 'identity' ? 'the identity' : actName(l)}`, from: `z${n}`, to: l === L ? `ŷ${j + 1} (a${n})` : `a${n}`, k: ['n' + n], part: 'a', say: `The function badge on top bends **z${n}** into **a${n}**${l === L ? ', the prediction ŷ' + (j + 1) : ''}, shown on the right half. Click the node to look inside.` }); }
        }
        if (soft) { const idd = id; for (let j = 0; j < sz[l]; j++) rv.a[l][j] = idd; out.push({ id: id++, t: 'Softmax turns all the z values into probabilities', from: nIdx[l].map(n => 'z' + n).join(', '), to: nIdx[l].map((n, j) => 'ŷ' + (j + 1)).join(', '), k: ['n' + nIdx[l][0]], part: 'a', say: 'Softmax looks at all the output z values together and gives each a share of 100%.' }); }
      } else {
        const zid = id; for (let j = 0; j < sz[l]; j++) rv.z[l][j] = zid;
        out.push({ id: id++, t: `Layer ${l}: every neuron adds up its weighted inputs`, from: `${l === 1 ? 'the inputs' : 'the previous layer'} and the weights`, to: `z${n1} … z${nK}`, k: ['n' + n1], part: 'z', say: `All ${sz[l]} neurons of layer ${l} compute their weighted sum at the same time (z${n1} to z${nK}). Click any node to see its own calculation.` });
        const aid = id; for (let j = 0; j < sz[l]; j++) rv.a[l][j] = aid;
        out.push({ id: id++, t: `Layer ${l}: the ${actName(l)} function gives a${n1} … a${nK}`, from: `z${n1} … z${nK}`, to: l === L ? 'the predictions ŷ' : `a${n1} … a${nK}`, k: ['n' + n1], part: 'a', say: `The function badge turns every z into its a${l === L ? ' (the prediction ŷ)' : ''}.` });
      }
    }
    rv.tg = id; out.push({ id: id++, t: 'The target: the answer we wanted', from: 'the data', to: 'target t', k: ['tg'], say: 'The target is the correct answer. The loss will compare the prediction with it.' });
    rv.loss = id; out.push({ id: id++, t: 'The loss: how wrong was the prediction?', from: 'ŷ and the target', to: 'loss L', k: ['loss'], say: 'The loss turns the difference between prediction and target into one number. Training tries to make it smaller.' });
    return { steps: out, rv };
  }
  function bwdSteps() {
    const I = info(), { L } = I, out = []; let id = 0;
    out.push({ id: id++, t: 'The loss starts the error', from: 'loss', to: 'δŷ = ŷ − t', key: ['dy'], say: 'Going backward starts at the loss. The error at each prediction is simply prediction minus target.' });
    out.push({ id: id++, t: 'Through the output function', from: 'δŷ', to: 'δz (output layer)', key: ['dz', L], say: actName(L) === 'sigmoid' ? 'The error is multiplied by the sigmoid slope ŷ(1 − ŷ).' : 'For this output function the error passes straight through.' });
    out.push({ id: id++, t: 'Gradients of the output weights', from: 'δz and the inputs of the layer', to: 'dw and db', key: ['dw', L], say: 'Each weight gets its own gradient: the error at its target neuron times the value it multiplied.' });
    for (let l = L - 1; l >= 1; l--) {
      out.push({ id: id++, t: `Back through the weights (layer ${l})`, from: `δz of layer ${l + 1}`, to: `δa of layer ${l}`, key: ['da', l], say: 'The error is sent back along the same weights it came through and added up for each neuron.' });
      out.push({ id: id++, t: `Through the activation (layer ${l})`, from: 'δa', to: 'δz', key: ['dz', l], say: 'The error is multiplied by the activation slope.' });
      out.push({ id: id++, t: `Gradients of the weights of layer ${l}`, from: 'δz and the layer inputs', to: 'dw and db', key: ['dw', l], say: 'Again each weight gets its gradient.' });
    }
    return out;
  }
  const seq = () => NA.g.back ? bwdSteps() : fwdSteps().steps;
  const curId = () => { if (!NA.g.on) return null; const s = seq(); return s[Math.min(NA.g.s, s.length - 1)].id; };
  const V = rv => { if (!NA.g.on || rv == null) return ''; if (NA.g.back) return 'fade'; const c = curId(); return rv > c ? 'hid' : rv === c ? 'enter' : ''; };
  const VB = rb => { if (!(NA.g.on && NA.g.back)) return 'hid'; const c = curId(); return rb > c ? 'hid' : rb === c ? 'enter' : ''; };
  /* ---------- drawing helpers ---------- */
  const Ln = (pts, mk, rv, w = 3, arrow = true, op = 1) => {
    const d = 'M' + pts.map(p => p.join(' ')).join(' L'), c = V(rv);
    return `<path class="ln ${c}" pathLength="1" d="${d}" fill="none" stroke="${MKS[mk] || mk}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round" stroke-linejoin="round"${arrow ? ` marker-end="url(#ah-${mk})"` : ''}/>` + (c === 'enter' ? `<path class="flowdash" pathLength="1" d="${d}" fill="none" stroke-width="${w}" stroke-linecap="round"/>` : '');
  };
  const Hit = (pts, rv) => `<path class="${V(rv)}" d="M${pts.map(p => p.join(' ')).join(' L')}" fill="none" stroke="rgba(0,0,0,0)" stroke-width="12" style="pointer-events:stroke"/>`;
  const Gr = (pts, rb, w = 3.2) => { if (!(NA.g.on && NA.g.back)) return ''; const d = 'M' + pts.map(p => p.join(' ')).join(' L'), c = VB(rb); return `<path class="ln grad ${c}" pathLength="1" d="${d}" fill="none" stroke="${AC.g}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#ah-g)"/>` + (c === 'enter' ? `<path class="flowdash" pathLength="1" d="${d}" fill="none" stroke-width="${w}" stroke-linecap="round"/>` : ''); };
  const chipH = (t, x, y, anc, cl, g) => { const w = t.length * 6.3 + 12, x0 = anc === 'start' ? x : anc === 'end' ? x - w : x - w / 2; return `<g class="${cl}"><rect class="${g ? 'chipbg gbg' : 'chipbg'}" x="${x0}" y="${y - 13}" width="${w}" height="19" rx="9.5"/><text class="chip${g ? ' gtx' : ''}" x="${x0 + w / 2}" y="${y}" text-anchor="middle">${t}</text></g>`; };
  const chip = (t, x, y, anc, rv) => NA.vals && !(NA.g.on && NA.g.back) ? chipH(t, x, y, anc, V(rv), false) : '';
  const gchip = (t, x, y, anc, rb) => NA.g.on && NA.g.back ? chipH(t, x, y, anc, VB(rb), true) : '';
  const PT = (nm, title, inner, ex = '') => `<g class="part ${ex}${NA.sel === nm && !NA.g.on ? ' sel' : ''}" data-p="${nm}"><title>${title}</title>${inner}</g>`;
  /* ---------- layout (adapts to the size of the network) ---------- */
  function layout() {
    const I = info(), { sz, L } = I, lv = level(), maxN = Math.max(...sz);
    const P = [{ PW: 140, PH: 58, gap: 124, sp: L >= 3 ? 270 : 320, rx: 24, tail: 200 }, { PW: 118, PH: 48, gap: 86, sp: 250, rx: 20, tail: 160 }, { PW: 96, PH: 40, gap: 62, sp: 210, rx: 17, tail: 130 }][lv];
    const VH = Math.max(380, maxN * P.gap + 110), X0 = 70, cx = [X0]; for (let l = 1; l <= L; l++) cx[l] = X0 + l * P.sp;
    const y = (l, j) => VH / 2 + (j - (sz[l] - 1) / 2) * P.gap, LX = cx[L] + P.PW / 2 + P.tail;
    return Object.assign(I, P, { lv, VH, cx, y, LX, W: LX + 120 });
  }
  function neuronSVG(G, l, j, rvz, rva) {
    const { cfg, nIdx, cx, y, PW, PH, lv, L } = G, n = nIdx[l][j], yy = y(l, j), x0 = cx[l] - PW / 2, top = yy - PH / 2, m = NA.m, isOut = l === L;
    const zv = m.z[l - 1][j], av = m.a[l][j], r = Math.min(14, PH / 2 - 2), hx = cx[l];
    const fs1 = lv === 0 ? 12 : lv === 1 ? 11 : 10, fs2 = lv === 0 ? 11 : lv === 1 ? 10 : 9;
    const right = `M${hx} ${top} h${PW / 2 - r} a${r} ${r} 0 0 1 ${r} ${r} v${PH - 2 * r} a${r} ${r} 0 0 1 ${-r} ${r} h${-(PW / 2 - r)} Z`;
    const lbl = isOut ? `ŷ${j + 1}` : `a${n}`;
    let s = `<rect class="capsule ${V(rvz)}" x="${x0}" y="${top}" width="${PW}" height="${PH}" rx="${r}" style="fill:${AC.box};stroke:#A9BBD0"/>`;
    s += `<g class="${V(rvz)}"><text x="${x0 + PW / 4}" y="${yy - 3}" text-anchor="middle" font-size="${fs1}" font-weight="700" fill="#3C5068">z${n}</text><text x="${x0 + PW / 4}" y="${yy + fs2 + 3}" text-anchor="middle" font-size="${fs2}" font-weight="600" fill="#33414d" class="tnum">${N(zv)}</text></g>`;
    s += `<g class="${V(rva)}"><path d="${right}" fill="${isOut ? AC.out : AC.hid}" stroke="#fff" stroke-width="2"/><text x="${hx + PW / 4}" y="${yy - 3}" text-anchor="middle" font-size="${fs1}" font-weight="700" fill="#fff">${lbl}</text><text x="${hx + PW / 4}" y="${yy + fs2 + 3}" text-anchor="middle" font-size="${fs2}" font-weight="600" fill="#fff" class="tnum">${N(av)}</text></g>`;
    s += `<line x1="${hx}" x2="${hx}" y1="${top + 4}" y2="${top + PH - 4}" stroke="#fff" stroke-width="2" class="${V(rva)}"/>`;
    const bw = Math.max(38, actLabel(l).length * 8 + 16);
    s += `<g class="nd ${V(rva)}"><rect x="${hx - bw / 2}" y="${top - 11}" width="${bw}" height="22" rx="11" fill="${actCol(l)}" stroke="#fff" stroke-width="2.5"/><text x="${hx}" y="${top + 4}" text-anchor="middle" font-size="${lv === 2 ? 11 : 12.5}" font-weight="700" ${actLabel(l) === 'σ' ? 'font-family="Georgia,serif" font-style="italic"' : ''} fill="${actDark(l) ? '#3b2f00' : '#fff'}">${actLabel(l)}</text></g>`;
    if (lv === 0) s += chip(`b${n} = ${N(cfg.b[l - 1][j])}`, x0 + PW / 4, yy + PH / 2 + 22, 'middle', rvz);
    return s;
  }
  function draw() {
    const G = layout(), { cfg, sz, L, nIdx, wIdx, cx, y, LX, PW, PH, lv } = G, m = NA.m, gr = NA.gr, bk = NA.g.on && NA.g.back, F = fwdSteps(), RV = F.rv;
    const BW = bk ? bwdSteps() : null, gid = (type, l) => { const st = BW.find(x => x.key[0] === type && (type === 'dy' || x.key[1] === l)); return st ? st.id : 0; };
    const ir = lv === 0 ? 24 : lv === 1 ? 20 : 17;
    let s = '', mxw = .05; cfg.W.forEach(a => a.forEach(r => r.forEach(w => { mxw = Math.max(mxw, Math.abs(w)); })));
    const hdr = (l) => l === 0 ? 'INPUT' : l === L ? 'OUTPUT' : (sz.length > 3 ? 'HIDDEN ' + l : 'HIDDEN');
    for (let l = 0; l <= L; l++) s += `<text class="zl" x="${cx[l]}" y="26" text-anchor="middle">${hdr(l)}</text><text class="ntag" x="${cx[l]}" y="42" text-anchor="middle">${sz[l]} neuron${sz[l] > 1 ? 's' : ''}${l > 0 ? ' · ' + actName(l) : ''}</text>`;
    s += `<text class="zl" x="${LX}" y="26" text-anchor="middle">LOSS</text><text class="ntag" x="${LX}" y="42" text-anchor="middle">${cfg.out === 'softmax' ? 'cross-entropy' : '½ squared error'}</text>`;
    /* weights */
    for (let l = 1; l <= L; l++) for (let j = 0; j < sz[l]; j++) for (let i = 0; i < sz[l - 1]; i++) {
      const k = wIdx[l][j][i], w = cfg.W[l - 1][j][i], rvz = RV.z[l][j];
      const x1 = l === 1 ? cx[0] + ir : cx[l - 1] + PW / 2, y1 = y(l - 1, i), x2 = cx[l] - PW / 2, y2 = y(l, j);
      const dx = x2 - x1, dy = y2 - y1, wd = (lv === 2 ? .8 : 1.2) + (lv === 2 ? 2.2 : 3.6) * Math.abs(w) / mxw, col = w >= 0 ? 'p' : 'n';
      const frac = .2 + .6 * (sz[l] > 1 ? j / (sz[l] - 1) : .5), px = x1 + dx * frac, py = y1 + dy * frac;
      const showChip = lv === 0 || (lv === 1 && (NA.sel === 'w' + k || V(rvz) === 'enter'));
      s += PT('w' + k, `weight w${k}`, Hit([[x1, y1], [x2, y2]], rvz) + Ln([[x1, y1], [x2 - 2, y2]], col, rvz, wd, lv < 2, .85) + (showChip ? chip(`w${k} = ${N(w)}`, px, py + 4, 'middle', rvz) : ''));
      if (bk) { const rb = gid('dw', l); s += Gr([[x2 - 6, y2 + 6], [x1 + 6, y1 + 6]], rb, lv === 2 ? 1.6 : 2.4); if (lv === 0) s += gchip(`dw${k} = ${N(gr.dW[l - 1][j][i])}`, px, py + 26, 'middle', rb); }
    }
    /* inputs */
    for (let i = 0; i < sz[0]; i++) s += PT('x', `input x${i + 1}`, `<g class="nd ${V(RV.x)}"><circle cx="${cx[0]}" cy="${y(0, i)}" r="${ir}" fill="${AC.x}" stroke="#fff" stroke-width="3"/><text x="${cx[0]}" y="${y(0, i) - 2}" text-anchor="middle" font-size="${lv === 2 ? 10 : 12}" font-weight="700" fill="#fff">x${i + 1}</text><text x="${cx[0]}" y="${y(0, i) + 11}" text-anchor="middle" font-size="${lv === 2 ? 8.5 : 10}" fill="#E2E8F0" class="tnum">${N(cfg.x[i])}</text></g>`);
    /* neurons */
    for (let l = 1; l <= L; l++) for (let j = 0; j < sz[l]; j++) {
      const n = nIdx[l][j], yy = y(l, j), rvz = RV.z[l][j], rva = RV.a[l][j];
      s += PT('n' + n, `neuron ${n}: z${n} then ${actName(l)} gives a${n}`, neuronSVG(G, l, j, rvz, rva));
      if (bk) {
        const gz = gr.dz[l - 1][j], rbz = gid('dz', l);
        s += Gr([[cx[l] + PW / 4, yy + PH / 2 + 8], [cx[l] - PW / 4, yy + PH / 2 + 8]], rbz, 2.6);
        if (lv < 2) { s += gchip(`δz${n} = ${N(gz)}`, cx[l] - PW / 4, yy + PH / 2 + 30, 'middle', rbz); if (l < L) s += gchip(`δa${n} = ${N(gr.da[l][j])}`, cx[l] + PW / 4, yy - PH / 2 - 22, 'middle', gid('da', l)); else s += gchip(`δŷ${j + 1} = ${N(gr.da[L][j])}`, cx[l] + PW / 4, yy - PH / 2 - 22, 'middle', gid('dy', 0)); }
      }
    }
    /* loss + target */
    const yl = G.VH / 2, yt = yl + (lv === 2 ? 90 : 112), lr = lv === 2 ? 22 : 26;
    s += PT('loss', 'loss', sz[L] <= 12 ? [...Array(sz[L]).keys()].map(j => Hit([[cx[L] + PW / 2, y(L, j)], [LX - lr, yl]], RV.loss) + Ln([[cx[L] + PW / 2, y(L, j)], [LX - lr - 2, yl + (j - (sz[L] - 1) / 2) * 3]], 'l', RV.loss, 2.2, lv < 2)).join('') : Ln([[cx[L] + PW / 2, yl], [LX - lr - 2, yl]], 'l', RV.loss, 3, true));
    s += PT('loss', 'loss L', `<g class="nd ${V(RV.loss)}"><circle cx="${LX}" cy="${yl}" r="${lr}" fill="${AC.loss}" stroke="#fff" stroke-width="3"/><text x="${LX}" y="${yl + 6}" text-anchor="middle" font-size="18" font-weight="700" fill="#fff">L</text></g>` + chip(`L = ${N(m.L)}`, LX, yl - lr - 14, 'middle', RV.loss));
    const tt = `t = [${short(cfg.t, 4)}]`;
    s += PT('tg', 'the target', Ln([[LX, yt - 22], [LX, yl + lr + 4]], 'e', RV.tg, 2.2) + `<g class="nd ${V(RV.tg)}"><rect x="${LX - 52}" y="${yt - 20}" width="104" height="40" rx="12" fill="${AC.x}" stroke="#fff" stroke-width="3"/><text x="${LX}" y="${yt + 5}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">target t</text></g>` + chip(tt, LX, yt + 40, 'middle', RV.tg));
    if (bk) { const rb = gid('dy', 0); s += Gr([[LX - lr - 4, yl + 12], [cx[L] + PW / 2 + 8, sz[L] > 12 ? yl + 12 : y(L, Math.floor((sz[L] - 1) / 2)) + 12]], rb, 3); }
    const defs = `<defs>${Object.entries(MKS).map(([k, c]) => `<marker id="ah-${k}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto"><path d="M0,0L10,5L0,10z" fill="${c}"/></marker>`).join('')}</defs>`;
    return { W: G.W, H: G.VH, html: defs + s };
  }
  /* ---------- explanations ---------- */
  const bmc = v => R`\begin{bmatrix}${v.map(N).join(R` \\ `)}\end{bmatrix}`;
  const locateN = (G, n) => { for (let l = 1; l <= G.L; l++) { const j = G.nIdx[l].indexOf(n); if (j >= 0) return [l, j]; } return null; };
  function nInfo(nm, noHead, part) {
    const G = layout(), { cfg, sz, L, nIdx, wIdx } = G, m = NA.m, D = s => K(s, true);
    let title = '', what = '', tex = [], why = '';
    const head = t => noHead ? `<h4 class="ih">${rt(t)}</h4>` : `<h3>${rt(t)}</h3>`;
    if (nm === 'x') { title = 'The inputs'; what = 'These are the numbers that enter the network.'; tex = [R`x=${bmc(cfg.x)}`]; }
    else if (/^n\d+$/.test(nm)) {
      const n = +nm.slice(1), [l, j] = locateN(G, n), prev = m.a[l - 1], a = actName(l), isOut = l === L;
      const zTex = () => { const terms = prev.map((v, i) => R`w_{${wIdx[l][j][i]}}\,${l === 1 ? 'x' : 'a'}_{${l === 1 ? i + 1 : nIdx[l - 1][i]}}`).join('+'); return [R`z_{${n}}=${terms}+b_{${n}}`, R`z_{${n}}=${prev.map((v, i) => `(${N(cfg.W[l - 1][j][i])})(${N(v)})`).join('+')}+(${N(cfg.b[l - 1][j])})=${N(m.z[l - 1][j])}`]; };
      const aTex = () => a === 'softmax' ? [R`\hat y_c=\dfrac{e^{z_c}}{\sum_q e^{z_q}}`, R`\hat y=${bmc(m.a[L])}`] : [R`a_{${n}}=${actTex(l)}(z_{${n}})=${actTex(l)}(${N(m.z[l - 1][j])})=${N(m.a[l][j])}`];
      if (part === 'z') { title = `z${n}: the weighted sum of neuron ${n}`; what = `**z${n}** multiplies every incoming value by its weight, adds them up and adds the bias **b${n}**. It is the left half of the node.`; tex = zTex(); why = 'Every neuron has its own weights, so it can listen to the inputs in its own way.'; }
      else if (part === 'a') { title = `a${n}: ${a === 'identity' || a === 'linear' ? 'the identity' : a} turns z${n} into a${n}`; what = (a === 'sigmoid' ? 'Sigmoid squeezes any number into 0 to 1.' : a === 'tanh' ? 'tanh squeezes any number into −1 to 1.' : a === 'relu' ? 'ReLU keeps positive numbers and turns negative numbers into 0.' : a === 'softmax' ? 'Softmax turns all the output z values into probabilities that add up to 1.' : 'The identity leaves the number as it is.') + (isOut ? ` The result is the prediction **ŷ${j + 1}**.` : ` **a${n}** is sent to every neuron of the next layer.`); tex = aTex(); why = 'Without this bend the whole network would be one big straight-line calculation.'; }
      else { title = `Neuron ${n}: z${n} → ${isOut ? 'ŷ' + (j + 1) : 'a' + n}`; what = `The left half is **z${n}** (weighted sum), the badge on top is the function (**${actLabel(l)}**), the right half is **${isOut ? 'ŷ' + (j + 1) + ' = a' + n : 'a' + n}**. Click the node to look inside.`; tex = zTex().concat(aTex()); }
    } else if (/^w\d+$/.test(nm)) {
      const k = +nm.slice(1); let f = null;
      for (let l = 1; l <= L; l++) for (let j = 0; j < sz[l]; j++) for (let i = 0; i < sz[l - 1]; i++) if (wIdx[l][j][i] === k) f = { l, j, i };
      const from = f.l === 1 ? `x${f.i + 1}` : `a${nIdx[f.l - 1][f.i]}`, to = `z${nIdx[f.l][f.j]}`;
      title = `Weight w${k}`; what = `**w${k}** multiplies **${from}** on its way into **${to}**. Weights are numbered input by input: first all the weights of the first input, then the second, and so on.`;
      tex = [R`w_{${k}}=${N(cfg.W[f.l - 1][f.j][f.i])}`]; why = 'Training changes the weights to make the loss smaller.';
    } else if (nm === 'tg') { title = 'The target'; what = 'The answer the network should have given.'; tex = [R`t=${bmc(cfg.t)}`]; }
    else if (nm === 'loss') { title = 'The loss'; what = cfg.out === 'softmax' ? 'Cross-entropy only looks at the probability of the right answer.' : 'Half the sum of the squared differences between prediction and target.'; tex = [cfg.out === 'softmax' ? R`L=-\sum_k t_k\ln\hat y_k=${N(m.L)}` : R`L=\tfrac12\sum_k(\hat y_k-t_k)^2=${N(m.L)}`]; if (sz[L] <= 6) tex.push(R`\hat y=${bmc(m.a[L])},\; t=${bmc(cfg.t)}`); }
    else { title = 'Network'; what = 'Click a shape.'; }
    return head(title) + `<p>${rt(what)}</p>` + tex.map(D).join('') + (why ? `<p class="why"><b>Why it exists:</b> ${rt(why)}</p>` : '');
  }
  function bInfo(key) {
    const G = layout(), { cfg, sz, L, nIdx, wIdx } = G, m = NA.m, g = NA.gr, D = s => K(s, true), [type, l] = key; let tex = [], note = '';
    const dzv = ll => g.dz[ll - 1], cap = 24;
    if (type === 'dy') tex = [R`\delta\hat y=\hat y-t=${bmc(m.a[L])}-${bmc(cfg.t)}=${bmc(g.da[L])}`];
    else if (type === 'dz') {
      if (l === L) { tex = cfg.out === 'sigmoid' ? [R`\delta z=\delta\hat y\odot\hat y\odot(1-\hat y)=${bmc(g.da[L])}\odot${bmc(m.a[L])}\odot${bmc(m.a[L].map(v => 1 - v))}=${bmc(dzv(L))}`] : [R`\delta z=\delta\hat y=${bmc(dzv(L))}`]; note = cfg.out === 'sigmoid' ? 'Sigmoid output: multiply by its slope.' : 'Softmax with cross-entropy (or an identity output with squared error) gives δz = ŷ − t directly.'; }
      else { const f = { sigmoid: R`a(1-a)`, tanh: R`1-a^2`, relu: R`\mathbb 1[z>0]` }[cfg.act]; tex = [R`\delta z=\delta a\odot f'(z),\; f'=${f}`, R`=${bmc(g.da[l])}\odot${bmc(m.a[l].map((a, j) => ACTS[cfg.act].d(m.z[l - 1][j], a)))}=${bmc(dzv(l))}`]; }
    } else if (type === 'dw') {
      let c = 0;
      outer: for (let j = 0; j < sz[l]; j++) for (let i = 0; i < sz[l - 1]; i++) { if (c++ >= cap) { note = `Showing the first ${cap} weights of this layer (${sz[l] * sz[l - 1]} in total). The rest follow the same rule.`; break outer; } tex.push(R`\partial L/\partial w_{${wIdx[l][j][i]}}=\delta z_{${nIdx[l][j]}}\times ${l === 1 ? 'x' : 'a'}_{${l === 1 ? i + 1 : nIdx[l - 1][i]}}=(${N(dzv(l)[j])})(${N(m.a[l - 1][i])})=${N(g.dW[l - 1][j][i])}`); }
      for (let j = 0; j < Math.min(sz[l], 8); j++) tex.push(R`\partial L/\partial b_{${nIdx[l][j]}}=\delta z_{${nIdx[l][j]}}=${N(g.db[l - 1][j])}`);
      note = note || 'Each weight learns from the error at the neuron it feeds, scaled by the value it carried.';
    } else if (type === 'da') {
      for (let i = 0; i < Math.min(sz[l], cap); i++) { const nx = Math.min(sz[l + 1], 6), ids = [...Array(nx).keys()]; const terms = ids.map(j => R`w_{${wIdx[l + 1][j][i]}}\,\delta z_{${nIdx[l + 1][j]}}`).join('+') + (sz[l + 1] > nx ? '+\\cdots' : ''); const nums = ids.map(j => `(${N(cfg.W[l][j][i])})(${N(dzv(l + 1)[j])})`).join('+') + (sz[l + 1] > nx ? '+\\cdots' : ''); tex.push(R`\delta a_{${nIdx[l][i]}}=${terms}=${nums}=${N(g.da[l][i])}`); }
    }
    return tex.map(D).join('') + (note ? `<div class="read">${esc2(note)}</div>` : '');
  }
  /* ---------- look inside ---------- */
  const uvec = v => v.slice(0, 12).map((x, j) => `<span class="uv" style="--uc:${UC[j % 6]}"><i>#${j + 1}</i>${N(x)}</span>`).join('') + (v.length > 12 ? `<span class="note">… ${v.length - 12} more</span>` : '');
  function inCurve(kind, zs, ys) {
    const W = 360, Hh = 200, p = 34, xr = kind === 'sig' ? [-6, 6] : [-3, 3], yr = kind === 'sig' ? [0, 1] : kind === 'relu' ? [0, 3] : [-1, 1];
    const X = z => p + (Math.max(xr[0], Math.min(xr[1], z)) - xr[0]) / (xr[1] - xr[0]) * (W - 2 * p), Y = y => Hh - p - (Math.max(yr[0], Math.min(yr[1], y)) - yr[0]) / (yr[1] - yr[0]) * (Hh - 2 * p);
    const f = kind === 'sig' ? z => 1 / (1 + Math.exp(-z)) : kind === 'relu' ? z => Math.max(0, z) : Math.tanh; let d = '';
    for (let i = 0; i <= 120; i++) { const z = xr[0] + (xr[1] - xr[0]) * i / 120; d += (i ? 'L' : 'M') + X(z).toFixed(1) + ' ' + Y(f(z)).toFixed(1); }
    const xt = kind === 'sig' ? [-6, -3, 0, 3, 6] : [-3, -1.5, 0, 1.5, 3], ticks = xt.map(z => `<text x="${X(z)}" y="${Hh - p + 16}" text-anchor="middle" class="tk">${z}</text>`).join('');
    const yv = kind === 'sig' ? [0, .5, 1] : kind === 'relu' ? [0, 1, 2, 3] : [-1, 0, 1], yt = yv.map(y => `<line x1="${p}" x2="${W - p}" y1="${Y(y)}" y2="${Y(y)}" class="gl2"/><text x="${p - 6}" y="${Y(y) + 4}" text-anchor="end" class="tk">${y}</text>`).join(''), b = Y(yr[0]);
    const dots = zs.map((z, j) => { const c = UC[j % 6], x = X(z), yy = Y(ys[j]); return `<line x1="${x}" x2="${x}" y1="${b}" y2="${b}" stroke="${c}" stroke-width="2" stroke-dasharray="4 3"><animate attributeName="y2" from="${b}" to="${yy}" dur="1.6s" begin=".9s" fill="freeze"/></line><line x1="${x}" x2="${x}" y1="${yy}" y2="${yy}" stroke="${c}" stroke-width="2" stroke-dasharray="4 3"><animate attributeName="x2" from="${x}" to="${p}" dur="1.2s" begin="2.5s" fill="freeze"/></line><circle cx="${x}" cy="${b}" r="6.5" fill="${c}" stroke="#fff" stroke-width="2"><animate attributeName="cy" from="${b}" to="${yy}" dur="1.6s" begin=".9s" fill="freeze"/></circle><circle cx="${p}" cy="${yy}" r="0" fill="${c}" stroke="#fff" stroke-width="2"><animate attributeName="r" from="0" to="6.5" dur=".4s" begin="3.7s" fill="freeze"/></circle>`; }).join('');
    return `<svg class="icurve" viewBox="0 0 ${W} ${Hh}">${yt}<line x1="${p}" x2="${W - p}" y1="${Hh - p}" y2="${Hh - p}" class="ax"/><line x1="${p}" x2="${p}" y1="${p - 8}" y2="${Hh - p}" class="ax"/>${ticks}<path d="${d}" fill="none" stroke="#475569" stroke-width="2.5"/>${dots}<text x="${W - p}" y="${p - 12}" text-anchor="end" class="tk">z in (bottom) → a out (left)</text></svg>`;
  }
  const T = (h, r) => `<table class="itab"><tr>${h.map(c => `<th>${c}</th>`).join('')}</tr>${r.map((row, i) => `<tr style="--i:${i}">${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
  function neuronInside(n) {
    const G = layout(), { cfg, sz, L, nIdx, wIdx } = G, m = NA.m, [l, j] = locateN(G, n), prev = m.a[l - 1], a = actName(l), zv = m.z[l - 1][j], av = m.a[l][j], isOut = l === L;
    const rows = prev.slice(0, 40).map((v, i) => [`w${wIdx[l][j][i]}`, N(cfg.W[l - 1][j][i]), `${l === 1 ? 'x' : 'a'}${l === 1 ? i + 1 : nIdx[l - 1][i]}`, N(v), `<b>${N(cfg.W[l - 1][j][i] * v)}</b>`]);
    if (prev.length > 40) rows.push(['…', '', '', '', `${prev.length - 40} more terms`]);
    rows.push([`b${n}`, N(cfg.b[l - 1][j]), '—', '—', `<b>${N(cfg.b[l - 1][j])}</b>`]); rows.push(['<b>total</b>', '', '', '', `<b>z${n} = ${N(zv)}</b>`]);
    let fn, curve = '', t2, lede2;
    if (a === 'softmax') { const zs = m.z[l - 1], mx = Math.max(...zs), ex = zs.map(v => Math.exp(v - mx)), se = ex.reduce((p, q) => p + q, 0); fn = K(R`\hat y_c=\dfrac{e^{z_c}}{\sum_q e^{z_q}}`, true); t2 = T(['output', 'z', 'e<sup>z</sup> (shifted by max)', '÷ total ' + N(se) + ' = ŷ'], zs.slice(0, 20).map((v, c) => [`ŷ${c + 1} (z${nIdx[L][c]})`, N(v), N(ex[c]), `<b>${N(m.a[L][c])}</b> (${(m.a[L][c] * 100).toFixed(1)}%)`])); lede2 = 'Softmax makes every z positive with e^z, then divides by the total so the answers add up to 100%.'; }
    else if (a === 'sigmoid') { fn = K(R`\sigma(z)=\dfrac{1}{1+e^{-z}}`, true); curve = inCurve('sig', [zv], [av]); t2 = T(['z', 'e<sup>−z</sup>', '1 + e<sup>−z</sup>', '1 ÷ that = a'], [[N(zv), N(Math.exp(-zv)), N(1 + Math.exp(-zv)), `<b>${N(av)}</b>`]]); lede2 = 'Sigmoid turns any number into a dial between 0 and 1.'; }
    else if (a === 'tanh') { fn = K(R`\tanh(z)=\dfrac{e^{z}-e^{-z}}{e^{z}+e^{-z}}`, true); curve = inCurve('tanh', [zv], [av]); t2 = T(['z', 'e<sup>z</sup>', 'e<sup>−z</sup>', '(e<sup>z</sup>−e<sup>−z</sup>) ÷ (e<sup>z</sup>+e<sup>−z</sup>) = a'], [[N(zv), N(Math.exp(zv)), N(Math.exp(-zv)), `<b>${N(av)}</b>`]]); lede2 = 'tanh squeezes any number into −1 to 1.'; }
    else if (a === 'relu') { fn = K(R`\mathrm{ReLU}(z)=\max(0,z)`, true); curve = inCurve('relu', [zv], [av]); t2 = T(['z', 'max(0, z) = a'], [[N(zv), `<b>${N(av)}</b>`]]); lede2 = 'ReLU keeps positive numbers and turns negative numbers into 0.'; }
    else { fn = K(R`a=z`, true); t2 = T(['z', 'a'], [[N(zv), `<b>${N(av)}</b>`]]); lede2 = 'The identity leaves the number as it is.'; }
    const inH = `<span class="vl">incoming values</span>${uvec(prev)}<span class="vl">weights</span>${uvec(cfg.W[l - 1][j])}`;
    const fnH = K(R`z_{${n}}=\sum_i w_i\,a_i+b_{${n}}`, true) + fn;
    const outH = `<span class="vl">z${n}</span><span class="uv" style="--uc:${AC.hid}"><i>z${n}</i>${N(zv)}</span><span class="vl">${isOut ? 'ŷ' + (j + 1) + ' = a' + n : 'a' + n}</span><span class="uv" style="--uc:${isOut ? AC.out : AC.hid}"><i>${isOut ? 'ŷ' + (j + 1) : 'a' + n}</i>${N(av)}</span>`;
    return `<div class="ihead"><span class="isym" style="background:${actCol(l)};color:${actDark(l) ? '#3b2f00' : '#fff'}">${actLabel(l)}</span><div><h3>Inside neuron ${n}: z${n} → ${isOut ? 'ŷ' + (j + 1) : 'a' + n}</h3><div class="ilede">Step 1: add up the weighted inputs to get z${n}. Step 2: ${esc2(lede2)}</div></div></div><div class="iflow"><div class="ibox"><div class="ik">What came in</div>${inH}</div><div class="iarr">➜</div><div class="ibox mid"><div class="ik">What happens inside</div>${fnH}</div><div class="iarr">➜</div><div class="ibox"><div class="ik">What came out</div>${outH}</div></div><div class="itw"><div class="ik" style="margin-top:8px">Step 1 · the weighted sum</div>${T(['weight', 'value', 'times', 'incoming', '= product'], rows)}</div>${curve ? `<div class="icwrap">${curve}</div>` : ''}<div class="itw"><div class="ik" style="margin-top:8px">Step 2 · the ${a === 'identity' || a === 'linear' ? 'identity' : a} function</div>${t2}</div>`;
  }
  function inside(nm) {
    if (/^n\d+$/.test(nm)) return neuronInside(+nm.slice(1));
    if (nm === 'loss') {
      const G = layout(), { cfg, L, nIdx } = G, m = NA.m, y = m.a[L], t = cfg.t, sm = cfg.out === 'softmax';
      return `<div class="ihead"><span class="isym" style="background:${AC.loss};color:#fff">L</span><div><h3>Inside the loss</h3><div class="ilede">${sm ? 'Cross-entropy only looks at the probability of the right answer.' : 'Half the sum of the squared differences between prediction and target.'}</div></div></div><div class="iflow"><div class="ibox"><div class="ik">What came in</div><span class="vl">ŷ</span>${uvec(y)}<span class="vl">target</span>${uvec(t)}</div><div class="iarr">➜</div><div class="ibox mid"><div class="ik">What happens inside</div>${K(sm ? R`L=-\sum_k t_k\ln\hat y_k` : R`L=\tfrac12\sum_k(\hat y_k-t_k)^2`, true)}</div><div class="iarr">➜</div><div class="ibox"><div class="ik">What came out</div><span class="uv" style="--uc:${AC.loss}"><i>L</i>${N(m.L)}</span></div></div><div class="itw">${T(sm ? ['output', 'target t', 'ŷ', '−t · ln ŷ'] : ['output', 'prediction ŷ', 'target t', '½ (ŷ − t)²'], y.slice(0, 30).map((v, c) => sm ? [`ŷ${c + 1}`, N(t[c]), N(v), `<b>${N(-t[c] * Math.log(v))}</b>`] : [`ŷ${c + 1}`, N(v), N(t[c]), `<b>${N(.5 * (v - t[c]) ** 2)}</b>`]))}<div class="note" style="margin-top:6px">Total: <b>L = ${N(m.L)}</b></div></div>`;
    }
    return null;
  }
  const INS = nm => /^n\d+$/.test(nm) || nm === 'loss';
  function openInside(nm, src) {
    const html = inside(nm); if (!html) return; const ov = $('#a-ov'), svg = $('#a-svg');
    ov.innerHTML = `<div class="insidecard"><button class="ix" id="a-ox">✕ Close</button>${html}</div>`; ov.classList.add('on'); NA.inside = nm;
    svg.classList.add('zooming'); svg.querySelectorAll('.part.focus').forEach(e => e.classList.remove('focus')); if (src) src.classList.add('focus');
    const card = ov.querySelector('.insidecard');
    if (src) { const sr = src.getBoundingClientRect(), cr = card.getBoundingClientRect(), dx = sr.left + sr.width / 2 - (cr.left + cr.width / 2), dy = sr.top + sr.height / 2 - (cr.top + cr.height / 2), sc = Math.max(.06, Math.min(sr.width / cr.width, sr.height / cr.height)); card.style.transition = 'none'; card.style.transform = `translate(${dx}px,${dy}px) scale(${sc})`; card.style.opacity = '0'; card.offsetWidth; card.style.transition = 'transform 1.1s cubic-bezier(.2,.8,.2,1),opacity .7s ease'; card.style.transform = 'none'; card.style.opacity = '1'; }
    $('#a-ox').onclick = closeInside;
  }
  function closeInside() { const ov = $('#a-ov'); if (!ov) return; ov.classList.remove('on'); ov.innerHTML = ''; NA.inside = null; const svg = $('#a-svg'); if (svg) { svg.classList.remove('zooming'); svg.querySelectorAll('.part.focus').forEach(e => e.classList.remove('focus')); } }
  /* ---------- guided + tab ---------- */
  function gStop() { if (NA.g.play) { clearInterval(NA.g.play); NA.g.play = null; } }
  function gGo(s) { NA.g.s = Math.max(0, Math.min(seq().length - 1, s)); renderArch(); }
  function guidedHTML() {
    const sq = seq(), n = Math.min(NA.g.s, sq.length - 1), g = sq[n];
    const body = NA.g.back ? bInfo(g.key) : g.k.map(k => nInfo(k, true, g.part)).join('<hr class="sep">');
    const first = !NA.g.back && g.k.find(INS), look = first ? `<button class="btn lookb" data-look="${first}">🔍 Look inside this node</button>` : '';
    return `<div class="gstep"><div class="gk">${NA.g.back ? 'Backward' : 'Forward'} · step ${n + 1} of ${sq.length}</div><h3>${rt(g.t)}</h3><div class="flow"><span class="fb">${esc2(g.from)}</span><span class="fa">➜</span><span class="fb to">${esc2(g.to)}</span></div><p class="gsay${NA.g.back ? ' back' : ''}">${rt(g.say)}</p>${look}${body}</div>`;
  }
  function keyHTML() {
    const G = layout(), { sz, L, nIdx, wIdx } = G; let h = '', c = 0;
    for (let l = 1; l <= L; l++) for (let i = 0; i < sz[l - 1]; i++) for (let j = 0; j < sz[l]; j++) h += `<span class="wk"><b>w${wIdx[l][j][i]}</b> ${l === 1 ? 'x' + (i + 1) : 'a' + nIdx[l - 1][i]} → z${nIdx[l][j]}</span>`;
    return G.W <= 24 ? '<b>Weight numbering:</b> ' + h : `<details><summary><b>Weight numbering</b> (${G.W} weights, numbered input by input; click a connection to see which one it is)</summary><div class="wkscroll">${h}</div></details>`;
  }
  function renderArch() {
    const root = $('#archroot');
    if (!root.dataset.ready) {
      root.dataset.ready = '1';
      root.innerHTML = `<div class="archbar"><div class="seg" id="a-run"><button data-r="0">Explore all</button><button data-r="1">▶ Forward, step by step</button><button data-r="2">◀ Backward, step by step</button></div><label class="note" id="a-vl"><input type="checkbox" id="a-vals" checked> numbers</label><span class="zoomb"><button class="btn" id="a-zm">−</button><button class="btn" id="a-fit">Fit</button><button class="btn" id="a-zp">+</button></span></div>
      <div class="gbarx" id="a-gbar"><button class="btn" id="g-prev">◀ Back</button><button class="btn pri" id="g-next">Next ▶</button><button class="btn" id="g-play">▶ Play</button><div class="gdots" id="g-dots"></div><button class="btn" id="g-reset">↺ Restart</button></div>
      <div class="archcap" id="a-cap"></div>
      <div class="archgrid"><div class="archstage" id="a-stage"><div class="archwrap" id="a-wrap"><svg id="a-svg"></svg></div><div class="insideov" id="a-ov"></div></div><aside class="archinfo" id="a-info"></aside></div>
      <div class="wkey" id="a-key"></div>
      <div class="archleg"><span><i style="background:${AC.x}"></i>input x</span><span><i style="background:${AC.box};border:1px solid #A9BBD0"></i>left half: z (weighted sum)</span><span><i style="background:${AC.sig}"></i>badge on top: activation function</span><span><i style="background:${AC.hid}"></i>right half: a (hidden output)</span><span><i style="background:${AC.out}"></i>ŷ (prediction)</span><span><i style="background:${AC.loss}"></i>loss</span><span><i style="background:${AC.pos}"></i>weight &gt; 0</span><span><i style="background:${AC.neg}"></i>weight &lt; 0</span><span><i style="background:${AC.g}"></i>gradient (backward)</span></div>`;
      $('#a-run').onclick = e => { const b = e.target.closest('button'); if (!b) return; gStop(); const r = b.dataset.r; NA.g.on = r !== '0'; NA.g.back = r === '2'; NA.g.s = 0; NA.sel = null; NA.zoom = null; renderArch(); };
      $('#a-vals').onchange = e => { NA.vals = e.target.checked; renderArch(); };
      $('#a-zp').onclick = () => { NA.zoom = (NA.zoom || fit()) * 1.2; renderArch(); }; $('#a-zm').onclick = () => { NA.zoom = (NA.zoom || fit()) / 1.2; renderArch(); }; $('#a-fit').onclick = () => { NA.zoom = null; renderArch(); };
      $('#g-prev').onclick = () => { gStop(); gGo(NA.g.s - 1); }; $('#g-next').onclick = () => { gStop(); gGo(NA.g.s + 1); }; $('#g-reset').onclick = () => { gStop(); gGo(0); };
      $('#g-play').onclick = () => { if (NA.g.play) { gStop(); renderArch(); return; } if (NA.g.s >= seq().length - 1) NA.g.s = 0; NA.g.play = setInterval(() => { if (NA.g.s >= seq().length - 1) { gStop(); renderArch(); return; } gGo(NA.g.s + 1); }, 6500); gGo(NA.g.s); };
      $('#g-dots').onclick = e => { const d = e.target.closest('i'); if (d) { gStop(); gGo(+d.dataset.i); } };
      document.addEventListener('keydown', e => { if (tab !== 'arch' || !NA.g.on || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return; if (e.key === 'ArrowRight') { gStop(); gGo(NA.g.s + 1); } if (e.key === 'ArrowLeft') { gStop(); gGo(NA.g.s - 1); } if (e.key === 'Escape') closeInside(); });
      $('#a-svg').addEventListener('click', e => { const g = e.target.closest('.part'); if (!g) return; const nm = g.dataset.p; if (NA.g.on && NA.g.back) return; if (!NA.g.on) { NA.sel = nm; renderArch(); } if (INS(nm)) openInside(nm, document.querySelector(`#a-svg [data-p="${nm}"]`)); });
      $('#a-ov').addEventListener('click', e => { if (e.target.id === 'a-ov') closeInside(); });
      $('#a-info').addEventListener('click', e => { const b = e.target.closest('[data-look]'); if (b) openInside(b.dataset.look, document.querySelector(`#a-svg [data-p="${b.dataset.look}"]`)); });
      window.addEventListener('resize', () => { if (tab === 'arch' && NA.zoom == null) renderArch(); });
    }
    NA.m = forward(S.cfg); NA.gr = backward(S.cfg).g;
    if (NA.g.s >= seq().length) NA.g.s = seq().length - 1;
    const sg = [NA.g.s, NA.g.on, NA.g.back, NA.vals].join(); if (NA._sg !== sg) { closeInside(); NA._sg = sg; }
    const gd = NA.g.on;
    document.querySelectorAll('#a-run button').forEach(b => b.classList.toggle('on', (b.dataset.r === '0' && !gd) || (b.dataset.r === '1' && gd && !NA.g.back) || (b.dataset.r === '2' && gd && NA.g.back)));
    $('#a-vl').style.display = gd ? 'none' : ''; $('#a-gbar').style.display = gd ? '' : 'none';
    $('#a-cap').style.display = gd ? 'none' : ''; $('#a-cap').innerHTML = rt('Every neuron is one node: the left half is **z** (the weighted sum), the badge on top is the **activation function**, the right half is **a** (its output). Click any node, weight, the target or the loss. Weights are numbered **w1, w2, …** input by input.');
    if (gd) { const n = seq().length; $('#g-dots').innerHTML = seq().map((_, i) => `<i class="${i < NA.g.s ? 'd' : i === NA.g.s ? 'a' : ''}" data-i="${i}" title="${esc2(seq()[i].t)}"></i>`).join(''); $('#g-play').textContent = NA.g.play ? '⏸ Pause' : '▶ Play'; $('#g-prev').disabled = NA.g.s === 0; $('#g-next').disabled = NA.g.s === n - 1; }
    const g = draw(), svg = $('#a-svg'), z = NA.zoom || fit(g.W, g.H); svg.setAttribute('viewBox', `0 0 ${g.W} ${g.H}`); svg.style.width = Math.round(g.W * z) + 'px'; svg.style.height = Math.round(g.H * z) + 'px'; svg.innerHTML = g.html; NA._W = g.W; NA._H = g.H;
    $('#a-key').innerHTML = keyHTML();
    $('#a-info').innerHTML = gd ? guidedHTML() : (NA.sel ? nInfo(NA.sel) + (INS(NA.sel) ? `<button class="btn lookb" data-look="${NA.sel}">🔍 Look inside this ${NA.sel === 'loss' ? 'part' : 'node'}</button>` : '') : `<h3>Click any part</h3><p class="note">Every shape is clickable: the inputs, the weights, the neuron nodes (z | function | a), the target and the loss. Click a neuron to look inside it.</p><p class="note">Press <b>▶ Forward, step by step</b> to build the network ${info().N <= 8 ? 'one neuron at a time' : 'one layer at a time'}, or <b>◀ Backward</b> to watch the error flow back.</p>`);
    root.classList.toggle('guided', gd);
  }
  function fit(W, H) { W = W || NA._W || 960; H = H || NA._H || 480; const w = ($('#a-wrap') && $('#a-wrap').clientWidth) || 900, hh = Math.max(360, innerHeight - 250); return Math.max(.2, Math.min(1.25, (w - 8) / W, hh / H)); }
  window.renderArch = renderArch; window.__NA = NA;
})();

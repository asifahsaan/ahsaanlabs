/* ================= Neural Network: Architecture tab (z -> activation -> a, clickable, guided) ================= */
(function () {
  const AC = { x: '#475569', hid: '#2B7A9B', out: '#7C3AED', sig: '#F5B50A', tan: '#10B981', relu: '#F97316', box: '#E8EEF6', gray: '#94A3B8', loss: '#B7791F', g: '#C0392B', pos: '#2B7A9B', neg: '#E07B39', bias: '#F472B6' };
  const MKS = { p: AC.pos, n: AC.neg, g: AC.g, l: AC.loss, e: '#334155' };
  const NA = { sel: null, zoom: null, vals: true, g: { on: false, back: false, s: 0, play: null }, m: null, gr: null, inside: null };
  const f2 = v => { const a = Math.abs(v) < .005 ? 0 : v; return a.toFixed(2); };
  const esc2 = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const UC = ['#D9730D', '#7C3AED', '#16A34A', '#0E7490', '#B7791F', '#C0392B'];
  /* ---------- numbering: neurons z1,z2,... and weights w1,w2,... (input by input) ---------- */
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
  const actFn = (l, zs) => {
    const a = actName(l);
    if (a === 'softmax') { const mx = Math.max(...zs), e = zs.map(v => Math.exp(v - mx)), s = e.reduce((p, q) => p + q, 0); return e.map(v => v / s); }
    return zs.map(a === 'sigmoid' ? (z => 1 / (1 + Math.exp(-z))) : a === 'tanh' ? Math.tanh : a === 'relu' ? (z => Math.max(0, z)) : (z => z));
  };
  /* ---------- steps ---------- */
  function fwdSteps() {
    const I = info(), { sz, L, nIdx, wIdx } = I, out = []; let id = 0; const rv = { z: [], a: [] };
    out.push({ id: id, t: 'The inputs arrive', from: 'the data', to: 'the input nodes', k: ['x'], say: 'The numbers you give the network enter here. Nothing is calculated yet.' }); rv.x = id++;
    for (let l = 1; l <= L; l++) {
      rv.z[l] = []; rv.a[l] = [];
      for (let j = 0; j < sz[l]; j++) {
        const n = nIdx[l][j];
        rv.z[l][j] = id; out.push({ id: id++, t: `z${n}: add up the weighted inputs`, from: `the ${l === 1 ? 'inputs' : 'previous layer'} and the weights`, to: `z${n}`, k: ['z' + n], say: `Neuron ${n} multiplies each incoming value by its weight, adds them up and adds its bias. This sum is **z${n}**.` });
        if (actName(l) !== 'softmax') { rv.a[l][j] = id; out.push({ id: id++, t: `a${n}: pass z${n} through ${actName(l) === 'identity' || actName(l) === 'linear' ? 'the identity' : actName(l)}`, from: `z${n}`, to: l === L ? `ŷ${j + 1} (a${n})` : `a${n}`, k: ['s' + n, 'a' + n], say: `The activation function bends **z${n}** into **a${n}**${l === L ? ', the prediction ŷ' + (j + 1) : ''}. Open the function node to see how.` }); }
      }
      if (actName(l) === 'softmax') { const ids = id; for (let j = 0; j < sz[l]; j++) rv.a[l][j] = ids; out.push({ id: id++, t: 'Softmax turns all the z values into probabilities', from: nIdx[l].map(n => 'z' + n).join(', '), to: nIdx[l].map((n, j) => 'ŷ' + (j + 1)).join(', '), k: nIdx[l].map(n => 's' + n).concat(nIdx[l].map(n => 'a' + n)), say: 'Softmax looks at all the output z values together and gives each a share of 100%.' }); }
    }
    rv.tg = id; out.push({ id: id++, t: 'The target: the answer we wanted', from: 'the data', to: 'target t', k: ['tg'], say: 'The target is the correct answer. The loss will compare the prediction with it.' });
    rv.loss = id; out.push({ id: id++, t: 'The loss: how wrong was the prediction?', from: 'ŷ and the target', to: 'loss L', k: ['loss'], say: 'The loss turns the difference between prediction and target into one number. Training tries to make it smaller.' });
    return { steps: out, rv };
  }
  function bwdSteps() {
    const I = info(), { sz, L, nIdx } = I, out = []; let id = 0;
    out.push({ id: id++, t: 'The loss starts the error', from: 'loss', to: 'δŷ = ŷ − t', key: ['dy'], say: 'Going backward starts at the loss. The error at each prediction is simply prediction minus target.' });
    out.push({ id: id++, t: 'Through the output function', from: 'δŷ', to: 'δz (output layer)', key: ['dz', L], say: actName(L) === 'sigmoid' ? 'The error is multiplied by the sigmoid slope ŷ(1 − ŷ).' : 'For this output function the error passes straight through.' });
    out.push({ id: id++, t: 'Gradients of the output weights', from: 'δz and the inputs of the layer', to: 'dw and db', key: ['dw', L], say: 'Each weight gets its own gradient: the error at its target neuron times the value it multiplied. These tell training how to change the weights.' });
    for (let l = L - 1; l >= 1; l--) {
      out.push({ id: id++, t: `Back through the weights (layer ${l})`, from: `δz of layer ${l + 1}`, to: `δa of layer ${l}`, key: ['da', l], say: 'The error is sent back along the same weights it came through and added up for each neuron.' });
      out.push({ id: id++, t: `Through the activation (layer ${l})`, from: `δa`, to: `δz`, key: ['dz', l], say: 'The error is multiplied by the activation slope.' });
      out.push({ id: id++, t: `Gradients of the weights of layer ${l}`, from: 'δz and the layer inputs', to: 'dw and db', key: ['dw', l], say: 'Again each weight gets its gradient.' });
    }
    return out;
  }
  const seq = () => NA.g.back ? bwdSteps() : fwdSteps().steps;
  const curId = () => { if (!(NA.g.on)) return null; const s = seq(); return s[Math.min(NA.g.s, s.length - 1)].id; };
  let RV = null;
  const V = rv => { if (!NA.g.on || rv == null) return ''; if (NA.g.back) return 'fade'; const c = curId(); return rv > c ? 'hid' : rv === c ? 'enter' : ''; };
  const VB = rb => { if (!(NA.g.on && NA.g.back)) return 'hid'; const c = curId(); return rb > c ? 'hid' : rb === c ? 'enter' : ''; };
  /* ---------- drawing helpers ---------- */
  const Ln = (pts, mk, rv, w = 3, arrow = true, xc = '', op = 1) => {
    const d = 'M' + pts.map(p => p.join(' ')).join(' L'), c = (V(rv) + ' ' + xc).trim();
    return `<path class="ln ${c}" pathLength="1" d="${d}" fill="none" stroke="${MKS[mk] || mk}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round" stroke-linejoin="round"${arrow ? ` marker-end="url(#ah-${mk})"` : ''}/>` + (V(rv) === 'enter' ? `<path class="flowdash" pathLength="1" d="${d}" fill="none" stroke-width="${w}" stroke-linecap="round"/>` : '');
  };
  const Gr = (pts, rb, w = 3.5) => { if (!(NA.g.on && NA.g.back)) return ''; const d = 'M' + pts.map(p => p.join(' ')).join(' L'), c = VB(rb); return `<path class="ln grad ${c}" pathLength="1" d="${d}" fill="none" stroke="${AC.g}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#ah-g)"/>` + (c === 'enter' ? `<path class="flowdash" pathLength="1" d="${d}" fill="none" stroke-width="${w}" stroke-linecap="round"/>` : ''); };
  const chipH = (t, x, y, anc, cl, g) => { const w = t.length * 6.3 + 12, x0 = anc === 'start' ? x : anc === 'end' ? x - w : x - w / 2; return `<g class="${cl}"><rect class="${g ? 'chipbg gbg' : 'chipbg'}" x="${x0}" y="${y - 13}" width="${w}" height="19" rx="9.5"/><text class="chip${g ? ' gtx' : ''}" x="${x0 + w / 2}" y="${y}" text-anchor="middle">${t}</text></g>`; };
  const chip = (t, x, y, anc, rv) => NA.vals && !(NA.g.on && NA.g.back) ? chipH(t, x, y, anc, V(rv), false) : '';
  const gchip = (t, x, y, anc, rb) => NA.g.on && NA.g.back ? chipH(t, x, y, anc, VB(rb), true) : '';
  const PT = (nm, title, inner, ex = '') => `<g class="part ${ex}${NA.sel === nm && !NA.g.on ? ' sel' : ''}" data-p="${nm}"><title>${title}</title>${inner}</g>`;
  const circ = (x, y, r, fill, rv, txt, col = '#fff', fs = 14) => `<g class="nd ${V(rv)}"><circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#fff" stroke-width="3"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="${col}">${txt}</text></g>`;
  const actNode = (x, y, l, rv) => {
    const a = actName(l);
    if (a === 'sigmoid') return `<g class="nd ${V(rv)}"><circle cx="${x}" cy="${y}" r="22" fill="${AC.sig}" stroke="#fff" stroke-width="3"/><text x="${x}" y="${y + 8}" text-anchor="middle" font-size="24" font-family="Georgia,serif" font-style="italic" fill="#3b2f00">σ</text></g>`;
    const lab = a === 'tanh' ? 'tanh' : a === 'relu' ? 'ReLU' : a === 'softmax' ? 'softmax' : 'id', col = a === 'tanh' ? AC.tan : a === 'relu' ? AC.relu : a === 'softmax' ? AC.sig : AC.gray, w = a === 'softmax' ? 62 : 44;
    return `<g class="nd ${V(rv)}"><rect x="${x - w / 2}" y="${y - 19}" width="${w}" height="38" rx="12" fill="${col}" stroke="#fff" stroke-width="3"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${a === 'softmax' ? '#3b2f00' : '#fff'}">${lab}</text></g>`;
  };
  /* ---------- layout ---------- */
  function layout() {
    const I = info(), { sz, L } = I, maxN = Math.max(...sz), VH = Math.max(380, maxN * 124 + 90), X0 = 70, sp = L >= 3 ? 250 : 300;
    const cx = [X0]; for (let l = 1; l <= L; l++) cx[l] = X0 + l * sp;
    const y = (l, j) => VH / 2 + (j - (sz[l] - 1) / 2) * 124;
    const LX = cx[L] + 52 + 22 + 190;
    return Object.assign(I, { VH, cx, y, LX, W: LX + 120 });
  }
  function draw() {
    const G = layout(), { cfg, sz, L, nIdx, wIdx, cx, y, LX } = G, m = NA.m, gr = NA.gr, bk = NA.g.on && NA.g.back;
    RV = fwdSteps().rv;
    let s = '';
    let mxw = .05; cfg.W.forEach(a => a.forEach(r => r.forEach(w => { mxw = Math.max(mxw, Math.abs(w)); })));
    /* column headers */
    for (let l = 0; l <= L; l++) s += `<text class="zl" x="${l === 0 ? cx[0] : cx[l]}" y="26" text-anchor="middle">${(l === 0 ? 'INPUT' : l === L ? 'OUTPUT' : sz.length > 3 ? 'HIDDEN ' + l : 'HIDDEN')}</text><text class="ntag" x="${cx[l]}" y="42" text-anchor="middle">${sz[l]} neuron${sz[l] > 1 ? 's' : ''}${l > 0 ? ' · ' + actName(l) : ''}</text>`;
    s += `<text class="zl" x="${LX}" y="26" text-anchor="middle">LOSS</text><text class="ntag" x="${LX}" y="42" text-anchor="middle">${cfg.out === 'softmax' ? 'cross-entropy' : '½ squared error'}</text>`;
    /* edges (weights) */
    for (let l = 1; l <= L; l++) for (let j = 0; j < sz[l]; j++) for (let i = 0; i < sz[l - 1]; i++) {
      const k = wIdx[l][j][i], w = cfg.W[l - 1][j][i], n = nIdx[l][j], rvz = RV.z[l][j];
      const x1 = l === 1 ? cx[0] + 24 : cx[l - 1] + 52 + 24, y1 = y(l - 1, i), x2 = cx[l] - 52 - 25, y2 = y(l, j);
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, wd = 1.4 + 4 * Math.abs(w) / mxw, col = w >= 0 ? 'p' : 'n';
      const frac = .2 + .6 * (sz[l] > 1 ? j / (sz[l] - 1) : .5), px = x1 + dx * frac, py = y1 + dy * frac;
      s += PT('w' + k, `weight w${k}`, Ln([[x1, y1], [x2 - ux * 2, y2 - uy * 2]], col, rvz, wd, true, '', .9) + chip(`w${k} = ${N(w)}`, px, py + 4, 'middle', rvz));
      if (bk) {
        const rb = gradId('dw', l);
        s += Gr([[x2 - ux * 6, y2 - uy * 6 + 8], [x1 + ux * 6, y1 + uy * 6 + 8]], rb, 2.6);
        s += gchip(`dw${k} = ${N(gr.dW[l - 1][j][i])}`, px, py + 26, 'middle', rb);
      }
    }
    /* input nodes */
    for (let i = 0; i < sz[0]; i++) s += PT('x', `input x${i + 1}`, circ(cx[0], y(0, i), 24, AC.x, RV.x, `x${i + 1}`) + chip(N(cfg.x[i]), cx[0], y(0, i) - 36, 'middle', RV.x));
    /* neuron capsules */
    for (let l = 1; l <= L; l++) for (let j = 0; j < sz[l]; j++) {
      const n = nIdx[l][j], yy = y(l, j), xz = cx[l] - 52, xs = cx[l], xa = cx[l] + 52, rvz = RV.z[l][j], rva = RV.a[l][j], isOut = l === L, zv = m.z[l - 1][j], av = m.a[l][j];
      s += `<rect class="capsule ${V(rvz)}" x="${xz - 30}" y="${yy - 34}" width="${xa - xz + 60}" height="68" rx="34"/>`;
      s += PT('z' + n, `z${n}: weighted sum`, circ(xz, yy, 22, AC.box, rvz, `z${n}`, '#3C5068', 14).replace('stroke="#fff"', 'stroke="#A9BBD0"') + chip(`z${n} = ${N(zv)}`, xz, yy - 44, 'middle', rvz) + chip(`b${n} = ${N(cfg.b[l - 1][j])}`, xz, yy + 52, 'middle', rvz));
      s += PT('s' + n, `${actName(l)} on z${n}`, Ln([[xz + 24, yy], [xs - 24, yy]], 'e', rva, 2.4) + actNode(xs, yy, l, rva));
      s += PT('a' + n, isOut ? `ŷ${j + 1} = a${n}` : `a${n}`, Ln([[xs + 24, yy], [xa - 24, yy]], 'e', rva, 2.4) + circ(xa, yy, 22, isOut ? AC.out : AC.hid, rva, isOut ? `ŷ${j + 1}` : `a${n}`, '#fff', isOut ? 14 : 14) + chip(`${isOut ? 'ŷ' + (j + 1) + ' = a' + n : 'a' + n} = ${N(av)}`, xa, yy - 44, 'middle', rva));
      if (bk) {
        const rbz = gradId('dz', l), gz = gr.dz[l - 1][j];
        s += Gr([[xs + 18, yy + 28], [xz - 18, yy + 28]], rbz, 3);
        s += gchip(`δz${n} = ${N(gz)}`, xs, yy + 70, 'middle', rbz);
        if (l < L) { const rba = gradId('da', l); s += gchip(`δa${n} = ${N(gr.da[l][j])}`, xa, yy - 62, 'middle', rba); }
        else s += gchip(`δŷ${j + 1} = ${N(gr.da[L][j])}`, xa, yy - 62, 'middle', gradId('dy', 0));
      }
    }
    /* loss + target */
    const yl = G.VH / 2, yt = yl + 112;
    for (let j = 0; j < sz[L]; j++) s += PT('loss', 'loss', Ln([[cx[L] + 52 + 24, y(L, j)], [LX - 26, yl + (j - (sz[L] - 1) / 2) * 6]], 'l', RV.loss, 2.6));
    s += PT('loss', 'loss L', `<g class="nd ${V(RV.loss)}"><circle cx="${LX}" cy="${yl}" r="26" fill="${AC.loss}" stroke="#fff" stroke-width="3"/><text x="${LX}" y="${yl + 6}" text-anchor="middle" font-size="18" font-weight="700" fill="#fff">L</text></g>` + chip(`L = ${N(m.L)}`, LX, yl - 40, 'middle', RV.loss));
    s += PT('tg', 'the target', Ln([[LX, yt - 22], [LX, yl + 30]], 'e', RV.tg, 2.4) + `<g class="nd ${V(RV.tg)}"><rect x="${LX - 52}" y="${yt - 20}" width="104" height="40" rx="12" fill="${AC.x}" stroke="#fff" stroke-width="3"/><text x="${LX}" y="${yt + 5}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">target t</text></g>` + chip(`t = [${cfg.t.map(v => N(v)).join(', ')}]`, LX, yt + 40, 'middle', RV.tg));
    if (bk) { for (let j = 0; j < sz[L]; j++) s += Gr([[LX - 28, yl + (j - (sz[L] - 1) / 2) * 6 + 10], [cx[L] + 52 + 30, y(L, j) + 10]], gradId('dy', 0), 3); }
    const defs = `<defs>${Object.entries(MKS).map(([k, c]) => `<marker id="ah-${k}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto"><path d="M0,0L10,5L0,10z" fill="${c}"/></marker>`).join('')}</defs>`;
    return { W: G.W, H: G.VH, html: defs + s };
  }
  function gradId(type, l) { const b = bwdSteps(); const st = b.find(x => x.key[0] === type && (type === 'dy' || x.key[1] === l)); return st ? st.id : 0; }
  /* ---------- explanations ---------- */
  const bmc = v => R`\begin{bmatrix}${v.map(N).join(R` \\ `)}\end{bmatrix}`;
  function nInfo(nm, noHead) {
    const G = layout(), { cfg, sz, L, nIdx, wIdx } = G, m = NA.m, D = s => K(s, true);
    const locate = n => { for (let l = 1; l <= L; l++) { const j = nIdx[l].indexOf(n); if (j >= 0) return [l, j]; } return null; };
    let title = '', what = '', tex = [], why = '', read = '';
    const head = (t) => noHead ? `<h4 class="ih">${rt(t)}</h4>` : `<h3>${rt(t)}</h3>`;
    if (nm === 'x') { title = 'The inputs'; what = 'These are the numbers that enter the network.'; tex = [R`x=${bmc(cfg.x)}`]; }
    else if (/^z\d+$/.test(nm)) {
      const n = +nm.slice(1), [l, j] = locate(n), prev = m.a[l - 1];
      title = `z${n}: the weighted sum of neuron ${n}`; what = `**z${n}** multiplies every incoming value by its weight, adds them up and adds the bias **b${n}**.`;
      const terms = prev.map((v, i) => R`w_{${wIdx[l][j][i]}}\,${l === 1 ? 'x' : 'a'}_{${l === 1 ? i + 1 : nIdx[l - 1][i]}}`).join('+');
      tex = [R`z_{${n}}=${terms}+b_{${n}}`, R`z_{${n}}=${prev.map((v, i) => `(${N(cfg.W[l - 1][j][i])})(${N(v)})`).join('+')}+(${N(cfg.b[l - 1][j])})=${N(m.z[l - 1][j])}`];
      why = 'Every neuron has its own weights, so it can listen to the inputs in its own way.';
    } else if (/^s\d+$/.test(nm)) {
      const n = +nm.slice(1), [l, j] = locate(n), a = actName(l);
      title = `The ${a === 'identity' || a === 'linear' ? 'identity' : a} function on z${n}`;
      what = a === 'sigmoid' ? 'Sigmoid squeezes any number into 0 to 1.' : a === 'tanh' ? 'tanh squeezes any number into −1 to 1.' : a === 'relu' ? 'ReLU keeps positive numbers and turns negative numbers into 0.' : a === 'softmax' ? 'Softmax turns all the output z values into probabilities that add up to 1.' : 'The identity leaves the number as it is.';
      tex = a === 'softmax' ? [R`\hat y_c=\dfrac{e^{z_c}}{\sum_q e^{z_q}}`, R`\hat y=${bmc(m.a[L])}`] : [R`a_{${n}}=${actTex(l)}(z_{${n}})=${actTex(l)}(${N(m.z[l - 1][j])})=${N(m.a[l][j])}`];
      why = 'Without this bend the whole network would be one big straight-line calculation.';
    } else if (/^a\d+$/.test(nm)) {
      const n = +nm.slice(1), [l, j] = locate(n);
      title = l === L ? `ŷ${j + 1} (= a${n}): the prediction` : `a${n}: the output of neuron ${n}`; what = l === L ? 'This is what the network predicts.' : `**a${n}** is sent to every neuron of the next layer.`;
      tex = [R`a_{${n}}=${N(m.a[l][j])}`];
    } else if (/^w\d+$/.test(nm)) {
      const k = +nm.slice(1); let f = null;
      for (let l = 1; l <= L; l++) for (let j = 0; j < sz[l]; j++) for (let i = 0; i < sz[l - 1]; i++) if (wIdx[l][j][i] === k) f = { l, j, i };
      const from = f.l === 1 ? `x${f.i + 1}` : `a${nIdx[f.l - 1][f.i]}`, to = `z${nIdx[f.l][f.j]}`;
      title = `Weight w${k}`; what = `**w${k}** multiplies **${from}** on its way into **${to}**. Weights are numbered input by input: first all the weights of x1, then all of x2, and so on.`;
      tex = [R`w_{${k}}=${N(cfg.W[f.l - 1][f.j][f.i])}`]; why = 'Training changes the weights to make the loss smaller.';
    } else if (nm === 'tg') { title = 'The target'; what = 'The answer the network should have given.'; tex = [R`t=${bmc(cfg.t)}`]; }
    else if (nm === 'loss') {
      title = 'The loss'; what = cfg.out === 'softmax' ? 'Cross-entropy only looks at the probability of the right answer.' : 'Half the sum of the squared differences between prediction and target.';
      tex = [cfg.out === 'softmax' ? R`L=-\sum_k t_k\ln\hat y_k=${N(m.L)}` : R`L=\tfrac12\sum_k(\hat y_k-t_k)^2=${N(m.L)}`, R`\hat y=${bmc(m.a[L])},\; t=${bmc(cfg.t)}`];
    } else { title = 'Network'; what = 'Click a shape.'; }
    return head(title) + `<p>${rt(what)}</p>` + tex.map(D).join('') + (read ? `<div class="read">${esc2(read)}</div>` : '') + (why ? `<p class="why"><b>Why it exists:</b> ${rt(why)}</p>` : '');
  }
  function bInfo(key) {
    const G = layout(), { cfg, sz, L, nIdx, wIdx } = G, m = NA.m, g = NA.gr, D = s => K(s, true), [type, l] = key; let tex = [], note = '';
    const dzv = ll => g.dz[ll - 1];
    if (type === 'dy') tex = [R`\delta\hat y=\hat y-t=${bmc(m.a[L])}-${bmc(cfg.t)}=${bmc(g.da[L])}`];
    else if (type === 'dz') {
      if (l === L) { tex = cfg.out === 'sigmoid' ? [R`\delta z=\delta\hat y\odot\hat y\odot(1-\hat y)=${bmc(g.da[L])}\odot${bmc(m.a[L])}\odot${bmc(m.a[L].map(v => 1 - v))}=${bmc(dzv(L))}`] : [R`\delta z=\delta\hat y=${bmc(dzv(L))}`]; note = cfg.out === 'sigmoid' ? 'Sigmoid output: multiply by its slope.' : 'Softmax with cross-entropy (or an identity output with squared error) gives δz = ŷ − t directly.'; }
      else { const f = { sigmoid: R`a(1-a)`, tanh: R`1-a^2`, relu: R`\mathbb 1[z>0]` }[cfg.act]; tex = [R`\delta z=\delta a\odot f'(z),\; f'=${f}`, R`=${bmc(g.da[l])}\odot${bmc(m.a[l].map((a, j) => ACTS[cfg.act].d(m.z[l - 1][j], a)))}=${bmc(dzv(l))}`]; }
    } else if (type === 'dw') {
      for (let j = 0; j < sz[l]; j++) for (let i = 0; i < sz[l - 1]; i++) tex.push(R`\partial L/\partial w_{${wIdx[l][j][i]}}=\delta z_{${nIdx[l][j]}}\times ${l === 1 ? 'x' : 'a'}_{${l === 1 ? i + 1 : nIdx[l - 1][i]}}=(${N(dzv(l)[j])})(${N(m.a[l - 1][i])})=${N(g.dW[l - 1][j][i])}`);
      for (let j = 0; j < sz[l]; j++) tex.push(R`\partial L/\partial b_{${nIdx[l][j]}}=\delta z_{${nIdx[l][j]}}=${N(g.db[l - 1][j])}`);
      note = 'Each weight learns from the error at the neuron it feeds, scaled by the value it carried.';
    } else if (type === 'da') {
      for (let i = 0; i < sz[l]; i++) { const terms = sz[l + 1] ? [...Array(sz[l + 1]).keys()].map(j => R`w_{${wIdx[l + 1][j][i]}}\,\delta z_{${nIdx[l + 1][j]}}`).join('+') : ''; const nums = [...Array(sz[l + 1]).keys()].map(j => `(${N(cfg.W[l][j][i])})(${N(dzv(l + 1)[j])})`).join('+'); tex.push(R`\delta a_{${nIdx[l][i]}}=${terms}=${nums}=${N(g.da[l][i])}`); }
    }
    return tex.map(D).join('') + (note ? `<div class="read">${esc2(note)}</div>` : '');
  }
  /* ---------- look inside ---------- */
  const uvec = v => v.map((x, j) => `<span class="uv" style="--uc:${UC[j % 6]}"><i>#${j + 1}</i>${N(x)}</span>`).join('');
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
  function rCard(title, sym, symc, lede, inHTML, fn, outHTML, curve, table) {
    return `<div class="ihead"><span class="isym" style="background:${symc};color:${symc === AC.box ? '#3C5068' : '#fff'}">${sym}</span><div><h3>${title}</h3><div class="ilede">${esc2(lede)}</div></div></div><div class="iflow"><div class="ibox"><div class="ik">What came in</div>${inHTML}</div><div class="iarr">➜</div><div class="ibox mid"><div class="ik">What happens inside</div>${fn}</div><div class="iarr">➜</div><div class="ibox"><div class="ik">What came out</div>${outHTML}</div></div>${curve ? `<div class="icwrap">${curve}</div>` : ''}<div class="itw">${table}</div>`;
  }
  function inside(nm) {
    const G = layout(), { cfg, sz, L, nIdx, wIdx } = G, m = NA.m;
    const T = (h, r) => `<table class="itab"><tr>${h.map(c => `<th>${c}</th>`).join('')}</tr>${r.map((row, i) => `<tr style="--i:${i}">${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
    const locate = n => { for (let l = 1; l <= L; l++) { const j = nIdx[l].indexOf(n); if (j >= 0) return [l, j]; } return null; };
    if (/^z\d+$/.test(nm)) {
      const n = +nm.slice(1), [l, j] = locate(n), prev = m.a[l - 1], zv = m.z[l - 1][j];
      const rows = prev.map((v, i) => [`w${wIdx[l][j][i]}`, N(cfg.W[l - 1][j][i]), `${l === 1 ? 'x' : 'a'}${l === 1 ? i + 1 : nIdx[l - 1][i]}`, N(v), `<b>${N(cfg.W[l - 1][j][i] * v)}</b>`]);
      rows.push([`b${n}`, N(cfg.b[l - 1][j]), '—', '—', `<b>${N(cfg.b[l - 1][j])}</b>`]);
      rows.push(['<b>total</b>', '', '', '', `<b>z${n} = ${N(zv)}</b>`]);
      return rCard(`Inside z${n}: the weighted sum`, 'Σ', AC.box, 'The neuron multiplies each incoming value by its weight, adds all the products and adds its bias.', `<span class="vl">incoming values</span>${uvec(prev)}<span class="vl">weights</span>${uvec(cfg.W[l - 1][j])}`, K(R`z_{${n}}=\sum_i w_i\,a_i+b_{${n}}`, true), `<span class="vl">z${n}</span><span class="uv" style="--uc:${AC.hid}"><i>z${n}</i>${N(zv)}</span>`, '', T(['weight', 'value', 'times', 'incoming', '= product'], rows));
    }
    if (/^s\d+$/.test(nm)) {
      const n = +nm.slice(1), [l, j] = locate(n), a = actName(l), zs = m.z[l - 1], as = m.a[l];
      if (a === 'softmax') { const mx = Math.max(...zs), ex = zs.map(v => Math.exp(v - mx)), se = ex.reduce((p, q) => p + q, 0); return rCard('Inside softmax', 'softmax', AC.sig, 'Softmax makes every z positive with e^z, then divides by the total so the answers add up to 100%.', `<span class="vl">output z values</span>${uvec(zs)}`, K(R`\hat y_c=\dfrac{e^{z_c}}{\sum_q e^{z_q}}`, true), `<span class="vl">ŷ</span>${uvec(as)}`, '', T(['output', 'z', 'e<sup>z</sup> (shifted by max)', '÷ total ' + N(se) + ' = ŷ'], zs.map((v, c) => [`ŷ${c + 1} (z${nIdx[L][c]})`, N(v), N(ex[c]), `<b>${N(as[c])}</b> (${(as[c] * 100).toFixed(1)}%)`]))); }
      const z = zs[j], o = as[j];
      if (a === 'sigmoid') return rCard(`Inside the sigmoid of z${n}`, 'σ', AC.sig, 'Sigmoid turns any number into a dial between 0 and 1.', `<span class="vl">z${n}</span><span class="uv" style="--uc:${UC[0]}"><i>z${n}</i>${N(z)}</span>`, K(R`\sigma(z)=\dfrac{1}{1+e^{-z}}`, true), `<span class="vl">a${n}</span><span class="uv" style="--uc:${UC[0]}"><i>a${n}</i>${N(o)}</span>`, inCurve('sig', [z], [o]), T(['z', 'e<sup>−z</sup>', '1 + e<sup>−z</sup>', '1 ÷ that = a'], [[N(z), N(Math.exp(-z)), N(1 + Math.exp(-z)), `<b>${N(o)}</b>`]]));
      if (a === 'tanh') return rCard(`Inside the tanh of z${n}`, 'tanh', AC.tan, 'tanh squeezes any number into −1 to 1.', `<span class="vl">z${n}</span><span class="uv" style="--uc:${UC[0]}"><i>z${n}</i>${N(z)}</span>`, K(R`\tanh(z)=\dfrac{e^{z}-e^{-z}}{e^{z}+e^{-z}}`, true), `<span class="vl">a${n}</span><span class="uv" style="--uc:${UC[0]}"><i>a${n}</i>${N(o)}</span>`, inCurve('tanh', [z], [o]), T(['z', 'e<sup>z</sup>', 'e<sup>−z</sup>', '(e<sup>z</sup>−e<sup>−z</sup>) ÷ (e<sup>z</sup>+e<sup>−z</sup>) = a'], [[N(z), N(Math.exp(z)), N(Math.exp(-z)), `<b>${N(o)}</b>`]]));
      if (a === 'relu') return rCard(`Inside the ReLU of z${n}`, 'ReLU', AC.relu, 'ReLU keeps positive numbers and turns negative numbers into 0.', `<span class="vl">z${n}</span><span class="uv" style="--uc:${UC[0]}"><i>z${n}</i>${N(z)}</span>`, K(R`\mathrm{ReLU}(z)=\max(0,z)`, true), `<span class="vl">a${n}</span><span class="uv" style="--uc:${UC[0]}"><i>a${n}</i>${N(o)}</span>`, inCurve('relu', [z], [o]), T(['z', 'max(0, z) = a'], [[N(z), `<b>${N(o)}</b>`]]));
      return rCard(`The identity on z${n}`, '=', AC.gray, 'The number is used as it is.', `<span class="uv" style="--uc:${UC[0]}"><i>z${n}</i>${N(z)}</span>`, K(R`a=z`, true), `<span class="uv" style="--uc:${UC[0]}"><i>a${n}</i>${N(o)}</span>`, '', T(['z', 'a'], [[N(z), `<b>${N(o)}</b>`]]));
    }
    if (nm === 'loss') {
      const y = m.a[L], t = cfg.t, sm = cfg.out === 'softmax';
      return rCard('Inside the loss', 'L', AC.loss, sm ? 'Cross-entropy only looks at the probability of the right answer.' : 'Half the sum of the squared differences between prediction and target.', `<span class="vl">ŷ</span>${uvec(y)}<span class="vl">target</span>${uvec(t)}`, K(sm ? R`L=-\sum_k t_k\ln\hat y_k` : R`L=\tfrac12\sum_k(\hat y_k-t_k)^2`, true), `<span class="vl">L</span><span class="uv" style="--uc:${AC.loss}"><i>L</i>${N(m.L)}</span>`, '', T(sm ? ['output', 'target t', 'ŷ', '−t · ln ŷ'] : ['output', 'prediction ŷ', 'target t', '½ (ŷ − t)²'], y.map((v, c) => sm ? [`ŷ${c + 1}`, N(t[c]), N(v), `<b>${N(-t[c] * Math.log(v))}</b>`] : [`ŷ${c + 1}`, N(v), N(t[c]), `<b>${N(.5 * (v - t[c]) ** 2)}</b>`])) + `<div class="note" style="margin-top:6px">Total: <b>L = ${N(m.L)}</b></div>`);
    }
    return null;
  }
  const INS = nm => /^(z|s)\d+$/.test(nm) || nm === 'loss';
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
    const body = NA.g.back ? bInfo(g.key) : g.k.map(k => nInfo(k, true)).filter((v, i, a) => a.indexOf(v) === i).join('<hr class="sep">');
    const first = !NA.g.back && g.k.find(INS), look = first ? `<button class="btn lookb" data-look="${first}">🔍 Look inside this part</button>` : '';
    return `<div class="gstep"><div class="gk">${NA.g.back ? 'Backward' : 'Forward'} · step ${n + 1} of ${sq.length}</div><h3>${rt(g.t)}</h3><div class="flow"><span class="fb">${esc2(g.from)}</span><span class="fa">➜</span><span class="fb to">${esc2(g.to)}</span></div><p class="gsay${NA.g.back ? ' back' : ''}">${rt(g.say)}</p>${look}${body}</div>`;
  }
  function keyHTML() {
    const G = layout(), { sz, L, nIdx, wIdx } = G; let h = '';
    for (let l = 1; l <= L; l++) for (let i = 0; i < sz[l - 1]; i++) for (let j = 0; j < sz[l]; j++) h += `<span class="wk"><b>w${wIdx[l][j][i]}</b> ${l === 1 ? 'x' + (i + 1) : 'a' + nIdx[l - 1][i]} → z${nIdx[l][j]}</span>`;
    return h;
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
      <div class="archleg"><span><i style="background:${AC.x}"></i>input x</span><span><i style="background:${AC.box};border:1px solid #A9BBD0"></i>z = weighted sum</span><span><i style="background:${AC.sig}"></i>activation function</span><span><i style="background:${AC.hid}"></i>a (hidden output)</span><span><i style="background:${AC.out}"></i>ŷ (prediction)</span><span><i style="background:${AC.loss}"></i>loss</span><span><i style="background:${AC.pos}"></i>weight &gt; 0</span><span><i style="background:${AC.neg}"></i>weight &lt; 0</span><span><i style="background:${AC.g}"></i>gradient (backward)</span></div>`;
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
    $('#a-cap').style.display = gd ? 'none' : ''; $('#a-cap').innerHTML = rt('Every neuron has three parts: **z** (the weighted sum), the **activation function**, and **a** (its output). Click any shape, or press a step-by-step button. Weights are numbered **w1, w2, …** input by input.');
    if (gd) { const n = seq().length; $('#g-dots').innerHTML = seq().map((_, i) => `<i class="${i < NA.g.s ? 'd' : i === NA.g.s ? 'a' : ''}" data-i="${i}" title="${esc2(seq()[i].t)}"></i>`).join(''); $('#g-play').textContent = NA.g.play ? '⏸ Pause' : '▶ Play'; $('#g-prev').disabled = NA.g.s === 0; $('#g-next').disabled = NA.g.s === n - 1; }
    const g = draw(), svg = $('#a-svg'), z = NA.zoom || fit(g.W, g.H); svg.setAttribute('viewBox', `0 0 ${g.W} ${g.H}`); svg.style.width = Math.round(g.W * z) + 'px'; svg.style.height = Math.round(g.H * z) + 'px'; svg.innerHTML = g.html; NA._W = g.W; NA._H = g.H;
    $('#a-key').innerHTML = '<b>Weight numbering:</b> ' + keyHTML();
    $('#a-info').innerHTML = gd ? guidedHTML() : (NA.sel ? nInfo(NA.sel) + (INS(NA.sel) ? `<button class="btn lookb" data-look="${NA.sel}">🔍 Look inside this part</button>` : '') : `<h3>Click any part</h3><p class="note">Every shape is clickable: the inputs, the weights, the z circles, the activation functions, the a circles, the target and the loss. You will see what it is and its numbers.</p><p class="note">Press <b>▶ Forward, step by step</b> to build the network one neuron at a time, or <b>◀ Backward</b> to watch the error flow back.</p>`);
    root.classList.toggle('guided', gd);
  }
  function fit(W, H) { W = W || NA._W || 960; H = H || NA._H || 480; const w = ($('#a-wrap') && $('#a-wrap').clientWidth) || 900, hh = Math.max(360, innerHeight - 250); return Math.max(.3, Math.min(1.25, (w - 8) / W, hh / H)); }
  window.renderArch = renderArch; window.__NA = NA;
})();

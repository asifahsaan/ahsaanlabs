
  /* ================= Step-by-step tab: same modern design, driven by the step engine ================= */
  function stepLayout() { const G = layout(); NL = G.L; return G; }
  function stepDiagram() {
    const G = layout(), { cfg, sz, L, nIdx, wIdx, cx, y, LX, PW, lv } = G, R = PW / 2, i = S.i, cur = steps[i], cs = cum(i), back = cur.ph === 'B';
    const bw = backward(cfg), g = bw.g, m = bw.m, cfg1 = apply(cfg, g, cfg.eta), m1 = forward(cfg1), th = cs.upd ? cfg1 : cfg, M = cs.check ? m1 : m, showG = !cs.check;
    const act = { n: new Set(cur.act.n), e: new Set(cur.act.e) }, opsE = cur.ops && cur.ops.edges, opsN = cur.ops && cur.ops.nodes;
    const mk = new Map(), marker = c => { if (!mk.has(c)) mk.set(c, 'sm' + mk.size); return mk.get(c); };
    let s = '', mxw = .05; th.W.forEach(a => a.forEach(r => r.forEach(w => { mxw = Math.max(mxw, Math.abs(w)); })));
    const hdr = l => l === 0 ? 'INPUT' : l === L ? 'OUTPUT' : (sz.length > 3 ? 'HIDDEN ' + l : 'HIDDEN');
    for (let l = 0; l <= L; l++) s += `<text class="zl" x="${cx[l]}" y="26" text-anchor="middle">${hdr(l)}</text><text class="ntag" x="${cx[l]}" y="42" text-anchor="middle">${sz[l]} neuron${sz[l] > 1 ? 's' : ''}${l > 0 ? ' · ' + actName(l) : ''}</text>`;
    s += `<text class="zl" x="${LX}" y="26" text-anchor="middle">LOSS</text><text class="ntag" x="${LX}" y="42" text-anchor="middle">${cfg.out === 'softmax' ? 'cross-entropy' : '½ squared error'}</text>`;
    const edge = (x1, y1, x2, y2, col, wd, op, active, rev, arrow) => {
      const pts = rev ? [[x2, y2], [x1, y1]] : [[x1, y1], [x2, y2]], d = 'M' + pts.map(p => p.join(' ')).join(' L');
      return `<path class="ln${active ? ' enter' : ''}" pathLength="1" d="${d}" fill="none" stroke="${col}" stroke-width="${wd}" stroke-opacity="${op}" stroke-linecap="round"${arrow ? ` marker-end="url(#${marker(col)})"` : ''}/>` + (active ? `<path class="flowdash" pathLength="1" d="${d}" fill="none" stroke-width="${wd}" stroke-linecap="round"/>` : '');
    };
    let chips = '';
    /* weights */
    for (let l = 1; l <= L; l++) for (let j = 0; j < sz[l]; j++) for (let ii = 0; ii < sz[l - 1]; ii++) {
      const id = `e:${l}:${j}:${ii}`, w = th.W[l - 1][j][ii];
      const x1 = cx[l - 1] + R, y1 = y(l - 1, ii), x2 = cx[l] - R, y2 = y(l, j), dx = x2 - x1, dy = y2 - y1;
      let col = w >= 0 ? AC.pos : AC.neg, wd = (lv === 2 ? .8 : 1.2) + (lv === 2 ? 2.2 : 3.6) * Math.abs(w) / mxw, op;
      const a = act.e.has(id);
      if (a) { if (back) col = ERR; op = 1; wd += 1.6; } else if (cs.de.has(id) || cs.upd) op = .8; else op = .25;
      const eo = opsE && opsE[id]; if (eo) { col = eo; op = 1; wd = Math.max(wd, 4.5); } else if (opsE) op = Math.min(op, .12);
      s += edge(x1, y1, x2 - 2, y2, col, wd, op, a, a && back, lv < 2);
      const len = Math.hypot(dx, dy) || 1, dd0 = (l === 1 ? 50 : 84) + (j % 2) * 30, dd = Math.min(len * .7, (l > 1 && dy < 0) ? Math.max(dd0, (130 - R) / Math.max(.2, dx / len)) : dd0), px = x1 + dx / len * dd, py = y1 + dy / len * dd;
      const showC = lv === 0 || (lv === 1 && (a || eo));
      if (showC) chips += chipH(`${tWshort(l, j, ii)}=${NF(w)}`, px, py + 4, 'middle', (a ? 'chip-ac ' : '') + (op < .5 ? 'chip-dim' : ''), false);
      const gk = `gw:${l}:${j}:${ii}`; if (showG && cs.gw.has(gk) && (lv === 0 || a)) chips += chipH(`d${tWshort(l, j, ii)}=${NF(g.dW[l - 1][j][ii])}`, px, py + 26, 'middle', '', true);
    }
    /* inputs */
    for (let ii = 0; ii < sz[0]; ii++) {
      const id = `n:0:${ii}`, no = opsN && opsN[id];
      s += `<g class="nd"><circle cx="${cx[0]}" cy="${y(0, ii)}" r="${R}" fill="#fff" stroke="${no || AC.x}" stroke-width="${no ? 5.5 : 2.4}"/><text x="${cx[0]}" y="${y(0, ii) - 2}" text-anchor="middle" font-size="${lv === 2 ? 10 : 12}" font-weight="700" fill="${AC.x}">x${ii + 1}</text><text x="${cx[0]}" y="${y(0, ii) + 11}" text-anchor="middle" font-size="${lv === 2 ? 8.5 : 10}" fill="#64748B" class="tnum">${NF(cfg.x[ii])}</text></g>`;
    }
    /* neurons */
    for (let l = 1; l <= L; l++) for (let j = 0; j < sz[l]; j++) {
      const id = `n:${l}:${j}`, n = nIdx[l][j], yy = y(l, j), x = cx[l], isOut = l === L, c = isOut ? AC.out : AC.hid, a = act.n.has(id), done = cs.dn.has(id), no = opsN && opsN[id];
      const zs = cs.vis.has(`z:${l}:${j}`), as = cs.vis.has(`a:${l}:${j}`), fs = lv === 0 ? 14 : lv === 1 ? 12.5 : 11;
      let fill, stroke = c, tcol = '#fff';
      if (a) { fill = back ? '#FDE8E6' : c; stroke = back ? ERR : c; tcol = back ? ERR : '#fff'; } else if (done || zs) { fill = tint(c); tcol = c; } else { fill = '#EFEFEA'; stroke = '#D6D6D0'; tcol = '#a6a6a0'; }
      s += `<g class="nd${a ? ' enter' : ''}"><circle cx="${x}" cy="${yy}" r="${R}" fill="${fill}" stroke="${no || stroke}" stroke-width="${no ? 5.5 : 2.6}"/><text x="${x}" y="${yy + fs * .36}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="${tcol}">z${n}</text></g>`;
      const cy = yy - R - 17, bwid = Math.max(32, actLabel(l).length * 7.5 + 16), on = as || zs;
      s += `<g class="nd${a && as ? ' enter' : ''}"><rect x="${x - bwid / 2}" y="${cy - 11}" width="${bwid}" height="22" rx="11" fill="${on ? actCol(l) : '#E5E7EB'}" stroke="#fff" stroke-width="2.5"/><text x="${x}" y="${cy + 4.5}" text-anchor="middle" font-size="${lv === 2 ? 11 : 12.5}" font-weight="700" ${actLabel(l) === 'σ' ? 'font-family="Georgia,serif" font-style="italic"' : ''} fill="${on ? (actDark(l) ? '#3b2f00' : '#fff') : '#9CA3AF'}">${actLabel(l)}</text></g>`;
      if (lv < 2) {
        if (zs) chips += chipH(`z${n}=${NF(M.z[l - 1][j])}`, x - bwid / 2 - 5, cy + 4, 'end', a && !as ? 'chip-ac' : '', false);
        if (as) chips += chipH(`${isOut ? 'ŷ' + (j + 1) : 'a' + n}=${NF(M.a[l][j])}`, x + bwid / 2 + 5, cy + 4, 'start', a ? 'chip-ac' : '', false);
      }
      if (lv === 0) chips += chipH(`b${n}=${NF(th.b[l - 1][j])}`, x, yy + R + 20, 'middle', '', false);
      if (showG && lv < 2) {
        if (cs.gv.has(`da:${l}:${j}`)) chips += chipH(`${isOut ? 'δŷ' + (j + 1) : 'δa' + n}=${NF(g.da[l][j])}`, x, yy + R + 46, 'middle', '', true);
        if (cs.gv.has(`dz:${l}:${j}`)) chips += chipH(`δz${n}=${NF(g.dz[l - 1][j])}`, x, yy + R + 70, 'middle', '', true);
      }
    }
    /* loss and target */
    const yl = G.VH / 2, lr = lv === 2 ? 22 : 26, yt = yl + (lv === 2 ? 90 : 112);
    for (let k = 0; k < sz[L]; k++) {
      const id = `eL:${k}`, a = act.e.has(id), op = a ? 1 : (cs.de.has(id) ? .8 : .25), x1 = cx[L] + R, y1 = y(L, k), x2 = LX - lr - 2, y2 = yl + (k - (sz[L] - 1) / 2) * 3;
      s += edge(x1, y1, x2, y2, back && a ? ERR : AC.loss, 2.4, op, a, a && back, lv < 2);
    }
    const ln = act.n.has('n:loss'), lno = opsN && opsN['n:loss'], lv_ = cs.vis.has('L');
    s += `<g class="nd${ln ? ' enter' : ''}"><circle cx="${LX}" cy="${yl}" r="${lr}" fill="${ln ? (back ? '#FDE8E6' : AC.loss) : (lv_ ? tint(AC.loss) : '#EFEFEA')}" stroke="${lno || (ln ? (back ? ERR : AC.loss) : (lv_ ? AC.loss : '#D6D6D0'))}" stroke-width="${lno ? 5.5 : 2.6}"/><text x="${LX}" y="${yl + 6}" text-anchor="middle" font-size="18" font-weight="700" fill="${ln ? (back ? ERR : '#fff') : (lv_ ? AC.loss : '#a6a6a0')}">L</text></g>`;
    if (lv_) chips += chipH(`L=${NF(M.L)}`, LX, yl - lr - 14, 'middle', '', false);
    s += `<line x1="${LX}" x2="${LX}" y1="${yt - 22}" y2="${yl + lr + 4}" stroke="#334155" stroke-width="2" stroke-opacity=".5"/><g class="nd"><rect x="${LX - 52}" y="${yt - 20}" width="104" height="40" rx="12" fill="${AC.x}" stroke="#fff" stroke-width="3"/><text x="${LX}" y="${yt + 5}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">target t</text></g>`;
    chips += chipH(`t = [${short(cfg.t, 4)}]`, LX, yt + 40, 'middle', '', false);
    const defs = `<defs>${[...mk].map(([c, id]) => `<marker id="${id}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto"><path d="M0,0L10,5L0,10z" fill="${c}"/></marker>`).join('')}</defs>`;
    return { W: G.WD, H: G.VH, html: defs + s + chips };
  }
  window.stepLayout = stepLayout; window.stepDiagram = stepDiagram;

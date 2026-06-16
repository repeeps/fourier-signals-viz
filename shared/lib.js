/* ============================================================
   푸리에·신호처리, 눈으로 보기 — 공통 헬퍼 (전역 VZ).
   코어 + linePlot + VZ.LA(arrow/tween) + VZ.FT(fourier).
   모든 신호·변환은 페이지에서 실시간 계산. 외부 출처 인용 없음.
   ============================================================ */
(function (global) {
  'use strict';

  const fmt = (n, d = 2) => {
    if (!isFinite(n)) return n > 0 ? '∞' : '−∞';
    const r = Number(n).toFixed(d);
    return Object.is(parseFloat(r), -0) ? (0).toFixed(d) : r;
  };
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const PALETTE = ['#60a5fa', '#fbbf24', '#94a3b8', '#34d399', '#f472b6', '#c084fc', '#fb7185', '#37bdf8'];

  function setupStepper(stepperSel = '#stepper', panelSel = '[data-panel]') {
    const stepper = document.querySelector(stepperSel);
    if (!stepper) return;
    const panels = [...document.querySelectorAll(panelSel)];
    stepper.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const s = b.dataset.s;
      stepper.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
      panels.forEach(p => p.classList.toggle('show', p.dataset.panel === s));
      const top = stepper.getBoundingClientRect().top + window.scrollY - 10;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  }

  function setupViewToggle(toggleSel, views, onShow) {
    const toggle = document.querySelector(toggleSel);
    if (!toggle) return;
    const shown = {};
    toggle.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const v = b.dataset.v;
      toggle.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      if (onShow && !shown[v]) { onShow(v); shown[v] = true; }
      Object.keys(views).forEach(key => {
        const el = document.querySelector(views[key]);
        if (el) el.style.display = (key === v) ? '' : 'none';
      });
    });
  }

  function mountTopnav(sel, badge) {
    const el = document.querySelector(sel);
    if (!el) return;
    el.innerHTML = `<a class="home" href="index.html">← 목차로</a><span class="chapbadge">${badge}</span>`;
  }

  function barRow(label, frac, { win = false, color = null, pctText = null } = {}) {
    const c = color || (win ? 'var(--hot)' : 'var(--q)');
    return `<div class="barrow ${win ? 'win' : ''}">
      <div class="bw">${label}${win ? ' 🏆' : ''}</div>
      <div class="track"><div class="fill" style="width:${(clamp(frac, 0, 1) * 100).toFixed(1)}%;background:${c}"></div></div>
      <div class="pct">${pctText != null ? pctText : (frac * 100).toFixed(1) + '%'}</div>
    </div>`;
  }

  global.VZ = { fmt, clamp, PALETTE, setupStepper, setupViewToggle, mountTopnav, barRow };
})(window);

/* ============================================================
   꺾은선 차트 (VZ.linePlot) — 수렴/손실/1변수 곡선용
   series:[{pts:[[x,y]],color,label,dash}], opts:{W,H,xlab,ylab,xmin..ymax,legend,hline,aria}
   ============================================================ */
(function (global) {
  'use strict';
  const VZ = global.VZ;
  function linePlot(series, opts = {}) {
    const W = opts.W || 460, H = opts.H || 230, padL = 44, padR = 14, padT = opts.legend === false ? 14 : 30, padB = 34;
    const all = series.filter(s => s.pts && s.pts.length);
    let xmin = opts.xmin, xmax = opts.xmax, ymin = opts.ymin, ymax = opts.ymax;
    if (xmin == null) xmin = Math.min(...all.flatMap(s => s.pts.map(p => p[0])), 0);
    if (xmax == null) xmax = Math.max(...all.flatMap(s => s.pts.map(p => p[0])), 1);
    if (ymin == null) ymin = Math.min(...all.flatMap(s => s.pts.map(p => p[1])), 0);
    if (ymax == null) ymax = Math.max(...all.flatMap(s => s.pts.map(p => p[1])), 1);
    if (ymax === ymin) ymax = ymin + 1;
    if (xmax === xmin) xmax = xmin + 1;
    const px = x => padL + (x - xmin) / (xmax - xmin) * (W - padL - padR);
    const py = y => H - padB - (y - ymin) / (ymax - ymin) * (H - padT - padB);
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const yv = ymin + (ymax - ymin) * i / 4, y = py(yv);
      g += `<line class="gridline" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"/>`;
      g += `<text class="axislabel" x="${padL - 6}" y="${y + 3}" text-anchor="end">${VZ.fmt(yv, Math.abs(ymax - ymin) >= 10 ? 0 : 1)}</text>`;
    }
    for (let i = 1; i < 4; i++) { const xv = xmin + (xmax - xmin) * i / 4; g += `<line class="gridline" x1="${px(xv)}" y1="${padT}" x2="${px(xv)}" y2="${H - padB}"/>`; }
    g += `<line class="axis" x1="${padL}" y1="${py(ymin)}" x2="${W - padR}" y2="${py(ymin)}"/>`;
    g += `<line class="axis" x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}"/>`;
    g += `<text class="axislabel" x="${padL}" y="${H - padB + 16}" text-anchor="start">${VZ.fmt(xmin, 0)}</text>`;
    g += `<text class="axislabel" x="${W - padR}" y="${H - padB + 16}" text-anchor="end">${VZ.fmt(xmax, 0)}</text>`;
    if (opts.xlab) g += `<text class="axislabel" x="${(padL + W - padR) / 2}" y="${H - padB + 16}" text-anchor="middle">${opts.xlab}</text>`;
    if (opts.ylab) g += `<text class="axislabel" x="${padL - 30}" y="${(padT + H - padB) / 2}" text-anchor="middle" transform="rotate(-90 ${padL - 30} ${(padT + H - padB) / 2})">${opts.ylab}</text>`;
    if (opts.hline) {
      const y = py(opts.hline.y);
      g += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--faint)" stroke-width="1" stroke-dasharray="4 3"/>`;
      if (opts.hline.label) g += `<text class="axislabel" x="${W - padR}" y="${y - 4}" text-anchor="end" fill="var(--faint)">${opts.hline.label}</text>`;
    }
    all.forEach(s => {
      const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' ');
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round"/>`;
    });
    if (opts.legend !== false) {
      let lx = padL;
      all.forEach(s => { if (!s.label) return;
        g += `<line x1="${lx}" y1="10" x2="${lx + 16}" y2="10" stroke="${s.color}" stroke-width="3" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''}/>`;
        g += `<text x="${lx + 20}" y="13" font-size="11" font-family="JetBrains Mono" fill="var(--muted)">${s.label}</text>`;
        lx += 26 + (s.label.length * 7.2); });
    }
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.aria || '꺾은선 차트'}" style="max-width:100%;display:block">${g}</svg>`;
  }
  VZ.linePlot = linePlot;
})(window);

/* ============================================================
   2D 보드/벡터/애니메이션 (VZ.LA) — 벡터장·등방 좌표용
   ============================================================ */
(function (global) {
  'use strict';
  const VZ = global.VZ;
  function arrowDefsAndLine(x1, y1, x2, y2, color, lw) {
    const id = 'ah' + Math.round(Math.abs(x1 * 7 + y1 * 13 + x2 * 17 + y2 * 23)) + color.replace(/[^a-z0-9]/gi, '');
    let s = `<defs><marker id="${id}" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill="${color}"/></marker></defs>`;
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${lw}" marker-end="url(#${id})"/>`;
    return s;
  }
  // 두 픽셀점 사이 화살표 (범용)
  function arrowPx(x1, y1, x2, y2, color, { lw = 2.5 } = {}) { return arrowDefsAndLine(x1, y1, x2, y2, color, lw); }
  // 보간 애니메이션(스칼라 t): cb(t∈0..1) 반복 호출. 취소함수 반환.
  function tween(cb, dur = 800, done) {
    const t0 = performance.now(); let cancelled = false, raf = 0;
    function frame(now) {
      if (cancelled) return;
      let t = Math.min(1, (now - t0) / dur);
      t = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      cb(t);
      if (t < 1) raf = requestAnimationFrame(frame); else if (done) done();
    }
    raf = requestAnimationFrame(frame);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }
  VZ.LA = { arrowPx, tween };
})(window);

/* ============================================================
   푸리에·신호처리 엔진 (VZ.FT)
   심장: clock — 등속으로 흐르는 시간 t를 매 프레임 콜백(무한 rAF 루프).
   회전(phasor)·에피사이클·스크롤 파형·스펙트럼이 같은 t로 동기화.
   렌더러는 순수 함수 (상태 → SVG 문자열). 복소수는 i/오일러 없이 "회전 화살표"로만.
   - clock(cb,opts)              : {start,stop,toggle,setSpeed,reset,running,t}
   - board(o) / cboard(o)        : 시간·값 좌표 / 등방 복소평면 좌표
   - cgrid(b,opts)               : 복소평면 축+단위원
   - phasor(b,opts)→{svg,tip}    : 회전 화살표(+원+투영선)
   - epicycles(b,terms,t,opts)   : 위상자 체인 → 펜 끝이 그림을 그림
   - trail({max})                : 누적 궤적 링버퍼
   - waveStrip(b,sample,opts)    : 시간축 파형(+sweep)
   - spectrum(bins,opts)         : 주파수별 막대(진폭/위상)
   - additive(terms)             : Σ amp·sin(2π·freq·x+phase) 샘플러
   - integrate / dft / dftComplex / idftComplex / fft / toEpicycleTerms
   - projectionArea(b,sig,basis,opts) : 신호·기저 곱의 부호별 면적 = 내적(사영)
   - audio                       : Web Audio — 하모닉 합성/EQ 실제 소리
   - legend(items)               : 색 범례
   ============================================================ */
(function (global) {
  'use strict';
  const VZ = global.VZ;
  const TAU = Math.PI * 2;

  const FT_STATE = { base:'var(--q)', sum:'var(--hot)', comp:'var(--v)', alt:'var(--pink)',
                     sample:'var(--hot)', alias:'var(--k)', pos:'var(--good)', neg:'var(--k)', dim:'var(--slate)' };
  const col = s => FT_STATE[s] || (s && s.indexOf && s.indexOf('var(') === 0 ? s : 'var(--slate)');

  // 스칼라 t∈[0,1] → 색 (낮음 남보라 → 청록 → 초록 → 노랑) — 스펙트로그램 히트맵용
  function heatColor(t) {
    t = Math.max(0, Math.min(1, t));
    const stops = [[30, 27, 75], [37, 99, 142], [52, 211, 153], [251, 191, 36]];
    const seg = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(seg)), f = seg - i;
    const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  // ---- 등속 시간 클럭 (이 트랙의 심장) ----
  function clock(cb, opts = {}) {
    let t = 0, speed = opts.speed || 1, running = false, raf = 0, last = 0;
    function frame(now) {
      if (!running) return;
      let dt = (now - last) / 1000; if (!(dt >= 0) || dt > 0.1) dt = 0.016; // 탭 비활성 점프 방지
      last = now; t += dt * speed;
      cb({ t, dt: dt * speed });
      raf = requestAnimationFrame(frame);
    }
    const api = {
      start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(raf); },
      toggle() { running ? api.stop() : api.start(); },
      setSpeed(m) { speed = m; },
      reset() { t = 0; cb({ t, dt: 0 }); },
      get running() { return running; }, get t() { return t; },
    };
    if (opts.autostart !== false) api.start();
    return api;
  }

  // ---- 좌표계 ----
  // 시간·값 보드 (독립 스케일) — 파형·스펙트럼·사영용
  function board(o = {}) {
    const W = o.W || 520, H = o.H || 220;
    const padL = o.padL ?? 36, padR = o.padR ?? 14, padT = o.padT ?? 14, padB = o.padB ?? 24;
    const xmin = o.xmin ?? 0, xmax = o.xmax ?? 1, ymin = o.ymin ?? -1.2, ymax = o.ymax ?? 1.2;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    return { W, H, padL, padR, padT, padB, xmin, xmax, ymin, ymax, plotW, plotH,
      X: x => padL + (x - xmin) / (xmax - xmin) * plotW,
      Y: y => H - padB - (y - ymin) / (ymax - ymin) * plotH };
  }
  // 등방 복소평면 (원이 안 찌그러짐) — 위상자·에피사이클용
  function cboard(o = {}) {
    const W = o.W || 360, H = o.H || 360, pad = o.pad ?? 16, range = o.range || 1.5;
    const plotW = W - pad * 2, plotH = H - pad * 2;
    const unit = Math.min(plotW, plotH) / (2 * range);
    const ox = W / 2 + (o.shiftX || 0), oy = H / 2 + (o.shiftY || 0);
    return { W, H, unit, range, ox, oy,
      X: re => ox + re * unit, Y: im => oy - im * unit };
  }
  function cgrid(b, o = {}) {
    let g = `<line x1="${b.X(-b.range)}" y1="${b.oy}" x2="${b.X(b.range)}" y2="${b.oy}" stroke="rgba(255,255,255,.18)" stroke-width="1"/>`
          + `<line x1="${b.ox}" y1="${b.Y(-b.range)}" x2="${b.ox}" y2="${b.Y(b.range)}" stroke="rgba(255,255,255,.18)" stroke-width="1"/>`;
    (o.rings || [1]).forEach(r => { g += `<circle cx="${b.ox}" cy="${b.oy}" r="${(r * b.unit).toFixed(1)}" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="1"/>`; });
    return g;
  }

  // ---- 위상자 (회전 화살표) ----
  function phasor(b, o) {
    const cx = o.cx || 0, cy = o.cy || 0, amp = o.amp, freq = o.freq, phase = o.phase || 0, t = o.t || 0;
    const ang = TAU * freq * t + phase;
    const tip = { re: cx + amp * Math.cos(ang), im: cy + amp * Math.sin(ang) };
    const color = o.color || 'var(--hot)';
    let g = '';
    if (o.showCircle !== false) g += `<circle cx="${b.X(cx).toFixed(1)}" cy="${b.Y(cy).toFixed(1)}" r="${(amp * b.unit).toFixed(1)}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="1"/>`;
    g += VZ.LA.arrowPx(b.X(cx), b.Y(cy), b.X(tip.re), b.Y(tip.im), color, { lw: o.lw || 2.5 });
    if (o.projY) { g += `<line x1="${b.X(tip.re).toFixed(1)}" y1="${b.Y(tip.im).toFixed(1)}" x2="${o.projY.toFixed(1)}" y2="${b.Y(tip.im).toFixed(1)}" stroke="${color}" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"/><circle cx="${o.projY.toFixed(1)}" cy="${b.Y(tip.im).toFixed(1)}" r="3.5" fill="${color}"/>`; }
    return { svg: g, tip, angle: ang };
  }

  // ---- 에피사이클 체인 ----
  function epicycles(b, terms, t, o = {}) {
    let pre = 0, pim = 0, g = '';
    terms.forEach((tm, i) => {
      const ang = TAU * tm.freq * t + (tm.phase || 0);
      const nre = pre + tm.amp * Math.cos(ang), nim = pim + tm.amp * Math.sin(ang);
      if (o.fadeCircles !== false && tm.amp * b.unit > 1.5)
        g += `<circle cx="${b.X(pre).toFixed(1)}" cy="${b.Y(pim).toFixed(1)}" r="${(tm.amp * b.unit).toFixed(1)}" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="1"/>`;
      g += `<line x1="${b.X(pre).toFixed(1)}" y1="${b.Y(pim).toFixed(1)}" x2="${b.X(nre).toFixed(1)}" y2="${b.Y(nim).toFixed(1)}" stroke="${o.armColor || 'rgba(255,255,255,.45)'}" stroke-width="1.3"/>`;
      pre = nre; pim = nim;
    });
    return { svg: g, tip: { re: pre, im: pim } };
  }
  function trail(o = {}) {
    const max = o.max || 600; const pts = [];
    return {
      push(p) { pts.push(p); if (pts.length > max) pts.shift(); },
      path() { return pts.length ? pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ') : ''; },
      clear() { pts.length = 0; },
    };
  }

  // ---- 파형 ----
  function waveStrip(b, sample, o = {}) {
    const n = o.n || 240, color = o.color || 'var(--hot)';
    let d = '';
    for (let i = 0; i <= n; i++) { const x = b.xmin + (b.xmax - b.xmin) * i / n; const y = sample(x); d += (i ? 'L' : 'M') + b.X(x).toFixed(1) + ',' + b.Y(y).toFixed(1) + ' '; }
    let g = `<path d="${d.trim()}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>`;
    if (o.sweep != null) { const sx = b.X(o.sweep); g += `<line x1="${sx.toFixed(1)}" y1="${b.padT}" x2="${sx.toFixed(1)}" y2="${(b.H - b.padB).toFixed(1)}" stroke="var(--faint)" stroke-width="1" stroke-dasharray="4 3"/><circle cx="${sx.toFixed(1)}" cy="${b.Y(sample(o.sweep)).toFixed(1)}" r="4" fill="${color}"/>`; }
    return g;
  }

  // ---- 스펙트럼 막대 ----
  function spectrum(bins, o = {}) {
    const W = o.W || 520, H = o.H || 200, pad = 28, gap = o.gap ?? 3;
    const n = bins.length, mode = o.mode || 'amp';
    const vals = bins.map(b => mode === 'phase' ? (b.phase || 0) : (b.amp || 0));
    const maxv = mode === 'phase' ? Math.PI : Math.max(...vals, 1e-6);
    const base = H - 22, plotH = base - 16;
    const bw = (W - pad * 2 - gap * (n - 1)) / n;
    let g = '';
    bins.forEach((bn, i) => {
      const v = mode === 'phase' ? (bn.phase || 0) : (bn.amp || 0);
      const h = Math.abs(v) / maxv * (mode === 'phase' ? plotH / 2 : plotH);
      const x = pad + i * (bw + gap);
      const y = mode === 'phase' ? (v >= 0 ? base / 1 - plotH / 2 - h : base / 1 - plotH / 2) : base - h;
      const fill = (o.highlight === i) ? 'var(--hot)' : (o.colorFn ? o.colorFn(i) : 'var(--q)');
      g += `<rect x="${x.toFixed(1)}" y="${(mode === 'phase' ? (base - plotH / 2 - Math.max(0, v) / maxv * plotH / 2) : y).toFixed(1)}" width="${bw.toFixed(1)}" height="${(mode === 'phase' ? h : h).toFixed(1)}" rx="2" fill="${fill}" opacity="0.9"/>`;
      if (o.labels !== false && n <= 24) g += `<text x="${(x + bw / 2).toFixed(1)}" y="${base + 14}" text-anchor="middle" font-size="10" fill="var(--faint)" font-family="JetBrains Mono">${bn.freq != null ? bn.freq : i}</text>`;
    });
    if (mode === 'phase') g += `<line x1="${pad}" y1="${(base - plotH / 2).toFixed(1)}" x2="${W - pad}" y2="${(base - plotH / 2).toFixed(1)}" stroke="rgba(255,255,255,.15)"/>`;
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;display:block" data-pick="${o.onPickId || ''}">${g}</svg>`;
  }

  // ---- 가산 합성 ----
  function additive(terms) {
    return x => terms.reduce((s, t) => s + (t.amp || 0) * Math.sin(TAU * t.freq * x + (t.phase || 0)), 0);
  }

  // ---- 수치 / 변환 ----
  function integrate(f, a, b, n = 400) { const dx = (b - a) / n; let s = 0.5 * (f(a) + f(b)); for (let i = 1; i < n; i++) s += f(a + i * dx); return s * dx; }
  function dft(samples) {
    const N = samples.length, out = [];
    for (let k = 0; k < N; k++) { let re = 0, im = 0; for (let nn = 0; nn < N; nn++) { const a = -TAU * k * nn / N; re += samples[nn] * Math.cos(a); im += samples[nn] * Math.sin(a); } out.push({ k, re, im, amp: Math.hypot(re, im) / N, phase: Math.atan2(im, re), freq: k }); }
    return out;
  }
  function dftComplex(pts) { // pts:[{re,im}] → 복소 계수 (에피사이클용, 부호있는 주파수)
    const N = pts.length, out = [];
    for (let k = 0; k < N; k++) { let re = 0, im = 0; for (let nn = 0; nn < N; nn++) { const a = -TAU * k * nn / N, c = Math.cos(a), s = Math.sin(a); re += pts[nn].re * c - pts[nn].im * s; im += pts[nn].re * s + pts[nn].im * c; } re /= N; im /= N; out.push({ k, re, im, amp: Math.hypot(re, im), phase: Math.atan2(im, re), freq: k <= N / 2 ? k : k - N }); }
    return out;
  }
  function fft(re, im) { const N = re.length; if (N <= 1) return { re: re.slice(), im: im.slice() };
    const er = [], ei = [], orr = [], oi = []; for (let i = 0; i < N / 2; i++) { er.push(re[2 * i]); ei.push(im[2 * i]); orr.push(re[2 * i + 1]); oi.push(im[2 * i + 1]); }
    const E = fft(er, ei), O = fft(orr, oi), Re = new Array(N), Im = new Array(N);
    for (let k = 0; k < N / 2; k++) { const a = -TAU * k / N, cr = Math.cos(a), ci = Math.sin(a); const tr = cr * O.re[k] - ci * O.im[k], ti = cr * O.im[k] + ci * O.re[k]; Re[k] = E.re[k] + tr; Im[k] = E.im[k] + ti; Re[k + N / 2] = E.re[k] - tr; Im[k + N / 2] = E.im[k] - ti; }
    return { re: Re, im: Im };
  }
  function toEpicycleTerms(coeffs, o = {}) {
    const topK = o.topK || coeffs.length;
    return coeffs.map(c => ({ amp: c.amp, freq: c.freq, phase: c.phase })).filter(c => c.amp > (o.minAmp || 0)).sort((a, b) => b.amp - a.amp).slice(0, topK);
  }

  // ---- 선대 연결: 사영(내적) = 곱의 부호별 면적 ----
  function projectionArea(b, signal, basis, o = {}) {
    const n = o.n || 60, fill = o.fill || 'var(--good)', negFill = o.negFill || 'var(--k)';
    const dx = (b.xmax - b.xmin) / n; let g = '', sum = 0;
    for (let i = 0; i < n; i++) { const x = b.xmin + (i + 0.5) * dx, h = signal(x) * basis(x); sum += h * dx;
      const yTop = b.Y(Math.max(0, h)), yBot = b.Y(Math.min(0, h)), px = b.X(b.xmin + i * dx), w = b.X(b.xmin + (i + 1) * dx) - px;
      g += `<rect x="${px.toFixed(1)}" y="${yTop.toFixed(1)}" width="${Math.max(0, w - 0.4).toFixed(1)}" height="${Math.abs(yBot - yTop).toFixed(1)}" fill="${h < 0 ? negFill : fill}" opacity="0.4"/>`;
    }
    return { svg: g, dot: sum / (b.xmax - b.xmin) };
  }

  // ---- Web Audio: 하모닉 합성 / EQ 실제 소리 ----
  const audio = (function () {
    let ctx;
    const ensure = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; };
    // terms: [{freq:하모닉 배수, amp}], base Hz. dur 초.
    function play(terms, o = {}) {
      const c = ensure(), base = o.base || 220, dur = o.dur || 1.2, vol = o.vol || 0.22, t0 = c.currentTime;
      const m = c.createGain(); m.gain.setValueAtTime(0, t0); m.gain.linearRampToValueAtTime(vol, t0 + 0.03);
      m.gain.setValueAtTime(vol, t0 + dur - 0.14); m.gain.linearRampToValueAtTime(0, t0 + dur); m.connect(c.destination);
      terms.forEach(tm => { const a = Math.abs(tm.amp || 0); if (a < 1e-4) return; const osc = c.createOscillator(), g = c.createGain(); osc.type = 'sine'; osc.frequency.value = base * tm.freq; g.gain.value = a; osc.connect(g); g.connect(m); osc.start(t0); osc.stop(t0 + dur); });
      return dur;
    }
    return { play, ensure };
  })();

  function legend(items) {
    return '<div class="ft-legend">' + items.map(([label, st]) => `<span class="ft-leg"><i style="background:${col(st)}"></i>${label}</span>`).join('') + '</div>';
  }

  VZ.FT = { clock, board, cboard, cgrid, phasor, epicycles, trail, waveStrip, spectrum, additive,
            integrate, dft, dftComplex, fft, toEpicycleTerms, projectionArea, audio, legend, col, heatColor, TAU };
})(window);

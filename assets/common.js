/* 模电讲义 — shared runtime: nav, KaTeX, slide lightbox, widgets, SVG schematic + plot helpers.
   Plain script (no modules, no fetch) so pages work when opened from file://  */

/* ===== Chapter registry: add new chapters here ===== */
var CHAPTERS = [
  {n:1, file:'ch1.html', title:'半导体二极管及其基本应用电路', slides:91,  desc:'信号与放大电路模型、半导体、PN结、二极管模型与应用、稳压管'},
  {n:2, file:'ch2.html', title:'双极结型晶体管及其放大电路',   slides:62,  desc:'BJT 结构与放大原理、特性曲线、共射放大电路、静态与动态分析'},
  {n:3, file:'ch3.html', title:'场效应晶体管及其放大电路',     slides:47,  desc:'JFET、MOSFET、特性方程、直流偏置计算、小信号模型'},
  {n:4, file:'ch4.html', title:'放大电路的频率响应',           slides:28,  desc:'RC 电路与波特图、混合π模型、密勒效应、上下限频率'},
  {n:5, file:'ch5.html', title:'差分式放大电路',               slides:77,  desc:'零点漂移、差模与共模、长尾与恒流源差放、CMRR'},
  {n:6, file:'ch6.html', title:'集成运算放大器',               slides:61,  desc:'虚短虚断、比例/加减/积分/微分电路、电压比较器'}
];

var SVGNS = 'http://www.w3.org/2000/svg';
/* numeric versions of main figures, drawn while the matching derivation is open: NUMFIG[id] = function(svgId){...} */
var NUMFIG = {};
function mk(tag, attrs, parent){
  var e = document.createElementNS(SVGNS, tag);
  for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
/* text with simple sub/superscripts: "V_{CC}", "R_b", "x^{2}" */
function rtext(parent, x, y, str, cls, anchor){
  var t = mk('text', {x:x, y:y, class:cls||'t', 'text-anchor':anchor||'start'}, parent);
  var re = /_\{([^}]*)\}|_([A-Za-z0-9'+−])|\^\{([^}]*)\}|\^([A-Za-z0-9])|([^_^]+)/g, m, off = 0;
  while ((m = re.exec(String(str))) !== null){
    var sub = m[1] !== undefined ? m[1] : m[2];
    var sup = m[3] !== undefined ? m[3] : m[4];
    if (sub !== undefined){ var s = mk('tspan', {dy: 4 - off, 'font-size':'0.74em'}, t); s.textContent = sub; off = 4; }
    else if (sup !== undefined){ var s2 = mk('tspan', {dy: -6 - off, 'font-size':'0.74em'}, t); s2.textContent = sup; off = -6; }
    else { var n = mk('tspan', {dy: -off}, t); n.textContent = m[5]; off = 0; }
  }
  return t;
}
function addMarkers(svg){
  if (svg.__mk) return svg.__mk;
  var id = svg.id || ('s' + Math.random().toString(36).slice(2, 8));
  svg.id = id;
  var defs = mk('defs', {}, svg), names = {};
  ['ink', 'red', 'blue', 'acc', 'amber'].forEach(function(c){
    /* slim notched head; the line ends inside the head so its square end never shows at the tip */
    var m = mk('marker', {id: id + '-' + c, viewBox:'0 0 12 8', refX:8, refY:4, markerWidth:7, markerHeight:4.67, orient:'auto-start-reverse'}, defs);
    mk('path', {d:'M0,0.4 L12,4 L0,7.6 L3,4 z', class:'mk-' + c}, m);
    names[c] = 'url(#' + id + '-' + c + ')';
  });
  svg.__mk = names;
  return names;
}

/* ===== Schematic drawing ===== */
function Sch(svgOrId){
  this.svg = typeof svgOrId === 'string' ? document.getElementById(svgOrId) : svgOrId;
  this.mk = addMarkers(this.svg);
  this.g = mk('g', {}, this.svg);
}
Sch.prototype = {
  line: function(x1, y1, x2, y2, cls){ return mk('line', {x1:x1, y1:y1, x2:x2, y2:y2, class:cls||'w'}, this.g); },
  wire: function(){ var a = arguments, pts = []; for (var i = 0; i < a.length; i += 2) pts.push(a[i] + ',' + a[i+1]);
    return mk('polyline', {points:pts.join(' '), class:'w'}, this.g); },
  hl: function(pts, cls){ return mk('polyline', {points:pts.map(function(p){return p.join(',');}).join(' '), class:cls||'path-hl'}, this.g); },
  text: function(x, y, s, cls, anchor){ return rtext(this.g, x, y, s, cls, anchor); },
  node: function(x, y){ return mk('circle', {cx:x, cy:y, r:3.2, class:'node'}, this.g); },
  term: function(x, y){ return mk('circle', {cx:x, cy:y, r:3.8, class:'term'}, this.g); },
  pm: function(x, y, s){ var t = mk('text', {x:x, y:y + 5, class:'pm', 'text-anchor':'middle'}, this.g); t.textContent = s === '-' ? '−' : s; return t; },
  gnd: function(x, y){ this.line(x, y, x, y + 8); this.line(x - 11, y + 8, x + 11, y + 8); this.line(x - 7, y + 12, x + 7, y + 12); this.line(x - 3, y + 16, x + 3, y + 16); },
  arrow: function(x1, y1, x2, y2, lab, color, lx, ly){
    color = color || 'red';
    mk('line', {x1:x1, y1:y1, x2:x2, y2:y2, class:'arr-' + color, 'marker-end':this.mk[color === 'acc' ? 'acc' : color]}, this.g);
    if (lab) rtext(this.g, lx !== undefined ? lx : (x1 + x2) / 2 + 6, ly !== undefined ? ly : (y1 + y2) / 2 - 6, lab, 't' + (color === 'acc' ? 'val' : color));
  },
  box: function(x, y, w, h){ return mk('rect', {x:x, y:y, width:w, height:h, class:'box-dash', rx:4}, this.g); },
  /* generic two-terminal element: body drawn in local coords along +x, centered */
  _two: function(x1, y1, x2, y2, L, body, o, hw){
    hw = hw || 7;
    var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    this.line(x1, y1, mx - ux * L / 2, my - uy * L / 2);
    this.line(mx + ux * L / 2, my + uy * L / 2, x2, y2);
    var g = mk('g', {transform:'translate(' + mx + ',' + my + ') rotate(' + (Math.atan2(dy, dx) * 180 / Math.PI) + ')'}, this.g);
    body(g);
    o = o || {};
    var vert = Math.abs(uy) > 0.5, side = o.side || (vert ? 'r' : 't'), off = o.off || 0;
    var lab = o.lab, val = o.val;
    if (vert){
      var xx = side === 'r' ? mx + hw + 7 + off : mx - hw - 7 - off, an = side === 'r' ? 'start' : 'end';
      if (lab && val){ rtext(this.g, xx, my - 3, lab, 't', an); rtext(this.g, xx, my + 15, val, 'tval', an); }
      else if (lab) rtext(this.g, xx, my + 5, lab, 't', an);
      else if (val) rtext(this.g, xx, my + 5, val, 'tval', an);
    } else {
      var yy = side === 't' ? my - hw - 7 - off : my + hw + 17 + off;
      var txt = [lab, val].filter(Boolean);
      if (lab) rtext(this.g, mx - (val ? 4 : 0), yy, lab, 't', val ? 'end' : 'middle');
      if (val) rtext(this.g, mx + (lab ? 4 : 0), yy, val, 'tval', lab ? 'start' : 'middle');
    }
    return {mx:mx, my:my, ux:ux, uy:uy, vert:vert, side:side};
  },
  R: function(x1, y1, x2, y2, o){ return this._two(x1, y1, x2, y2, 34, function(g){ mk('rect', {x:-17, y:-7, width:34, height:14, class:'body'}, g); }, o); },
  C: function(x1, y1, x2, y2, o){ return this._two(x1, y1, x2, y2, 9, function(g){ mk('line', {x1:-4.5, y1:-12, x2:-4.5, y2:12, class:'w2'}, g); mk('line', {x1:4.5, y1:-12, x2:4.5, y2:12, class:'w2'}, g); }, o, 12); },
  /* battery: first point is the + terminal (long plate) */
  bat: function(x1, y1, x2, y2, o){
    o = o || {};
    var r = this._two(x1, y1, x2, y2, 10, function(g){ mk('line', {x1:-5, y1:-14, x2:-5, y2:14, class:'w'}, g); mk('line', {x1:5, y1:-7, x2:5, y2:7, class:'w2'}, g); }, o, 14);
    if (!o.nopm){
      /* +/- go on the side opposite the label, so they never collide with it */
      var dx, dy;
      if (o.lab || o.val){ if (r.vert){ dx = r.side === 'r' ? -1 : 1; dy = 0; } else { dx = 0; dy = r.side === 't' ? 1 : -1; } }
      else { dx = -r.uy; dy = r.ux; }
      if (o.pmSide === 'l'){ dx = -dx; dy = -dy; }
      this.pm(r.mx - r.ux * 15 + dx * 15, r.my - r.uy * 15 + dy * 15, '+');
      this.pm(r.mx + r.ux * 15 + dx * 15, r.my + r.uy * 15 + dy * 15, '-'); }
    return r;
  },
  /* AC / signal source: first point is + */
  vs: function(x1, y1, x2, y2, o){
    var r = this._two(x1, y1, x2, y2, 30, function(g){ mk('circle', {cx:0, cy:0, r:15, class:'body'}, g); mk('path', {d:'M-8,0 C-5,-9 -1,-9 0,0 S5,9 8,0', class:'w', transform:'rotate(-90)'}, g); }, o, 16);
    var px = -r.uy, py = r.ux;
    this.pm(r.mx - r.ux * 22 + px * 12, r.my - r.uy * 22 + py * 12, '+');
    this.pm(r.mx + r.ux * 22 + px * 12, r.my + r.uy * 22 + py * 12, '-');
    return r;
  },
  /* DC source drawn as circle with +/- (first point +) */
  vdc: function(x1, y1, x2, y2, o){
    return this._two(x1, y1, x2, y2, 30, function(g){ mk('circle', {cx:0, cy:0, r:15, class:'body'}, g);
      var a = mk('text', {x:-8, y:5, class:'pm', 'text-anchor':'middle', transform:'rotate(90 -8 0)'}, g); a.textContent = '+';
      var b = mk('text', {x:8, y:5, class:'pm', 'text-anchor':'middle', transform:'rotate(90 8 0)'}, g); b.textContent = '−'; }, o, 16);
  },
  /* dependent current source: diamond, arrow from first point toward second */
  ccs: function(x1, y1, x2, y2, o){
    return this._two(x1, y1, x2, y2, 30, function(g){ mk('path', {d:'M-15,0 L0,-13 L15,0 L0,13 Z', class:'body'}, g); mk('line', {x1:-8, y1:0, x2:8, y2:0, class:'w', 'marker-end':''}, g); mk('path', {d:'M8,0 L2,-4 L2,4 Z', class:'solid'}, g); }, o, 14);
  },
  /* dependent voltage source: diamond with + toward first point */
  ccvs: function(x1, y1, x2, y2, o){
    return this._two(x1, y1, x2, y2, 30, function(g){ mk('path', {d:'M-15,0 L0,-13 L15,0 L0,13 Z', class:'body'}, g);
      var a = mk('text', {x:-6, y:5, class:'pm', 'text-anchor':'middle', transform:'rotate(90 -6 0)'}, g); a.textContent = '+';
      var b = mk('text', {x:7, y:5, class:'pm', 'text-anchor':'middle', transform:'rotate(90 7 0)'}, g); b.textContent = '−'; }, o, 14);
  },
  isrc: function(x1, y1, x2, y2, o){
    return this._two(x1, y1, x2, y2, 30, function(g){ mk('circle', {cx:0, cy:0, r:15, class:'body'}, g); mk('line', {x1:-8, y1:0, x2:5, y2:0, class:'w'}, g); mk('path', {d:'M9,0 L2,-4.5 L2,4.5 Z', class:'solid'}, g); }, o, 16);
  },
  /* diode: first point = anode */
  D: function(x1, y1, x2, y2, o){
    return this._two(x1, y1, x2, y2, 22, function(g){ mk('path', {d:'M-10,-10 L-10,10 L8,0 Z', class:(o && o.open) ? 'body' : 'solid'}, g); mk('line', {x1:9, y1:-11, x2:9, y2:11, class:'w2'}, g); }, o, 11);
  },
  Z: function(x1, y1, x2, y2, o){
    return this._two(x1, y1, x2, y2, 22, function(g){ mk('path', {d:'M-10,-10 L-10,10 L8,0 Z', class:'solid'}, g); mk('polyline', {points:'4,-14 9,-11 9,11 14,14', class:'w2'}, g); }, o, 14);
  },
  sw: function(x1, y1, x2, y2, closed, o){
    return this._two(x1, y1, x2, y2, 30, function(g){ mk('circle', {cx:-15, cy:0, r:2.5, class:'node'}, g); mk('circle', {cx:15, cy:0, r:2.5, class:'node'}, g);
      mk('line', {x1:-15, y1:0, x2:closed ? 15 : 12, y2:closed ? 0 : -12, class:'w'}, g); }, o);
  },
  /* NPN/PNP: (x,y) = middle of base bar. pins: b (left), c (top), e (bottom). o.pnp, o.lab, o.flip (mirror: base on right) */
  bjt: function(x, y, o){
    o = o || {}; var s = o.flip ? -1 : 1, g = this.g;
    if (o.circle !== false) mk('circle', {cx:x + 8 * s, cy:y, r:22, class:'body', style:'fill:none'}, g);
    this.line(x - 22 * s, y, x, y);
    mk('line', {x1:x, y1:y - 13, x2:x, y2:y + 13, class:'w2'}, g);
    this.line(x, y - 6, x + 16 * s, y - 18); this.line(x + 16 * s, y - 18, x + 16 * s, y - 34);
    this.line(x + 16 * s, y + 18, x + 16 * s, y + 34);
    if (o.pnp) mk('line', {x1:x + 16 * s, y1:y + 18, x2:x + 1 * s, y2:y + 6.5, class:'w', 'marker-end':this.mk.ink}, g);
    else mk('line', {x1:x, y1:y + 6, x2:x + 15 * s, y2:y + 17.5, class:'w', 'marker-end':this.mk.ink}, g);
    if (o.lab) rtext(g, x + 34 * s, y + 5, o.lab, 'tb', s > 0 ? 'start' : 'end');
    if (o.pins){ rtext(g, x - 18 * s, y - 6, 'b', 'ts', 'middle'); rtext(g, x + 24 * s, y - 26, 'c', 'ts', 'middle'); rtext(g, x + 24 * s, y + 32, 'e', 'ts', 'middle'); }
    return {b:[x - 22 * s, y], c:[x + 16 * s, y - 34], e:[x + 16 * s, y + 34]};
  },
  /* N-channel enhancement MOSFET: (x,y)=channel center. pins g (left), d (top), s (bottom). o.dep (depletion: solid channel), o.p (P-channel), o.jfet */
  fet: function(x, y, o){
    o = o || {}; var g = this.g;
    if (o.jfet){
      mk('line', {x1:x, y1:y - 16, x2:x, y2:y + 16, class:'w2'}, g);
      this.line(x, y - 10, x + 18, y - 10); this.line(x + 18, y - 10, x + 18, y - 34);
      this.line(x, y + 10, x + 18, y + 10); this.line(x + 18, y + 10, x + 18, y + 34);
      if (o.p) mk('line', {x1:x, y1:y + 10, x2:x - 20, y2:y + 10, class:'w', 'marker-end':this.mk.ink}, g);
      else mk('line', {x1:x - 22, y1:y + 10, x2:x - 2, y2:y + 10, class:'w', 'marker-end':this.mk.ink}, g);
      if (o.lab) rtext(g, x + 28, y + 5, o.lab, 'tb');
      return {g:[x - 22, y + 10], d:[x + 18, y - 34], s:[x + 18, y + 34]};
    }
    mk('line', {x1:x - 8, y1:y - 14, x2:x - 8, y2:y + 14, class:'w'}, g);
    this.line(x - 26, y + 10, x - 8, y + 10);
    if (o.dep) mk('line', {x1:x, y1:y - 16, x2:x, y2:y + 16, class:'w2'}, g);
    else [[-16, -7], [-5, 5], [7, 16]].forEach(function(p){ mk('line', {x1:x, y1:y + p[0], x2:x, y2:y + p[1], class:'w2'}, g); });
    this.line(x, y - 11, x + 18, y - 11); this.line(x + 18, y - 11, x + 18, y - 34);
    this.line(x, y + 11, x + 18, y + 11); this.line(x + 18, y + 11, x + 18, y + 34);
    this.line(x + 18, y, x + 18, y + 11);
    if (o.p) mk('line', {x1:x + 2, y1:y, x2:x + 17, y2:y, class:'w', 'marker-end':this.mk.ink}, g);
    else mk('line', {x1:x + 18, y1:y, x2:x + 2, y2:y, class:'w', 'marker-end':this.mk.ink}, g);
    if (o.lab) rtext(g, x + 28, y + 5, o.lab, 'tb');
    if (o.pins){ rtext(g, x - 26, y + 4, 'g', 'ts', 'middle'); rtext(g, x + 27, y - 26, 'd', 'ts', 'middle'); rtext(g, x + 27, y + 32, 's', 'ts', 'middle'); }
    return {g:[x - 26, y + 10], d:[x + 18, y - 34], s:[x + 18, y + 34]};
  },
  /* op-amp: (x,y) = left edge center. pins m (inverting), p (non-inverting), o (output). o.plusTop swaps inputs */
  opamp: function(x, y, o){
    o = o || {}; var g = this.g;
    mk('path', {d:'M' + x + ',' + (y - 38) + ' L' + x + ',' + (y + 38) + ' L' + (x + 66) + ',' + y + ' Z', class:'body'}, g);
    var ty = o.plusTop ? y + 20 : y - 20, py = o.plusTop ? y - 20 : y + 20;
    this.line(x - 16, ty, x, ty); this.line(x - 16, py, x, py); this.line(x + 66, y, x + 82, y);
    var a = mk('text', {x:x + 9, y:ty + 5, class:'tb', 'text-anchor':'middle'}, g); a.textContent = '−';
    var b = mk('text', {x:x + 9, y:py + 5, class:'tb', 'text-anchor':'middle'}, g); b.textContent = '+';
    rtext(g, x + 26, y + 5, o.lab || '∞', 'ts', 'middle');
    return {m:[x - 16, ty], p:[x - 16, py], o:[x + 82, y]};
  }
};

/* ===== Plot helper ===== */
function Plot(svgOrId, box, xr, yr){
  this.svg = typeof svgOrId === 'string' ? document.getElementById(svgOrId) : svgOrId;
  this.mk = addMarkers(this.svg);
  this.b = box; this.xr = xr; this.yr = yr;
  this.g = mk('g', {}, this.svg);
  this.d = mk('g', {}, this.svg);
}
Plot.prototype = {
  X: function(v){ var b = this.b; return b.x + (v - this.xr[0]) / (this.xr[1] - this.xr[0]) * b.w; },
  Y: function(v){ var b = this.b; return b.y + b.h - (v - this.yr[0]) / (this.yr[1] - this.yr[0]) * b.h; },
  axes: function(o){
    o = o || {}; var b = this.b, self = this, g = this.g;
    var ax = (this.yr[0] <= 0 && this.yr[1] >= 0 && !o.xAtBottom) ? this.Y(0) : b.y + b.h;
    var ay = (this.xr[0] <= 0 && this.xr[1] >= 0 && !o.yAtLeft) ? this.X(0) : b.x;
    (o.xt || []).forEach(function(v){ if (o.grid !== false) mk('line', {x1:self.X(v), y1:b.y, x2:self.X(v), y2:b.y + b.h, class:'grid'}, g);
      /* o.xtShift: label just right of its tick, for plots whose vertical segments sit exactly on the ticks */
      var sh = o.xtShift; rtext(g, self.X(v) + (sh ? 4 : 0), ax + 16, o.xf ? o.xf(v) : String(v), 'ts', sh ? 'start' : 'middle'); });
    (o.yt || []).forEach(function(v){ if (o.grid !== false) mk('line', {x1:b.x, y1:self.Y(v), x2:b.x + b.w, y2:self.Y(v), class:'grid'}, g);
      /* y axis through the middle: labels go to the left edge of the plot, clear of the curves */
      rtext(g, (ay > b.x + 1 ? b.x : ay) - 6, self.Y(v) + 4, o.yf ? o.yf(v) : String(v), 'ts', 'end'); });
    mk('line', {x1:b.x - 4, y1:ax, x2:b.x + b.w + 10, y2:ax, class:'axis', 'marker-end':this.mk.ink}, g);
    mk('line', {x1:ay, y1:b.y + b.h + 4, x2:ay, y2:b.y - 10, class:'axis', 'marker-end':this.mk.ink}, g);
    if (o.xl) rtext(g, b.x + b.w + 16, ax - 4, o.xl, 't');
    if (o.yl) rtext(g, ay + 8, b.y - 2, o.yl, 't');
    return this;
  },
  /* sample f over [a,b]; values outside y-range break the path */
  fn: function(f, cls, a, bnd, n, layer){
    a = a === undefined ? this.xr[0] : a; bnd = bnd === undefined ? this.xr[1] : bnd; n = n || 400;
    var d = '', pen = false, lo = this.yr[0] - (this.yr[1] - this.yr[0]) * 0.02, hi = this.yr[1] + (this.yr[1] - this.yr[0]) * 0.02;
    for (var i = 0; i <= n; i++){ var x = a + (bnd - a) * i / n, y = f(x);
      if (!isFinite(y) || y < lo || y > hi){ pen = false; continue; }
      d += (pen ? 'L' : 'M') + this.X(x).toFixed(1) + ',' + this.Y(y).toFixed(1); pen = true; }
    return mk('path', {d:d, class:cls || 'cv'}, layer || this.g);
  },
  poly: function(pts, cls, layer){ var self = this;
    return mk('polyline', {points:pts.map(function(p){ return self.X(p[0]).toFixed(1) + ',' + self.Y(p[1]).toFixed(1); }).join(' '), class:cls || 'cv'}, layer || this.g); },
  text: function(x, y, s, cls, anchor, layer){ return rtext(layer || this.g, this.X(x), this.Y(y), s, cls || 'ts', anchor); },
  dot: function(x, y, layer){ return mk('circle', {cx:this.X(x), cy:this.Y(y), r:6, class:'dot'}, layer || this.d); },
  rect: function(x1, y1, x2, y2, cls, layer){ return mk('rect', {x:this.X(Math.min(x1, x2)), y:this.Y(Math.max(y1, y2)), width:Math.abs(this.X(x2) - this.X(x1)), height:Math.abs(this.Y(y2) - this.Y(y1)), class:cls || 'zone'}, layer || this.g); },
  vline: function(x, cls, layer){ return mk('line', {x1:this.X(x), y1:this.b.y, x2:this.X(x), y2:this.b.y + this.b.h, class:cls || 'cvdash'}, layer || this.g); },
  hline: function(y, cls, layer){ return mk('line', {x1:this.b.x, y1:this.Y(y), x2:this.b.x + this.b.w, y2:this.Y(y), class:cls || 'cvdash'}, layer || this.g); },
  clear: function(){ this.d.innerHTML = ''; return this.d; }
};

/* ===== Slider binding: <input type=range id=..> + <output for=..> ===== */
function bindSliders(ids, fmt, cb){
  function run(){ var v = {}; ids.forEach(function(id){ var el = document.getElementById(id); v[id] = parseFloat(el.value);
      var out = document.querySelector('output[for="' + id + '"]'); if (out) out.textContent = fmt && fmt[id] ? fmt[id](v[id]) : el.value; });
    cb(v); }
  ids.forEach(function(id){ document.getElementById(id).addEventListener('input', run); });
  run();
  return run;
}

/* ===== Page init: nav, toc, widgets, KaTeX ===== */
function initPage(chNum){
  // loose text / inline tags directly inside a figure panel -> one block, so the wide two-column grid keeps them together
  document.querySelectorAll('article .panel').forEach(function(p){
    var INL = /^(B|I|EM|STRONG|SPAN|A|SUB|SUP|CODE|BR)$/, run = [];
    function flush(){ if (!run.length) return; if (run.some(function(n){ return n.nodeType === 1 || n.textContent.trim(); })){
      var w = document.createElement('div'); w.className = 'ptext'; run[0].before(w); run.forEach(function(n){ w.appendChild(n); }); } run = []; }
    Array.prototype.slice.call(p.childNodes).forEach(function(n){ if (n.nodeType === 3 || (n.nodeType === 1 && INL.test(n.tagName))) run.push(n); else flush(); });
    flush();
  });
  var here = CHAPTERS.filter(function(c){ return c.n === chNum; })[0];
  var idx = CHAPTERS.indexOf(here), prev = idx > 0 ? CHAPTERS[idx - 1] : null, next = here && idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;
  // sidebar (desktop: fixed on the left, no top bar; phones: slides in from a slim top bar)
  try { var th = localStorage.getItem('analog-theme'); if (th) document.documentElement.setAttribute('data-theme', th); } catch(e){}
  var layout = document.querySelector('.layout');
  var side = document.querySelector('nav.toc');
  if (!side){ side = document.createElement('nav'); layout.insertBefore(side, layout.firstChild); }
  side.className = 'sidebar'; side.setAttribute('aria-label', '目录');
  var hs = document.querySelectorAll('article h2[id]');
  var html = '<div class="sb-book">模拟电子技术基础 · 图解自学讲义</div><a class="sb-title" href="index.html">模电讲义</a>' +
    '<a class="sb-home' + (chNum === 0 ? ' on' : '') + '" href="index.html">首页 · 学习路线</a><div class="sb-group-t">章节</div><ol>';
  CHAPTERS.forEach(function(c){
    var cur = c.n === chNum;
    html += '<li' + (cur ? ' class="cur"' : '') + '><a class="sb-ch" href="' + c.file + '"><span>第 ' + c.n + ' 章　' + c.title + '</span><span class="r">' + c.slides + ' 页</span></a>';
    if (cur){ html += '<div class="sb-secs">' + Array.prototype.map.call(hs, function(h){
        var n = h.querySelector('.n'), t = h.innerHTML.replace(/<span class="n">[^<]*<\/span>/, '').replace(/<a [^>]*class="src"[^>]*>[^<]*<\/a>/g, '').trim();
        return '<a href="#' + h.id + '">' + (n ? '<span class="sn">' + n.textContent + '</span>' : '') + '<span>' + t + '</span></a>'; }).join('') + '</div>'; }
    html += '</li>';
  });
  html += '</ol>';
  html += '<div class="sb-tools"><div>外观：<button type="button" id="themeBtn"></button></div>' +
    '<div class="sb-cols" id="sbCols" hidden>栏数：<button type="button" data-c="1">1</button><button type="button" data-c="2">2</button><button type="button" data-c="3">3</button>' +
    '<button type="button" class="lock" title="锁定栏数（缩放时也保持）" aria-pressed="false"></button></div></div>';
  side.innerHTML = html;
  var themeBtn = document.getElementById('themeBtn');
  function thGet(){ try { return localStorage.getItem('analog-theme'); } catch(e){ return null; } }
  function thLabel(){ var t = thGet(); themeBtn.textContent = t === 'dark' ? '深色' : t === 'light' ? '浅色' : '跟随系统'; }
  themeBtn.addEventListener('click', function(){
    var t = thGet(), nt = t === null ? 'light' : t === 'light' ? 'dark' : null;
    if (nt) document.documentElement.setAttribute('data-theme', nt); else document.documentElement.removeAttribute('data-theme');
    try { nt ? localStorage.setItem('analog-theme', nt) : localStorage.removeItem('analog-theme'); } catch(e){}
    thLabel(); });
  thLabel();
  var links = side.querySelectorAll('.sb-secs a');
  if (links.length){
    var io = new IntersectionObserver(function(ents){ ents.forEach(function(en){ if (en.isIntersecting){
      links.forEach(function(a){ var on = a.getAttribute('href') === '#' + en.target.id; a.classList.toggle('on', on);
        if (on && side.scrollHeight > side.clientHeight){ var r = a.getBoundingClientRect(), sr = side.getBoundingClientRect(); if (r.top < sr.top || r.bottom > sr.bottom) a.scrollIntoView({block:'nearest'}); } }); } }); }, {rootMargin:'-10% 0px -80% 0px'});
    hs.forEach(function(h){ io.observe(h); });
  }
  // phone top bar
  var bar = document.createElement('div'); bar.className = 'topbar';
  bar.innerHTML = '<button type="button" class="menu" aria-expanded="false">目录</button><span>' + (here ? '第 ' + here.n + ' 章　' + here.title : '模电讲义') + '</span>';
  document.body.insertBefore(bar, document.body.firstChild);
  var mask = document.createElement('div'); mask.className = 'sb-mask'; document.body.appendChild(mask);
  var menu = bar.querySelector('.menu');
  function setOpen(v){ document.body.classList.toggle('sb-open', v); menu.setAttribute('aria-expanded', v ? 'true' : 'false'); }
  menu.addEventListener('click', function(){ setOpen(!document.body.classList.contains('sb-open')); });
  mask.addEventListener('click', function(){ setOpen(false); });
  side.addEventListener('click', function(e){ if (e.target.closest('a')) setOpen(false); });

  // prev / next at the bottom of the article
  var art = document.querySelector('article');
  if (art && here){
    var pn = document.createElement('nav'); pn.className = 'page-nav'; pn.setAttribute('aria-label', '上一章 / 下一章');
    pn.innerHTML = (prev ? '<a class="pv" href="' + prev.file + '"><small>上一章</small>第 ' + prev.n + ' 章　' + prev.title + '</a>' : '<a class="pv" href="index.html"><small>返回</small>首页 · 学习路线</a>') +
      (next ? '<a class="nx" href="' + next.file + '"><small>下一章</small>第 ' + next.n + ' 章　' + next.title + '</a>' : '<span></span>');
    art.appendChild(pn);
  }

  // slide refs: <a class="src" data-s="48">S48</a> (chapter = this page) or data-s="2:48"
  function slideUrl(spec){ var p = String(spec).split(':'); var ch = p.length > 1 ? p[0] : chNum, s = p.length > 1 ? p[1] : p[0]; return {ch:+ch, s:+s, url:'img/ch' + ch + '/s' + s + '.jpg'}; }
  var lb = null, cur = null;
  function openLB(spec){
    cur = slideUrl(spec);
    if (!lb){ lb = document.createElement('div'); lb.className = 'lightbox'; lb.hidden = true;
      lb.innerHTML = '<img alt="课件页"><div class="bar"><button type="button" data-d="-1">上一页</button><span class="lbn"></span><button type="button" data-d="1">下一页</button><button type="button" data-x="1">关闭 (Esc)</button></div>';
      document.body.appendChild(lb);
      lb.addEventListener('click', function(e){ var t = e.target;
        if (t.dataset.d){ var c = CHAPTERS.filter(function(x){ return x.n === cur.ch; })[0]; var ns = Math.min(c ? c.slides : 999, Math.max(1, cur.s + (+t.dataset.d))); openLB(cur.ch + ':' + ns); }
        else if (t.dataset.x || t === lb) lb.hidden = true; });
      document.addEventListener('keydown', function(e){ if (lb.hidden) return; if (e.key === 'Escape') lb.hidden = true;
        if (e.key === 'ArrowRight') lb.querySelector('[data-d="1"]').click(); if (e.key === 'ArrowLeft') lb.querySelector('[data-d="-1"]').click(); });
    }
    lb.querySelector('img').src = cur.url; lb.querySelector('.lbn').textContent = '第' + cur.ch + '章 课件 第' + cur.s + '页'; lb.hidden = false;
  }
  document.querySelectorAll('.src[data-s]').forEach(function(a){ if (!a.textContent.trim()) a.textContent = '课件 S' + String(a.dataset.s).split(':').pop();
    a.setAttribute('role', 'button'); a.tabIndex = 0;
    a.addEventListener('click', function(e){ e.preventDefault(); openLB(a.dataset.s); });
    a.addEventListener('keydown', function(e){ if (e.key === 'Enter') openLB(a.dataset.s); }); });
  // inline slide figures: <figure class="sl" data-s="48">caption</figure>
  document.querySelectorAll('figure.sl[data-s]').forEach(function(f){ var u = slideUrl(f.dataset.s), cap = f.innerHTML;
    f.innerHTML = '<img loading="lazy" src="' + u.url + '" alt="课件第' + u.s + '页"><figcaption>课件 S' + u.s + (cap ? '：' + cap : '') + '</figcaption>';
    f.querySelector('img').addEventListener('click', function(){ openLB(f.dataset.s); }); });
  // full gallery
  document.querySelectorAll('details.gallery').forEach(function(d){
    d.addEventListener('toggle', function(){ if (!d.open || d.__done) return; d.__done = true; var c = here, h = '';
      for (var i = 1; i <= c.slides; i++) h += '<div><img loading="lazy" src="img/ch' + c.n + '/s' + i + '.jpg" data-s="' + i + '" alt="S' + i + '"><span>S' + i + '</span></div>';
      var box = document.createElement('div'); box.className = 'gal'; box.innerHTML = h; d.appendChild(box);
      box.addEventListener('click', function(e){ if (e.target.dataset.s) openLB(e.target.dataset.s); }); }); });

  // reveal steps
  document.querySelectorAll('.reveal').forEach(function(r){
    var steps = r.querySelectorAll('.rs'), k = 0;
    steps.forEach(function(s, i){ s.hidden = true; var sn = document.createElement('span'); sn.className = 'sn'; sn.textContent = '第' + (i + 1) + '步'; s.insertBefore(sn, s.firstChild); });
    var c = document.createElement('div'); c.className = 'rctl';
    c.innerHTML = '<button type="button" class="nx">先自己想，再看第 1 步</button><button type="button" class="al">显示全部</button><button type="button" class="rz">收起</button>';
    r.appendChild(c);
    function upd(){ steps.forEach(function(s, i){ s.hidden = i >= k; });
      var nx = c.querySelector('.nx'); nx.disabled = k >= steps.length; nx.textContent = k >= steps.length ? '已全部显示' : (k === 0 ? '先自己想，再看第 1 步' : '下一步（第 ' + (k + 1) + ' / ' + steps.length + ' 步）');
      setTimeout(function(){ fitSvgs(r); }, 0); }
    c.querySelector('.nx').onclick = function(){ k = Math.min(steps.length, k + 1); upd(); };
    c.querySelector('.al').onclick = function(){ k = steps.length; upd(); };
    c.querySelector('.rz').onclick = function(){ k = 0; upd(); };
    upd();
  });
  // tabs
  document.querySelectorAll('.tabs').forEach(function(t){
    var btns = t.querySelectorAll(':scope > .tabbar > button'), pans = t.querySelectorAll(':scope > .tab');
    function show(i){ btns.forEach(function(b, j){ b.classList.toggle('on', i === j); }); pans.forEach(function(p, j){ p.hidden = i !== j; }); if (t.__on) t.__on(i); }
    btns.forEach(function(b, i){ b.type = 'button'; b.onclick = function(){ show(i); }; });
    show(0);
  });
  // quiz
  document.querySelectorAll('.q[data-a]').forEach(function(q){
    var a = +q.dataset.a, ex = q.querySelector('.qex'), bs = q.querySelectorAll('.opts button');
    var hint = document.createElement('div'); hint.className = 'qhint'; hint.hidden = true; q.appendChild(hint);
    if (ex) ex.hidden = true;
    bs.forEach(function(b, i){ b.type = 'button'; b.onclick = function(){ bs.forEach(function(x){ x.classList.remove('right', 'wrong'); });
      if (i === a){ b.classList.add('right'); if (ex) ex.hidden = false; hint.hidden = true; }
      else { b.classList.add('wrong'); hint.hidden = false; hint.textContent = '✗ 不对，再想想。' + (q.dataset.hint || '回到上面对应的图看看。'); if (ex) ex.hidden = true; } }; });
  });
  // KaTeX
  if (window.renderMathInElement){
    renderMathInElement(document.body, {delimiters:[{left:'\\[', right:'\\]', display:true}, {left:'\\(', right:'\\)', display:false}], throwOnError:false, strict:false,
      ignoredTags:['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option', 'svg']});
  }
  // subscripts in text written by scripts (readouts, buttons): U_BE -> U<sub>BE</sub>
  fixSubs(document.body);
  new MutationObserver(function(ms){ ms.forEach(function(m){ var el = m.target.nodeType === 3 ? m.target.parentNode : m.target; if (el) fixSubs(el); }); })
    .observe(document.body, {childList:true, subtree:true, characterData:true});
  // phones: figures always fit the screen width; tap one to see it large (scrollable)
  document.querySelectorAll('.fig').forEach(function(f){
    var svgs = f.querySelectorAll(':scope > svg'); if (!svgs.length) return;
    var h = document.createElement('div'); h.className = 'zoomhint'; h.textContent = '点图放大查看'; svgs[svgs.length - 1].after(h);
    svgs.forEach(function(sv){ sv.addEventListener('click', function(e){
      if (!matchMedia('(max-width:700px)').matches) return;
      var z = document.createElement('div'); z.className = 'figzoom';
      z.innerHTML = '<div class="fzbar"><span>左右滑动查看全图</span><button type="button">关闭</button></div>';
      var c = sv.cloneNode(true); c.removeAttribute('id'); c.style.cursor = 'zoom-out'; z.appendChild(c);
      document.body.appendChild(z); document.body.style.overflow = 'hidden';
      function close(){ z.remove(); document.body.style.overflow = ''; }
      z.querySelector('button').onclick = close; c.onclick = close; }); });
  });
  // grow each figure's viewBox so no label is cut off at the edge
  fitSvgs(document);
  // a derivation tagged data-fig/data-draw relabels the main figure with numbers while it is open
  document.querySelectorAll('details[data-fig][data-draw]').forEach(function(d){
    var svg = document.getElementById(d.dataset.fig), f = NUMFIG[d.dataset.draw], saved = null;
    if (!svg || !f) return;
    d.addEventListener('toggle', function(){
      if (d.open){
        if (!saved) saved = {html:svg.innerHTML, vb:svg.getAttribute('viewBox'), mk:svg.__mk};
        svg.innerHTML = ''; svg.__mk = null; svg.setAttribute('viewBox', d.dataset.vb); f(svg.id); svg.classList.add('numon');
      } else if (saved){
        svg.innerHTML = saved.html; svg.__mk = saved.mk; svg.setAttribute('viewBox', saved.vb); svg.classList.remove('numon');
      }
      setTimeout(function(){ fitSvgs(document); }, 0);
    });
  });
  document.querySelectorAll('.tabs > .tabbar > button, details').forEach(function(b){ b.addEventListener(b.tagName === 'DETAILS' ? 'toggle' : 'click', function(){ setTimeout(function(){ fitSvgs(document); }, 0); }); });
  // very wide screens (or a page zoomed far out): each numbered section (h2) becomes a card and the
  // cards are laid out in 2-3 columns, every next card going into the currently shortest column
  document.body.dataset.cols = '1';
  if (art && chNum > 0) masonry(art);
  if (location.hash){ var t0 = document.getElementById(location.hash.slice(1)); if (t0) setTimeout(function(){ t0.scrollIntoView(); }, 50); }
}

function masonry(art){
  var h2s = Array.prototype.slice.call(art.querySelectorAll(':scope > h2'));
  if (h2s.length < 3) return;
  var box = document.createElement('div'); box.className = 'mason'; h2s[0].before(box);
  var secs = h2s.map(function(h){
    var sec = document.createElement('section'); sec.className = 'sec'; box.appendChild(sec);
    var n = h;
    while (n){ var nx = n.nextSibling; sec.appendChild(n); n = nx;
      if (n && n.nodeType === 1 && (n.tagName === 'H2' || n.classList.contains('page-nav'))) break; }
    return sec;
  });
  var cur = 0, KEY = 'analog-cols', locked = null, manual = 0;
  try { locked = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e){}
  /* recommended: one column until the page is really wide; phones always one */
  function rec(){ var w = window.innerWidth; return w >= 3600 ? 3 : (w >= 2400 ? 2 : 1); }
  function want(){ if (window.innerWidth < 900) return 1; return locked ? locked : (manual || rec()); }
  var ui = document.getElementById('sbCols'), LOCK = '<svg viewBox="0 0 16 16" width="14" height="14"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0' + '%' + '" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  function sync(){
    if (!ui) return; ui.hidden = false;
    ui.querySelectorAll('[data-c]').forEach(function(b){ b.classList.toggle('on', +b.dataset.c === cur); });
    var lk = ui.querySelector('.lock'); lk.classList.toggle('on', !!locked); lk.setAttribute('aria-pressed', locked ? 'true' : 'false');
    lk.innerHTML = LOCK.replace('%', locked ? 'v2' : 'v0'); lk.title = locked ? '已锁定为 ' + locked + ' 栏，点击解锁' : '锁定栏数（缩放时也保持）';
  }
  function save(){ try { if (locked) localStorage.setItem(KEY, JSON.stringify(locked)); else localStorage.removeItem(KEY); } catch(e){} }
  if (ui){
    ui.querySelectorAll('[data-c]').forEach(function(b){ b.addEventListener('click', function(){
      var n = +b.dataset.c; if (locked){ locked = n; save(); } else manual = n; lay(); }); });
    ui.querySelector('.lock').addEventListener('click', function(){
      if (locked){ manual = locked; locked = null; } else { locked = cur; manual = 0; } save(); sync(); });
  }
  function lay(){
    var n = want(); document.body.dataset.cols = String(n); if (n === cur){ sync(); return; } cur = n;
    box.innerHTML = ''; box.className = 'mason' + (n > 1 ? ' on' : '');
    if (n === 1){ secs.forEach(function(sec){ box.appendChild(sec); }); }
    else {
      var cols = []; for (var i = 0; i < n; i++){ var c = document.createElement('div'); c.className = 'mcol'; box.appendChild(c); cols.push(c); }
      secs.forEach(function(sec){ var c = cols.reduce(function(a, b){ return b.offsetHeight < a.offsetHeight ? b : a; }); c.appendChild(sec); });
    }
    fitSvgs(document); sync();
  }
  lay();
  /* zooming / resizing drops a choice that was not locked and goes back to the recommended count */
  var tm, lastW = window.innerWidth;
  window.addEventListener('resize', function(){ clearTimeout(tm); tm = setTimeout(function(){
    if (window.innerWidth === lastW) return; lastW = window.innerWidth; manual = 0; lay(); }, 150); });
}


/* ===== text subscripts written at runtime ===== */
var SUB_RE = /([A-Za-z0-9)α-ωΑ-Ω'])(?:_\{([^}]*)\}|_([A-Za-z0-9']+)|\^\{([^}]*)\})/;
var SUB_SKIP = 'svg,script,style,.katex,textarea,option,sub,sup';
function fixSubs(root){
  if (!root || root.nodeType !== 1 || root.closest(SUB_SKIP)) return;
  var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, todo = [];
  while ((n = w.nextNode())){ var p = n.parentNode; if (p && p.closest && p.closest(SUB_SKIP)) continue; if (SUB_RE.test(n.nodeValue)) todo.push(n); }
  todo.forEach(function(n){
    var f = document.createDocumentFragment(), s = n.nodeValue, m;
    while ((m = SUB_RE.exec(s))){
      f.appendChild(document.createTextNode(s.slice(0, m.index + 1)));
      var sub = m[2] !== undefined ? m[2] : m[3], e = document.createElement(sub !== undefined ? 'sub' : 'sup');
      e.textContent = sub !== undefined ? sub : m[4]; f.appendChild(e);
      s = s.slice(m.index + m[0].length);
    }
    f.appendChild(document.createTextNode(s));
    n.parentNode.replaceChild(f, n);
  });
}
/* ===== make the viewBox big enough for everything drawn ===== */
function fitSvgs(root){
  root.querySelectorAll('article svg[viewBox]').forEach(function(svg){
    if (svg.closest('.katex')) return;
    /* --vw = drawing width: CSS caps the on-screen scale so small and wide figures read at a similar size */
    svg.classList.add('sz'); svg.style.setProperty('--vw', svg.viewBox.baseVal.width); svg.style.setProperty('--vh', svg.viewBox.baseVal.height);
    if (!svg.getBoundingClientRect().width) return;
    var vb = svg.viewBox.baseVal, b; try { b = svg.getBBox(); } catch(e){ return; }
    if (!b.width) return;
    var x0 = Math.min(vb.x, b.x - 4), y0 = Math.min(vb.y, b.y - 4), x1 = Math.max(vb.x + vb.width, b.x + b.width + 4), y1 = Math.max(vb.y + vb.height, b.y + b.height + 4);
    if (x0 < vb.x || y0 < vb.y || x1 > vb.x + vb.width || y1 > vb.y + vb.height) svg.setAttribute('viewBox', [x0, y0, x1 - x0, y1 - y0].map(function(v){ return +v.toFixed(1); }).join(' '))
    svg.style.setProperty('--vw', svg.viewBox.baseVal.width); svg.style.setProperty('--vh', svg.viewBox.baseVal.height);
  });
}

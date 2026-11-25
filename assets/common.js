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
function mk(tag, attrs, parent){
  var e = document.createElementNS(SVGNS, tag);
  for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
/* text with simple sub/superscripts: "V_{CC}", "R_b", "x^{2}" */
function rtext(parent, x, y, str, cls, anchor){
  var t = mk('text', {x:x, y:y, class:cls||'t', 'text-anchor':anchor||'start'}, parent);
  var re = /_\{([^}]*)\}|_([A-Za-z0-9'])|\^\{([^}]*)\}|\^([A-Za-z0-9])|([^_^]+)/g, m, off = 0;
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
    var m = mk('marker', {id: id + '-' + c, viewBox:'0 0 10 10', refX:8.5, refY:5, markerWidth:7, markerHeight:7, orient:'auto-start-reverse'}, defs);
    mk('path', {d:'M0,0 L10,5 L0,10 z', class:'mk-' + c}, m);
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
  _two: function(x1, y1, x2, y2, L, body, o){
    var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    this.line(x1, y1, mx - ux * L / 2, my - uy * L / 2);
    this.line(mx + ux * L / 2, my + uy * L / 2, x2, y2);
    var g = mk('g', {transform:'translate(' + mx + ',' + my + ') rotate(' + (Math.atan2(dy, dx) * 180 / Math.PI) + ')'}, this.g);
    body(g);
    o = o || {};
    var vert = Math.abs(uy) > 0.5, side = o.side || (vert ? 'r' : 't'), off = o.off || 0;
    var lab = o.lab, val = o.val;
    if (vert){
      var xx = side === 'r' ? mx + 14 + off : mx - 14 - off, an = side === 'r' ? 'start' : 'end';
      if (lab && val){ rtext(this.g, xx, my - 3, lab, 't', an); rtext(this.g, xx, my + 15, val, 'tval', an); }
      else if (lab) rtext(this.g, xx, my + 5, lab, 't', an);
      else if (val) rtext(this.g, xx, my + 5, val, 'tval', an);
    } else {
      var yy = side === 't' ? my - 14 - off : my + 24 + off;
      var txt = [lab, val].filter(Boolean);
      if (lab) rtext(this.g, mx - (val ? 4 : 0), yy, lab, 't', val ? 'end' : 'middle');
      if (val) rtext(this.g, mx + (lab ? 4 : 0), yy, val, 'tval', lab ? 'start' : 'middle');
    }
    return {mx:mx, my:my, ux:ux, uy:uy};
  },
  R: function(x1, y1, x2, y2, o){ return this._two(x1, y1, x2, y2, 34, function(g){ mk('rect', {x:-17, y:-7, width:34, height:14, class:'body'}, g); }, o); },
  C: function(x1, y1, x2, y2, o){ return this._two(x1, y1, x2, y2, 9, function(g){ mk('line', {x1:-4.5, y1:-12, x2:-4.5, y2:12, class:'w2'}, g); mk('line', {x1:4.5, y1:-12, x2:4.5, y2:12, class:'w2'}, g); }, o); },
  /* battery: first point is the + terminal (long plate) */
  bat: function(x1, y1, x2, y2, o){
    var r = this._two(x1, y1, x2, y2, 10, function(g){ mk('line', {x1:-5, y1:-14, x2:-5, y2:14, class:'w'}, g); mk('line', {x1:5, y1:-7, x2:5, y2:7, class:'w2'}, g); }, o);
    if (!(o && o.nopm)){ var px = -r.uy, py = r.ux, s = (o && o.pmSide === 'l') ? -1 : 1;
      this.pm(r.mx - r.ux * 15 + px * 14 * s, r.my - r.uy * 15 + py * 14 * s, '+');
      this.pm(r.mx + r.ux * 15 + px * 14 * s, r.my + r.uy * 15 + py * 14 * s, '-'); }
    return r;
  },
  /* AC / signal source: first point is + */
  vs: function(x1, y1, x2, y2, o){
    var r = this._two(x1, y1, x2, y2, 30, function(g){ mk('circle', {cx:0, cy:0, r:15, class:'body'}, g); mk('path', {d:'M-8,0 C-5,-9 -1,-9 0,0 S5,9 8,0', class:'w', transform:'rotate(-90)'}, g); }, o);
    var px = -r.uy, py = r.ux;
    this.pm(r.mx - r.ux * 22 + px * 12, r.my - r.uy * 22 + py * 12, '+');
    this.pm(r.mx + r.ux * 22 + px * 12, r.my + r.uy * 22 + py * 12, '-');
    return r;
  },
  /* DC source drawn as circle with +/- (first point +) */
  vdc: function(x1, y1, x2, y2, o){
    return this._two(x1, y1, x2, y2, 30, function(g){ mk('circle', {cx:0, cy:0, r:15, class:'body'}, g);
      var a = mk('text', {x:-8, y:5, class:'pm', 'text-anchor':'middle', transform:'rotate(90 -8 0)'}, g); a.textContent = '+';
      var b = mk('text', {x:8, y:5, class:'pm', 'text-anchor':'middle', transform:'rotate(90 8 0)'}, g); b.textContent = '−'; }, o);
  },
  /* dependent current source: diamond, arrow from first point toward second */
  ccs: function(x1, y1, x2, y2, o){
    return this._two(x1, y1, x2, y2, 30, function(g){ mk('path', {d:'M-15,0 L0,-13 L15,0 L0,13 Z', class:'body'}, g); mk('line', {x1:-8, y1:0, x2:8, y2:0, class:'w', 'marker-end':''}, g); mk('path', {d:'M8,0 L2,-4 L2,4 Z', class:'solid'}, g); }, o);
  },
  /* dependent voltage source: diamond with + toward first point */
  ccvs: function(x1, y1, x2, y2, o){
    return this._two(x1, y1, x2, y2, 30, function(g){ mk('path', {d:'M-15,0 L0,-13 L15,0 L0,13 Z', class:'body'}, g);
      var a = mk('text', {x:-6, y:5, class:'pm', 'text-anchor':'middle', transform:'rotate(90 -6 0)'}, g); a.textContent = '+';
      var b = mk('text', {x:7, y:5, class:'pm', 'text-anchor':'middle', transform:'rotate(90 7 0)'}, g); b.textContent = '−'; }, o);
  },
  isrc: function(x1, y1, x2, y2, o){
    return this._two(x1, y1, x2, y2, 30, function(g){ mk('circle', {cx:0, cy:0, r:15, class:'body'}, g); mk('line', {x1:-8, y1:0, x2:5, y2:0, class:'w'}, g); mk('path', {d:'M9,0 L2,-4.5 L2,4.5 Z', class:'solid'}, g); }, o);
  },
  /* diode: first point = anode */
  D: function(x1, y1, x2, y2, o){
    return this._two(x1, y1, x2, y2, 22, function(g){ mk('path', {d:'M-10,-10 L-10,10 L8,0 Z', class:(o && o.open) ? 'body' : 'solid'}, g); mk('line', {x1:9, y1:-11, x2:9, y2:11, class:'w2'}, g); }, o);
  },
  Z: function(x1, y1, x2, y2, o){
    return this._two(x1, y1, x2, y2, 22, function(g){ mk('path', {d:'M-10,-10 L-10,10 L8,0 Z', class:'solid'}, g); mk('polyline', {points:'4,-14 9,-11 9,11 14,14', class:'w2'}, g); }, o);
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
      rtext(g, self.X(v), ax + 16, o.xf ? o.xf(v) : String(v), 'ts', 'middle'); });
    (o.yt || []).forEach(function(v){ if (o.grid !== false) mk('line', {x1:b.x, y1:self.Y(v), x2:b.x + b.w, y2:self.Y(v), class:'grid'}, g);
      rtext(g, ay - 6, self.Y(v) + 4, o.yf ? o.yf(v) : String(v), 'ts', 'end'); });
    mk('line', {x1:b.x - 4, y1:ax, x2:b.x + b.w + 10, y2:ax, class:'axis', 'marker-end':this.mk.ink}, g);
    mk('line', {x1:ay, y1:b.y + b.h + 4, x2:ay, y2:b.y - 10, class:'axis', 'marker-end':this.mk.ink}, g);
    if (o.xl) rtext(g, b.x + b.w + 12, ax - 8, o.xl, 't', 'end');
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
  var here = CHAPTERS.filter(function(c){ return c.n === chNum; })[0];
  // top bar
  var bar = document.createElement('div'); bar.className = 'topbar';
  var sel = '<select id="chsel" aria-label="跳转章节"><option value="index.html">目录</option>' +
    CHAPTERS.map(function(c){ return '<option value="' + c.file + '"' + (c.n === chNum ? ' selected' : '') + '>第' + c.n + '章 ' + c.title + '</option>'; }).join('') + '</select>';
  var idx = CHAPTERS.indexOf(here), prev = idx > 0 ? CHAPTERS[idx - 1] : null, next = here && idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;
  bar.innerHTML = '<a class="home" href="index.html">模电讲义</a>' + sel +
    '<div class="pn">' + (prev ? '<a href="' + prev.file + '">← 第' + prev.n + '章</a>' : '') + (next ? '<a href="' + next.file + '">第' + next.n + '章 →</a>' : '') +
    '<a href="#" id="themeBtn" class="theme">明/暗</a></div>';
  document.body.insertBefore(bar, document.body.firstChild);
  document.getElementById('chsel').addEventListener('change', function(e){ location.href = e.target.value; });
  try { var th = localStorage.getItem('analog-theme'); if (th) document.documentElement.setAttribute('data-theme', th); } catch(e){}
  document.getElementById('themeBtn').addEventListener('click', function(e){ e.preventDefault();
    var cur = document.documentElement.getAttribute('data-theme');
    var dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    var nt = dark ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', nt);
    try { localStorage.setItem('analog-theme', nt); } catch(e){} });

  // toc
  var toc = document.querySelector('.toc');
  if (toc){
    var hs = document.querySelectorAll('article h2[id]');
    toc.innerHTML = '<b>本章目录</b>' + Array.prototype.map.call(hs, function(h){ return '<a href="#' + h.id + '">' + h.textContent + '</a>'; }).join('');
    var links = toc.querySelectorAll('a');
    var io = new IntersectionObserver(function(ents){ ents.forEach(function(en){ if (en.isIntersecting){
      links.forEach(function(a){ a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id); }); } }); }, {rootMargin:'-10% 0px -80% 0px'});
    hs.forEach(function(h){ io.observe(h); });
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
      var nx = c.querySelector('.nx'); nx.disabled = k >= steps.length; nx.textContent = k >= steps.length ? '已全部显示' : (k === 0 ? '先自己想，再看第 1 步' : '下一步（第 ' + (k + 1) + ' / ' + steps.length + ' 步）'); }
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
  if (location.hash){ var t0 = document.getElementById(location.hash.slice(1)); if (t0) setTimeout(function(){ t0.scrollIntoView(); }, 50); }
}

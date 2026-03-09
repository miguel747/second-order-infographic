/**
 * src/infra/svgUtils.js
 * Utilitários para criação e manipulação de elementos SVG nativos.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Cria um elemento SVG com atributos opcionais. */
export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  setAttrs(el, attrs);
  return el;
}

/** Define múltiplos atributos em um elemento. */
export function setAttrs(el, attrs) {
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

/** Cria um elemento SVG <text> com posição e conteúdo. */
export function svgText(x, y, content, attrs = {}) {
  const el = svgEl('text', { x, y, ...attrs });
  el.textContent = content;
  return el;
}

/** Cria uma linha SVG. */
export function svgLine(x1, y1, x2, y2, attrs = {}) {
  return svgEl('line', { x1, y1, x2, y2, ...attrs });
}

/** Cria um círculo SVG. */
export function svgCircle(cx, cy, r, attrs = {}) {
  return svgEl('circle', { cx, cy, r, ...attrs });
}

/** Cria um path SVG a partir de um array de pontos [[x,y], ...]. */
export function svgPolyline(points, attrs = {}) {
  const d = points.map(([x, y]) => `${x},${y}`).join(' ');
  return svgEl('polyline', { points: d, fill: 'none', ...attrs });
}

/** Cria um path SVG a partir de uma string de comandos. */
export function svgPath(d, attrs = {}) {
  return svgEl('path', { d, fill: 'none', ...attrs });
}

/**
 * Constrói o atributo `d` de um path a partir de arrays t[] e y[]
 * mapeados para coordenadas de tela.
 */
export function buildPathD(tArr, yArr, mapX, mapY) {
  if (tArr.length === 0) return '';
  let d = `M ${mapX(tArr[0])} ${mapY(yArr[0])}`;
  for (let i = 1; i < tArr.length; i++) {
    d += ` L ${mapX(tArr[i])} ${mapY(yArr[i])}`;
  }
  return d;
}

/** Cria um elemento <g> com classe CSS opcional. */
export function svgGroup(cls = '', attrs = {}) {
  const g = svgEl('g', attrs);
  if (cls) g.setAttribute('class', cls);
  return g;
}

/** Remove todos os filhos de um elemento. */
export function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Formata um número para exibição em eixos. */
export function fmtAxis(v) {
  if (Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0)) {
    return v.toExponential(1);
  }
  return parseFloat(v.toFixed(2)).toString();
}

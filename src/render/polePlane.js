/**
 * src/render/polePlane.js
 * Renderiza o plano complexo (plano-s) com os polos de malha fechada em SVG nativo.
 *
 * Elementos desenhados:
 *   - Eixos Re e Im com setas
 *   - Grade leve
 *   - Semicírculo de raio ωn (linha tracejada)
 *   - Linha de ζ constante (ângulo de amortecimento)
 *   - Marcadores × para os polos
 *   - Rótulos dos polos
 */

import { svgEl, svgLine, svgCircle, svgText, svgGroup, svgPath, clearChildren, fmtAxis, setAttrs } from '../infra/svgUtils.js';
import { classificationColor } from '../core/classify.js';

const PAD = { top: 24, right: 24, bottom: 32, left: 44 };

/**
 * Renderiza o plano de polos dentro de `container`.
 * @param {HTMLElement} container
 * @param {Object}      model     Modelo interno
 * @param {Object}      opts      { width, height }
 */
export function renderPolePlane(container, model, opts = {}) {
  clearChildren(container);

  const W = opts.width  ?? container.clientWidth  ?? 320;
  const H = opts.height ?? container.clientHeight ?? 280;

  const svg = svgEl('svg', {
    width: '100%',
    height: '100%',
    viewBox: `0 0 ${W} ${H}`,
    class: 's2i__pole-svg',
    'aria-label': 'Plano de polos',
  });

  const { poles, wn, zeta, classification } = model;
  const color = classificationColor(classification.key);

  // ── Domínio ────────────────────────────────────────────────────────────────
  // Garante que todos os polos e o círculo ωn caibam com margem
  const margin = wn > 0 ? wn * 1.5 : 2;
  const allRe = poles.map(p => p.re);
  const allIm = poles.map(p => p.im);
  const reMin = Math.min(...allRe, -margin);
  const reMax = Math.max(...allRe,  margin * 0.4);
  const imMax = Math.max(...allIm.map(Math.abs), margin);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top  - PAD.bottom;

  // Mapeia coordenadas do plano-s para pixels
  const mapX = re => PAD.left + ((re - reMin) / (reMax - reMin)) * plotW;
  const mapY = im => PAD.top  + ((imMax - im) / (2 * imMax)) * plotH;

  const ox = mapX(0); // origem x (eixo Im)
  const oy = mapY(0); // origem y (eixo Re)

  // ── Grupo principal ────────────────────────────────────────────────────────
  const g = svgGroup('s2i__pole-plane');
  svg.appendChild(g);

  // Grade
  drawGrid(g, { reMin, reMax, imMax, mapX, mapY, plotW, plotH, PAD, W, H });

  // Semicírculo ωn
  if (wn > 0) {
    drawWnCircle(g, { wn, mapX, mapY, color });
  }

  // Linha de ζ (ângulo de amortecimento)
  if (zeta > 0 && zeta < 1) {
    drawZetaLine(g, { zeta, wn, mapX, mapY, ox, oy, color });
  }

  // Eixos
  drawAxes(g, { ox, oy, W, H, PAD, plotW, plotH });

  // Polos
  drawPoles(g, { poles, mapX, mapY, color, classification });

  container.appendChild(svg);
}

// ─── Sub-rotinas de desenho ────────────────────────────────────────────────────

function drawGrid(g, { reMin, reMax, imMax, mapX, mapY, plotW, plotH, PAD, W, H }) {
  const gridG = svgGroup('s2i__grid');

  // Número de linhas de grade
  const nRe = 5;
  const nIm = 5;

  for (let i = 0; i <= nRe; i++) {
    const re = reMin + (i / nRe) * (reMax - reMin);
    const x = mapX(re);
    const line = svgLine(x, PAD.top, x, H - PAD.bottom, {
      class: 's2i__grid-line',
      stroke: 'var(--s2i-grid, #e2e8f0)',
      'stroke-width': '1',
    });
    gridG.appendChild(line);

    // Rótulo eixo Re
    if (Math.abs(re) > 0.01) {
      const lbl = svgText(x, H - PAD.bottom + 14, fmtAxis(re), {
        class: 's2i__axis-label',
        'text-anchor': 'middle',
        'font-size': '9',
        fill: 'var(--s2i-axis-text, #64748b)',
      });
      gridG.appendChild(lbl);
    }
  }

  for (let i = 0; i <= nIm; i++) {
    const im = -imMax + (i / nIm) * 2 * imMax;
    const y = mapY(im);
    const line = svgLine(PAD.left, y, W - PAD.right, y, {
      class: 's2i__grid-line',
      stroke: 'var(--s2i-grid, #e2e8f0)',
      'stroke-width': '1',
    });
    gridG.appendChild(line);

    if (Math.abs(im) > 0.01) {
      const lbl = svgText(PAD.left - 4, y + 3, fmtAxis(im), {
        class: 's2i__axis-label',
        'text-anchor': 'end',
        'font-size': '9',
        fill: 'var(--s2i-axis-text, #64748b)',
      });
      gridG.appendChild(lbl);
    }
  }

  g.appendChild(gridG);
}

function drawAxes(g, { ox, oy, W, H, PAD, plotW, plotH }) {
  const axG = svgGroup('s2i__axes');
  const stroke = 'var(--s2i-axis, #334155)';
  const sw = '1.5';

  // Eixo Re (horizontal)
  axG.appendChild(svgLine(PAD.left, oy, W - PAD.right + 8, oy, { stroke, 'stroke-width': sw }));
  // Seta →
  axG.appendChild(svgPath(`M ${W - PAD.right + 8} ${oy} l -6 -4 l 0 8 z`, { fill: stroke, stroke: 'none' }));
  axG.appendChild(svgText(W - PAD.right + 12, oy + 4, 'σ', {
    'font-size': '11', fill: stroke, 'font-style': 'italic',
  }));

  // Eixo Im (vertical)
  axG.appendChild(svgLine(ox, H - PAD.bottom, ox, PAD.top - 8, { stroke, 'stroke-width': sw }));
  // Seta ↑
  axG.appendChild(svgPath(`M ${ox} ${PAD.top - 8} l -4 6 l 8 0 z`, { fill: stroke, stroke: 'none' }));
  axG.appendChild(svgText(ox + 6, PAD.top - 10, 'jω', {
    'font-size': '11', fill: stroke, 'font-style': 'italic',
  }));

  g.appendChild(axG);
}

function drawWnCircle(g, { wn, mapX, mapY, color }) {
  const cx = mapX(0);
  const cy = mapY(0);
  // Raio em pixels: distância de (0,0) a (0, wn)
  const r = Math.abs(mapY(wn) - cy);

  const circle = svgEl('circle', {
    cx, cy, r,
    fill: 'none',
    stroke: color,
    'stroke-width': '1',
    'stroke-dasharray': '4 3',
    opacity: '0.5',
    class: 's2i__wn-circle',
  });
  g.appendChild(circle);

  // Rótulo ωn
  const lbl = svgText(cx + r + 3, cy - 4, `ωₙ=${fmtAxis(wn)}`, {
    'font-size': '9',
    fill: color,
    opacity: '0.8',
  });
  g.appendChild(lbl);
}

function drawZetaLine(g, { zeta, wn, mapX, mapY, ox, oy, color }) {
  // Ângulo: cos(θ) = ζ  →  θ = acos(ζ)
  const theta = Math.acos(zeta);
  const r = wn * 1.3; // comprimento da linha

  // Linha para polo superior
  const x2 = mapX(-r * Math.cos(theta));
  const y2 = mapY( r * Math.sin(theta));
  const line = svgLine(ox, oy, x2, y2, {
    stroke: color,
    'stroke-width': '1',
    'stroke-dasharray': '3 3',
    opacity: '0.45',
    class: 's2i__zeta-line',
  });
  g.appendChild(line);

  // Linha para polo inferior
  const y2b = mapY(-r * Math.sin(theta));
  const lineb = svgLine(ox, oy, x2, y2b, {
    stroke: color,
    'stroke-width': '1',
    'stroke-dasharray': '3 3',
    opacity: '0.45',
    class: 's2i__zeta-line',
  });
  g.appendChild(lineb);
}

function drawPoles(g, { poles, mapX, mapY, color, classification }) {
  const polesG = svgGroup('s2i__poles');
  const seen = new Set();

  poles.forEach((pole, idx) => {
    const key = `${pole.re.toFixed(6)},${pole.im.toFixed(6)}`;
    const isDuplicate = seen.has(key);
    seen.add(key);

    const px = mapX(pole.re);
    const py = mapY(pole.im);
    const size = 7;

    // Marcador × (dois segmentos cruzados)
    const x1a = svgLine(px - size, py - size, px + size, py + size, {
      stroke: color, 'stroke-width': '2.5', 'stroke-linecap': 'round',
    });
    const x1b = svgLine(px + size, py - size, px - size, py + size, {
      stroke: color, 'stroke-width': '2.5', 'stroke-linecap': 'round',
    });
    polesG.appendChild(x1a);
    polesG.appendChild(x1b);

    // Rótulo do polo
    const reStr = fmtAxis(pole.re);
    const imStr = pole.im !== 0 ? ` ${pole.im >= 0 ? '+' : ''}j${fmtAxis(pole.im)}` : '';
    const lbl = svgText(px + 10, py - 6, `${reStr}${imStr}`, {
      'font-size': '9',
      fill: color,
      class: 's2i__pole-label',
    });
    polesG.appendChild(lbl);

    // Polo duplo: círculo adicional
    if (isDuplicate) {
      polesG.appendChild(svgEl('circle', {
        cx: px, cy: py, r: size + 4,
        fill: 'none',
        stroke: color,
        'stroke-width': '1.5',
        opacity: '0.6',
      }));
    }
  });

  g.appendChild(polesG);
}

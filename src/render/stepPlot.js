/**
 * src/render/stepPlot.js
 * Renderiza a resposta ao degrau em SVG nativo.
 *
 * Elementos:
 *   - Curva da resposta y(t)
 *   - Linha de regime (y = kdc)
 *   - Banda de acomodação (±settlingBand)
 *   - Anotação de overshoot
 *   - Anotação de rise time
 *   - Anotação de settling time
 *   - Eixos com rótulos
 */

import { svgEl, svgLine, svgText, svgGroup, svgPath, buildPathD, clearChildren, fmtAxis, setAttrs } from '../infra/svgUtils.js';
import { classificationColor } from '../core/classify.js';

const PAD = { top: 28, right: 28, bottom: 36, left: 48 };

/**
 * @param {HTMLElement} container
 * @param {Object}      model
 * @param {{ t, y }}    response
 * @param {Object}      metrics
 * @param {Object}      opts   { width, height, settlingBand }
 */
export function renderStepPlot(container, model, response, metrics, opts = {}) {
  clearChildren(container);

  const W = opts.width  ?? container.clientWidth  ?? 360;
  const H = opts.height ?? container.clientHeight ?? 260;

  const svg = svgEl('svg', {
    width: '100%',
    height: '100%',
    viewBox: `0 0 ${W} ${H}`,
    class: 's2i__step-svg',
    'aria-label': 'Resposta ao degrau',
  });

  const { t, y } = response;
  const { classification, kdc } = model;
  const color = classificationColor(classification.key);
  const settlingBand = opts.settlingBand ?? 0.02;

  if (t.length === 0) { container.appendChild(svg); return; }

  // ── Domínio ────────────────────────────────────────────────────────────────
  const tMin = 0;
  const tMax = t[t.length - 1];
  const yMin = Math.min(0, ...y) * 1.05;
  const yMax = Math.max(kdc * 1.05, ...y) * 1.05;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top  - PAD.bottom;

  const mapX = tv => PAD.left + ((tv - tMin) / (tMax - tMin)) * plotW;
  const mapY = yv => PAD.top  + ((yMax - yv) / (yMax - yMin)) * plotH;

  const g = svgGroup('s2i__step-plot');
  svg.appendChild(g);

  // Grade
  drawGrid(g, { tMin, tMax, yMin, yMax, mapX, mapY, PAD, W, H });

  // Banda de acomodação
  drawSettlingBand(g, { kdc, settlingBand, mapX, mapY, tMin, tMax });

  // Linha de regime
  g.appendChild(svgLine(mapX(tMin), mapY(kdc), mapX(tMax), mapY(kdc), {
    stroke: 'var(--s2i-steady-line, #94a3b8)',
    'stroke-width': '1',
    'stroke-dasharray': '5 3',
    class: 's2i__steady-line',
  }));

  // Curva principal
  const d = buildPathD(t, y, mapX, mapY);
  g.appendChild(svgPath(d, {
    stroke: color,
    'stroke-width': '2',
    fill: 'none',
    class: 's2i__step-curve',
    'stroke-linejoin': 'round',
  }));

  // Anotações de métricas
  drawMetricAnnotations(g, { metrics, mapX, mapY, color, kdc, settlingBand });

  // Eixos
  drawAxes(g, { PAD, W, H, mapX, mapY, tMin, tMax, yMin, yMax });

  container.appendChild(svg);
}

// ─── Sub-rotinas ──────────────────────────────────────────────────────────────

function drawGrid(g, { tMin, tMax, yMin, yMax, mapX, mapY, PAD, W, H }) {
  const gridG = svgGroup('s2i__grid');
  const nT = 5, nY = 5;

  for (let i = 0; i <= nT; i++) {
    const tv = tMin + (i / nT) * (tMax - tMin);
    const x = mapX(tv);
    gridG.appendChild(svgLine(x, PAD.top, x, H - PAD.bottom, {
      stroke: 'var(--s2i-grid, #e2e8f0)', 'stroke-width': '1',
    }));
    gridG.appendChild(svgText(x, H - PAD.bottom + 14, fmtAxis(tv), {
      'text-anchor': 'middle', 'font-size': '9',
      fill: 'var(--s2i-axis-text, #64748b)',
    }));
  }

  for (let i = 0; i <= nY; i++) {
    const yv = yMin + (i / nY) * (yMax - yMin);
    const y = mapY(yv);
    gridG.appendChild(svgLine(PAD.left, y, W - PAD.right, y, {
      stroke: 'var(--s2i-grid, #e2e8f0)', 'stroke-width': '1',
    }));
    gridG.appendChild(svgText(PAD.left - 4, y + 3, fmtAxis(yv), {
      'text-anchor': 'end', 'font-size': '9',
      fill: 'var(--s2i-axis-text, #64748b)',
    }));
  }

  g.appendChild(gridG);
}

function drawAxes(g, { PAD, W, H, mapX, mapY, tMin, tMax, yMin, yMax }) {
  const axG = svgGroup('s2i__axes');
  const stroke = 'var(--s2i-axis, #334155)';

  // Eixo t (horizontal)
  axG.appendChild(svgLine(PAD.left, H - PAD.bottom, W - PAD.right + 8, H - PAD.bottom, {
    stroke, 'stroke-width': '1.5',
  }));
  axG.appendChild(svgText(W - PAD.right + 12, H - PAD.bottom + 4, 't (s)', {
    'font-size': '10', fill: stroke,
  }));

  // Eixo y (vertical)
  axG.appendChild(svgLine(PAD.left, H - PAD.bottom, PAD.left, PAD.top - 8, {
    stroke, 'stroke-width': '1.5',
  }));
  axG.appendChild(svgText(PAD.left - 6, PAD.top - 12, 'y(t)', {
    'font-size': '10', fill: stroke, 'text-anchor': 'middle',
  }));

  g.appendChild(axG);
}

function drawSettlingBand(g, { kdc, settlingBand, mapX, mapY, tMin, tMax }) {
  const band = settlingBand * Math.abs(kdc);
  const yUp = kdc + band;
  const yDn = kdc - band;

  const x1 = mapX(tMin), x2 = mapX(tMax);
  const yU = mapY(yUp), yD = mapY(yDn);

  // Faixa preenchida
  const rect = svgEl('rect', {
    x: x1, y: yU,
    width: x2 - x1,
    height: Math.abs(yD - yU),
    fill: 'var(--s2i-band-fill, rgba(148,163,184,0.12))',
    class: 's2i__settling-band',
  });
  g.appendChild(rect);
}

function drawMetricAnnotations(g, { metrics, mapX, mapY, color, kdc, settlingBand }) {
  const annG = svgGroup('s2i__annotations');
  const dimColor = 'var(--s2i-annotation, #64748b)';

  // ── Overshoot ──────────────────────────────────────────────────────────────
  if (metrics.overshoot !== null && metrics.overshoot > 0.1 && metrics.peakTime !== null) {
    const px = mapX(metrics.peakTime);
    const pyPeak = mapY(kdc * (1 + metrics.overshoot / 100));
    const pySteady = mapY(kdc);

    // Seta vertical
    annG.appendChild(svgLine(px, pySteady, px, pyPeak, {
      stroke: color, 'stroke-width': '1', 'stroke-dasharray': '2 2',
    }));
    annG.appendChild(svgText(px + 4, (pyPeak + pySteady) / 2, `OS: ${metrics.overshoot.toFixed(1)}%`, {
      'font-size': '9', fill: color,
    }));
  }

  // ── Rise time ──────────────────────────────────────────────────────────────
  if (metrics.riseTime !== null && metrics.riseTime > 0) {
    const xRise = mapX(metrics.riseTime);
    const yMid = mapY(kdc * 0.5);
    annG.appendChild(svgLine(xRise, mapY(0), xRise, mapY(kdc), {
      stroke: dimColor, 'stroke-width': '1', 'stroke-dasharray': '3 2',
    }));
    annG.appendChild(svgText(xRise + 3, yMid - 6, `tr`, {
      'font-size': '9', fill: dimColor,
    }));
  }

  // ── Settling time ──────────────────────────────────────────────────────────
  if (metrics.settlingTime !== null && metrics.settlingTime > 0) {
    const xSettle = mapX(metrics.settlingTime);
    annG.appendChild(svgLine(xSettle, mapY(0), xSettle, mapY(kdc * 1.02), {
      stroke: dimColor, 'stroke-width': '1', 'stroke-dasharray': '3 2',
    }));
    annG.appendChild(svgText(xSettle + 3, mapY(kdc * 0.3), `ts`, {
      'font-size': '9', fill: dimColor,
    }));
  }

  g.appendChild(annG);
}

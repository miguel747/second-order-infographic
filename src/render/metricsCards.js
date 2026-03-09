/**
 * src/render/metricsCards.js
 * Renderiza os cards de métricas de desempenho do sistema.
 */

import { clearChildren } from '../infra/svgUtils.js';

const fmt = (v, d = 3) => {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  return parseFloat(v.toFixed(d)).toString();
};

/**
 * @param {HTMLElement} container
 * @param {Object}      model
 * @param {Object}      metrics
 * @param {Object}      opts    { settlingBand, riseTimeMode }
 */
export function renderMetricsCards(container, model, metrics, opts = {}) {
  clearChildren(container);

  const settlingBand = opts.settlingBand ?? 0.02;
  const riseTimeMode = opts.riseTimeMode ?? '10-90';
  const { classification } = model;

  const cards = [
    {
      id: 'overshoot',
      label: 'Sobressinal',
      sublabel: 'Overshoot',
      value: metrics.overshoot !== null ? `${fmt(metrics.overshoot, 2)} %` : '—',
      icon: '↑',
      highlight: metrics.overshoot > 20,
    },
    {
      id: 'rise-time',
      label: 'Tempo de Subida',
      sublabel: riseTimeMode === '10-90' ? '(10 % → 90 %)' : '(1ª passagem)',
      value: metrics.riseTime !== null ? `${fmt(metrics.riseTime)} s` : '—',
      icon: '⏱',
    },
    {
      id: 'settling-time',
      label: 'Tempo de Acomodação',
      sublabel: `(±${(settlingBand * 100).toFixed(0)} %)`,
      value: metrics.settlingTime !== null ? `${fmt(metrics.settlingTime)} s` : '—',
      icon: '⏲',
    },
    {
      id: 'peak-time',
      label: 'Tempo de Pico',
      sublabel: 'Peak Time',
      value: metrics.peakTime !== null ? `${fmt(metrics.peakTime)} s` : '—',
      icon: '⊙',
    },
    {
      id: 'steady-state',
      label: 'Valor de Regime',
      sublabel: 'Steady State',
      value: metrics.steadyState !== null ? fmt(metrics.steadyState) : '—',
      icon: '→',
    },
    {
      id: 'classification',
      label: 'Classificação',
      sublabel: classification.label,
      value: classification.labelPt,
      icon: '◈',
      cls: `s2i__card--${classification.key}`,
    },
  ];

  const grid = document.createElement('div');
  grid.className = 's2i__metrics-grid';

  cards.forEach(card => {
    const el = document.createElement('div');
    el.className = `s2i__card ${card.cls ?? ''}`;
    el.dataset.metric = card.id;
    el.innerHTML = `
      <span class="s2i__card-icon" aria-hidden="true">${card.icon}</span>
      <span class="s2i__card-label">${card.label}</span>
      <span class="s2i__card-sublabel">${card.sublabel}</span>
      <span class="s2i__card-value${card.highlight ? ' s2i__card-value--warn' : ''}">${card.value}</span>
    `;
    grid.appendChild(el);
  });

  container.appendChild(grid);
}

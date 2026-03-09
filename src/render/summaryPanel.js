/**
 * src/render/summaryPanel.js
 * Renderiza o painel de resumo textual automático.
 */

import { clearChildren } from '../infra/svgUtils.js';
import { buildSummary } from '../core/summary.js';

/**
 * @param {HTMLElement} container
 * @param {Object}      model
 * @param {Object}      metrics
 * @param {Object}      opts    { settlingBand }
 */
export function renderSummaryPanel(container, model, metrics, opts = {}) {
  clearChildren(container);

  // Injeta a banda de acomodação no modelo para o resumo
  const modelWithBand = { ...model, _settlingBand: opts.settlingBand ?? 0.02 };

  const html = buildSummary(modelWithBand, metrics);

  const wrapper = document.createElement('div');
  wrapper.className = 's2i__summary';
  wrapper.innerHTML = html;

  container.appendChild(wrapper);
}

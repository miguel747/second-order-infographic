/**
 * src/core/summary.js
 * Gera o resumo textual automático do sistema em português.
 */

const fmt = (v, d = 3) => {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  return parseFloat(v.toFixed(d)).toString();
};

/**
 * @param {Object} model    Modelo interno
 * @param {Object} metrics  Métricas extraídas
 * @returns {string}  HTML com o resumo
 */
export function buildSummary(model, metrics) {
  const { zeta, wn, wd, alpha, classification } = model;
  const { key, labelPt } = classification;

  const lines = [];

  // Classificação
  lines.push(
    `O sistema é <strong>${labelPt}</strong> ` +
    `(ζ = ${fmt(zeta)}, ω<sub>n</sub> = ${fmt(wn)} rad/s).`
  );

  // Descrição por regime
  if (key === 'underdamped') {
    lines.push(
      `Com fator de amortecimento ζ = ${fmt(zeta)} < 1, a resposta ao degrau apresenta ` +
      `oscilações amortecidas na frequência ω<sub>d</sub> = ${fmt(wd)} rad/s. ` +
      `A constante de tempo de decaimento é τ = 1/α = ${fmt(1 / alpha)} s.`
    );
    if (metrics.overshoot !== null && metrics.overshoot > 0.01) {
      lines.push(
        `O sobressinal (overshoot) é de <strong>${fmt(metrics.overshoot, 2)} %</strong>, ` +
        `atingido em t<sub>p</sub> = ${fmt(metrics.peakTime)} s.`
      );
    }
  } else if (key === 'critically_damped') {
    lines.push(
      `Com ζ = 1, o sistema é criticamente amortecido: resposta mais rápida ` +
      `sem oscilações. Polo duplo em s = −ω<sub>n</sub> = ${fmt(-wn)}.`
    );
  } else if (key === 'overdamped') {
    lines.push(
      `Com ζ = ${fmt(zeta)} > 1, o sistema é superamortecido: resposta lenta ` +
      `sem oscilações. Os dois polos reais distintos determinam a dinâmica dominante.`
    );
  } else if (key === 'marginal') {
    lines.push(
      `Com ζ = 0, o sistema é marginalmente estável: oscilação sustentada ` +
      `na frequência ω<sub>n</sub> = ${fmt(wn)} rad/s sem amortecimento.`
    );
  } else {
    lines.push(
      `O sistema possui polo(s) no semiplano direito — a resposta diverge com o tempo.`
    );
  }

  // Métricas de desempenho
  if (metrics.riseTime !== null) {
    lines.push(
      `Tempo de subida: <strong>${fmt(metrics.riseTime)} s</strong>. ` +
      `Tempo de acomodação (±${fmt((model._settlingBand ?? 0.02) * 100, 0)} %): ` +
      `<strong>${fmt(metrics.settlingTime)} s</strong>.`
    );
  }

  return lines.map(l => `<p class="s2i__summary-line">${l}</p>`).join('\n');
}

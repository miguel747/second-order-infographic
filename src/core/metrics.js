/**
 * src/core/metrics.js
 * Extrai numericamente as métricas de desempenho da resposta ao degrau.
 *
 * Métricas calculadas:
 *   - overshoot (%)
 *   - riseTime  (s)  — modo '10-90' ou 'first-crossing'
 *   - settlingTime (s)
 *   - peakTime  (s)
 *   - steadyState
 */

/**
 * @param {{ t: number[], y: number[] }} response
 * @param {Object} opts
 *   opts.riseTimeMode    'first-crossing' | '10-90'   (default: '10-90')
 *   opts.settlingBand    número em fração (default: 0.02 → 2 %)
 *   opts.kdc             ganho DC (default: 1)
 * @returns {Object}  métricas
 */
export function extractMetrics(response, opts = {}) {
  const { t, y } = response;
  const riseTimeMode = opts.riseTimeMode ?? '10-90';
  const settlingBand = opts.settlingBand ?? 0.02;
  const n = t.length;

  if (n < 2) return nullMetrics();

  // Valor de regime (último ponto estabilizado)
  const steadyState = y[n - 1];
  if (Math.abs(steadyState) < 1e-12) return nullMetrics();

  // ── Overshoot ────────────────────────────────────────────────────────────────
  const yMax = Math.max(...y);
  const overshoot = ((yMax - steadyState) / Math.abs(steadyState)) * 100;

  // ── Peak time ────────────────────────────────────────────────────────────────
  const peakIdx = y.indexOf(yMax);
  const peakTime = t[peakIdx];

  // ── Rise time ────────────────────────────────────────────────────────────────
  let riseTime = null;

  if (riseTimeMode === 'first-crossing') {
    // Primeiro instante em que y(t) ≥ steadyState
    const idx = y.findIndex(v => v >= steadyState);
    riseTime = idx >= 0 ? interpolateCrossing(t, y, idx, steadyState) : null;
  } else {
    // Modo '10-90': tempo entre y = 10 % e y = 90 % do valor final
    const y10 = 0.10 * steadyState;
    const y90 = 0.90 * steadyState;
    const idx10 = y.findIndex(v => v >= y10);
    const idx90 = y.findIndex(v => v >= y90);
    if (idx10 >= 0 && idx90 >= 0) {
      const t10 = interpolateCrossing(t, y, idx10, y10);
      const t90 = interpolateCrossing(t, y, idx90, y90);
      riseTime = t90 - t10;
    }
  }

  // ── Settling time ────────────────────────────────────────────────────────────
  // Último instante em que |y(t) - steadyState| > band * |steadyState|
  const band = settlingBand * Math.abs(steadyState);
  let settlingTime = t[n - 1]; // pessimista: nunca saiu da banda
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(y[i] - steadyState) > band) {
      // O sinal saiu da banda em i; o settling é logo depois
      settlingTime = i + 1 < n ? t[i + 1] : t[i];
      break;
    }
    if (i === 0) settlingTime = 0; // já começa na banda
  }

  return {
    overshoot:    roundTo(overshoot, 3),
    riseTime:     riseTime !== null ? roundTo(riseTime, 4) : null,
    settlingTime: roundTo(settlingTime, 4),
    peakTime:     roundTo(peakTime, 4),
    steadyState:  roundTo(steadyState, 4),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Interpolação linear para encontrar o instante exato de cruzamento. */
function interpolateCrossing(t, y, idx, threshold) {
  if (idx === 0) return t[0];
  const t0 = t[idx - 1], t1 = t[idx];
  const y0 = y[idx - 1], y1 = y[idx];
  if (Math.abs(y1 - y0) < 1e-15) return t0;
  return t0 + (threshold - y0) * (t1 - t0) / (y1 - y0);
}

function roundTo(v, decimals) {
  if (v === null || v === undefined || !isFinite(v)) return null;
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

function nullMetrics() {
  return {
    overshoot: null,
    riseTime: null,
    settlingTime: null,
    peakTime: null,
    steadyState: null,
  };
}

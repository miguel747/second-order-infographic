/**
 * src/core/stepResponse.js
 * Gera a resposta ao degrau unitário analítica para cada regime.
 * Retorna um array de pontos { t, y } amostrados uniformemente.
 */

const EPS = 1e-9;

/**
 * Calcula a resposta ao degrau y(t) para um dado modelo interno.
 * @param {Object} model  Modelo interno gerado por buildInternalModel()
 * @param {Object} opts   { nPoints, tMax }
 * @returns {{ t: number[], y: number[], tMax: number }}
 */
export function computeStepResponse(model, opts = {}) {
  const { zeta, wn, wd, alpha, kdc, classification } = model;
  const key = classification.key;

  // Determina tMax automaticamente se não fornecido
  const tMax = opts.tMax ?? autoTMax(model);
  const nPoints = opts.nPoints ?? 500;

  const t = Array.from({ length: nPoints }, (_, i) => (i / (nPoints - 1)) * tMax);
  const y = t.map(ti => stepValue(ti, { zeta, wn, wd, alpha, kdc, key }));

  return { t, y, tMax };
}

/**
 * Calcula y(t) para um instante t.
 */
function stepValue(t, { zeta, wn, wd, alpha, kdc, key }) {
  const K = kdc ?? 1;

  if (key === 'underdamped') {
    // y(t) = K * [1 - e^{-αt}(cos(ωd·t) + (α/ωd)·sin(ωd·t))]
    const env = Math.exp(-alpha * t);
    return K * (1 - env * (Math.cos(wd * t) + (alpha / wd) * Math.sin(wd * t)));
  }

  if (key === 'critically_damped') {
    // y(t) = K * [1 - e^{-ωn·t}(1 + ωn·t)]
    return K * (1 - Math.exp(-wn * t) * (1 + wn * t));
  }

  if (key === 'overdamped') {
    // Dois polos reais: s1 = -wn(ζ - √(ζ²-1)), s2 = -wn(ζ + √(ζ²-1))
    const delta = Math.sqrt(zeta * zeta - 1);
    const s1 = -wn * (zeta - delta);
    const s2 = -wn * (zeta + delta);
    // y(t) = K * [1 + (s2/(s1-s2))·e^{s1·t} - (s1/(s1-s2))·e^{s2·t}]
    const denom = s1 - s2;
    return K * (1 + (s2 / denom) * Math.exp(s1 * t) - (s1 / denom) * Math.exp(s2 * t));
  }

  if (key === 'marginal') {
    // y(t) = K * [1 - cos(ωn·t)]  (integrador duplo não tratado aqui)
    return K * (1 - Math.cos(wn * t));
  }

  // Instável: cresce exponencialmente — clampado para visualização
  const s1 = alpha > 0 ? alpha : 1;
  return K * (Math.exp(s1 * t) - 1);
}

/**
 * Estima tMax razoável para exibição.
 */
function autoTMax(model) {
  const { zeta, wn, classification } = model;
  const key = classification.key;

  if (wn < EPS) return 10;

  if (key === 'underdamped') {
    // ~8 constantes de tempo + margem para overshoot
    const tau = 1 / (zeta * wn);
    return Math.min(Math.max(8 * tau, 4 * Math.PI / model.wd), 200);
  }
  if (key === 'critically_damped') {
    return 8 / wn;
  }
  if (key === 'overdamped') {
    const delta = Math.sqrt(zeta * zeta - 1);
    const slowPole = wn * (zeta - delta);
    return 8 / slowPole;
  }
  if (key === 'marginal') {
    return (4 * Math.PI) / wn;
  }
  return 10;
}

/**
 * src/core/classify.js
 * Classifica o sistema de 2ª ordem com base em zeta e wn.
 */

const EPS = 1e-9;

/**
 * @typedef {'underdamped'|'critically_damped'|'overdamped'|'unstable'|'marginal'} Classification
 */

/**
 * Retorna a classificação do sistema.
 * @param {{ zeta: number, wn: number }} params
 * @returns {{ key: Classification, label: string, labelPt: string }}
 */
export function classifySystem({ zeta, wn }) {
  // Sistema instável: polo(s) no semiplano direito
  if (zeta < -EPS || wn < -EPS) {
    return {
      key: 'unstable',
      label: 'Unstable',
      labelPt: 'Instável',
    };
  }

  // Sistema marginal: polo(s) no eixo imaginário
  if (Math.abs(zeta) < EPS && wn > EPS) {
    return {
      key: 'marginal',
      label: 'Marginally Stable',
      labelPt: 'Marginalmente Estável',
    };
  }

  // Subamortecido: 0 < zeta < 1
  if (zeta > EPS && zeta < 1 - EPS) {
    return {
      key: 'underdamped',
      label: 'Underdamped',
      labelPt: 'Subamortecido',
    };
  }

  // Criticamente amortecido: zeta ≈ 1
  if (Math.abs(zeta - 1) < EPS) {
    return {
      key: 'critically_damped',
      label: 'Critically Damped',
      labelPt: 'Criticamente Amortecido',
    };
  }

  // Superamortecido: zeta > 1
  if (zeta > 1 + EPS) {
    return {
      key: 'overdamped',
      label: 'Overdamped',
      labelPt: 'Superamortecido',
    };
  }

  // Fallback
  return {
    key: 'unstable',
    label: 'Unstable / Marginal',
    labelPt: 'Instável / Marginal',
  };
}

/**
 * Retorna a cor associada à classificação para uso nos SVGs.
 * @param {Classification} key
 * @returns {string}  Valor CSS
 */
export function classificationColor(key) {
  const map = {
    underdamped:       'var(--s2i-color-underdamped,    #2563eb)',
    critically_damped: 'var(--s2i-color-critical,       #16a34a)',
    overdamped:        'var(--s2i-color-overdamped,     #9333ea)',
    marginal:          'var(--s2i-color-marginal,       #d97706)',
    unstable:          'var(--s2i-color-unstable,       #dc2626)',
  };
  return map[key] ?? '#64748b';
}

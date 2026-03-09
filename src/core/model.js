/**
 * src/core/model.js
 * Converte qualquer modo de entrada para o modelo interno canônico unificado.
 * Modelo interno: { a2, a1, a0, zeta, wn, wd, alpha, poles, kdc, classification }
 */

import { classifySystem } from './classify.js';

const EPS = 1e-10;

// ─── Conversores de entrada ───────────────────────────────────────────────────

/**
 * Entrada: coeficientes do polinômio característico a2*s² + a1*s + a0
 * Normaliza para s² + (a1/a2)*s + (a0/a2)
 */
function fromCoefficients({ a2, a1, a0, kdc = 1 }) {
  if (Math.abs(a2) < EPS) throw new Error('a2 não pode ser zero.');
  const b1 = a1 / a2;
  const b0 = a0 / a2;
  const wn = Math.sqrt(Math.abs(b0));
  const zeta = b1 / (2 * wn);
  return buildModel({ zeta, wn, kdc });
}

/**
 * Entrada: forma canônica  wn² / (s² + 2ζωn·s + ωn²)
 */
function fromCanonical({ zeta, wn, kdc = 1 }) {
  if (wn < 0) throw new Error('wn deve ser não-negativo.');
  return buildModel({ zeta, wn, kdc });
}

/**
 * Entrada: par de polos complexos [{ re, im }, { re, im }]
 * Aceita polos reais (im = 0) ou complexo-conjugados.
 */
function fromPoles(polesInput, kdc = 1) {
  if (!Array.isArray(polesInput) || polesInput.length !== 2) {
    throw new Error('poles deve ser um array com exatamente 2 elementos.');
  }
  const [p1, p2] = polesInput;
  // wn² = re² + im²  (para polo complexo conjugado)
  // alpha = -re  (parte real negativa → sistema estável)
  const re = (p1.re + p2.re) / 2;
  const im = Math.abs(p1.im);          // usa módulo da parte imaginária
  const wn = Math.sqrt(re * re + im * im);
  const alpha = -re;                    // alpha = zeta * wn
  const zeta = wn > EPS ? alpha / wn : 0;
  return buildModel({ zeta, wn, kdc });
}

// ─── Construtor do modelo interno ─────────────────────────────────────────────

function buildModel({ zeta, wn, kdc = 1 }) {
  const alpha = zeta * wn;
  const wd = wn * Math.sqrt(Math.max(0, 1 - zeta * zeta));

  // Polos de malha fechada
  let poles;
  if (Math.abs(zeta) < 1 - EPS) {
    // Subamortecido: polos complexo-conjugados
    poles = [
      { re: -alpha, im: +wd },
      { re: -alpha, im: -wd },
    ];
  } else if (Math.abs(zeta - 1) < EPS) {
    // Criticamente amortecido: polo real duplo
    poles = [
      { re: -alpha, im: 0 },
      { re: -alpha, im: 0 },
    ];
  } else {
    // Superamortecido: dois polos reais distintos
    const delta = Math.sqrt(zeta * zeta - 1);
    poles = [
      { re: -wn * (zeta - delta), im: 0 },
      { re: -wn * (zeta + delta), im: 0 },
    ];
  }

  // Coeficientes normalizados do polinômio característico
  const a2 = 1;
  const a1 = 2 * zeta * wn;
  const a0 = wn * wn;

  const classification = classifySystem({ zeta, wn });

  return {
    // Parâmetros canônicos
    zeta,
    wn,
    wd,
    alpha,
    kdc,
    // Coeficientes
    a2,
    a1,
    a0,
    // Polos
    poles,
    // Classificação
    classification,
  };
}

// ─── Ponto de entrada público ─────────────────────────────────────────────────

/**
 * Constrói o modelo interno a partir de qualquer modo de entrada.
 * @param {Object} config  { mode, ...params }
 *   mode = 'coefficients' | 'canonical' | 'poles'
 */
export function buildInternalModel(config) {
  const { mode = 'canonical', ...params } = config;

  switch (mode) {
    case 'coefficients':
      return fromCoefficients(params);
    case 'canonical':
      return fromCanonical(params);
    case 'poles':
      return fromPoles(params.poles, params.kdc);
    default:
      throw new Error(`Modo desconhecido: "${mode}". Use 'coefficients', 'canonical' ou 'poles'.`);
  }
}

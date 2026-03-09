/**
 * src/core/latex.js
 * Gera strings LaTeX para as equações exibidas no painel de equações.
 * Todas as strings são compatíveis com MathJax 3.
 */

const fmt = (v, d = 4) => {
  if (v === null || v === undefined || !isFinite(v)) return '?';
  // Remove zeros à direita
  return parseFloat(v.toFixed(d)).toString();
};

/**
 * Retorna um objeto com todas as equações LaTeX do sistema.
 * @param {Object} model  Modelo interno
 * @returns {Object}  { transferFunction, charPoly, canonicalForm, polesExpr, params }
 */
export function buildLatexStrings(model) {
  const { zeta, wn, wd, alpha, a1, a0, kdc, poles, classification } = model;

  const wnFmt   = fmt(wn);
  const zetaFmt = fmt(zeta);
  const wdFmt   = fmt(wd);
  const alphaFmt = fmt(alpha);
  const kdcFmt  = fmt(kdc);
  const a1Fmt   = fmt(a1);
  const a0Fmt   = fmt(a0);
  const wn2Fmt  = fmt(wn * wn);

  // ── Função de transferência na forma canônica ─────────────────────────────
  const transferFunction =
    `G(s) = \\frac{${kdcFmt}\\,\\omega_n^2}{s^2 + 2\\zeta\\omega_n s + \\omega_n^2}` +
    ` = \\frac{${kdcFmt} \\cdot ${wn2Fmt}}{s^2 + ${a1Fmt}\\,s + ${a0Fmt}}`;

  // ── Polinômio característico ──────────────────────────────────────────────
  const charPoly = `\\Delta(s) = s^2 + ${a1Fmt}\\,s + ${a0Fmt}`;

  // ── Parâmetros canônicos ──────────────────────────────────────────────────
  const params = [
    `\\omega_n = ${wnFmt}\\text{ rad/s}`,
    `\\zeta = ${zetaFmt}`,
    `\\alpha = \\zeta\\omega_n = ${alphaFmt}`,
    `\\omega_d = \\omega_n\\sqrt{1-\\zeta^2} = ${wdFmt}\\text{ rad/s}`,
  ];

  // ── Expressão dos polos ───────────────────────────────────────────────────
  let polesExpr;
  const key = classification.key;

  if (key === 'underdamped') {
    const reFmt = fmt(-alpha);
    const imFmt = fmt(wd);
    polesExpr =
      `s_{1,2} = -\\alpha \\pm j\\omega_d = ${reFmt} \\pm j${imFmt}`;
  } else if (key === 'critically_damped') {
    polesExpr = `s_{1,2} = -\\omega_n = ${fmt(-wn)}`;
  } else if (key === 'overdamped') {
    const s1 = fmt(poles[0].re);
    const s2 = fmt(poles[1].re);
    polesExpr = `s_1 = ${s1},\\quad s_2 = ${s2}`;
  } else if (key === 'marginal') {
    polesExpr = `s_{1,2} = \\pm j\\omega_n = \\pm j${wnFmt}`;
  } else {
    polesExpr = `s_{1,2} = ${fmt(poles[0].re)} \\pm j${fmt(Math.abs(poles[0].im))}`;
  }

  // ── Fórmula da resposta ao degrau ─────────────────────────────────────────
  let stepFormula;
  if (key === 'underdamped') {
    stepFormula =
      `y(t) = ${kdcFmt}\\left[1 - e^{-${alphaFmt}t}` +
      `\\left(\\cos(${wdFmt}\\,t) + \\frac{${alphaFmt}}{${wdFmt}}\\sin(${wdFmt}\\,t)\\right)\\right]`;
  } else if (key === 'critically_damped') {
    stepFormula =
      `y(t) = ${kdcFmt}\\left[1 - e^{-${wnFmt}\\,t}(1 + ${wnFmt}\\,t)\\right]`;
  } else if (key === 'overdamped') {
    const delta = fmt(Math.sqrt(zeta * zeta - 1));
    stepFormula =
      `y(t) = ${kdcFmt}\\left[1 + \\frac{s_2}{s_1-s_2}e^{s_1 t} - \\frac{s_1}{s_1-s_2}e^{s_2 t}\\right]`;
  } else if (key === 'marginal') {
    stepFormula = `y(t) = ${kdcFmt}\\left[1 - \\cos(${wnFmt}\\,t)\\right]`;
  } else {
    stepFormula = `y(t) \\to \\infty \\text{ (sistema instável)}`;
  }

  return {
    transferFunction,
    charPoly,
    params,
    polesExpr,
    stepFormula,
  };
}

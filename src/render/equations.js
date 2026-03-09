/**
 * src/render/equations.js
 * Renderiza o painel de equações LaTeX usando MathJax 3.
 *
 * Estratégia:
 *   1. Injeta o HTML com delimitadores \(...\) e \[...\]
 *   2. Aguarda MathJax.startup.promise (garante que o MathJax está pronto)
 *   3. Chama MathJax.typesetPromise([container]) para renderizar apenas o nó alvo
 *   4. Em updates subsequentes, limpa o container e repete os passos 1–3
 */

import { clearChildren } from '../infra/svgUtils.js';

/**
 * @param {HTMLElement} container
 * @param {Object}      latex   Objeto retornado por buildLatexStrings()
 * @returns {Promise<void>}
 */
export async function renderEquations(container, latex) {
  clearChildren(container);

  const { transferFunction, charPoly, params, polesExpr, stepFormula } = latex;

  // ── Monta o HTML com LaTeX inline/display ──────────────────────────────────
  const html = `
    <div class="s2i__eq-block">
      <span class="s2i__eq-label">Função de Transferência</span>
      <div class="s2i__eq-display">\\[${transferFunction}\\]</div>
    </div>
    <div class="s2i__eq-block">
      <span class="s2i__eq-label">Polinômio Característico</span>
      <div class="s2i__eq-display">\\[${charPoly}\\]</div>
    </div>
    <div class="s2i__eq-block">
      <span class="s2i__eq-label">Parâmetros Canônicos</span>
      <div class="s2i__eq-params">
        ${params.map(p => `<span class="s2i__eq-param">\\(${p}\\)</span>`).join('')}
      </div>
    </div>
    <div class="s2i__eq-block">
      <span class="s2i__eq-label">Polos de Malha Fechada</span>
      <div class="s2i__eq-display">\\[${polesExpr}\\]</div>
    </div>
    <div class="s2i__eq-block">
      <span class="s2i__eq-label">Resposta ao Degrau</span>
      <div class="s2i__eq-display">\\[${stepFormula}\\]</div>
    </div>
  `;

  container.innerHTML = html;

  // ── Renderiza com MathJax ──────────────────────────────────────────────────
  await typesetContainer(container);
}

/**
 * Aguarda o MathJax estar disponível e renderiza o container.
 * Usa a fila via MathJax.startup.promise conforme requisito.
 */
export async function typesetContainer(container) {
  if (typeof window === 'undefined' || !window.MathJax) return;

  try {
    // Aguarda o MathJax inicializar completamente
    await window.MathJax.startup.promise;
    // Renderiza apenas o nó alvo (eficiente em updates)
    await window.MathJax.typesetPromise([container]);
  } catch (err) {
    console.warn('[s2i] MathJax typesetPromise falhou:', err);
  }
}

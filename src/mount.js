/**
 * src/mount.js
 * Ponto de entrada do widget. Expõe a API pública:
 *
 *   mountSecondOrderInfographic(container, config) → instance
 *   instance.update(nextConfig)
 *   instance.destroy()
 *
 * config = {
 *   mode:          'coefficients' | 'canonical' | 'poles'
 *   // coefficients:
 *   a2, a1, a0, kdc?
 *   // canonical:
 *   zeta, wn, kdc?
 *   // poles:
 *   poles: [{ re, im }, { re, im }], kdc?
 *
 *   // Opções de cálculo
 *   riseTimeMode?:  '10-90' | 'first-crossing'   (default: '10-90')
 *   settlingBand?:  number                         (default: 0.02)
 *   nPoints?:       number                         (default: 500)
 *   tMax?:          number | null                  (default: auto)
 *
 *   // Opções de layout
 *   theme?:         'light' | 'dark'               (default: 'light')
 *   locale?:        'pt-BR' | 'en'                 (default: 'pt-BR')
 * }
 */

import { buildInternalModel }   from './core/model.js';
import { computeStepResponse }  from './core/stepResponse.js';
import { extractMetrics }       from './core/metrics.js';
import { buildLatexStrings }    from './core/latex.js';

import { renderPolePlane }      from './render/polePlane.js';
import { renderStepPlot }       from './render/stepPlot.js';
import { renderEquations }      from './render/equations.js';
import { renderMetricsCards }   from './render/metricsCards.js';
import { renderSummaryPanel }   from './render/summaryPanel.js';

// ─── Estrutura do DOM interno ─────────────────────────────────────────────────

const TEMPLATE = `
<div class="s2i__root">
  <header class="s2i__header">
    <h2 class="s2i__title">Sistema de 2ª Ordem — Resposta ao Degrau</h2>
    <span class="s2i__badge" data-key="classification"></span>
  </header>

  <div class="s2i__body">
    <!-- Coluna esquerda: equações + resumo -->
    <section class="s2i__col s2i__col--left">
      <div class="s2i__panel s2i__panel--equations">
        <h3 class="s2i__panel-title">Equações</h3>
        <div class="s2i__equations-container" data-slot="equations"></div>
      </div>
      <div class="s2i__panel s2i__panel--summary">
        <h3 class="s2i__panel-title">Análise</h3>
        <div data-slot="summary"></div>
      </div>
    </section>

    <!-- Coluna direita: gráficos + métricas -->
    <section class="s2i__col s2i__col--right">
      <div class="s2i__panel s2i__panel--plots">
        <div class="s2i__plots-row">
          <div class="s2i__plot-wrap s2i__plot-wrap--poles">
            <h3 class="s2i__panel-title">Plano de Polos</h3>
            <div class="s2i__svg-container" data-slot="pole-plane"></div>
          </div>
          <div class="s2i__plot-wrap s2i__plot-wrap--step">
            <h3 class="s2i__panel-title">Resposta ao Degrau</h3>
            <div class="s2i__svg-container" data-slot="step-plot"></div>
          </div>
        </div>
      </div>
      <div class="s2i__panel s2i__panel--metrics">
        <h3 class="s2i__panel-title">Métricas de Desempenho</h3>
        <div data-slot="metrics"></div>
      </div>
    </section>
  </div>
</div>
`;

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Monta o infográfico no container e retorna a instância da API pública.
 *
 * @param {HTMLElement|string} container  Elemento ou seletor CSS
 * @param {Object}             config
 * @returns {{ update(nextConfig): Promise<void>, destroy(): void }}
 */
export function mountSecondOrderInfographic(container, config = {}) {
  // Resolve o container
  const root = typeof container === 'string'
    ? document.querySelector(container)
    : container;

  if (!root) throw new Error('[s2i] Container não encontrado.');

  // Injeta o template
  root.innerHTML = TEMPLATE;
  root.classList.add('s2i__host');

  // Aplica tema (padrão: dark, alinhado ao tema de referência)
  const _initialTheme = config.theme ?? 'dark';
  applyTheme(root, _initialTheme);

  // Slots de renderização
  const slots = {
    equations:  root.querySelector('[data-slot="equations"]'),
    polePlane:  root.querySelector('[data-slot="pole-plane"]'),
    stepPlot:   root.querySelector('[data-slot="step-plot"]'),
    metrics:    root.querySelector('[data-slot="metrics"]'),
    summary:    root.querySelector('[data-slot="summary"]'),
    badge:      root.querySelector('[data-key="classification"]'),
  };

  // Estado interno
  let currentConfig = null;
  let destroyed = false;

  // ResizeObserver para re-renderizar SVGs em mudanças de tamanho
  let resizeTimer = null;
  const ro = new ResizeObserver(() => {
    if (destroyed) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (currentConfig) renderSvgs(slots, currentConfig._model, currentConfig._response, currentConfig._metrics, currentConfig);
    }, 120);
  });
  ro.observe(root);

  // ── API pública ─────────────────────────────────────────────────────────────

  const instance = {
    /**
     * Atualiza o infográfico com nova configuração.
     * @param {Object} nextConfig
     * @returns {Promise<void>}
     */
    async update(nextConfig) {
      if (destroyed) throw new Error('[s2i] Instância destruída.');

      const cfg = { ...nextConfig };
      const prevTheme = currentConfig?._theme;
      const newTheme  = cfg.theme ?? 'dark';
      applyTheme(root, newTheme);
      cfg._theme = newTheme;

      // 1. Constrói o modelo interno
      const model = buildInternalModel(cfg);

      // 2. Calcula a resposta ao degrau
      const response = computeStepResponse(model, {
        nPoints: cfg.nPoints ?? 500,
        tMax:    cfg.tMax ?? undefined,
      });

      // 3. Extrai métricas
      const metrics = extractMetrics(response, {
        riseTimeMode: cfg.riseTimeMode ?? '10-90',
        settlingBand: cfg.settlingBand ?? 0.02,
        kdc:          model.kdc,
      });

      // 4. Strings LaTeX
      const latex = buildLatexStrings(model);

      // Persiste estado para resize
      cfg._model    = model;
      cfg._response = response;
      cfg._metrics  = metrics;
      currentConfig = cfg;

      // 5. Renderiza badge de classificação
      const badge = slots.badge;
      badge.textContent = model.classification.labelPt;
      badge.className = `s2i__badge s2i__badge--${model.classification.key}`;

      // 6. Renderiza SVGs (sempre re-renderiza para aplicar novas cores de tema)
      renderSvgs(slots, model, response, metrics, cfg);

      // 7. Renderiza cards de métricas
      renderMetricsCards(slots.metrics, model, metrics, {
        settlingBand: cfg.settlingBand ?? 0.02,
        riseTimeMode: cfg.riseTimeMode ?? '10-90',
      });

      // 8. Renderiza resumo textual
      renderSummaryPanel(slots.summary, model, metrics, {
        settlingBand: cfg.settlingBand ?? 0.02,
      });

      // 9. Renderiza equações (async — MathJax)
      await renderEquations(slots.equations, latex);
    },

    /**
     * Remove o widget do DOM e libera recursos.
     */
    destroy() {
      destroyed = true;
      ro.disconnect();
      clearTimeout(resizeTimer);
      root.innerHTML = '';
      root.classList.remove('s2i__host');
      currentConfig = null;
    },
  };

  // Renderização inicial
  instance.update({ ...config, theme: _initialTheme }).catch(err => console.error('[s2i] Erro na renderização inicial:', err));

  return instance;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function renderSvgs(slots, model, response, metrics, cfg) {
  const poleEl  = slots.polePlane;
  const stepEl  = slots.stepPlot;

  renderPolePlane(poleEl, model, {
    width:  poleEl.clientWidth  || 300,
    height: poleEl.clientHeight || 260,
  });

  renderStepPlot(stepEl, model, response, metrics, {
    width:       stepEl.clientWidth  || 340,
    height:      stepEl.clientHeight || 260,
    settlingBand: cfg.settlingBand ?? 0.02,
  });
}

function applyTheme(root, theme) {
  root.setAttribute('data-s2i-theme', theme);
}

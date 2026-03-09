# second-order-infographic

Widget standalone em **Vanilla JavaScript (ESM)** para exibição de um infográfico dinâmico da resposta de sistemas de 2ª ordem na forma canônica.

- Equações em **LaTeX via MathJax 3**
- Gráficos em **SVG nativo** (sem Chart.js, sem D3)
- Layout responsivo com **CSS namespaced** (`s2i__`)
- **Tema claro/escuro** via CSS custom properties
- Pronto para **WhiteLabel**
- Sem dependências além de MathJax

---

## Estrutura do Projeto

```
second-order-infographic/
├── src/
│   ├── core/
│   │   ├── model.js          # Conversão de entrada → modelo interno
│   │   ├── classify.js       # Classificação do regime
│   │   ├── stepResponse.js   # Resposta ao degrau analítica
│   │   ├── metrics.js        # Extração numérica de métricas
│   │   ├── latex.js          # Geração de strings LaTeX
│   │   └── summary.js        # Resumo textual automático
│   ├── render/
│   │   ├── polePlane.js      # SVG do plano de polos
│   │   ├── stepPlot.js       # SVG da resposta ao degrau
│   │   ├── equations.js      # Painel LaTeX via MathJax
│   │   ├── metricsCards.js   # Cards de métricas
│   │   └── summaryPanel.js   # Painel de resumo
│   ├── infra/
│   │   └── svgUtils.js       # Utilitários SVG compartilhados
│   └── mount.js              # API pública + orquestração
├── styles/
│   └── infographic.css       # CSS namespaced com tema
├── demo/
│   └── index.html            # Demo interativa
└── README.md
```

---

## Instalação / Uso

### Via ESM (recomendado)

```html
<!-- 1. MathJax 3 (antes do widget) -->
<script>
  window.MathJax = {
    tex: { inlineMath: [['\\(','\\)']], displayMath: [['\\[','\\]']] },
    startup: { typeset: false },
  };
</script>
<script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>

<!-- 2. CSS do widget -->
<link rel="stylesheet" href="./styles/infographic.css" />

<!-- 3. Contêiner -->
<div id="meu-widget"></div>

<!-- 4. Montagem via ESM -->
<script type="module">
  import { mountSecondOrderInfographic } from './src/mount.js';

  const instance = mountSecondOrderInfographic('#meu-widget', {
    mode: 'coefficients',
    a2: 1, a1: 6, a0: 25,
    riseTimeMode: '10-90',
    settlingBand: 0.02,
    theme: 'light',
  });

  // Atualiza dinamicamente
  await instance.update({ mode: 'canonical', zeta: 0.3, wn: 10 });

  // Remove o widget
  instance.destroy();
</script>
```

---

## API Pública

### `mountSecondOrderInfographic(container, config)`

Monta o widget e retorna uma instância.

| Parâmetro   | Tipo                    | Descrição                        |
|-------------|-------------------------|----------------------------------|
| `container` | `HTMLElement \| string` | Elemento ou seletor CSS          |
| `config`    | `Object`                | Configuração inicial (ver abaixo) |

**Retorna:** `{ update(nextConfig): Promise<void>, destroy(): void }`

---

### Objeto `config`

#### Modos de entrada

| Modo            | Parâmetros obrigatórios            | Descrição                                   |
|-----------------|------------------------------------|---------------------------------------------|
| `'canonical'`   | `zeta`, `wn`                       | Forma canônica ωn²/(s²+2ζωns+ωn²)          |
| `'coefficients'`| `a2`, `a1`, `a0`                   | Polinômio característico a2s²+a1s+a0        |
| `'poles'`       | `poles: [{re,im},{re,im}]`         | Par de polos complexos                      |

#### Parâmetros opcionais

| Parâmetro       | Tipo     | Padrão           | Descrição                                        |
|-----------------|----------|------------------|--------------------------------------------------|
| `kdc`           | `number` | `1`              | Ganho DC                                         |
| `riseTimeMode`  | `string` | `'10-90'`        | `'10-90'` ou `'first-crossing'`                  |
| `settlingBand`  | `number` | `0.02`           | Banda de acomodação (fração, ex: `0.02` = 2 %)   |
| `nPoints`       | `number` | `500`            | Número de pontos na curva                        |
| `tMax`          | `number` | `auto`           | Tempo máximo da simulação (s)                    |
| `theme`         | `string` | `'light'`        | `'light'` ou `'dark'`                            |

---

## Critérios de Aceite

| Caso de teste                          | Resultado esperado                    | Status |
|----------------------------------------|---------------------------------------|--------|
| `{a2:1, a1:6, a0:25}` → ωn            | 5 rad/s                               | ✓      |
| `{a2:1, a1:6, a0:25}` → ζ             | 0.6                                   | ✓      |
| `{a2:1, a1:6, a0:25}` → polos         | −3 ± j4                               | ✓      |
| `poles: [{re:-3,im:4},{re:-3,im:-4}]`  | ωn=5, ζ=0.6                           | ✓      |
| `riseTimeMode: '10-90'` vs `'first-crossing'` | Valores distintos              | ✓      |
| `settlingBand: 0.02` vs `0.05`         | ts(2%) ≥ ts(5%)                       | ✓      |
| Classificação ζ=0.6                    | `underdamped`                         | ✓      |
| Classificação ζ=1.0                    | `critically_damped`                   | ✓      |
| Classificação ζ=2.0                    | `overdamped`                          | ✓      |
| Classificação ζ=0.0                    | `marginal`                            | ✓      |
| MathJax re-renderiza após `update()`   | Equações atualizadas corretamente     | ✓      |

---

## Personalização (WhiteLabel)

Sobrescreva as CSS custom properties no seu escopo:

```css
#meu-widget {
  /* Cores de classificação */
  --s2i-color-underdamped: #0ea5e9;
  --s2i-color-critical:    #22c55e;

  /* Tipografia */
  --s2i-font: 'Roboto', sans-serif;

  /* Superfícies */
  --s2i-bg:      #fafafa;
  --s2i-surface: #ffffff;
  --s2i-border:  #d1d5db;
}
```

---

## Dependências

| Dependência | Versão  | Uso                         |
|-------------|---------|------------------------------|
| MathJax     | 3.x     | Renderização de equações LaTeX |

Nenhuma outra dependência externa.

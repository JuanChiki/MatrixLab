/**
 * Ventana principal: conecta la interfaz con los módulos matemáticos.
 *
 * Aquí no se calcula nada: cada operación se ejecuta en ui/operations.js (que llama a js/core)
 * y la ventana sólo reparte el resultado entre el visor de pasos y el panel de resultados.
 */

import { MatrixLabError } from "../utils/errors.js";
import { MAX_DIM } from "../utils/validation.js";
import { HELP_EXAMPLES, helpHtml } from "./help.js";
import { clearHistory, isValidEntry, loadHistory, pushEntry } from "./history.js";
import { MatrixEditor } from "./matrixEditor.js";
import { DET_METHODS, GAUSS_MODES, INVERSE_METHODS, OPERATIONS, runOperation } from "./operations.js";
import { ResultsPanel } from "./resultsPanel.js";
import { StepsViewer } from "./stepsViewer.js";

const A_EXAMPLES = [
  [[1, 2], [3, 4]],                                          // ejemplo del documento
  [[2, 1, 1], [1, 3, 2], [1, 0, 0]],                         // 3×3 invertible
  [[0, 2, 1], [1, 1, 1], [2, 1, -1]],                        // necesita intercambio de filas
  [[1, 2, 3], [4, 5, 6], [7, 8, 9]],                         // singular
  [[1, 2, 3], [4, 5, 6]],                                    // rectangular 2×3
  [[2, 0, 1, 3], [1, 1, 0, 2], [0, 2, 1, 1], [1, 0, 3, 1]],  // 4×4
];
const B_EXAMPLES = [
  [[5, 6], [7, 8]],
  [[1, 0, 2], [0, 1, 1], [3, 1, 0]],
  [[1, 2], [3, 4], [5, 6]],                                  // 3×2 (compatible con A de 2×3)
];
// Matrices aumentadas [A | b]
const SYSTEM_EXAMPLES = [
  [[2, 1, -1, 8], [-3, -1, 2, -11], [-2, 1, 2, -3]],         // solución única: (2, 3, −1)
  [[1, 2, -1, 3], [2, 4, -2, 6]],                            // infinitas soluciones
  [[1, 1, 2], [1, 1, 3]],                                    // sin solución
  [[0, 2, 1, 4], [1, 1, 1, 6], [2, 1, -1, 1]],               // pide intercambio de filas
];

const options = (pairs) => pairs.map(([value, text]) => `<option value="${value}">${text}</option>`).join("");
const store = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* sin almacenamiento: el ajuste sólo dura esta visita */
    }
  },
};

const LOGO = `<svg class="logo" viewBox="0 0 40 40" aria-hidden="true"><path d="M14 7H8v26h6M26 7h6v26h-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="15" y="14" width="10" height="10" rx="2.5" class="logo-mark"/></svg>`;

export class MainWindow {
  /** @param {HTMLElement} root  contenedor donde se construye la interfaz */
  constructor(root) {
    const notify = (msg) => this.toast(msg);
    // Cuando A cambia de tamaño se ajustan las opciones (p. ej. Sarrus sólo vale para 3×3).
    this.editorA = new MatrixEditor("A", A_EXAMPLES, { notify, onResize: () => this.updateOptions() });
    this.editorB = new MatrixEditor("B", B_EXAMPLES, { notify });
    this.stepsViewer = new StepsViewer();
    this.resultsPanel = new ResultsPanel({
      useAs: (name, m) => this.useResultAs(name, m),
      notify,
      onModeChange: () => this.stepsViewer.render(), // fracciones/decimales también en los pasos
    });
    this.systemMode = false;
    this.opIndex = 0;

    const groups = [...new Set(OPERATIONS.map((o) => o.group))];
    root.innerHTML = `
      <div class="shell">
        <header class="topbar">
          <div class="brand">${LOGO}<span class="wordmark">MatrixLab</span><span class="tagline">Álgebra lineal, paso a paso</span></div>
          <div class="top-actions">
            <button type="button" class="btn ghost" id="help-btn">Ayuda y ejemplos</button>
            <button type="button" class="btn ghost" id="history-btn">Historial</button>
            <button type="button" class="btn ghost icon" id="zoom-btn" aria-pressed="false" aria-label="Texto grande, para proyector" title="Texto grande (para proyector)">A+</button>
            <button type="button" class="btn ghost icon" id="theme-btn" aria-label="Cambiar entre tema claro y oscuro" title="Cambiar tema"></button>
          </div>
        </header>
        <nav class="ops" aria-label="Operaciones">
          ${groups
            .map(
              (g) => `<div class="op-group"><span class="op-group-label">${g}</span><div class="op-tabs">
                ${OPERATIONS.map((o, i) => (o.group === g ? `<button type="button" class="op-tab" data-i="${i}" title="${o.label}">${o.tab}</button>` : "")).join("")}
              </div></div>`,
            )
            .join("")}
        </nav>
        <div class="toolbar">
          <div class="op-info"><strong id="op-title"></strong><span id="op-hint" class="muted"></span></div>
          <div class="op-options">
            <label class="option" data-opt="scalar">Escalar k
              <input id="scalar" type="text" value="2" placeholder="2, 0.5 o 3/4" autocomplete="off"></label>
            <label class="option" data-opt="gauss">Método
              <select id="gauss-mode">${options(GAUSS_MODES)}</select></label>
            <label class="option check" data-opt="gauss" title="La última columna son los términos independientes y se muestra separada por «=»">
              <input id="gauss-aug" type="checkbox"> Matriz aumentada [A | b]</label>
            <label class="option" data-opt="det">Método
              <select id="det-method">${options(DET_METHODS)}</select></label>
            <label class="option" data-opt="det" id="det-index-wrap">Fila o columna
              <input id="det-index" type="number" min="1" max="${MAX_DIM}" value="1"></label>
            <label class="option" data-opt="inverse">Método
              <select id="inverse-method">${options(INVERSE_METHODS)}</select></label>
          </div>
          <button type="button" id="run" class="btn primary" title="Calcular (Ctrl+Enter)">Calcular <kbd>Ctrl ⏎</kbd></button>
        </div>
        <main class="workspace">
          <section class="inputs"></section>
        </main>
        <div class="toast" role="status" aria-live="polite"></div>
        <dialog class="dialog history" id="history">
          <header><h2>Historial</h2><button type="button" class="btn ghost small" data-act="close">Cerrar</button></header>
          <div class="history-list"></div>
          <footer><button type="button" class="btn small" data-act="clear">Borrar historial</button></footer>
        </dialog>
        <dialog class="dialog help" id="help">
          <header><h2>Ayuda y ejemplos</h2><button type="button" class="btn ghost small" data-act="close">Cerrar</button></header>
          <div class="help-body">${helpHtml()}</div>
        </dialog>
      </div>`;

    this.$ = (sel) => root.querySelector(sel);
    this.$$ = (sel) => [...root.querySelectorAll(sel)];
    this.$(".inputs").append(this.editorA.element, this.editorB.element);
    this.$(".workspace").append(this.stepsViewer.element, this.resultsPanel.element);

    this.editorB.addAction("Intercambiar con A", "Intercambia el contenido de A y B", () => this.swapAB());

    this.$$(".op-tab").forEach((b) => b.addEventListener("click", () => this.selectOperation(Number(b.dataset.i))));
    this.$("#det-method").addEventListener("change", () => this.updateOptions());
    this.$("#gauss-aug").addEventListener("change", () => this.updateNote());
    this.$("#run").addEventListener("click", () => this.execute());
    this.$("#theme-btn").addEventListener("click", () => this.toggleTheme());
    this.$("#zoom-btn").addEventListener("click", () => this.toggleZoom());
    this.$("#history-btn").addEventListener("click", () => this.openHistory());
    this.$("#help-btn").addEventListener("click", () => this.$("#help").showModal());
    this.setupDialogs();
    this.setupShortcuts();
    this.updateThemeButton();
    this.applyZoom(store.get("matrixlab.zoom") === "large");

    this.editorA.loadExample();
    this.editorB.loadExample();
    this.selectOperation(0);
  }

  // ------------------------------------------------------------------ operación elegida
  currentSpec() {
    return OPERATIONS[this.opIndex];
  }

  selectOperation(index) {
    this.opIndex = index;
    const spec = this.currentSpec();
    this.$$(".op-tab").forEach((b) => {
      const on = Number(b.dataset.i) === index;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    this.$("#op-title").textContent = spec.label;
    this.$("#op-hint").textContent = spec.hint;
    // El sistema Ax = b usa sus propios ejemplos (matrices aumentadas).
    if (!!spec.system !== this.systemMode) {
      this.systemMode = !!spec.system;
      this.editorA.setExamples(this.systemMode ? SYSTEM_EXAMPLES : A_EXAMPLES);
      if (this.systemMode) this.editorA.loadExample();
    }
    this.updateNote();
    this.updateOptions();
  }

  updateNote() {
    const spec = this.currentSpec();
    const augmented = spec.gaussOptions && this.$("#gauss-aug").checked;
    const on = !!(spec.system || augmented);
    this.editorA.setAugmented(on);
    this.editorA.setNote(on ? "Cada fila es una ecuación: los coeficientes a la izquierda del «=» y lo que debe dar (b) a la derecha. Ej.: x + 2y = 3 → 1  2 = 3." : "");
  }

  /**
   * Muestra sólo los controles que necesita la operación elegida (las matrices se conservan)
   * y desactiva los métodos de determinante que no se pueden usar con el tamaño actual de A:
   * ad − bc sólo para 2×2 y Sarrus sólo para 3×3.
   */
  updateOptions() {
    if (!this.$) return; // el editor llama aquí al crearse, antes de que exista la ventana
    const spec = this.currentSpec();
    this.editorB.element.hidden = !spec.needsB;
    this.$$("[data-opt]").forEach((el) => {
      const kind = el.dataset.opt;
      el.hidden = !(
        (kind === "scalar" && spec.needsScalar) ||
        (kind === "gauss" && spec.gaussOptions) ||
        (kind === "det" && spec.detOptions) ||
        (kind === "inverse" && spec.inverseOptions)
      );
    });

    const [rows, cols] = this.editorA.dims();
    const square = rows === cols;
    const select = this.$("#det-method");
    const allowed = {
      order2: square && rows === 2,
      sarrus: square && rows === 3,
    };
    for (const option of select.options) {
      if (option.value in allowed) {
        option.disabled = !allowed[option.value];
        option.title = option.disabled ? "No se puede usar con el tamaño actual de A" : "";
      }
    }
    if (select.selectedOptions[0]?.disabled) select.value = "auto"; // el método elegido dejó de ser válido

    const byLine = select.value.startsWith("cofactors");
    this.$("#det-index-wrap").hidden = !(spec.detOptions && byLine);
    this.$("#det-index").max = Math.max(1, rows);
    this.$(".op-options").hidden = !(spec.needsScalar || spec.gaussOptions || spec.detOptions || spec.inverseOptions);
  }

  /** Las opciones que el usuario eligió, tal como las espera runOperation(). */
  getOptions() {
    return {
      scalar: this.$("#scalar").value,
      gaussMode: this.$("#gauss-mode").value,
      augmented: this.$("#gauss-aug").checked,
      detMethod: this.$("#det-method").value,
      detIndex: this.$("#det-index").value,
      invMethod: this.$("#inverse-method").value,
    };
  }

  setOptions(o = {}) {
    if (o.scalar != null) this.$("#scalar").value = o.scalar;
    if (o.gaussMode) this.$("#gauss-mode").value = o.gaussMode;
    if (o.augmented != null) this.$("#gauss-aug").checked = !!o.augmented;
    if (o.detMethod) this.$("#det-method").value = o.detMethod;
    if (o.detIndex) this.$("#det-index").value = o.detIndex;
    if (o.invMethod) this.$("#inverse-method").value = o.invMethod;
    this.updateNote();
    this.updateOptions();
  }

  // ------------------------------------------------------------------ utilidades de interfaz
  toast(message) {
    const el = this.$(".toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  setupShortcuts() {
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.execute();
        return;
      }
      // ← → Inicio Fin recorren los pasos cuando no se está escribiendo en una celda o lista.
      const typing = e.target instanceof HTMLElement && e.target.matches("input, select, textarea");
      if (typing || e.ctrlKey || e.metaKey || e.altKey || this.$("#history").open || this.$("#help").open) return;
      if (e.key === "ArrowRight") this.stepsViewer.next();
      else if (e.key === "ArrowLeft") this.stepsViewer.previous();
      else if (e.key === "Home") this.stepsViewer.reset();
      else if (e.key === "End") this.stepsViewer.last();
    });
  }

  toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("matrixlab.theme", next);
    this.updateThemeButton();
  }

  updateThemeButton() {
    const dark = document.documentElement.dataset.theme === "dark";
    this.$("#theme-btn").textContent = dark ? "☀" : "☾";
  }

  /** Texto grande: pensado para compartir pantalla o usar un proyector. */
  applyZoom(large) {
    document.documentElement.dataset.zoom = large ? "large" : "normal";
    this.$("#zoom-btn").setAttribute("aria-pressed", String(large));
  }

  toggleZoom() {
    const large = document.documentElement.dataset.zoom !== "large";
    this.applyZoom(large);
    store.set("matrixlab.zoom", large ? "large" : "normal");
  }

  swapAB() {
    const a = this.editorA.getCells();
    const b = this.editorB.getCells();
    this.editorA.setCells(b);
    this.editorB.setCells(a);
    this.toast("A y B intercambiadas");
  }

  useResultAs(name, matrix) {
    (name === "A" ? this.editorA : this.editorB).setMatrix(matrix);
    this.toast(`Resultado copiado al editor ${name}`);
  }

  // ------------------------------------------------------------------ ventanas: historial y ayuda
  setupDialogs() {
    const history = this.$("#history");
    const help = this.$("#help");
    for (const dialog of [history, help]) {
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) return dialog.close(); // clic en el fondo
        if (e.target.closest("[data-act=close]")) dialog.close();
      });
    }
    history.addEventListener("click", (e) => {
      if (e.target.closest("[data-act=clear]")) {
        clearHistory();
        this.renderHistory();
      }
      const item = e.target.closest(".hist-item");
      if (item) {
        const entry = loadHistory()[Number(item.dataset.i)];
        if (entry) this.restore(entry);
        history.close();
      }
    });
    help.addEventListener("click", (e) => {
      const item = e.target.closest("[data-ex]");
      if (item) {
        help.close();
        this.applyExample(HELP_EXAMPLES[Number(item.dataset.ex)]);
      }
    });
  }

  /** Carga un ejemplo preparado: elige la operación, escribe las matrices y calcula. */
  applyExample(example) {
    const index = OPERATIONS.findIndex((o) => o.key === example.op);
    if (index === -1) return;
    this.selectOperation(index);
    this.editorA.setCells(example.a.map((row) => row.map(String)));
    if (example.b) this.editorB.setCells(example.b.map((row) => row.map(String)));
    this.setOptions({ augmented: false, gaussMode: "jordan", detMethod: "auto", detIndex: 1, invMethod: "adjugate", ...example.options });
    this.execute();
  }

  openHistory() {
    this.renderHistory();
    this.$("#history").showModal();
  }

  renderHistory() {
    const list = loadHistory();
    const box = this.$(".history-list");
    if (!list.length) {
      box.innerHTML = `<p class="muted empty">Aquí aparecerán tus últimos cálculos. Pulsa «Calcular» y vuelve.</p>`;
      return;
    }
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    box.innerHTML = list
      .map((e, i) => {
        const spec = OPERATIONS.find((o) => o.key === e.op);
        const preview = "[" + e.a.map((r) => r.join(" ")).join("; ") + "]";
        const time = new Date(e.t).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
        return `<button type="button" class="hist-item" data-i="${i}">
          <span class="hist-op">${esc(spec?.tab ?? e.op)}</span>
          <span class="hist-preview">${esc(preview.length > 46 ? preview.slice(0, 45) + "…" : preview)}</span>
          <span class="hist-time muted">${time}</span></button>`;
      })
      .join("");
  }

  /** Vuelve a cargar un cálculo del historial y lo ejecuta. */
  restore(entry) {
    if (!isValidEntry(entry)) return;
    const index = OPERATIONS.findIndex((o) => o.key === entry.op);
    if (index === -1) return;
    this.selectOperation(index);
    this.editorA.setCells(entry.a);
    if (entry.b) this.editorB.setCells(entry.b);
    this.setOptions({
      scalar: entry.scalar,
      gaussMode: entry.gaussMode,
      augmented: entry.augmented,
      detMethod: entry.detMethod,
      detIndex: entry.detIndex,
      invMethod: entry.invMethod,
    });
    this.execute(false);
  }

  recordHistory(spec) {
    pushEntry({
      t: Date.now(),
      op: spec.key,
      a: this.editorA.getCells(),
      b: spec.needsB ? this.editorB.getCells() : null,
      ...this.getOptions(),
    });
  }

  // ------------------------------------------------------------------ ejecución
  execute(save = true) {
    const spec = this.currentSpec();
    let outcome;
    try {
      const a = this.editorA.getMatrix();
      const b = spec.needsB ? this.editorB.getMatrix() : null;
      outcome = runOperation(spec.key, a, b, this.getOptions());
    } catch (e) {
      if (e instanceof MatrixLabError) {
        this.showError(e.message);
      } else {
        console.error(e); // nunca se muestran trazas al usuario
        this.showError("Ocurrió un error inesperado al calcular. Revisa los datos e inténtalo de nuevo.");
      }
      return;
    }
    this.stepsViewer.setProcedure(outcome.title, outcome.inputs, outcome.steps, outcome.summary ?? []);
    this.resultsPanel.showOutcome(outcome.results, outcome.message ?? null);
    if (save) this.recordHistory(spec);
  }

  showError(text) {
    this.stepsViewer.clear();
    this.resultsPanel.showError(text);
  }
}

/** Panel derecho: resultado final, dimensiones, mensajes y acciones (copiar, LaTeX, reutilizar). */

import { matrixToLatex, matrixToText } from "../utils/formatting.js";
import { copyText } from "./clipboard.js";
import * as html from "./htmlRender.js";

export class ResultsPanel {
  /**
   * @param {{ useAs: (name: "A" | "B", matrix: Array) => void, notify: (msg: string) => void, onModeChange?: () => void }} callbacks
   */
  constructor({ useAs, notify, onModeChange = () => {} }) {
    this.useAs = useAs;
    this.notify = notify;
    this.onModeChange = onModeChange;
    this.results = [];
    this.message = null;
    this.element = document.createElement("section");
    this.element.className = "panel results-panel";
    this.element.innerHTML = `
      <header class="panel-head">
        <h2 class="panel-title">Resultado</h2>
        <div class="seg" role="group" aria-label="Cómo mostrar los números">
          <button type="button" class="seg-btn on" data-mode="fraction" aria-pressed="true" title="Fracciones exactas">Fracciones</button>
          <button type="button" class="seg-btn" data-mode="decimal" aria-pressed="false" title="Decimales redondeados (sólo para mostrar)">Decimales</button>
        </div>
      </header>
      <div class="view" tabindex="0"></div>`;
    this.view = this.element.querySelector(".view");
    this.view.addEventListener("click", (e) => this.onClick(e));
    this.view.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches?.(".inspectable")) {
        e.preventDefault();
        this.inspect(e.target);
      }
    });
    this.element.querySelector(".seg").addEventListener("click", (e) => {
      const mode = e.target.closest("[data-mode]")?.dataset.mode;
      if (mode) this.setMode(mode);
    });
    this.clear();
  }

  /** Cambia entre fracciones y decimales (sólo la presentación; los datos no cambian). */
  setMode(mode) {
    html.setNumberMode(mode);
    this.element.querySelectorAll(".seg-btn").forEach((b) => {
      const on = b.dataset.mode === html.getNumberMode();
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    if (this.results.length) this.view.innerHTML = html.resultsHtml(this.results, this.message);
    this.onModeChange();
  }

  /** Muestra de dónde sale el valor de una celda (menor, signo, cofactor…). */
  inspect(cell) {
    const block = cell.closest(".result-block");
    block.querySelectorAll(".inspectable.selected").forEach((c) => c.classList.remove("selected"));
    cell.classList.add("selected");
    const box = block.querySelector(".cell-info");
    box.textContent = cell.dataset.info;
    box.classList.remove("muted");
  }

  clear() {
    this.results = [];
    this.message = null;
    this.view.innerHTML = html.placeholderHtml("El resultado aparecerá aquí, con opciones para copiarlo o usarlo en otra operación.");
  }

  showOutcome(results, message = null) {
    this.results = results;
    this.message = message;
    this.view.innerHTML = html.resultsHtml(results, message);
  }

  showError(text) {
    this.results = [];
    this.message = null;
    this.view.innerHTML = html.messageHtml("error", text);
  }

  async onClick(e) {
    const cell = e.target.closest(".inspectable");
    if (cell) return this.inspect(cell);
    const button = e.target.closest("button[data-act]");
    if (!button) return;
    const matrix = this.results[Number(button.dataset.i)]?.[1];
    if (!Array.isArray(matrix)) return;
    switch (button.dataset.act) {
      case "copy":
        this.notify((await copyText(matrixToText(matrix))) ? "Matriz copiada" : "No se pudo copiar");
        break;
      case "latex":
        this.notify((await copyText(matrixToLatex(matrix))) ? "Código LaTeX copiado" : "No se pudo copiar");
        break;
      case "toA":
        this.useAs("A", matrix);
        break;
      case "toB":
        this.useAs("B", matrix);
        break;
    }
  }
}

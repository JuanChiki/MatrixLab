/**
 * Panel central: recorre un procedimiento paso a paso.
 * Anterior / siguiente, reproducción automática, línea de tiempo, todos los pasos y reiniciar.
 */

import * as html from "./htmlRender.js";

const SPEEDS = [
  [2200, "Lenta"],
  [1300, "Normal"],
  [600, "Rápida"],
];

/** Muestra el estado inicial y luego revela una operación nueva por cada «Siguiente». */
export class StepsViewer {
  constructor() {
    this.timer = null;
    this.element = document.createElement("section");
    this.element.className = "panel steps-viewer";
    this.element.innerHTML = `
      <header class="panel-head"><h2 class="panel-title">Procedimiento</h2><span class="progress" aria-live="polite"></span></header>
      <div class="paper view" tabindex="0"></div>
      <input type="range" class="timeline" min="0" max="0" value="0" aria-label="Línea de tiempo de los pasos">
      <p class="legend" aria-label="Significado de los colores">
        <span><i class="swatch pivot"></i>Pivote</span>
        <span><i class="swatch row"></i>Fila modificada</span>
        <span><i class="swatch focus"></i>Elementos señalados</span>
      </p>
      <div class="controls primary">
        <button type="button" class="btn icon" data-act="first" title="Ir al inicio (Inicio)" aria-label="Ir al inicio">⏮</button>
        <button type="button" class="btn" data-act="prev" title="Paso anterior (←)">◀ Anterior</button>
        <button type="button" class="btn accent" data-act="play" title="Reproducir los pasos automáticamente">▶ Reproducir</button>
        <button type="button" class="btn" data-act="next" title="Siguiente paso (→)">Siguiente ▶</button>
        <button type="button" class="btn icon" data-act="last" title="Ir al resultado final (Fin)" aria-label="Ir al resultado final">⏭</button>
      </div>
      <div class="controls secondary">
        <button type="button" class="btn small" data-act="all">Mostrar todos</button>
        <button type="button" class="btn small" data-act="reset">Reiniciar</button>
        <label class="speed">Velocidad
          <select data-act="speed">${SPEEDS.map(([ms, label], i) => `<option value="${ms}"${i === 1 ? " selected" : ""}>${label}</option>`).join("")}</select>
        </label>
      </div>`;
    this.view = this.element.querySelector(".view");
    this.progress = this.element.querySelector(".progress");
    this.timeline = this.element.querySelector(".timeline");
    this.speed = this.element.querySelector("[data-act=speed]");
    this.buttons = Object.fromEntries([...this.element.querySelectorAll("button")].map((b) => [b.dataset.act, b]));

    this.buttons.first.addEventListener("click", () => this.reset());
    this.buttons.last.addEventListener("click", () => this.last());
    this.buttons.prev.addEventListener("click", () => this.previous());
    this.buttons.next.addEventListener("click", () => this.next());
    this.buttons.play.addEventListener("click", () => this.togglePlay());
    this.buttons.all.addEventListener("click", () => this.showAllSteps());
    this.buttons.reset.addEventListener("click", () => this.reset());
    this.speed.addEventListener("change", () => this.timer && this.startTimer());
    this.timeline.addEventListener("input", () => {
      this.pause();
      this.showAll = false;
      this.index = Number(this.timeline.value);
      this.render();
    });
    this.clear();
  }

  // ------------------------------------------------------------------ estado
  clear() {
    this.pause();
    this.active = false;
    this.title = "";
    this.inputs = [];
    this.steps = [];
    this.summary = [];
    this.index = 0; // cuántos pasos se han revelado
    this.showAll = false;
    this.render();
  }

  setProcedure(title, inputs, steps, summary = []) {
    this.pause();
    this.active = true;
    this.title = title;
    this.inputs = inputs;
    this.steps = steps;
    this.summary = summary;
    this.index = 0;
    this.showAll = false;
    this.render();
  }

  // ------------------------------------------------------------------ navegación
  next() {
    this.pause();
    if (this.index < this.steps.length) this.index += 1;
    this.render();
  }

  previous() {
    this.pause();
    if (this.showAll) {
      this.showAll = false;
      this.index = this.steps.length - 1;
    } else if (this.index > 0) {
      this.index -= 1;
    }
    this.render();
  }

  /** Ir al último paso (con el resumen final). */
  last() {
    this.pause();
    this.showAll = false;
    this.index = this.steps.length;
    this.render();
  }

  showAllSteps() {
    this.pause();
    this.showAll = true;
    this.index = this.steps.length;
    this.render();
  }

  reset() {
    this.pause();
    this.showAll = false;
    this.index = 0;
    this.render();
  }

  // ------------------------------------------------------------------ reproducción automática
  togglePlay() {
    if (this.timer) return this.pause();
    if (!this.active || !this.steps.length) return;
    if (this.showAll || this.index >= this.steps.length) {
      this.showAll = false;
      this.index = 0;
    }
    this.startTimer();
    this.tick(); // muestra el primer paso enseguida
  }

  startTimer() {
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), Number(this.speed.value));
    this.render();
  }

  tick() {
    if (this.index < this.steps.length) this.index += 1;
    if (this.index >= this.steps.length) this.pause(false);
    this.render();
  }

  pause(redraw = true) {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    if (redraw) this.render();
  }

  // ------------------------------------------------------------------ dibujo
  render() {
    const n = this.steps.length;
    const playing = this.timer !== null;
    this.buttons.play.textContent = playing ? "❚❚ Pausar" : "▶ Reproducir";
    if (!this.active) {
      this.view.innerHTML = html.placeholderHtml("Elige una operación, escribe tus matrices y pulsa «Calcular». Aquí verás cada paso del procedimiento.");
      this.progress.textContent = "";
      this.timeline.max = 0;
      this.timeline.value = 0;
      this.setButtons({ prev: false, play: false, next: false, all: false, reset: false, first: false, last: false });
      return;
    }

    const head = html.inputsHtml(this.title, this.inputs);
    const summary = html.summaryHtml(this.summary);
    let body;
    let label;
    if (n === 0) {
      [body, label] = [head + summary, "Sin pasos que mostrar"];
    } else if (this.showAll) {
      const all = this.steps.map((s, k) => `<div class="step">${html.stepHtml(s, `Paso ${k + 1} de ${n}`)}</div><hr>`).join("");
      [body, label] = [`${head}<hr>${all}${summary}`, `Mostrando los ${n} pasos`];
    } else if (this.index === 0) {
      const hint = html.placeholderHtml("Pulsa «Siguiente» o «Reproducir» para ver la primera operación.");
      [body, label] = [head + hint, `Inicio · 0 de ${n} pasos`];
    } else {
      const s = this.steps[this.index - 1];
      body = `<div class="step">${html.stepHtml(s, `Paso ${this.index} de ${n}`)}</div>`;
      if (this.index === n) body += summary;
      label = `Paso ${this.index} de ${n}`;
    }

    this.view.innerHTML = body;
    this.view.scrollTop = 0;
    this.progress.textContent = label;
    this.timeline.max = n;
    this.timeline.value = this.showAll ? n : this.index;
    this.timeline.style.setProperty("--fill", n ? `${((this.showAll ? n : this.index) / n) * 100}%` : "0%");
    this.setButtons({
      prev: this.showAll || this.index > 0,
      play: n > 0,
      next: !this.showAll && this.index < n,
      all: n > 0 && !this.showAll,
      reset: this.showAll || this.index > 0,
      first: this.showAll || this.index > 0,
      last: n > 0 && (this.showAll || this.index < n),
    });
  }

  setButtons({ prev, play, next, all, reset, first, last }) {
    this.buttons.first.disabled = !first;
    this.buttons.last.disabled = !last;
    this.buttons.prev.disabled = !prev;
    this.buttons.play.disabled = !play;
    this.buttons.next.disabled = !next;
    this.buttons.all.disabled = !all;
    this.buttons.reset.disabled = !reset;
    this.timeline.disabled = !play;
  }
}

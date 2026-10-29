/** Editor de una matriz: dimensiones, celdas editables, teclado, pegado, ejemplos y limpieza. */

import { fmt } from "../utils/formatting.js";
import { ValidationError } from "../utils/errors.js";
import { MAX_DIM, parseMatrix } from "../utils/validation.js";

/**
 * Convierte texto pegado (Excel, otra web, "[1 2; 3 4]"...) en una tabla de textos.
 * Columnas: tabuladores, espacios o ";". Filas: saltos de línea (o ";" si todo viene en una línea).
 * La coma sólo separa si va seguida de espacio, porque "2,5" es un decimal.
 * Devuelve { cells } (null si es un solo valor) o { error }.
 */
export function parsePastedMatrix(text) {
  let t = String(text).replace(/\r/g, "").replace(/[[\]]/g, "").trim();
  if (!t) return { cells: null };
  t = t.replace(/\s*\/\s*/g, "/"); // "3 / 4" es una sola fracción
  let rows;
  if (t.includes("\n")) rows = t.split("\n");
  else if (t.includes(";")) rows = t.split(";");
  else rows = [t];
  const table = rows
    .map((r) => r.trim())
    .filter((r) => r !== "")
    .map((r) => r.split(/\t|\s+|;|,(?=\s)/).filter((x) => x !== ""));
  if (table.length === 1 && table[0].length === 1) return { cells: null };
  const width = Math.max(...table.map((r) => r.length));
  if (table.length > MAX_DIM || width > MAX_DIM) {
    return { error: `Lo pegado es de ${table.length}×${width} y el máximo es ${MAX_DIM}×${MAX_DIM}.` };
  }
  return { cells: table.map((r) => [...r, ...Array(width - r.length).fill("")]) };
}

/** Tabla editable. Acepta enteros, decimales y fracciones (3/4). */
export class MatrixEditor {
  /**
   * @param {string} name       "A" o "B"
   * @param {Array}  examples   matrices de ejemplo (cada clic pasa a la siguiente)
   * @param {{size?: [number, number], notify?: (msg: string) => void, onResize?: () => void}} options
   */
  constructor(name, examples, { size = [2, 2], notify = () => {}, onResize = () => {} } = {}) {
    this.name = name;
    this.onResize = onResize; // se avisa cuando cambian las dimensiones (la ventana ajusta las opciones)
    this.examples = examples;
    this.nextExample = 0;
    this.notify = notify;
    this.values = []; // texto de cada celda, para conservarlo al cambiar de tamaño

    this.element = document.createElement("section");
    this.element.className = "editor";
    this.element.innerHTML = `
      <header class="editor-head">
        <h2 class="editor-title">Matriz ${name}</h2>
        <div class="dims-control">
          <label><span class="lbl-rows">Filas</span> <input type="number" class="rows" min="1" max="${MAX_DIM}" value="${size[0]}" inputmode="numeric"></label>
          <label><span class="lbl-cols">Columnas</span> <input type="number" class="cols" min="1" max="${MAX_DIM}" value="${size[1]}" inputmode="numeric"></label>
        </div>
      </header>
      <div class="matrix-input"><span class="bracket left"></span><div class="grid" role="group" aria-label="Celdas de la matriz ${name}"></div><span class="bracket right"></span></div>
      <p class="editor-note muted"></p>
      <div class="editor-actions">
        <button type="button" class="btn small" data-act="example" title="Carga una matriz de ejemplo (cada clic pasa al siguiente)">Ejemplo</button>
        <button type="button" class="btn small" data-act="random" title="Llena la matriz con enteros al azar">Aleatoria</button>
        <button type="button" class="btn small" data-act="identity" title="Unos en la diagonal y ceros en el resto">Identidad</button>
        <button type="button" class="btn small" data-act="zero" title="Llena toda la matriz con ceros">Nula</button>
        <button type="button" class="btn small" data-act="clear" title="Borra todas las celdas">Limpiar</button>
      </div>`;
    this.rowsInput = this.element.querySelector(".rows");
    this.colsInput = this.element.querySelector(".cols");
    this.grid = this.element.querySelector(".grid");
    this.augmented = false;
    this.note = this.element.querySelector(".editor-note");
    this.actions = this.element.querySelector(".editor-actions");

    this.rowsInput.addEventListener("input", () => this.resize());
    this.colsInput.addEventListener("input", () => this.resize());
    this.actions.addEventListener("click", (e) => {
      const act = e.target.closest("button")?.dataset.act;
      if (act === "example") this.loadExample();
      else if (act === "random") this.randomize();
      else if (act === "identity") this.makeIdentity();
      else if (act === "zero") this.makeZero();
      else if (act === "clear") this.clear();
    });
    this.grid.addEventListener("input", (e) => e.target.classList.remove("invalid")); // quita la marca de error al editar
    this.grid.addEventListener("keydown", (e) => this.onKeyDown(e));
    this.grid.addEventListener("paste", (e) => this.onPaste(e));
    this.resize();
  }

  /** Agrega un botón extra a la fila de acciones (p. ej. "Intercambiar con A"). */
  addAction(label, title, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn small";
    button.textContent = label;
    button.title = title;
    button.addEventListener("click", handler);
    this.actions.append(button);
  }

  /** Texto de ayuda bajo la matriz ("" lo oculta). */
  setNote(text) {
    this.note.textContent = text;
    this.note.hidden = !text;
  }

  /**
   * Modo sistema [A | b]: el campo de columnas pasa a contar sólo las incógnitas y se agrega
   * a la derecha una columna b separada por "=". El tamaño total de la tabla no cambia al activarlo.
   */
  setAugmented(on) {
    on = !!on;
    if (on === this.augmented) return this.markAugmented();
    this.syncValues();
    const total = this.dims()[1];
    this.augmented = on;
    this.colsInput.value = on ? Math.max(1, total - 1) : total;
    this.resize(false);
  }

  markAugmented() {
    const [, cols] = this.dims();
    const last = cols - 1;
    this.element.querySelector(".lbl-rows").textContent = this.augmented ? "Ecuaciones" : "Filas";
    this.element.querySelector(".lbl-cols").textContent = this.augmented ? "Incógnitas" : "Columnas";
    this.colsInput.max = this.augmented ? MAX_DIM - 1 : MAX_DIM;
    this.grid.querySelectorAll("input").forEach((input) => {
      const isB = this.augmented && Number(input.dataset.c) === last;
      input.classList.toggle("aug", isB);
      input.placeholder = isB ? "b" : "";
      input.title = isB ? `Lo que debe dar la ecuación ${Number(input.dataset.r) + 1}` : "";
    });
  }

  /** Cambia la lista de ejemplos (p. ej. al elegir "Sistema Ax = b"). */
  setExamples(examples) {
    this.examples = examples;
    this.nextExample = 0;
  }

  // ------------------------------------------------------------------ teclado y pegado
  focusCell(r, c) {
    const input = this.grid.querySelector(`input[data-r="${r}"][data-c="${c}"]`);
    if (input) {
      input.focus();
      input.select();
    }
    return !!input;
  }

  onKeyDown(e) {
    const input = e.target;
    if (!(input instanceof HTMLInputElement)) return;
    const r = Number(input.dataset.r);
    const c = Number(input.dataset.c);
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
    let handled = true;
    if (e.key === "ArrowDown") this.focusCell(r + 1, c);
    else if (e.key === "ArrowUp") this.focusCell(r - 1, c);
    else if (e.key === "ArrowLeft" && atStart) this.focusCell(r, c - 1);
    else if (e.key === "ArrowRight" && atEnd) this.focusCell(r, c + 1);
    else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
      // Enter baja; al final de la columna pasa al inicio de la siguiente. Shift+Enter sube.
      if (e.shiftKey) this.focusCell(r - 1, c);
      else if (!this.focusCell(r + 1, c)) this.focusCell(0, c + 1);
    } else handled = false;
    if (handled) e.preventDefault();
  }

  onPaste(e) {
    const { cells, error } = parsePastedMatrix(e.clipboardData?.getData("text") ?? "");
    if (error) {
      e.preventDefault();
      this.notify(error);
    } else if (cells) {
      e.preventDefault();
      this.setCells(cells);
      this.notify(`Matriz ${this.name} pegada (${cells.length}×${cells[0].length})`);
    } // si es un solo valor, se pega normalmente en la celda
  }

  // ------------------------------------------------------------------ tabla
  /** Dimensiones pedidas, forzadas al rango 1..MAX_DIM. */
  dims() {
    const clamp = (el, max) => Math.min(max, Math.max(1, parseInt(el.value, 10) || 1));
    const extra = this.augmented ? 1 : 0; // columna b
    return [clamp(this.rowsInput, MAX_DIM), clamp(this.colsInput, MAX_DIM - extra) + extra];
  }

  /** Lee los textos que hay ahora en la cuadrícula y los guarda en this.values. */
  syncValues() {
    this.grid.querySelectorAll("input").forEach((input) => {
      const { r, c } = input.dataset;
      (this.values[r] ??= [])[c] = input.value;
    });
  }

  /**
   * Redibuja la cuadrícula con las dimensiones pedidas.
   * `keep = true` conserva lo que el usuario ya escribió; con `false` se usa this.values tal cual
   * (setCells y clear ya dejaron this.values listo).
   */
  resize(keep = true) {
    if (keep) this.syncValues();
    const [rows, cols] = this.dims();
    this.grid.style.gridTemplateColumns = this.augmented
      ? `repeat(${cols - 1}, minmax(0, 1fr)) auto minmax(0, 1fr)`
      : `repeat(${cols}, minmax(0, 1fr))`;
    const html = [];
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (this.augmented && j === cols - 1) html.push(`<span class="eq" aria-hidden="true">=</span>`);
        html.push(
          `<input type="text" inputmode="text" autocomplete="off" spellcheck="false" ` +
            `aria-label="${this.name}[${i + 1},${j + 1}]" data-r="${i}" data-c="${j}">`,
        );
      }
    }
    this.grid.innerHTML = html.join("");
    this.grid.querySelectorAll("input").forEach((input) => {
      input.value = this.values[input.dataset.r]?.[input.dataset.c] ?? "";
    });
    this.markAugmented();
    this.onResize(rows, cols);
  }

  clearMarks() {
    this.grid.querySelectorAll("input.invalid").forEach((el) => el.classList.remove("invalid"));
  }

  markError(row, col) {
    const input = this.grid.querySelector(`input[data-r="${row}"][data-c="${col}"]`);
    if (input) {
      input.classList.add("invalid");
      input.focus();
    }
  }

  /** Los textos de las celdas visibles (para el historial). */
  getCells() {
    this.syncValues();
    const [rows, cols] = this.dims();
    return Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => this.values[i]?.[j] ?? ""));
  }

  /** Lee y valida la tabla. Lanza ValidationError indicando la celda defectuosa. */
  getMatrix() {
    this.clearMarks();
    try {
      return parseMatrix(this.getCells(), this.name);
    } catch (e) {
      if (e instanceof ValidationError && e.row !== null && e.col !== null) this.markError(e.row, e.col);
      throw e;
    }
  }

  /** Pone una tabla de textos y ajusta las dimensiones. */
  setCells(cells) {
    this.values = cells.map((row) => row.map(String));
    this.rowsInput.value = cells.length;
    this.colsInput.value = cells[0].length - (this.augmented && cells[0].length > 1 ? 1 : 0);
    this.resize(false);
  }

  /** Pone una matriz de Fractions / números / textos. */
  setMatrix(m) {
    this.setCells(m.map((row) => row.map((x) => fmt(x))));
  }

  clear() {
    this.values = [];
    this.resize(false);
  }

  randomize() {
    const [rows, cols] = this.dims();
    this.setCells(
      Array.from({ length: rows }, () => Array.from({ length: cols }, () => String(Math.floor(Math.random() * 11) - 5))),
    );
  }

  makeIdentity() {
    const [rows, cols] = this.dims();
    this.setCells(Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => (i === j ? "1" : "0"))));
  }

  makeZero() {
    const [rows, cols] = this.dims();
    this.setCells(Array.from({ length: rows }, () => Array(cols).fill("0")));
  }

  loadExample() {
    if (!this.examples.length) return;
    this.setMatrix(this.examples[this.nextExample % this.examples.length]);
    this.nextExample += 1;
  }
}

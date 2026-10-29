/**
 * Genera el HTML con el que se dibujan matrices y pasos.
 *
 * Son funciones puras (reciben datos y devuelven texto HTML): no tocan el DOM,
 * así que también se pueden probar con Node sin abrir un navegador.
 * Los colores y la tipografía viven en css/styles.css.
 */

import { Fraction } from "../utils/fraction.js";
import { fmt, fmtDecimal } from "../utils/formatting.js";
import { dimsText, matrixEqual } from "../utils/validation.js";

// Pasos cuyo "antes/después" es una operación elemental sobre la misma matriz.
const BEFORE_AFTER_KINDS = new Set(["swap", "scale", "add"]);

/** Escapa los caracteres especiales de HTML (evita que el texto del usuario se interprete como código). */
export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Escapa el texto y convierte saltos de línea en <br>. */
export const textHtml = (text) => escapeHtml(text).replaceAll("\n", "<br>");

const muted = (text) => `<span class="muted">${escapeHtml(text)}</span>`;

// Cómo se muestran los números: "fraction" (exacto) o "decimal" (sólo para mostrar, redondeado).
// El cálculo SIEMPRE es exacto; este ajuste no cambia ningún dato, sólo el texto en pantalla.
let numberMode = "fraction";
export const DECIMAL_DIGITS = 4;
export const setNumberMode = (mode) => { numberMode = mode === "decimal" ? "decimal" : "fraction"; };
export const getNumberMode = () => numberMode;

/** Un número como texto plano según el modo elegido. */
export function numberText(value) {
  const f = Fraction.of(value);
  return numberMode === "decimal" && !f.isInteger() ? fmtDecimal(f, DECIMAL_DIGITS, true) : fmt(f, true);
}

/** Un número dentro de una matriz: los enteros en línea y las fracciones apiladas (numerador sobre denominador). */
function numberHtml(value) {
  const f = Fraction.of(value);
  if (f.isInteger()) return escapeHtml(fmt(f, true));
  if (numberMode === "decimal") return escapeHtml(fmtDecimal(f, DECIMAL_DIGITS, true));
  const sign = f.sign < 0 ? '<span class="neg">−</span>' : "";
  return `${sign}<span class="frac"><span>${f.abs().numerator}</span><span>${f.denominator}</span></span>`;
}

/** Matriz como cuadrícula con corchetes, alineación uniforme y celdas resaltadas. */
export function matrixHtml(
  m,
  { highlightRows = [], highlightCells = [], pivot = null, splitCol = null, big = false, format = null, info = null } = {},
) {
  const rowsHl = new Set(highlightRows);
  const cellsHl = new Set(highlightCells.map(([i, j]) => `${i},${j}`));
  const cols = m[0].length;
  const cells = [];
  m.forEach((row, i) => {
    row.forEach((value, j) => {
      const classes = ["cell"];
      if (rowsHl.has(i)) classes.push("row-hl");
      if (cellsHl.has(`${i},${j}`)) classes.push("cell-hl");
      if (pivot && pivot[0] === i && pivot[1] === j) classes.push("pivot");
      if (splitCol !== null && j === splitCol) classes.push("split");
      // `info`: la celda se puede consultar (clic o Enter) y muestra de dónde sale; `format`: texto propio (p. ej. + o −).
      const inspect = info ? ` data-info="${escapeHtml(info(i, j))}" tabindex="0" role="button"` : "";
      if (info) classes.push("inspectable");
      const content = format ? escapeHtml(format(value)) : numberHtml(value);
      cells.push(`<span class="${classes.join(" ")}" title="${escapeHtml(fmt(value, true))}"${inspect}>${content}</span>`);
    });
  });
  return (
    `<div class="matrix${big ? " big" : ""}" role="img" aria-label="Matriz ${dimsText(m)}"><span class="bracket left"></span>` +
    `<div class="cells" style="grid-template-columns:repeat(${cols}, auto)">${cells.join("")}</div>` +
    `<span class="bracket right"></span></div>`
  );
}

const captioned = (caption, matrix) => `<div class="captioned">${muted(caption)}${matrix}</div>`;

/** Un paso completo: encabezado, operación, explicación y matrices antes/después. */
export function stepHtml(step, heading) {
  const parts = [];
  const tag = step.section ? `${heading}  ·  ${step.section}` : heading;
  parts.push(`<p class="step-tag">${muted(tag)}</p>`);
  parts.push(`<p class="step-op"><b>${escapeHtml(step.operation)}</b></p>`);
  parts.push(`<p class="step-expl">${textHtml(step.explanation)}</p>`);
  if (step.pivot) {
    const [r, c] = step.pivot;
    parts.push(`<p class="step-pivot">${muted(`Pivote actual: fila ${r + 1}, columna ${c + 1}`)}</p>`);
  }

  const { changedRows: rows, highlightCells: cells, matrixBefore: before, matrixAfter: after } = step;
  const opts = { highlightRows: rows, highlightCells: cells, pivot: step.pivot, splitCol: step.splitCol };
  if (before && after && matrixEqual(before, after)) {
    parts.push(`<div class="matrix-row">${matrixHtml(before, opts)}</div>`);
  } else if (before || after) {
    const [capA, capB] = BEFORE_AFTER_KINDS.has(step.kind) ? ["Antes", "Después"] : ["Matriz", "Resultado"];
    const items = [];
    if (before) items.push(captioned(capA, matrixHtml(before, opts)));
    if (before && after) items.push('<div class="arrow" aria-hidden="true">⟶</div>');
    // La matriz "después" no resalta celdas sueltas, sólo filas y pivote.
    if (after) {
      items.push(
        captioned(capB, matrixHtml(after, { highlightRows: rows, pivot: step.pivot, splitCol: step.splitCol })),
      );
    }
    parts.push(`<div class="matrix-row">${items.join("")}</div>`);
  }
  return parts.join("");
}

/** Datos de entrada del procedimiento (estado inicial, antes del primer paso). */
export function inputsHtml(title, inputs) {
  const items = inputs.map(([name, m]) => captioned(`${name} (${dimsText(m)})`, matrixHtml(m)));
  return `<p class="inputs-title"><b>${escapeHtml(title)}</b></p><div class="matrix-row spaced">${items.join("")}</div>`;
}

const KIND_STYLE = { ok: ["✔", "ok"], error: ["✖", "error"], warn: ["⚠", "warn"], info: ["ℹ", "info"] };

export function messageHtml(kind, text) {
  const [icon, cls] = KIND_STYLE[kind] ?? KIND_STYLE.info;
  return `<p class="message ${cls}" role="${kind === "error" ? "alert" : "status"}"><b aria-hidden="true">${icon}</b>&nbsp;${textHtml(text)}</p>`;
}

export function summaryHtml(lines) {
  if (!lines.length) return "";
  const items = lines.map((line) => `<li>${textHtml(line)}</li>`).join("");
  return `<hr><p class="summary-title"><b>Resumen</b></p><ul class="summary">${items}</ul>`;
}

export const placeholderHtml = (text) => `<p class="placeholder">${textHtml(text)}</p>`;

/**
 * Panel de resultados: matrices (con sus dimensiones y acciones) y valores sueltos.
 * Cada matriz lleva botones con data-act / data-i que el panel atiende por delegación de eventos.
 */
export function resultsHtml(results, message = null) {
  const parts = [];
  if (message) parts.push(messageHtml(...message));
  results.forEach(([label, obj, opts = {}], i) => {
    const block = [`<p class="result-label"><b>${escapeHtml(label)}</b></p>`];
    if (Array.isArray(obj)) {
      block.push(matrixHtml(obj, { big: true, format: opts.format, info: opts.info }));
      if (opts.info) {
        block.push(`<p class="cell-info muted" aria-live="polite">Haz clic en una celda para ver de dónde sale.</p>`);
      }
      block.push(
        `<div class="result-meta">${muted(`Dimensiones: ${dimsText(obj)}`)}` +
          `<span class="result-actions">` +
          `<button type="button" class="btn small" data-act="copy" data-i="${i}" title="Copiar como texto">Copiar</button>` +
          `<button type="button" class="btn small" data-act="latex" data-i="${i}" title="Copiar como código LaTeX">LaTeX</button>` +
          `<button type="button" class="btn small" data-act="toA" data-i="${i}" title="Poner esta matriz en el editor A">Usar como A</button>` +
          `<button type="button" class="btn small" data-act="toB" data-i="${i}" title="Poner esta matriz en el editor B">Usar como B</button>` +
          `</span></div>`,
      );
    } else {
      const text = obj instanceof Fraction ? numberText(obj) : String(obj);
      block.push(`<p class="result-value">${textHtml(text)}</p>`);
    }
    parts.push(`<div class="result-block" data-i="${i}">${block.join("")}</div>`);
  });
  const hasFraction = results.some(([, v]) =>
    Array.isArray(v) ? v.some((row) => row.some((x) => !Fraction.of(x).isInteger())) : v instanceof Fraction && !v.isInteger(),
  );
  if (numberMode === "decimal" && hasFraction) {
    parts.push(
      `<p class="muted note">Decimales redondeados a ${DECIMAL_DIGITS} cifras sólo para mostrarlos. Los cálculos siguen siendo exactos (pasa el cursor sobre un número para ver su valor exacto).</p>`,
    );
  }
  return parts.length ? parts.join("") : placeholderHtml("Sin resultados.");
}

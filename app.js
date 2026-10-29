(function () {
"use strict";
const __defs = {}, __cache = {};
function __req(k) { if (!__cache[k]) { const e = __cache[k] = {}; __defs[k](e); } return __cache[k]; }
__defs['js/utils/errors.js'] = function (__exports) {
/**
 * Errores previstos de MatrixLab.
 *
 * Todos heredan de MatrixLabError. La interfaz captura esta clase base y muestra
 * el mensaje al usuario sin mostrar trazas internas.
 */

/** Base de los errores matemáticos o de entrada que se informan al usuario. */
class MatrixLabError extends Error {
  constructor(message) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Un dato de entrada no es válido (celda vacía, texto no numérico, etc.).
 * Si corresponde a una celda concreta se guardan su fila y columna (base 0)
 * para que la interfaz pueda resaltarla.
 */
class ValidationError extends MatrixLabError {
  constructor(message, row = null, col = null) {
    super(message);
    this.row = row;
    this.col = col;
  }
}

/** Las dimensiones de las matrices no permiten realizar la operación. */
class DimensionError extends MatrixLabError {}

/** La operación exige una matriz cuadrada y se recibió una rectangular. */
class NotSquareError extends DimensionError {}

__exports.MatrixLabError = MatrixLabError;
__exports.ValidationError = ValidationError;
__exports.DimensionError = DimensionError;
__exports.NotSquareError = NotSquareError;
};
__defs['js/config.js'] = function (__exports) {
/**
 * Configuración de MatrixLab.
 *
 * El tamaño máximo de las matrices NO es una restricción matemática de los métodos:
 * sólo cuida que la pantalla siga siendo legible. Se puede cambiar de dos formas:
 *   1. Editando DEFAULT_MAX_DIM aquí.
 *   2. Abriendo la página con ?maxDim=12 al final de la dirección (entre 1 y 30).
 */

const DEFAULT_MAX_DIM = 10;
const ABSOLUTE_LIMIT = 30;

/** Lee ?maxDim=N de la dirección (sólo existe en el navegador; en Node se usa el valor por defecto). */
function maxDimFromUrl(search) {
  const raw = new URLSearchParams(search ?? "").get("maxDim");
  const value = raw === null ? NaN : Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= ABSOLUTE_LIMIT ? value : null;
}

const CONFIG = Object.freeze({
  maxDim: maxDimFromUrl(globalThis.location?.search) ?? DEFAULT_MAX_DIM,
});

__exports.DEFAULT_MAX_DIM = DEFAULT_MAX_DIM;
__exports.maxDimFromUrl = maxDimFromUrl;
__exports.CONFIG = CONFIG;
};
__defs['js/utils/fraction.js'] = function (__exports) {
/**
 * Fraction: número racional exacto (equivalente a `fractions.Fraction` de Python).
 *
 * JavaScript no trae fracciones y sus números normales (`Number`) son decimales
 * binarios: 1/3 se guardaría como 0.3333... y los errores se acumularían.
 * Por eso guardamos numerador y denominador como BigInt (enteros sin límite)
 * y siempre los dejamos simplificados con el máximo común divisor.
 */

function gcd(a, b) {
  if (a < 0n) a = -a;
  if (b < 0n) b = -b;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

/** Error propio para "denominador cero" (lo captura validation.parseValue). */
class ZeroDenominatorError extends RangeError {}

class Fraction {
  constructor(numerator, denominator = 1n) {
    let num = BigInt(numerator);
    let den = BigInt(denominator);
    if (den === 0n) throw new ZeroDenominatorError("denominador cero");
    if (den < 0n) {
      num = -num;
      den = -den;
    }
    const g = gcd(num, den) || 1n;
    this.numerator = num / g;
    this.denominator = den / g;
    Object.freeze(this);
  }

  /** Convierte Fraction, BigInt, entero o texto ("3/4", "1.5") en Fraction. */
  static of(x) {
    if (x instanceof Fraction) return x;
    if (typeof x === "bigint") return new Fraction(x);
    if (typeof x === "number") {
      if (!Number.isInteger(x)) throw new TypeError("Use texto para decimales (p. ej. '1.5') o new Fraction(p, q).");
      return new Fraction(BigInt(x));
    }
    if (typeof x === "string") return Fraction.parse(x);
    throw new TypeError(`No se puede convertir a Fraction: ${x}`);
  }

  /**
   * Lee "3", "-3/4", "1.5", "2e3". Lanza SyntaxError si el formato es inválido
   * y ZeroDenominatorError si el denominador es 0.
   */
  static parse(text) {
    const m = /^([-+]?)(?=\d|\.\d)(\d*)(?:\/(\d+)|(?:\.(\d*))?(?:[eE]([-+]?\d+))?)$/.exec(String(text).trim());
    if (!m) throw new SyntaxError(`Fracción inválida: ${text}`);
    const [, sign, intPart, den, decimals = "", exp] = m;
    let result;
    if (den !== undefined) {
      result = new Fraction(BigInt(intPart || "0"), BigInt(den));
    } else {
      // "12.34" = 1234 / 10^2
      result = new Fraction(BigInt((intPart + decimals) || "0"), 10n ** BigInt(decimals.length));
      if (exp !== undefined) {
        const e = parseInt(exp, 10);
        if (Math.abs(e) > 1000) throw new SyntaxError("Exponente demasiado grande.");
        const factor = 10n ** BigInt(Math.abs(e));
        result = e >= 0 ? result.mul(new Fraction(factor)) : result.div(new Fraction(factor));
      }
    }
    return sign === "-" ? result.neg() : result;
  }

  add(o) {
    o = Fraction.of(o);
    return new Fraction(this.numerator * o.denominator + o.numerator * this.denominator, this.denominator * o.denominator);
  }
  sub(o) {
    o = Fraction.of(o);
    return new Fraction(this.numerator * o.denominator - o.numerator * this.denominator, this.denominator * o.denominator);
  }
  mul(o) {
    o = Fraction.of(o);
    return new Fraction(this.numerator * o.numerator, this.denominator * o.denominator);
  }
  div(o) {
    o = Fraction.of(o);
    return new Fraction(this.numerator * o.denominator, this.denominator * o.numerator);
  }
  neg() {
    return new Fraction(-this.numerator, this.denominator);
  }
  abs() {
    return this.numerator < 0n ? this.neg() : this;
  }
  inverse() {
    return new Fraction(this.denominator, this.numerator);
  }

  /** -1, 0 o 1 según el signo. */
  get sign() {
    return this.numerator < 0n ? -1 : this.numerator > 0n ? 1 : 0;
  }
  isZero() {
    return this.numerator === 0n;
  }
  /** this == o ? (las fracciones están simplificadas, basta comparar las partes) */
  eq(o) {
    o = Fraction.of(o);
    return this.numerator === o.numerator && this.denominator === o.denominator;
  }
  isInteger() {
    return this.denominator === 1n;
  }
  toString() {
    return this.isInteger() ? `${this.numerator}` : `${this.numerator}/${this.denominator}`;
  }
}

__exports.ZeroDenominatorError = ZeroDenominatorError;
__exports.Fraction = Fraction;
};
__defs['js/utils/validation.js'] = function (__exports) {
/**
 * Validación de dimensiones, valores numéricos y condiciones matemáticas.
 *
 * Las matrices son arreglos de arreglos de `Fraction` (aritmética exacta:
 * 1/3 se conserva como 1/3, no como 0.3333).
 */

const { CONFIG } = __req('js/config.js');
const { Fraction, ZeroDenominatorError } = __req('js/utils/fraction.js');
const { DimensionError, NotSquareError, ValidationError } = __req('js/utils/errors.js');

const MAX_DIM = CONFIG.maxDim; // configurable en js/config.js

/** Convierte texto (entero, decimal o fracción como 3/4) en Fraction. */
function parseValue(text) {
  const raw = String(text);
  const cleaned = raw.trim().replaceAll("−", "-").replaceAll(",", ".").replaceAll(" ", "");
  if (!cleaned) throw new ValidationError("la celda está vacía");
  try {
    return Fraction.parse(cleaned);
  } catch (e) {
    if (e instanceof ZeroDenominatorError) {
      throw new ValidationError(`«${raw.trim()}» tiene denominador cero`);
    }
    throw new ValidationError(
      `«${raw.trim()}» no es un número válido (use enteros, decimales o fracciones como 3/4)`,
    );
  }
}

/** Convierte una tabla de textos en una matriz de fracciones, indicando la celda problemática. */
function parseMatrix(cells, name = "A") {
  if (!cells.length || !cells[0].length) throw new ValidationError(`La matriz ${name} no tiene filas o columnas.`);
  const width = cells[0].length;
  if (cells.some((row) => row.length !== width)) throw new ValidationError(`La matriz ${name} no es rectangular.`);
  return cells.map((row, i) =>
    row.map((text, j) => {
      try {
        return parseValue(text);
      } catch (e) {
        if (e instanceof ValidationError) {
          throw new ValidationError(`Celda ${name}[${i + 1},${j + 1}]: ${e.message}.`, i, j);
        }
        throw e;
      }
    }),
  );
}

/** Valida que `data` sea una matriz no vacía y rectangular; la devuelve como fracciones. */
function toMatrix(data, name = "A") {
  if (!data.length || !data[0].length) throw new ValidationError(`La matriz ${name} no tiene filas o columnas.`);
  const width = data[0].length;
  if (data.some((row) => row.length !== width)) throw new ValidationError(`La matriz ${name} no es rectangular.`);
  return data.map((row) => row.map((x) => Fraction.of(x)));
}

/** Las dimensiones deben ser enteros positivos (y no exceder MAX_DIM). */
function validateDimensions(rows, cols) {
  for (const [value, label] of [[rows, "filas"], [cols, "columnas"]]) {
    if (!Number.isInteger(value) || value < 1) {
      throw new ValidationError(`El número de ${label} debe ser un entero positivo.`);
    }
    if (value > MAX_DIM) throw new ValidationError(`El número de ${label} no puede ser mayor que ${MAX_DIM}.`);
  }
}

const dimensions = (m) => [m.length, m[0].length];

function dimsText(m) {
  const [r, c] = dimensions(m);
  return `${r}×${c}`;
}

/** ¿Las dos matrices tienen los mismos valores (y las mismas dimensiones)? */
function matrixEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((row, i) => row.length === b[i].length && row.every((x, j) => x.eq(b[i][j])));
}

function requireSameDimensions(a, b, verb) {
  const [ra, ca] = dimensions(a);
  const [rb, cb] = dimensions(b);
  if (ra !== rb || ca !== cb) {
    throw new DimensionError(
      `Para ${verb} matrices ambas deben tener las mismas dimensiones: A es ${dimsText(a)} y B es ${dimsText(b)}.`,
    );
  }
}

function requireMultipliable(a, b) {
  if (dimensions(a)[1] !== dimensions(b)[0]) {
    throw new DimensionError(
      "Para multiplicar A·B el número de columnas de A debe coincidir con el número " +
        `de filas de B: A es ${dimsText(a)} y B es ${dimsText(b)}.`,
    );
  }
}

function requireSquare(m, what = "esta operación") {
  const [r, c] = dimensions(m);
  if (r !== c) {
    throw new NotSquareError(
      `${what.charAt(0).toUpperCase() + what.slice(1)} requiere una matriz cuadrada; ` +
        `la matriz ingresada es ${dimsText(m)}.`,
    );
  }
}

__exports.MAX_DIM = MAX_DIM;
__exports.parseValue = parseValue;
__exports.parseMatrix = parseMatrix;
__exports.toMatrix = toMatrix;
__exports.validateDimensions = validateDimensions;
__exports.dimensions = dimensions;
__exports.dimsText = dimsText;
__exports.matrixEqual = matrixEqual;
__exports.requireSameDimensions = requireSameDimensions;
__exports.requireMultipliable = requireMultipliable;
__exports.requireSquare = requireSquare;
};
__defs['js/utils/formatting.js'] = function (__exports) {
/**
 * Representación legible de números y matrices (texto plano).
 *
 * Las fracciones exactas se conservan: 3/2 se muestra como "3/2".
 * La representación en HTML para la interfaz vive en ui/htmlRender.js.
 */

const { Fraction } = __req('js/utils/fraction.js');

const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";

/** Devuelve n con dígitos subíndice (2 -> ₂). */
function subscript(n) {
  return String(n).replace(/\d/g, (d) => SUBSCRIPTS[Number(d)]);
}

/** Formatea un número exacto: enteros sin denominador y fracciones como p/q. */
function fmt(x, pretty = false) {
  const text = Fraction.of(x).toString();
  return pretty ? text.replaceAll("-", "−") : text;
}

/** Como fmt pero entre paréntesis si el valor es negativo (útil en productos). */
function fmtParen(x, pretty = false) {
  const text = fmt(x, pretty);
  return Fraction.of(x).sign < 0 ? `(${text})` : text;
}

/** Coeficiente para operaciones de fila: 1 se omite, fracciones/negativos van entre paréntesis. */
function coef(c) {
  c = Fraction.of(c);
  if (c.eq(1)) return "";
  if (c.isInteger() && c.sign > 0) return String(c.numerator);
  return `(${fmt(c)})`;
}

/** Matriz con columnas alineadas, una fila por línea. */
function matrixToText(m) {
  const cells = m.map((row) => row.map((x) => fmt(x)));
  const widths = cells[0].map((_, j) => Math.max(...cells.map((row) => row[j].length)));
  return cells.map((row) => "[ " + row.map((c, j) => c.padStart(widths[j])).join("  ") + " ]").join("\n");
}

/** Matriz como arreglos de textos (para editores y pruebas legibles). */
function matrixToLists(m) {
  return m.map((row) => row.map((x) => fmt(x)));
}

/** Un número en LaTeX: enteros tal cual y fracciones como \frac{p}{q} (el signo va delante). */
function fmtLatex(x) {
  const f = Fraction.of(x);
  if (f.isInteger()) return String(f.numerator);
  const sign = f.sign < 0 ? "-" : "";
  return `${sign}\\frac{${f.abs().numerator}}{${f.denominator}}`;
}

/** Matriz en LaTeX (entorno bmatrix), lista para pegar en un documento. */
function matrixToLatex(m) {
  const rows = m.map((row) => "  " + row.map((x) => fmtLatex(x)).join(" & "));
  return `\\begin{bmatrix}\n${rows.join(" \\\\\n")}\n\\end{bmatrix}`;
}

/** Decimal redondeado (por defecto a 4 cifras, sin ceros finales). Sólo para mostrar; el cálculo sigue siendo exacto. */
function fmtDecimal(x, digits = 4, pretty = false) {
  const f = Fraction.of(x);
  const n = f.sign < 0 ? -f.numerator : f.numerator;
  const scale = 10n ** BigInt(digits);
  const scaled = (n * scale * 2n + f.denominator) / (2n * f.denominator); // redondeo half-up con BigInt
  const frac = (scaled % scale).toString().padStart(digits, "0").replace(/0+$/, "");
  let text = `${scaled / scale}${frac ? "." + frac : ""}`;
  if (f.sign < 0 && scaled !== 0n) text = "-" + text;
  return pretty ? text.replaceAll("-", "−") : text;
}

__exports.subscript = subscript;
__exports.fmt = fmt;
__exports.fmtParen = fmtParen;
__exports.coef = coef;
__exports.matrixToText = matrixToText;
__exports.matrixToLists = matrixToLists;
__exports.fmtLatex = fmtLatex;
__exports.matrixToLatex = matrixToLatex;
__exports.fmtDecimal = fmtDecimal;
};
__defs['js/ui/htmlRender.js'] = function (__exports) {
/**
 * Genera el HTML con el que se dibujan matrices y pasos.
 *
 * Son funciones puras (reciben datos y devuelven texto HTML): no tocan el DOM,
 * así que también se pueden probar con Node sin abrir un navegador.
 * Los colores y la tipografía viven en css/styles.css.
 */

const { Fraction } = __req('js/utils/fraction.js');
const { fmt, fmtDecimal } = __req('js/utils/formatting.js');
const { dimsText, matrixEqual } = __req('js/utils/validation.js');

// Pasos cuyo "antes/después" es una operación elemental sobre la misma matriz.
const BEFORE_AFTER_KINDS = new Set(["swap", "scale", "add"]);

/** Escapa los caracteres especiales de HTML (evita que el texto del usuario se interprete como código). */
function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Escapa el texto y convierte saltos de línea en <br>. */
const textHtml = (text) => escapeHtml(text).replaceAll("\n", "<br>");

const muted = (text) => `<span class="muted">${escapeHtml(text)}</span>`;

// Cómo se muestran los números: "fraction" (exacto) o "decimal" (sólo para mostrar, redondeado).
// El cálculo SIEMPRE es exacto; este ajuste no cambia ningún dato, sólo el texto en pantalla.
let numberMode = "fraction";
const DECIMAL_DIGITS = 4;
const setNumberMode = (mode) => { numberMode = mode === "decimal" ? "decimal" : "fraction"; };
const getNumberMode = () => numberMode;

/** Un número como texto plano según el modo elegido. */
function numberText(value) {
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
function matrixHtml(
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
function stepHtml(step, heading) {
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
function inputsHtml(title, inputs) {
  const items = inputs.map(([name, m]) => captioned(`${name} (${dimsText(m)})`, matrixHtml(m)));
  return `<p class="inputs-title"><b>${escapeHtml(title)}</b></p><div class="matrix-row spaced">${items.join("")}</div>`;
}

const KIND_STYLE = { ok: ["✔", "ok"], error: ["✖", "error"], warn: ["⚠", "warn"], info: ["ℹ", "info"] };

function messageHtml(kind, text) {
  const [icon, cls] = KIND_STYLE[kind] ?? KIND_STYLE.info;
  return `<p class="message ${cls}" role="${kind === "error" ? "alert" : "status"}"><b aria-hidden="true">${icon}</b>&nbsp;${textHtml(text)}</p>`;
}

function summaryHtml(lines) {
  if (!lines.length) return "";
  const items = lines.map((line) => `<li>${textHtml(line)}</li>`).join("");
  return `<hr><p class="summary-title"><b>Resumen</b></p><ul class="summary">${items}</ul>`;
}

const placeholderHtml = (text) => `<p class="placeholder">${textHtml(text)}</p>`;

/**
 * Panel de resultados: matrices (con sus dimensiones y acciones) y valores sueltos.
 * Cada matriz lleva botones con data-act / data-i que el panel atiende por delegación de eventos.
 */
function resultsHtml(results, message = null) {
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

__exports.escapeHtml = escapeHtml;
__exports.textHtml = textHtml;
__exports.DECIMAL_DIGITS = DECIMAL_DIGITS;
__exports.setNumberMode = setNumberMode;
__exports.getNumberMode = getNumberMode;
__exports.numberText = numberText;
__exports.matrixHtml = matrixHtml;
__exports.stepHtml = stepHtml;
__exports.inputsHtml = inputsHtml;
__exports.messageHtml = messageHtml;
__exports.summaryHtml = summaryHtml;
__exports.placeholderHtml = placeholderHtml;
__exports.resultsHtml = resultsHtml;
};
__defs['js/ui/help.js'] = function (__exports) {
/**
 * Ayuda y ejemplos preparados.
 *
 * Los ejemplos sirven para la exposición: cada uno carga las matrices, elige la operación
 * y calcula. Se pueden usar también para probar casos especiales (singular, rectangular,
 * sistema sin solución…).
 */

const { escapeHtml } = __req('js/ui/htmlRender.js');

/** op: clave de la operación · a, b: matrices (números o textos) · options: opciones de esa operación. */
const HELP_EXAMPLES = [
  { group: "Gauss y Gauss-Jordan", title: "Necesita intercambio de filas", desc: "El pivote de la primera columna es 0: hay que intercambiar F₁ ↔ F₂.", op: "gauss", a: [[0, 2, 1], [1, 1, 1], [2, 1, -1]] },
  { group: "Gauss y Gauss-Jordan", title: "Sólo eliminación de Gauss", desc: "La misma matriz, pero sin normalizar pivotes ni eliminar por encima: forma escalonada.", op: "gauss", a: [[0, 2, 1], [1, 1, 1], [2, 1, -1]], options: { gaussMode: "gauss" } },
  { group: "Gauss y Gauss-Jordan", title: "Matriz singular (rango 2)", desc: "Termina con una fila nula: el rango es menor que 3.", op: "gauss", a: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] },
  { group: "Gauss y Gauss-Jordan", title: "Matriz rectangular 2×3", desc: "Funciona con cualquier tamaño; la columna sin pivote queda libre.", op: "gauss", a: [[1, 2, 3], [4, 5, 6]] },
  { group: "Gauss y Gauss-Jordan", title: "Con fracciones", desc: "Los resultados se mantienen exactos: nada de 0.3333.", op: "gauss", a: [["1/2", "1/3", 1], ["1/4", "3/4", 2]] },
  { group: "Sistemas Ax = b", title: "Solución única", desc: "Tres ecuaciones, tres incógnitas: x₁ = 2, x₂ = 3, x₃ = −1.", op: "system", a: [[2, 1, -1, 8], [-3, -1, 2, -11], [-2, 1, 2, -3]] },
  { group: "Sistemas Ax = b", title: "Infinitas soluciones", desc: "La segunda ecuación es el doble de la primera: quedan variables libres.", op: "system", a: [[1, 2, -1, 3], [2, 4, -2, 6]] },
  { group: "Sistemas Ax = b", title: "Sin solución", desc: "x + y = 2 y x + y = 3 a la vez es imposible.", op: "system", a: [[1, 1, 2], [1, 1, 3]] },
  { group: "Determinantes", title: "Regla de Sarrus (3×3)", desc: "Diagonales que suman y diagonales que restan.", op: "det", a: [[2, 1, 1], [1, 3, 2], [1, 0, 0]], options: { detMethod: "sarrus" } },
  { group: "Determinantes", title: "Cofactores en una matriz 4×4", desc: "Expansión por la fila 2, que tiene un 0 y ahorra un cálculo.", op: "det", a: [[2, 0, 1, 3], [1, 1, 0, 2], [0, 2, 1, 1], [1, 0, 3, 1]], options: { detMethod: "cofactors-row", detIndex: 2 } },
  { group: "Determinantes", title: "Determinante cero", desc: "Una matriz con det(A) = 0 es singular.", op: "det", a: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] },
  { group: "Cofactores, adjunta e inversa", title: "Menores y cofactores", desc: "Haz clic en las celdas del resultado para ver de dónde sale cada valor.", op: "cofactors", a: [[2, 1, 1], [1, 3, 2], [1, 0, 0]] },
  { group: "Cofactores, adjunta e inversa", title: "Adjunta y comprobación", desc: "adj(A) = Cᵀ y se verifica que A·adj(A) = det(A)·I.", op: "adjugate", a: [[2, 1, 1], [1, 3, 2], [1, 0, 0]] },
  { group: "Cofactores, adjunta e inversa", title: "Inversa por Gauss-Jordan", desc: "Se reduce [A | I] hasta que la izquierda sea la identidad.", op: "inverse", a: [[2, 1, 1], [1, 3, 2], [1, 0, 0]], options: { invMethod: "gauss" } },
  { group: "Cofactores, adjunta e inversa", title: "Inversa de una matriz singular", desc: "No falla: explica por qué no existe la inversa.", op: "inverse", a: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] },
  { group: "Operaciones básicas", title: "Tipo de matriz", desc: "Reconoce una matriz simétrica.", op: "classify", a: [[1, 2, 3], [2, 4, 5], [3, 5, 6]] },
  { group: "Operaciones básicas", title: "Error de dimensiones", desc: "Multiplicar 2×3 por 2×2 no se puede: se explica el motivo.", op: "mul", a: [[1, 2, 3], [4, 5, 6]], b: [[1, 2], [3, 4]] },
];

const SHORTCUTS = [
  ["Ctrl + Enter", "Calcular"],
  ["← →", "Paso anterior / siguiente"],
  ["Inicio, Fin", "Ir al primer o al último paso"],
  ["Flechas y Enter", "Moverse entre las celdas de una matriz"],
  ["Ctrl + V", "Pegar una matriz desde Excel o Google Sheets"],
];

const DET_PROPERTIES = [
  "Intercambiar dos filas cambia el signo del determinante.",
  "Multiplicar una fila por un número k multiplica el determinante por k.",
  "Sumar a una fila un múltiplo de otra no cambia el determinante.",
  "det(Aᵀ) = det(A).",
  "det(I) = 1.",
  "Si det(A) = 0, la matriz es singular y no tiene inversa.",
  "Si una fila (o columna) es toda de ceros, o dos filas son iguales o proporcionales, det(A) = 0.",
  "det(A·B) = det(A)·det(B).",
];

/** Contenido del cuadro de ayuda. */
function helpHtml() {
  const groups = [...new Set(HELP_EXAMPLES.map((e) => e.group))];
  const examples = groups
    .map(
      (g) => `<h4>${escapeHtml(g)}</h4><div class="ex-list">${HELP_EXAMPLES.map((e, i) =>
        e.group === g
          ? `<button type="button" class="ex-item" data-ex="${i}"><b>${escapeHtml(e.title)}</b><span>${escapeHtml(e.desc)}</span></button>`
          : "",
      ).join("")}</div>`,
    )
    .join("");
  return `
    <section><h3>Cómo escribir los números</h3>
      <p>Enteros (<code>3</code>), decimales (<code>0.5</code> o <code>0,5</code>) y fracciones (<code>3/4</code>). Los decimales se convierten en fracciones exactas (0.5 pasa a ser 1/2), por eso no hay errores de redondeo ni tolerancias. Las celdas vacías o con texto se marcan en rojo.</p>
      <p>El tamaño máximo es de 10×10 y se puede cambiar con <code>?maxDim=12</code> al final de la dirección de la página.</p></section>
    <section><h3>Qué significan los colores</h3>
      <ul class="legend-list">
        <li><i class="swatch pivot"></i><b>Amarillo:</b> el pivote que se está usando.</li>
        <li><i class="swatch row"></i><b>Violeta:</b> la fila que cambia en esta operación.</li>
        <li><i class="swatch focus"></i><b>Verde:</b> los elementos que se señalan (diagonales de Sarrus, fila y columna de un menor, términos de un cofactor).</li>
      </ul></section>
    <section><h3>Atajos</h3>
      <dl class="keys">${SHORTCUTS.map(([k, d]) => `<dt><kbd>${escapeHtml(k)}</kbd></dt><dd>${escapeHtml(d)}</dd>`).join("")}</dl></section>
    <section><h3>Propiedades de los determinantes</h3>
      <ul>${DET_PROPERTIES.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
      <p class="muted">Al calcular un determinante, MatrixLab lo comprueba con los demás métodos y con la transpuesta.</p></section>
    <section><h3>Ejemplos preparados</h3>
      <p class="muted">Un clic carga la matriz, elige la operación y calcula.</p>${examples}</section>`;
}

__exports.HELP_EXAMPLES = HELP_EXAMPLES;
__exports.helpHtml = helpHtml;
};
__defs['js/ui/history.js'] = function (__exports) {
/**
 * Historial de cálculos guardado en el navegador (localStorage).
 *
 * Cada entrada guarda la operación, las matrices como texto y las opciones, de modo
 * que se puede volver a cargar y calcular con un clic. Si el navegador no permite
 * guardar (modo privado, etc.) la aplicación sigue funcionando sin historial.
 */

const KEY = "matrixlab.history.v1";
const MAX_ENTRIES = 15;

const isGrid = (g) => Array.isArray(g) && g.length > 0 && g.every((r) => Array.isArray(r) && r.length === g[0].length);

/** Una entrada es válida si tiene la forma esperada (el almacenamiento puede haber sido modificado). */
function isValidEntry(e) {
  return !!e && typeof e.op === "string" && isGrid(e.a) && (e.b === null || isGrid(e.b));
}

function loadHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(value) ? value.filter(isValidEntry) : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* sin almacenamiento disponible: se ignora */
  }
}

/** Agrega una entrada al inicio (sin repetir la anterior idéntica). Devuelve la lista nueva. */
function pushEntry(entry) {
  const list = loadHistory();
  const sameAsLast = list[0] && JSON.stringify({ ...list[0], t: 0 }) === JSON.stringify({ ...entry, t: 0 });
  if (!sameAsLast) {
    list.unshift(entry);
    list.length = Math.min(list.length, MAX_ENTRIES);
    save(list);
  }
  return list;
}

function clearHistory() {
  save([]);
}

__exports.isValidEntry = isValidEntry;
__exports.loadHistory = loadHistory;
__exports.pushEntry = pushEntry;
__exports.clearHistory = clearHistory;
};
__defs['js/ui/matrixEditor.js'] = function (__exports) {
/** Editor de una matriz: dimensiones, celdas editables, teclado, pegado, ejemplos y limpieza. */

const { fmt } = __req('js/utils/formatting.js');
const { ValidationError } = __req('js/utils/errors.js');
const { MAX_DIM, parseMatrix } = __req('js/utils/validation.js');

/**
 * Convierte texto pegado (Excel, otra web, "[1 2; 3 4]"...) en una tabla de textos.
 * Columnas: tabuladores, espacios o ";". Filas: saltos de línea (o ";" si todo viene en una línea).
 * La coma sólo separa si va seguida de espacio, porque "2,5" es un decimal.
 * Devuelve { cells } (null si es un solo valor) o { error }.
 */
function parsePastedMatrix(text) {
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
class MatrixEditor {
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

__exports.parsePastedMatrix = parsePastedMatrix;
__exports.MatrixEditor = MatrixEditor;
};
__defs['js/core/steps.js'] = function (__exports) {
/** Estructuras compartidas para registrar los procedimientos paso a paso. */

const copyMatrix = (m) => m.map((row) => row.slice());

/**
 * Un paso de un procedimiento (una operación elemental, un término, un menor...).
 *
 * Los algoritmos crean estos pasos *mientras* calculan; nunca se reconstruyen
 * después a partir del resultado final.
 *
 * Campos:
 *   number         número del paso
 *   operation      p. ej. "F₂ ← F₂ − 3F₁"
 *   explanation    objetivo de la operación
 *   matrixBefore   matriz antes (o null)
 *   matrixAfter    matriz después (o null)
 *   pivot          [fila, columna] base 0, o null
 *   changedRows    filas a resaltar
 *   highlightCells celdas a resaltar [[i, j], ...]
 *   splitCol       separador de matriz aumentada [A | I]
 *   kind           "swap" | "scale" | "add" | ... (para verificar)
 *   params         argumentos de la operación elemental
 *   section        etiqueta de etapa (p. ej. "Determinante")
 */
function step(number, operation, explanation, matrixBefore = null, matrixAfter = null, extra = {}) {
  return Object.freeze({
    number,
    operation,
    explanation,
    matrixBefore,
    matrixAfter,
    pivot: null,
    changedRows: [],
    highlightCells: [],
    splitCol: null,
    kind: "",
    params: [],
    section: "",
    ...extra,
  });
}

/** Devuelve copias de `steps` numeradas desde `start` (y con otra sección si se indica). */
function renumber(steps, section = null, start = 1) {
  return steps.map((s, offset) =>
    Object.freeze({ ...s, number: start + offset, ...(section !== null ? { section } : {}) }),
  );
}

__exports.copyMatrix = copyMatrix;
__exports.step = step;
__exports.renumber = renumber;
};
__defs['js/core/determinants.js'] = function (__exports) {
/**
 * Cálculo de determinantes conservando el procedimiento.
 *
 * Métodos disponibles (parámetro `method`):
 *   "auto"       orden 1: directo · orden 2: ad − bc · orden 3: Sarrus · mayor: eliminación
 *   "order2"     ad − bc (sólo 2×2)
 *   "sarrus"     regla de Sarrus (sólo 3×3)
 *   "cofactors"  expansión por cofactores a lo largo de una fila o columna
 *   "gauss"      eliminación por filas (triangularización)
 */

const { Fraction } = __req('js/utils/fraction.js');
const { DimensionError, ValidationError } = __req('js/utils/errors.js');
const { coef, fmt, fmtParen, subscript } = __req('js/utils/formatting.js');
const { requireSquare, toMatrix } = __req('js/utils/validation.js');
const { copyMatrix, step } = __req('js/core/steps.js');

const METHODS = ["auto", "order2", "sarrus", "cofactors", "gauss"];

/** Sólo el valor del determinante (eliminación exacta). La matriz vacía vale 1. */
function determinantValue(matrix) {
  if (!matrix.length) return new Fraction(1);
  const A = toMatrix(matrix);
  requireSquare(A, "el determinante");
  return eliminate(A)[0];
}

/** Triangulariza una copia de A. Devuelve [determinante, número de intercambios]. */
function eliminate(A) {
  const M = copyMatrix(A);
  const n = M.length;
  let sign = 1;
  let swaps = 0;
  for (let c = 0; c < n; c++) {
    let p = -1;
    for (let i = c; i < n; i++) {
      if (!M[i][c].isZero()) {
        p = i;
        break;
      }
    }
    if (p === -1) return [new Fraction(0), swaps];
    if (p !== c) {
      [M[c], M[p]] = [M[p], M[c]];
      sign = -sign;
      swaps += 1;
    }
    for (let i = c + 1; i < n; i++) {
      if (!M[i][c].isZero()) {
        const f = M[i][c].div(M[c][c]);
        M[i] = M[i].map((x, j) => x.sub(f.mul(M[c][j])));
      }
    }
  }
  let value = new Fraction(sign);
  for (let i = 0; i < n; i++) value = value.mul(M[i][i]);
  return [value, swaps];
}

/** Elimina la fila i y la columna j (base 0). */
function submatrix(m, i, j) {
  return m.filter((_, k) => k !== i).map((row) => [...row.slice(0, j), ...row.slice(j + 1)]);
}

/**
 * Calcula det(A) y devuelve { value, method, steps, order }.
 * `axis` ("row" o "column") e `index` (base 0) sólo se usan con "cofactors".
 */
function determinant(matrix, method = "auto", axis = "row", index = 0) {
  if (!METHODS.includes(method)) throw new ValidationError(`Método de determinante desconocido: ${method}.`);
  const A = toMatrix(matrix);
  requireSquare(A, "el determinante");
  const n = A.length;

  if (n === 1) {
    const value = A[0][0];
    const s = step(1, "det(A) = a₁₁", `Una matriz 1×1 tiene como determinante su único elemento: ${fmt(value)}.`, A, A);
    return { value, method: "Orden 1", steps: [s], order: n };
  }

  if (method === "auto") method = { 2: "order2", 3: "sarrus" }[n] ?? "gauss";
  if (method === "order2") {
    if (n !== 2) throw new DimensionError("La fórmula ad − bc sólo se aplica a matrices 2×2.");
    return order2(A);
  }
  if (method === "sarrus") {
    if (n !== 3) throw new DimensionError("La regla de Sarrus sólo se aplica a matrices 3×3.");
    return sarrus(A);
  }
  if (method === "cofactors") {
    if (axis !== "row" && axis !== "column") {
      throw new ValidationError("La expansión debe hacerse por una fila o por una columna.");
    }
    if (!(index >= 0 && index < n)) {
      throw new ValidationError(
        `El índice de la ${axis === "row" ? "fila" : "columna"} debe estar entre 1 y ${n}.`,
      );
    }
    return cofactorExpansion(A, axis, index);
  }
  return gauss(A);
}

// ---------------------------------------------------------------- orden 2: ad − bc
function order2(A) {
  const [[a, b], [c, d]] = A;
  const value = a.mul(d).sub(b.mul(c));
  const s = step(
    1,
    "det(A) = ad − bc",
    "Producto de la diagonal principal menos producto de la diagonal secundaria:\n" +
      `det(A) = ${fmtParen(a)}·${fmtParen(d)} − ${fmtParen(b)}·${fmtParen(c)} ` +
      `= ${fmt(a.mul(d))} − ${fmtParen(b.mul(c))} = ${fmt(value)}`,
    A,
    A,
    { highlightCells: [[0, 0], [1, 1]], kind: "order2" },
  );
  return { value, method: "Fórmula ad − bc (orden 2)", steps: [s], order: 2 };
}

// ---------------------------------------------------------------- orden 3: Sarrus
function sarrus(A) {
  const ext = A.map((row) => [...row, ...row.slice(0, 2)]); // se repiten las dos primeras columnas
  const range3 = [0, 1, 2];
  const mainCells = range3.map((k) => range3.map((i) => [i, k + i]));
  const antiCells = range3.map((k) => range3.map((i) => [i, k + 2 - i]));

  const products = (groups) =>
    groups.map((cells) => {
      const factors = cells.map(([i, j]) => ext[i][j]);
      return [factors, factors[0].mul(factors[1]).mul(factors[2])];
    });
  const describe = (prods) =>
    prods.map(([factors, p]) => `${factors.map((f) => fmtParen(f)).join(" · ")} = ${fmt(p)}`).join("\n");
  const sum = (prods) => prods.reduce((acc, [, p]) => acc.add(p), new Fraction(0));

  const main = products(mainCells);
  const anti = products(antiCells);
  const plus = sum(main);
  const minus = sum(anti);
  const value = plus.sub(minus);
  const flat = (groups) => groups.flat();

  const steps = [
    step(1, "Repetir las dos primeras columnas a la derecha",
      "Se escribe la matriz 3×3 y a su derecha se repiten sus dos primeras columnas.",
      A, ext, { kind: "sarrus-extend" }),
    step(2, "Diagonales principales (suman)",
      "Se multiplican los tres elementos de cada diagonal descendente (↘) y se suman:\n" +
        describe(main) + `\nSuma = ${fmt(plus)}`,
      ext, ext, { highlightCells: flat(mainCells), kind: "sarrus-main" }),
    step(3, "Diagonales secundarias (restan)",
      "Se multiplican los tres elementos de cada diagonal ascendente (↙) y se suman:\n" +
        describe(anti) + `\nSuma = ${fmt(minus)}`,
      ext, ext, { highlightCells: flat(antiCells), kind: "sarrus-anti" }),
    step(4, "det(A) = (suma principales) − (suma secundarias)",
      `det(A) = ${fmt(plus)} − ${fmtParen(minus)} = ${fmt(value)}`,
      A, A, { kind: "sarrus-result" }),
  ];
  return { value, method: "Regla de Sarrus (orden 3)", steps, order: 3 };
}

// ---------------------------------------------------------------- cofactores
function cofactorExpansion(A, axis, index) {
  const n = A.length;
  const byRow = axis === "row";
  const label = byRow ? "fila" : "columna";
  const line = Array.from({ length: n }, (_, k) => (byRow ? [index, k] : [k, index]));
  const steps = [
    step(
      1,
      `Expansión por cofactores a lo largo de la ${label} ${index + 1}`,
      "det(A) = Σ aᵢⱼ·Cᵢⱼ, donde Cᵢⱼ = (−1)^(i+j)·Mᵢⱼ y Mᵢⱼ es el determinante de la matriz que " +
        `queda al eliminar la fila i y la columna j.\nSe recorren los elementos de la ${label} ${index + 1}.`,
      A,
      A,
      { highlightCells: line, kind: "cofactor-start" },
    ),
  ];
  let total = new Fraction(0);
  const terms = [];
  for (let k = 0; k < n; k++) {
    const [i, j] = byRow ? [index, k] : [k, index];
    const a = A[i][j];
    const sign = (i + j) % 2 === 0 ? 1 : -1;
    const signText = sign === 1 ? "+" : "−";
    const name = `${subscript(i + 1)}${subscript(j + 1)}`;
    let term;
    let explanation;
    let sub = null;
    if (a.isZero()) {
      term = new Fraction(0);
      explanation = `a${name} = 0, así que el término a${name}·C${name} vale 0 y no hace falta calcular el menor.`;
    } else {
      sub = submatrix(A, i, j);
      const minor = determinantValue(sub);
      term = a.mul(sign).mul(minor);
      explanation =
        `a${name} = ${fmt(a)}.  Signo (−1)^(${i + 1}+${j + 1}) = ${signText}1.\n` +
        `Menor M${name} = det(matriz sin la fila ${i + 1} y la columna ${j + 1}) = ${fmt(minor)}.\n` +
        `Término = a${name}·(${signText}1)·M${name} = ${fmtParen(a)}·(${signText}1)·${fmtParen(minor)} = ${fmt(term)}`;
    }
    total = total.add(term);
    terms.push(term);
    steps.push(
      step(steps.length + 1, `Término a${name}·C${name}`, explanation, A, sub, {
        highlightCells: [[i, j]],
        kind: "cofactor-term",
        params: [i, j],
      }),
    );
  }
  const summation = terms.map((t) => fmtParen(t)).join(" + ");
  steps.push(
    step(steps.length + 1, "det(A) = suma de los términos", `det(A) = ${summation} = ${fmt(total)}`, A, A, {
      kind: "cofactor-result",
    }),
  );
  return { value: total, method: `Expansión por cofactores (${label} ${index + 1})`, steps, order: n };
}

// ---------------------------------------------------------------- eliminación (Gauss)
function gauss(A) {
  const n = A.length;
  const M = copyMatrix(A);
  const steps = [];
  let sign = 1;
  const intro =
    "Se lleva la matriz a forma triangular superior. Sumar a una fila un múltiplo de otra " +
    "no cambia el determinante; intercambiar dos filas lo multiplica por −1. " +
    "Al final, el determinante es el producto de la diagonal (por el signo acumulado).";

  const record = (op, expl, before, kind, params, changed, pivot = null) =>
    steps.push(
      step(steps.length + 1, op, expl, before, copyMatrix(M), { pivot, changedRows: changed, kind, params }),
    );

  steps.push(step(1, "Triangularización por filas", intro, A, A, { kind: "gauss-start" }));
  for (let c = 0; c < n; c++) {
    let p = -1;
    for (let i = c; i < n; i++) {
      if (!M[i][c].isZero()) {
        p = i;
        break;
      }
    }
    if (p === -1) {
      steps.push(
        step(
          steps.length + 1,
          `Columna ${c + 1} sin pivote`,
          `Todos los elementos de la columna ${c + 1} desde la fila ${c + 1} son 0, ` +
            "por lo que la matriz es singular: det(A) = 0.",
          copyMatrix(M),
          copyMatrix(M),
          { kind: "gauss-zero" },
        ),
      );
      return { value: new Fraction(0), method: "Eliminación por filas", steps, order: n };
    }
    if (p !== c) {
      const before = copyMatrix(M);
      [M[c], M[p]] = [M[p], M[c]];
      sign = -sign;
      record(
        `F${subscript(c + 1)} ↔ F${subscript(p + 1)}`,
        `El elemento (${c + 1},${c + 1}) es 0; se intercambian las filas ${c + 1} y ${p + 1}. ` +
          `Este cambio multiplica el determinante por −1 (signo acumulado: ${sign === 1 ? "+" : "−"}1).`,
        before, "swap", [c, p], [c, p], [c, c],
      );
    }
    for (let i = c + 1; i < n; i++) {
      if (M[i][c].isZero()) continue;
      const before = copyMatrix(M);
      const f = M[i][c].div(M[c][c]);
      M[i] = M[i].map((x, j) => x.sub(f.mul(M[c][j])));
      const sym = f.sign > 0 ? "−" : "+";
      record(
        `F${subscript(i + 1)} ← F${subscript(i + 1)} ${sym} ${coef(f.abs())}F${subscript(c + 1)}`,
        `Hacer 0 el elemento (${i + 1},${c + 1}). Esta operación no cambia el determinante.`,
        before, "add", [i, c, f.neg()], [i], [c, c],
      );
    }
  }
  const diag = M.map((row, i) => row[i]);
  let value = new Fraction(sign);
  for (const d of diag) value = value.mul(d);
  const product = diag.map((d) => fmtParen(d)).join("·");
  steps.push(
    step(
      steps.length + 1,
      "det(A) = (signo) · producto de la diagonal",
      `Signo acumulado: ${sign === 1 ? "+" : "−"}1.\n` +
        `Producto de la diagonal: ${product} = ${fmt(value.mul(sign))}.\n` +
        `det(A) = ${sign === 1 ? "+" : "−"}1 · ${fmtParen(value.mul(sign))} = ${fmt(value)}`,
      copyMatrix(M),
      copyMatrix(M),
      { highlightCells: diag.map((_, i) => [i, i]), kind: "gauss-result" },
    ),
  );
  return { value, method: "Eliminación por filas", steps, order: n };
}

// ---------------------------------------------------------------- comprobaciones
/**
 * Calcula det(A) con todos los métodos aplicables y con la transpuesta, para comprobar que coinciden.
 * Devuelve { value, entries: [{ label, value, ok }], allEqual, notes }.
 */
function crossCheck(matrix) {
  const A = toMatrix(matrix);
  requireSquare(A, "el determinante");
  const n = A.length;
  const value = determinant(A).value;
  const entries = [];
  const add = (label, v) => entries.push({ label, value: v, ok: v.eq(value) });
  if (n === 2) add("Fórmula ad − bc", determinant(A, "order2").value);
  if (n === 3) add("Regla de Sarrus", determinant(A, "sarrus").value);
  if (n >= 2) {
    add("Cofactores por la fila 1", determinant(A, "cofactors", "row", 0).value);
    add("Cofactores por la columna 1", determinant(A, "cofactors", "column", 0).value);
    add("Eliminación por filas", determinant(A, "gauss").value);
  }
  add("det(Aᵀ), la transpuesta", determinantValue(A[0].map((_, j) => A.map((row) => row[j]))));

  const notes = [];
  if (value.isZero()) notes.push("det(A) = 0: la matriz es singular.");
  if (A.every((row, i) => row.every((x, j) => x.eq(i === j ? 1 : 0)))) notes.push("A es la identidad y det(I) = 1, como debe ser.");
  return { value, entries, allEqual: entries.every((e) => e.ok), notes };
}

__exports.METHODS = METHODS;
__exports.determinantValue = determinantValue;
__exports.submatrix = submatrix;
__exports.determinant = determinant;
__exports.crossCheck = crossCheck;
};
__defs['js/core/classification.js'] = function (__exports) {
/**
 * Reconocimiento del tipo de matriz: nula, cuadrada, identidad, diagonal, escalar,
 * triangular, simétrica, antisimétrica y singular.
 *
 * Cada propiedad se comprueba celda por celda y se explica con el primer elemento
 * que la contradice (si lo hay). Devuelve las comprobaciones y los pasos para mostrarlas.
 */

const { fmt, subscript } = __req('js/utils/formatting.js');
const { dimsText, toMatrix } = __req('js/utils/validation.js');
const { determinantValue } = __req('js/core/determinants.js');
const { step } = __req('js/core/steps.js');

const cellName = (i, j) => `a${subscript(i + 1)}${subscript(j + 1)}`;

/** Busca las celdas (i, j) que cumplen `bad`. */
function findCells(A, bad) {
  const cells = [];
  A.forEach((row, i) => row.forEach((x, j) => bad(x, i, j) && cells.push([i, j])));
  return cells;
}

const NAMES = {
  zero: "nula", square: "cuadrada", identity: "identidad", diagonal: "diagonal", scalar: "escalar",
  upper: "triangular superior", lower: "triangular inferior", symmetric: "simétrica",
  antisymmetric: "antisimétrica", singular: "singular",
};

/**
 * Clasifica la matriz. Devuelve { tags, checks, steps, square }:
 *   checks: [{ key, label, holds, explanation, cells }]
 *   tags:   etiquetas de las propiedades que se cumplen (para el resumen)
 */
function classify(matrix) {
  const A = toMatrix(matrix);
  const rows = A.length;
  const cols = A[0].length;
  const square = rows === cols;
  const checks = [];
  const add = (key, label, holds, explanation, cells = []) => checks.push({ key, label, holds, explanation, cells });
  const val = (c) => fmt(A[c[0]][c[1]], true);

  const nonZero = findCells(A, (x) => !x.isZero());
  add(
    "zero", "¿Es nula?", nonZero.length === 0,
    nonZero.length === 0
      ? "Todos los elementos son 0."
      : `Hay elementos distintos de 0, por ejemplo ${cellName(...nonZero[0])} = ${val(nonZero[0])}.`,
    nonZero,
  );
  add(
    "square", "¿Es cuadrada?", square,
    square
      ? `Tiene ${rows} filas y ${cols} columnas: el mismo número.`
      : `Tiene ${rows} filas y ${cols} columnas: es una matriz rectangular ${dimsText(A)}.`,
  );

  if (square) {
    const offDiagonal = findCells(A, (x, i, j) => i !== j && !x.isZero());
    const diag = A.map((row, i) => row[i]);
    const isDiagonal = offDiagonal.length === 0;
    const isIdentity = isDiagonal && diag.every((x) => x.eq(1));
    const off = offDiagonal[0];

    add(
      "identity", "¿Es la identidad?", isIdentity,
      isIdentity
        ? "Tiene 1 en la diagonal y 0 en el resto."
        : !isDiagonal
          ? `Fuera de la diagonal debería haber 0, pero ${cellName(...off)} = ${val(off)}.`
          : "La diagonal debería ser toda de unos.",
      isDiagonal ? findCells(A, (x, i, j) => i === j && !x.eq(1)) : offDiagonal,
    );
    add(
      "diagonal", "¿Es diagonal?", isDiagonal,
      isDiagonal ? "Todos los elementos fuera de la diagonal son 0." : `${cellName(...off)} = ${val(off)} está fuera de la diagonal y no es 0.`,
      offDiagonal,
    );
    const sameDiagonal = diag.every((x) => x.eq(diag[0]));
    add(
      "scalar", "¿Es escalar?", isDiagonal && sameDiagonal,
      !isDiagonal
        ? "Una matriz escalar es diagonal, y esta no lo es."
        : sameDiagonal
          ? `Es diagonal y todos los elementos de la diagonal valen ${fmt(diag[0], true)}.`
          : "Es diagonal, pero los elementos de la diagonal no son todos iguales.",
    );

    const below = findCells(A, (x, i, j) => i > j && !x.isZero());
    const above = findCells(A, (x, i, j) => i < j && !x.isZero());
    add(
      "upper", "¿Es triangular superior?", below.length === 0,
      below.length === 0 ? "Todos los elementos debajo de la diagonal son 0." : `${cellName(...below[0])} = ${val(below[0])} está debajo de la diagonal y no es 0.`,
      below,
    );
    add(
      "lower", "¿Es triangular inferior?", above.length === 0,
      above.length === 0 ? "Todos los elementos encima de la diagonal son 0." : `${cellName(...above[0])} = ${val(above[0])} está encima de la diagonal y no es 0.`,
      above,
    );

    const asym = findCells(A, (x, i, j) => i < j && !x.eq(A[j][i]));
    add(
      "symmetric", "¿Es simétrica?", asym.length === 0,
      asym.length === 0
        ? "Se cumple aᵢⱼ = aⱼᵢ para todos los elementos: A es igual a su transpuesta."
        : `${cellName(...asym[0])} = ${val(asym[0])} pero ${cellName(asym[0][1], asym[0][0])} = ${val([asym[0][1], asym[0][0]])}.`,
      asym.flatMap(([i, j]) => [[i, j], [j, i]]),
    );

    const notAnti = findCells(A, (x, i, j) => (i === j ? !x.isZero() : i < j && !x.eq(A[j][i].neg())));
    const na = notAnti[0];
    add(
      "antisymmetric", "¿Es antisimétrica?", notAnti.length === 0,
      notAnti.length === 0
        ? "Se cumple aᵢⱼ = −aⱼᵢ y la diagonal es 0: A es igual a −Aᵀ."
        : na[0] === na[1]
          ? `La diagonal debería ser 0, pero ${cellName(...na)} = ${val(na)}.`
          : `${cellName(...na)} = ${val(na)} pero −${cellName(na[1], na[0])} = ${fmt(A[na[1]][na[0]].neg(), true)}.`,
      notAnti.flatMap(([i, j]) => [[i, j], [j, i]]),
    );

    const det = determinantValue(A);
    add(
      "singular", "¿Es singular (sin inversa)?", det.isZero(),
      det.isZero()
        ? "det(A) = 0, así que A es singular: no tiene inversa."
        : `det(A) = ${fmt(det, true)} ≠ 0, así que A es invertible (no singular).`,
    );
  } else {
    for (const [key, label] of [
      ["identity", "¿Es la identidad?"], ["diagonal", "¿Es diagonal?"], ["scalar", "¿Es escalar?"],
      ["upper", "¿Es triangular superior?"], ["lower", "¿Es triangular inferior?"],
      ["symmetric", "¿Es simétrica?"], ["antisymmetric", "¿Es antisimétrica?"], ["singular", "¿Es singular?"],
    ]) {
      add(key, label, false, `Esta propiedad sólo se define para matrices cuadradas y A es ${dimsText(A)}.`);
    }
  }

  const tags = checks.filter((c) => c.holds).map((c) => NAMES[c.key]);
  if (!square) tags.push("rectangular");
  if (rows === 1 && cols > 1) tags.push("matriz fila");
  if (cols === 1 && rows > 1) tags.push("matriz columna");

  const steps = checks.map((c, k) =>
    step(k + 1, `${c.label} ${c.holds ? "Sí" : "No"}`, `${c.holds ? "Se cumple" : "No se cumple"}. ${c.explanation}`, A, A, {
      highlightCells: c.cells,
      kind: "classify",
    }),
  );
  return { tags, checks, steps, square };
}

__exports.classify = classify;
};
__defs['js/core/matrixOperations.js'] = function (__exports) {
/**
 * Operaciones básicas: suma, resta, escalar, producto y transpuesta.
 *
 * Todas devuelven { result, formula, steps } con la matriz resultante, la
 * fórmula utilizada y un paso que detalla cada elemento calculado.
 */

const { Fraction } = __req('js/utils/fraction.js');
const { fmt, fmtParen, subscript } = __req('js/utils/formatting.js');
const { parseValue, requireMultipliable, requireSameDimensions, toMatrix } = __req('js/utils/validation.js');
const { step } = __req('js/core/steps.js');

const idx = (name, i, j) => `${name}${subscript(i + 1)}${subscript(j + 1)}`;

function elementwise(a, b, sign) {
  const A = toMatrix(a, "A");
  const B = toMatrix(b, "B");
  const [verb, symbol] = sign === 1 ? ["sumar", "+"] : ["restar", "−"];
  requireSameDimensions(A, B, verb);
  const result = A.map((row, i) => row.map((x, j) => (sign === 1 ? x.add(B[i][j]) : x.sub(B[i][j]))));
  const lines = [];
  result.forEach((row, i) =>
    row.forEach((value, j) => {
      lines.push(
        `${idx("c", i, j)} = ${idx("a", i, j)} ${symbol} ${idx("b", i, j)} = ` +
          `${fmt(A[i][j])} ${symbol} ${fmtParen(B[i][j])} = ${fmt(value)}`,
      );
    }),
  );
  const formula = `C = A ${symbol} B,  con cᵢⱼ = aᵢⱼ ${symbol} bᵢⱼ`;
  return { result, formula, steps: [step(1, formula, lines.join("\n"), A, result, { kind: "elementwise" })] };
}

/** A + B (mismas dimensiones). */
const add = (a, b) => elementwise(a, b, 1);

/** A − B (mismas dimensiones). */
const subtract = (a, b) => elementwise(a, b, -1);

/** k·A. k puede ser entero, fracción o texto como "3/4". */
function scalarMultiply(a, k) {
  const A = toMatrix(a, "A");
  const scalar = typeof k === "string" ? parseValue(k) : Fraction.of(k);
  const result = A.map((row) => row.map((x) => scalar.mul(x)));
  const lines = [];
  result.forEach((row, i) =>
    row.forEach((value, j) => {
      lines.push(`${idx("c", i, j)} = k·${idx("a", i, j)} = ${fmtParen(scalar)}·${fmtParen(A[i][j])} = ${fmt(value)}`);
    }),
  );
  const formula = `C = k·A,  con k = ${fmt(scalar)}  y  cᵢⱼ = k·aᵢⱼ`;
  return { result, formula, steps: [step(1, formula, lines.join("\n"), A, result, { kind: "scalar" })] };
}

/** A·B (columnas de A = filas de B). */
function multiply(a, b) {
  const A = toMatrix(a, "A");
  const B = toMatrix(b, "B");
  requireMultipliable(A, B);
  const inner = B.length;
  const range = (n) => Array.from({ length: n }, (_, k) => k);
  const result = A.map((rowA) =>
    B[0].map((_, j) => range(inner).reduce((acc, k) => acc.add(rowA[k].mul(B[k][j])), new Fraction(0))),
  );
  const lines = [];
  result.forEach((row, i) =>
    row.forEach((value, j) => {
      const products = range(inner)
        .map((k) => `${fmtParen(A[i][k])}·${fmtParen(B[k][j])}`)
        .join(" + ");
      lines.push(`${idx("c", i, j)} = ${products} = ${fmt(value)}`);
    }),
  );
  const formula = "C = A·B,  con cᵢⱼ = Σₖ aᵢₖ·bₖⱼ (fila i de A por columna j de B)";
  return { result, formula, steps: [step(1, formula, lines.join("\n"), A, result, { kind: "product" })] };
}

/** Aᵀ: las filas pasan a ser columnas. */
function transpose(a) {
  const A = toMatrix(a, "A");
  const result = A[0].map((_, j) => A.map((row) => row[j]));
  const lines = [];
  A.forEach((row, i) =>
    row.forEach((x, j) => {
      lines.push(`${idx("t", j, i)} = ${idx("a", i, j)} = ${fmt(x)}`);
    }),
  );
  const formula = "Aᵀ,  con (Aᵀ)ᵢⱼ = aⱼᵢ";
  return { result, formula, steps: [step(1, formula, lines.join("\n"), A, result, { kind: "transpose" })] };
}

__exports.add = add;
__exports.subtract = subtract;
__exports.scalarMultiply = scalarMultiply;
__exports.multiply = multiply;
__exports.transpose = transpose;
};
__defs['js/core/cofactors.js'] = function (__exports) {
/**
 * Menores, cofactores y matriz adjunta, con el procedimiento paso a paso.
 *
 *   Mᵢⱼ = det(A sin la fila i y la columna j)
 *   Cᵢⱼ = (−1)^(i+j) · Mᵢⱼ
 *   adj(A) = Cᵀ
 */

const { Fraction } = __req('js/utils/fraction.js');
const { fmt, fmtParen, subscript } = __req('js/utils/formatting.js');
const { requireSquare, toMatrix } = __req('js/utils/validation.js');
const { determinantValue, submatrix } = __req('js/core/determinants.js');
const { multiply } = __req('js/core/matrixOperations.js');
const { copyMatrix, step } = __req('js/core/steps.js');

function minorExplanation(sub, value) {
  if (sub.length === 0) {
    return "Al eliminar la única fila y columna no queda ninguna matriz; por convención el menor vale 1.";
  }
  if (sub.length === 1) {
    return `La matriz restante es 1×1: su determinante es su único elemento, ${fmt(value)}.`;
  }
  if (sub.length === 2) {
    const [[a, b], [c, d]] = sub;
    return (
      `det = ad − bc = ${fmtParen(a)}·${fmtParen(d)} − ${fmtParen(b)}·${fmtParen(c)} ` +
      `= ${fmt(a.mul(d))} − ${fmtParen(b.mul(c))} = ${fmt(value)}`
    );
  }
  return `Determinante de la matriz restante de orden ${sub.length}: ${fmt(value)}`;
}

/** Calcula la matriz de menores, de cofactores y la adjunta registrando los pasos. */
function cofactorProcedure(matrix) {
  const A = toMatrix(matrix);
  requireSquare(A, "el cálculo de menores, cofactores y adjunta");
  const n = A.length;
  const steps = [];
  const range = Array.from({ length: n }, (_, k) => k);
  const add = (operation, explanation, before, after, extra = {}) =>
    steps.push(step(steps.length + 1, operation, explanation, before, after, extra));

  add("Matriz original", `Se parte de la matriz A de orden ${n}.`, A, A);

  const minors = range.map(() => range.map(() => new Fraction(0)));
  for (const i of range) {
    for (const j of range) {
      const sub = submatrix(A, i, j);
      const value = determinantValue(sub);
      minors[i][j] = value;
      const name = `${subscript(i + 1)}${subscript(j + 1)}`;
      // La "cruz" de la fila i y la columna j es lo que se elimina.
      const cross = [...range.map((k) => [i, k]), ...range.filter((k) => k !== i).map((k) => [k, j])];
      add(
        `Menor M${name}`,
        `Se elimina la fila ${i + 1} y la columna ${j + 1} (celdas resaltadas); el menor es el ` +
          `determinante de la matriz que queda.\n${minorExplanation(sub, value)}`,
        A,
        sub.length ? sub : null,
        { highlightCells: cross, kind: "minor", params: [i, j] },
      );
    }
  }
  add("Matriz de menores", "Se reúnen todos los menores Mᵢⱼ en su posición (i, j).", A, copyMatrix(minors), {
    kind: "minors-matrix",
  });

  const signs = range.map((i) => range.map((j) => new Fraction((i + j) % 2 === 0 ? 1 : -1)));
  add(
    "Patrón de signos (−1)^(i+j)",
    "El signo alterna como un tablero de ajedrez, empezando con + en la posición (1,1).",
    copyMatrix(minors),
    signs,
    { kind: "signs" },
  );

  const cofactors = range.map((i) => range.map((j) => signs[i][j].mul(minors[i][j])));
  const lines = [];
  for (const i of range) {
    for (const j of range) {
      lines.push(
        `C${subscript(i + 1)}${subscript(j + 1)} = (${signs[i][j].eq(1) ? "+" : "−"}1)·${fmtParen(minors[i][j])} = ${fmt(cofactors[i][j])}`,
      );
    }
  }
  add(
    "Cofactores Cᵢⱼ = (−1)^(i+j)·Mᵢⱼ",
    "Cada menor se multiplica por su signo:\n" + lines.join("\n"),
    copyMatrix(minors),
    copyMatrix(cofactors),
    { kind: "cofactors" },
  );
  add("Matriz de cofactores C", "Los cofactores calculados forman la matriz de cofactores C.", A, copyMatrix(cofactors), {
    kind: "cofactors-matrix",
  });

  const adjugate = range.map((j) => range.map((i) => cofactors[i][j]));
  add(
    "adj(A) = Cᵀ",
    "La adjunta es la transpuesta de la matriz de cofactores: las filas de C pasan a ser columnas.",
    copyMatrix(cofactors),
    copyMatrix(adjugate),
    { kind: "adjugate" },
  );
  return { minors, signPattern: signs, cofactors, adjugate, steps };
}

/**
 * Comprueba la propiedad A·adj(A) = det(A)·I.
 * Devuelve { ok, determinant, product, expected, badCells } (badCells: posiciones donde difieren).
 */
function verifyAdjugate(matrix, adjugate) {
  const A = toMatrix(matrix);
  requireSquare(A, "la comprobación de la adjunta");
  const det = determinantValue(A);
  const product = multiply(A, adjugate).result;
  const expected = product.map((row, i) => row.map((_, j) => (i === j ? det : new Fraction(0))));
  const badCells = [];
  product.forEach((row, i) => row.forEach((x, j) => !x.eq(expected[i][j]) && badCells.push([i, j])));
  return { ok: badCells.length === 0, determinant: det, product, expected, badCells };
}

__exports.cofactorProcedure = cofactorProcedure;
__exports.verifyAdjugate = verifyAdjugate;
};
__defs['js/core/gaussJordan.js'] = function (__exports) {
/**
 * Reducción de Gauss-Jordan con registro de cada operación elemental.
 *
 * El algoritmo guarda cada paso *mientras* lo ejecuta: la lista de pasos es la
 * traza real del cálculo, no una explicación fabricada a partir del resultado.
 *
 * Operaciones elementales registradas (campos `kind` y `params` del paso):
 *   "swap"  [i, j]      -> F_i ↔ F_j
 *   "scale" [i, k]      -> F_i ← k·F_i          (k ≠ 0)
 *   "add"   [i, j, f]   -> F_i ← F_i + f·F_j    (i ≠ j)
 * Los índices son de base 0.
 */

const { Fraction } = __req('js/utils/fraction.js');
const { coef, fmt, subscript } = __req('js/utils/formatting.js');
const { toMatrix } = __req('js/utils/validation.js');
const { copyMatrix, step } = __req('js/core/steps.js');

/**
 * Lleva `matrix` a su forma escalonada reducida por filas (RREF).
 *
 * pivotLimit: sólo se buscan pivotes en las primeras `pivotLimit` columnas
 *             (útil para matrices aumentadas [A | I]).
 * splitCol:   indica dónde dibujar el separador de la matriz aumentada.
 * reduced:    true  -> Gauss-Jordan (forma escalonada REDUCIDA: pivotes 1 y ceros arriba y abajo).
 *             false -> eliminación de Gauss (forma escalonada: sólo ceros debajo de cada pivote,
 *                      sin dividir la fila entre el pivote).
 *
 * Devuelve { rref, form, steps, pivots, pivotColumns, rank, zeroRows, isSquare, notes, rankExplanation }.
 * (`rref` es la matriz final; `form` vale "RREF" o "REF" según `reduced`.)
 */
function gaussJordan(matrix, { pivotLimit = null, splitCol = null, reduced = true } = {}) {
  const A = toMatrix(matrix);
  const rows = A.length;
  const cols = A[0].length;
  const limit = pivotLimit === null ? cols : pivotLimit;
  const steps = [];
  const notes = [];
  const pivots = [];

  // Registra un paso con la matriz "antes" recibida y la matriz "después" actual.
  function record(operation, explanation, before, pivot, changed, kind, params) {
    steps.push(
      step(steps.length + 1, operation, explanation, before, copyMatrix(A), {
        pivot,
        changedRows: changed,
        splitCol,
        kind,
        params,
      }),
    );
  }

  let r = 0; // fila donde se colocará el siguiente pivote
  for (let c = 0; c < limit; c++) {
    if (r >= rows) break;

    // 1) Buscar, desde la fila r, un elemento distinto de 0 en la columna c.
    let p = -1;
    for (let i = r; i < rows; i++) {
      if (!A[i][c].isZero()) {
        p = i;
        break;
      }
    }
    if (p === -1) {
      notes.push(
        `Columna ${c + 1}: no hay elementos distintos de 0 desde la fila ${r + 1}; ` +
          "no hay pivote en esta columna y se pasa a la siguiente.",
      );
      continue;
    }

    // 2) Si el pivote no está en la fila r, se intercambian filas (nunca se divide entre 0).
    if (p !== r) {
      const before = copyMatrix(A);
      const reason =
        `El elemento en la posición (${r + 1},${c + 1}) es 0, así que no puede ser pivote. ` +
        `Se intercambia con la fila ${p + 1}, que tiene un valor distinto de 0 en la columna ${c + 1}.`;
      [A[r], A[p]] = [A[p], A[r]];
      record(`F${subscript(r + 1)} ↔ F${subscript(p + 1)}`, reason, before, [r, c], [r, p], "swap", [r, p]);
    }

    // 3) Gauss-Jordan: si el pivote ≠ 1, se multiplica la fila por su inverso (exacto).
    const pivotValue = A[r][c];
    if (reduced && !pivotValue.eq(1)) {
      const before = copyMatrix(A);
      const k = new Fraction(1).div(pivotValue);
      A[r] = A[r].map((x) => x.mul(k));
      record(
        `F${subscript(r + 1)} ← ${coef(k)}F${subscript(r + 1)}`,
        `Convertir el pivote (${r + 1},${c + 1}) = ${fmt(pivotValue)} en 1: se multiplica la ` +
          `fila ${r + 1} por ${fmt(k)}, el inverso del pivote.`,
        before,
        [r, c],
        [r],
        "scale",
        [r, k],
      );
    }

    // 4) Hacer 0 el resto de la columna: F_i ← F_i − f·F_r.
    //    Gauss-Jordan: arriba y abajo (el pivote vale 1, así que f = a_ic).
    //    Gauss: sólo debajo (el pivote puede ser distinto de 1, así que f = a_ic / pivote).
    const pivotNow = A[r][c];
    for (let i = reduced ? 0 : r + 1; i < rows; i++) {
      if (i === r || A[i][c].isZero()) continue;
      const before = copyMatrix(A);
      const element = A[i][c];
      const f = element.div(pivotNow);
      A[i] = A[i].map((x, j) => x.sub(f.mul(A[r][j])));
      const sign = f.sign > 0 ? "−" : "+";
      const op = `F${subscript(i + 1)} ← F${subscript(i + 1)} ${sign} ${coef(f.abs())}F${subscript(r + 1)}`;
      const where = i > r ? "debajo" : "encima";
      const explanation = pivotNow.eq(1)
        ? `Hacer 0 el elemento (${i + 1},${c + 1}) = ${fmt(element)}, que está ${where} del pivote, ` +
          `restando ${fmt(f)} veces la fila ${r + 1} (que tiene el pivote 1).`
        : `Hacer 0 el elemento (${i + 1},${c + 1}) = ${fmt(element)}, que está ${where} del pivote ${fmt(pivotNow)}, ` +
          `restando ${fmt(f)} veces la fila ${r + 1} (${fmt(element)} ÷ ${fmt(pivotNow)} = ${fmt(f)}).`;
      record(op, explanation, before, [r, c], [i], "add", [i, r, f.neg()]);
    }

    // 5) Avanzar a la siguiente fila.
    pivots.push([r, c]);
    r += 1;
  }

  const zeroRows = [];
  A.forEach((row, i) => {
    if (row.slice(0, limit).every((x) => x.isZero())) zeroRows.push(i);
  });
  const pivotColumns = pivots.map(([, c]) => c);
  const rank = pivots.length;
  const rankExplanation = rank
    ? `Rango = ${rank}: es el número de pivotes (columnas pivote: ${pivotColumns.map((c) => c + 1).join(", ")}), ` +
      `es decir, el número de filas no nulas de la forma ${reduced ? "reducida" : "escalonada"}.`
    : "Rango = 0: la matriz es nula y no tiene pivotes.";

  return { rref: A, form: reduced ? "RREF" : "REF", steps, pivots, pivotColumns, rank, zeroRows, isSquare: rows === cols, notes, rankExplanation };
}

__exports.gaussJordan = gaussJordan;
};
__defs['js/core/inverse.js'] = function (__exports) {
/**
 * Matriz inversa por la adjunta (A⁻¹ = adj(A)/det(A)) o por Gauss-Jordan sobre [A | I].
 *
 * Si la matriz es singular no se lanza una excepción: el resultado trae
 * `invertible = false`, `inverse = null` y un mensaje que explica el motivo.
 */

const { Fraction } = __req('js/utils/fraction.js');
const { fmt } = __req('js/utils/formatting.js');
const { requireSquare, toMatrix } = __req('js/utils/validation.js');
const { cofactorProcedure } = __req('js/core/cofactors.js');
const { determinant } = __req('js/core/determinants.js');
const { gaussJordan } = __req('js/core/gaussJordan.js');
const { copyMatrix, renumber, step } = __req('js/core/steps.js');

function identity(n) {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => new Fraction(i === j ? 1 : 0)));
}

/** A⁻¹ = adj(A) / det(A), mostrando determinante, adjunta y la división. */
function inverseByAdjugate(matrix) {
  const A = toMatrix(matrix);
  requireSquare(A, "la matriz inversa");

  const det = determinant(A);
  const steps = renumber(det.steps, "Determinante");
  if (det.value.isZero()) {
    steps.push(
      step(
        steps.length + 1,
        "det(A) = 0",
        "Como el determinante es 0, no se puede dividir entre det(A): " +
          "la matriz es singular y NO tiene inversa.",
        A,
        null,
        { section: "Conclusión", kind: "singular" },
      ),
    );
    return {
      invertible: false,
      inverse: null,
      method: "Adjunta",
      message: "El determinante es 0: la matriz es singular y no tiene inversa.",
      steps,
      determinant: det.value,
      adjugate: null,
    };
  }

  const cof = cofactorProcedure(A);
  steps.push(...renumber(cof.steps, "Adjunta", steps.length + 1));
  const inv = cof.adjugate.map((row) => row.map((x) => x.div(det.value)));
  steps.push(
    step(
      steps.length + 1,
      "A⁻¹ = adj(A) / det(A)",
      `Cada elemento de la adjunta se divide entre det(A) = ${fmt(det.value)}.`,
      copyMatrix(cof.adjugate),
      copyMatrix(inv),
      { section: "Inversa", kind: "divide" },
    ),
  );
  return {
    invertible: true,
    inverse: inv,
    method: "Adjunta",
    message: `det(A) = ${fmt(det.value)} ≠ 0: la matriz tiene inversa.`,
    steps,
    determinant: det.value,
    adjugate: cof.adjugate,
  };
}

/** Reduce [A | I]; si la parte izquierda llega a I, la derecha es A⁻¹. */
function inverseByGaussJordan(matrix) {
  const A = toMatrix(matrix);
  requireSquare(A, "la matriz inversa");
  const n = A.length;
  const I = identity(n);
  const augmented = A.map((row, i) => [...row, ...I[i]]);
  const gj = gaussJordan(augmented, { pivotLimit: n, splitCol: n });
  const steps = renumber(gj.steps, "Gauss-Jordan sobre [A | I]");
  if (gj.rank < n) {
    steps.push(
      step(
        steps.length + 1,
        "No se obtuvo la identidad",
        `Al reducir [A | I] la parte izquierda tiene rango ${gj.rank} < ${n} (hay filas nulas): ` +
          "la matriz es singular y NO tiene inversa.",
        copyMatrix(gj.rref),
        null,
        { splitCol: n, section: "Conclusión", kind: "singular" },
      ),
    );
    return {
      invertible: false,
      inverse: null,
      method: "Gauss-Jordan",
      message: `El rango de A es ${gj.rank} < ${n}: la matriz es singular y no tiene inversa.`,
      steps,
      determinant: null,
      adjugate: null,
    };
  }
  return {
    invertible: true,
    inverse: gj.rref.map((row) => row.slice(n)),
    method: "Gauss-Jordan",
    message: "La parte izquierda de [A | I] se convirtió en I: la parte derecha es A⁻¹.",
    steps,
    determinant: null,
    adjugate: null,
  };
}

/** Despacha según el método: "adjugate" (por defecto) o "gauss". */
function inverse(matrix, method = "adjugate") {
  return method === "gauss" ? inverseByGaussJordan(matrix) : inverseByAdjugate(matrix);
}

__exports.identity = identity;
__exports.inverseByAdjugate = inverseByAdjugate;
__exports.inverseByGaussJordan = inverseByGaussJordan;
__exports.inverse = inverse;
};
__defs['js/core/linearSystem.js'] = function (__exports) {
/**
 * Sistemas de ecuaciones lineales Ax = b por Gauss-Jordan.
 *
 * Se recibe la matriz aumentada [A | b] (la última columna son los términos
 * independientes). Se reduce con gaussJordan() buscando pivotes sólo en las
 * columnas de A, y luego se clasifica el sistema leyendo la forma reducida:
 *
 *   · fila [0 0 … 0 | c] con c ≠ 0   →  sin solución (inconsistente)
 *   · rango = número de incógnitas    →  solución única
 *   · rango < número de incógnitas    →  infinitas soluciones (variables libres)
 */

const { Fraction } = __req('js/utils/fraction.js');
const { ValidationError } = __req('js/utils/errors.js');
const { fmt, subscript } = __req('js/utils/formatting.js');
const { toMatrix } = __req('js/utils/validation.js');
const { gaussJordan } = __req('js/core/gaussJordan.js');
const { copyMatrix, renumber, step } = __req('js/core/steps.js');

const xName = (j) => `x${subscript(j + 1)}`;

/** Escribe c + a·t₁ + b·t₂ … con signos y coeficientes 1 omitidos. */
function linearExpression(constant, terms) {
  let text = "";
  if (!constant.isZero() || terms.length === 0) text = fmt(constant, true);
  for (const [coef, symbol] of terms) {
    if (coef.isZero()) continue;
    const abs = coef.abs();
    const body = (abs.eq(1) ? "" : fmt(abs, true)) + symbol;
    if (text === "") text = (coef.sign < 0 ? "−" : "") + body;
    else text += ` ${coef.sign < 0 ? "−" : "+"} ${body}`;
  }
  return text === "" ? "0" : text;
}

/**
 * Resuelve el sistema. Devuelve
 * { kind: "unique" | "infinite" | "none", rref, steps, rank, unknowns,
 *   solution (arreglo de Fraction o null), lines (ecuaciones de la solución),
 *   freeColumns, message }.
 */
function solveSystem(augmented) {
  const M = toMatrix(augmented);
  const cols = M[0].length;
  if (cols < 2) {
    throw new ValidationError(
      "Un sistema necesita al menos una columna de coeficientes y la columna de términos independientes (b).",
    );
  }
  const n = cols - 1; // incógnitas
  const gj = gaussJordan(M, { pivotLimit: n, splitCol: n });
  const R = gj.rref;
  const steps = [...gj.steps];

  const pivotRowOfColumn = new Map(gj.pivots.map(([r, c]) => [c, r]));
  const freeColumns = Array.from({ length: n }, (_, j) => j).filter((j) => !pivotRowOfColumn.has(j));
  const badRow = R.findIndex((row) => row.slice(0, n).every((x) => x.isZero()) && !row[n].isZero());

  const finish = (kind, operation, explanation, extra) => {
    steps.push(
      step(steps.length + 1, operation, explanation, copyMatrix(R), copyMatrix(R), {
        splitCol: n,
        kind: "solution",
        ...extra,
      }),
    );
    return { kind, rref: R, steps, rank: gj.rank, unknowns: n, freeColumns, ...extra.result };
  };

  if (badRow !== -1) {
    const message = "El sistema no tiene solución (es inconsistente).";
    return finish(
      "none",
      "Sistema inconsistente",
      `La fila ${badRow + 1} de la forma reducida es [0 … 0 | ${fmt(R[badRow][n])}], es decir, 0 = ${fmt(R[badRow][n])}, ` +
        "lo cual es imposible. Ninguna combinación de valores cumple todas las ecuaciones a la vez.",
      { highlightCells: [[badRow, n]], result: { solution: null, lines: [], message } },
    );
  }

  const pivotCells = gj.pivots.map(([r, c]) => [r, c]);
  if (freeColumns.length === 0) {
    const solution = Array.from({ length: n }, (_, j) => R[pivotRowOfColumn.get(j)][n]);
    const lines = solution.map((v, j) => `${xName(j)} = ${fmt(v, true)}`);
    const message = "El sistema tiene una única solución.";
    return finish(
      "unique",
      "Solución única",
      `El rango (${gj.rank}) es igual al número de incógnitas (${n}): cada incógnita tiene su pivote, ` +
        `así que la última columna es la solución.\n${lines.join("\n")}`,
      { highlightCells: [...pivotCells, ...R.slice(0, n).map((_, i) => [i, n])], result: { solution, lines, message } },
    );
  }

  // Infinitas soluciones: cada variable libre es un parámetro tₖ.
  const symbols = new Map(freeColumns.map((j, k) => [j, `t${subscript(k + 1)}`]));
  const lines = Array.from({ length: n }, (_, j) => {
    if (symbols.has(j)) return `${xName(j)} = ${symbols.get(j)}  (variable libre)`;
    const row = R[pivotRowOfColumn.get(j)];
    const terms = freeColumns.map((f) => [row[f].neg(), symbols.get(f)]);
    return `${xName(j)} = ${linearExpression(row[n], terms)}`;
  });
  const message = "El sistema tiene infinitas soluciones.";
  return finish(
    "infinite",
    "Infinitas soluciones",
    `El rango (${gj.rank}) es menor que el número de incógnitas (${n}): ` +
      `${freeColumns.map(xName).join(", ")} ${freeColumns.length === 1 ? "es una variable libre" : "son variables libres"} ` +
      "y puede tomar cualquier valor (se escribe como parámetro). Las demás se expresan en función de ella.\n" +
      lines.join("\n"),
    { highlightCells: pivotCells, result: { solution: null, lines, message } },
  );
}

 // por si la interfaz quiere etiquetar secciones

__exports.solveSystem = solveSystem;
__exports.renumber = renumber;
};
__defs['js/ui/operations.js'] = function (__exports) {
/**
 * Catálogo de operaciones y su ejecución.
 *
 * Este módulo NO toca el DOM: recibe las matrices ya validadas y las opciones elegidas,
 * llama a js/core y devuelve un "Outcome" listo para mostrar:
 *   { title, inputs, steps, results, summary?, message? }
 * Por eso se puede probar con Node, sin navegador (tests/integration.test.js).
 *
 * `results` es una lista de [etiqueta, valor, opciones?]. Las opciones sirven para que la
 * interfaz muestre más información de una matriz:
 *   format(valor) -> texto   (p. ej. mostrar +/− en el patrón de signos)
 *   info(i, j)    -> texto   (explicación que aparece al hacer clic en una celda)
 */

const { classify } = __req('js/core/classification.js');
const { cofactorProcedure, verifyAdjugate } = __req('js/core/cofactors.js');
const { crossCheck, determinant, submatrix } = __req('js/core/determinants.js');
const { gaussJordan } = __req('js/core/gaussJordan.js');
const { identity, inverse } = __req('js/core/inverse.js');
const { solveSystem } = __req('js/core/linearSystem.js');
const { add, multiply, scalarMultiply, subtract, transpose } = __req('js/core/matrixOperations.js');
const { ValidationError } = __req('js/utils/errors.js');
const { fmt, fmtParen, subscript } = __req('js/utils/formatting.js');
const { dimsText, matrixEqual, parseValue } = __req('js/utils/validation.js');

/** `tab` es el texto corto del botón; `label` y `hint` se muestran sobre el área de trabajo. */
const OPERATIONS = [
  { key: "sum", group: "Básicas", tab: "A + B", label: "Suma de matrices", hint: "A y B deben tener las mismas dimensiones.", needsB: true },
  { key: "sub", group: "Básicas", tab: "A − B", label: "Resta de matrices", hint: "A y B deben tener las mismas dimensiones.", needsB: true },
  { key: "scalar", group: "Básicas", tab: "k·A", label: "Multiplicación por un escalar", hint: "Cada elemento de A se multiplica por k.", needsScalar: true },
  { key: "mul", group: "Básicas", tab: "A·B", label: "Multiplicación de matrices", hint: "Las columnas de A deben coincidir con las filas de B.", needsB: true },
  { key: "transpose", group: "Básicas", tab: "Aᵀ", label: "Transpuesta", hint: "Las filas de A pasan a ser columnas." },
  { key: "classify", group: "Básicas", tab: "Tipo", label: "Tipo de matriz", hint: "Reconoce si A es nula, cuadrada, diagonal, triangular, simétrica, singular…" },
  { key: "gauss", group: "Sistemas", tab: "Gauss-Jordan", label: "Eliminación de Gauss y Gauss-Jordan", hint: "Forma escalonada (Gauss) o escalonada reducida (Gauss-Jordan), pivotes y rango.", gaussOptions: true },
  { key: "system", group: "Sistemas", tab: "Sistema Ax = b", label: "Sistema de ecuaciones lineales", hint: "Escribe cada ecuación en una fila: coeficientes a la izquierda del «=» y lo que debe dar a la derecha.", system: true },
  { key: "det", group: "Determinante e inversa", tab: "det(A)", label: "Determinante", hint: "Sólo para matrices cuadradas.", detOptions: true },
  { key: "cofactors", group: "Determinante e inversa", tab: "Cofactores", label: "Menores y cofactores", hint: "Sólo para matrices cuadradas. Haz clic en una celda del resultado para ver de dónde sale." },
  { key: "adjugate", group: "Determinante e inversa", tab: "Adjunta", label: "Matriz adjunta", hint: "adj(A) es la transpuesta de la matriz de cofactores. Se comprueba A·adj(A) = det(A)·I." },
  { key: "inverse", group: "Determinante e inversa", tab: "A⁻¹", label: "Matriz inversa", hint: "Sólo existe si det(A) ≠ 0.", inverseOptions: true },
];

const DET_METHODS = [
  ["auto", "Automático (según el orden)"],
  ["order2", "Fórmula ad − bc (2×2)"],
  ["sarrus", "Regla de Sarrus (3×3)"],
  ["cofactors-row", "Cofactores por una fila"],
  ["cofactors-col", "Cofactores por una columna"],
  ["gauss", "Eliminación por filas"],
];

const INVERSE_METHODS = [
  ["adjugate", "Con la adjunta: adj(A)/det(A)"],
  ["gauss", "Con Gauss-Jordan sobre [A | I]"],
];

const GAUSS_MODES = [
  ["jordan", "Gauss-Jordan (reducida)"],
  ["gauss", "Gauss (escalonada)"],
];

const DEFAULT_OPTIONS = { scalar: "2", detMethod: "auto", detIndex: 1, invMethod: "adjugate", gaussMode: "jordan", augmented: false };

const ij = (i, j) => `${subscript(i + 1)}${subscript(j + 1)}`;
const rowText = (m) => "[" + m.map((r) => r.map((x) => fmt(x, true)).join(" ")).join("; ") + "]";

/** Ejecuta una operación. Lanza MatrixLabError (o ValidationError) si los datos no son válidos. */
function runOperation(key, a, b, options = {}) {
  const run = RUNNERS[key];
  if (!run) throw new ValidationError(`Operación desconocida: ${key}.`);
  return run(a, b, { ...DEFAULT_OPTIONS, ...options });
}

const RUNNERS = {
  sum(a, b) {
    const r = add(a, b);
    return { title: r.formula, inputs: [["A", a], ["B", b]], steps: r.steps, results: [["C = A + B", r.result]] };
  },

  sub(a, b) {
    const r = subtract(a, b);
    return { title: r.formula, inputs: [["A", a], ["B", b]], steps: r.steps, results: [["C = A − B", r.result]] };
  },

  mul(a, b) {
    const r = multiply(a, b);
    return { title: r.formula, inputs: [["A", a], ["B", b]], steps: r.steps, results: [["C = A·B", r.result]] };
  },

  scalar(a, _b, { scalar }) {
    let k;
    try {
      k = parseValue(scalar);
    } catch (e) {
      throw new ValidationError(`Escalar k: ${e.message}.`);
    }
    const r = scalarMultiply(a, k);
    return { title: r.formula, inputs: [["A", a]], steps: r.steps, results: [[`C = ${fmt(k)}·A`, r.result]] };
  },

  transpose(a) {
    const r = transpose(a);
    return { title: r.formula, inputs: [["A", a]], steps: r.steps, results: [["Aᵀ", r.result]] };
  },

  classify(a) {
    const r = classify(a);
    const summary = [
      `A es ${dimsText(a)}.`,
      r.tags.length ? `Tipos que cumple: ${r.tags.join(", ")}.` : "No cumple ninguno de los tipos especiales.",
    ];
    return {
      title: "Tipo de matriz",
      inputs: [["A", a]],
      steps: r.steps,
      results: [["Tipos que cumple", r.tags.length ? r.tags.join(", ") : "ninguno en particular"]],
      summary,
    };
  },

  gauss(a, _b, { gaussMode, augmented }) {
    const reduced = gaussMode !== "gauss";
    const cols = a[0].length;
    if (augmented && cols < 2) {
      throw new ValidationError("Una matriz aumentada necesita al menos una columna de coeficientes y otra de términos independientes.");
    }
    // En una matriz aumentada [A | b] sólo se buscan pivotes en las columnas de coeficientes.
    const r = gaussJordan(a, { reduced, ...(augmented ? { pivotLimit: cols - 1, splitCol: cols - 1 } : {}) });
    const pivotCols = r.pivotColumns.map((c) => c + 1).join(", ") || "ninguna";
    const zeroRows = r.zeroRows.map((i) => i + 1).join(", ") || "ninguna";
    const name = reduced ? "Gauss-Jordan" : "Gauss";
    const form = reduced ? "escalonada reducida (RREF)" : "escalonada (REF)";
    const summary = [
      `Método: ${name}. Resultado: forma ${form}.`,
      `La matriz es ${r.isSquare ? "cuadrada" : "rectangular"} (${dimsText(a)}).`,
      r.rankExplanation,
      `Filas nulas: ${zeroRows}.`,
    ];
    if (augmented) {
      summary.push(`Matriz aumentada: las columnas 1 a ${cols - 1} son coeficientes y la columna ${cols} son los términos independientes (el «=» las separa).`);
    }
    const coefficientCols = augmented ? cols - 1 : cols;
    const full = Math.min(a.length, coefficientCols);
    if (r.rank < full) summary.push(`Rango incompleto: ${r.rank} < ${full}. Hay filas que dependen de otras.`);
    summary.push(...r.notes);
    const message = r.steps.length ? null : ["info", `La matriz ya está en forma ${reduced ? "escalonada reducida" : "escalonada"}: no se necesita ninguna operación.`];
    const results = [
      [`Forma ${form}`, r.rref],
      ["Rango", String(r.rank)],
      ["Columnas pivote", pivotCols],
      ["Filas nulas", zeroRows],
    ];
    return { title: `Eliminación por ${name}`, inputs: [["A", a]], steps: r.steps, results, summary, message };
  },

  system(a) {
    const r = solveSystem(a);
    const summary = [`${a.length} ecuaciones con ${r.unknowns} incógnitas. Rango de A = ${r.rank}.`, r.message];
    const results = [["Forma reducida de [A | b]", r.rref]];
    if (r.lines.length) results.push([r.kind === "unique" ? "Solución" : "Solución general", r.lines.join("\n")]);
    const kinds = { unique: "ok", infinite: "warn", none: "error" };
    return { title: "Sistema de ecuaciones lineales", inputs: [["[A | b]", a]], steps: r.steps, results, summary, message: [kinds[r.kind], r.message] };
  },

  det(a, _b, { detMethod, detIndex }) {
    const axis = detMethod === "cofactors-col" ? "column" : "row";
    const method = detMethod.startsWith("cofactors") ? "cofactors" : detMethod;
    const r = determinant(a, method, axis, (parseInt(detIndex, 10) || 0) - 1);
    const summary = [`Método: ${r.method}.`, `det(A) = ${fmt(r.value, true)}.`];

    // Comprobaciones: el resultado debe ser el mismo con cualquier método y con la transpuesta.
    if (a.length >= 2) {
      const check = crossCheck(a);
      summary.push(
        ...check.entries.map((e) => `Comprobación · ${e.label}: ${fmt(e.value, true)} ${e.ok ? "✔" : "✖"}`),
        check.allEqual ? "Todos los métodos dan el mismo valor." : "¡Los métodos no coinciden! Revisa el cálculo.",
        ...check.notes,
      );
    }
    let message;
    if (r.value.isZero()) {
      summary.push("Como det(A) = 0, la matriz es singular: no tiene inversa.");
      message = ["warn", "det(A) = 0: la matriz es singular."];
    } else {
      message = ["ok", `Se usó: ${r.method}.`];
    }
    return { title: "Cálculo del determinante", inputs: [["A", a]], steps: r.steps, results: [["det(A)", r.value]], summary, message };
  },

  cofactors(a) {
    const r = cofactorProcedure(a);
    const minorInfo = (i, j) =>
      `M${ij(i, j)} = det de A sin la fila ${i + 1} y la columna ${j + 1} = det ${rowText(submatrix(a, i, j))} = ${fmt(r.minors[i][j], true)}`;
    const cofactorInfo = (i, j) => {
      const sign = r.signPattern[i][j].eq(1) ? "+1" : "−1";
      return `C${ij(i, j)} = (−1)^(${i + 1}+${j + 1}) · M${ij(i, j)} = (${sign}) · ${fmtParen(r.minors[i][j], true)} = ${fmt(r.cofactors[i][j], true)}`;
    };
    const results = [
      ["Matriz de menores M", r.minors, { info: minorInfo }],
      ["Patrón de signos (−1)^(i+j)", r.signPattern, { format: (x) => (x.eq(1) ? "+" : "−") }],
      ["Matriz de cofactores C", r.cofactors, { info: cofactorInfo }],
    ];
    const summary = [
      "Mᵢⱼ = determinante de A sin la fila i y la columna j.",
      "Cᵢⱼ = (−1)^(i+j)·Mᵢⱼ.",
      "La adjunta es la transpuesta de C: está en la pestaña «Adjunta».",
    ];
    return { title: "Menores y cofactores", inputs: [["A", a]], steps: r.steps.filter((s) => s.kind !== "adjugate"), results, summary };
  },

  adjugate(a) {
    const r = cofactorProcedure(a);
    const check = verifyAdjugate(a, r.adjugate);
    const cofactorInfo = (i, j) => `C${ij(i, j)} = (−1)^(${i + 1}+${j + 1}) · M${ij(i, j)} = ${fmt(r.cofactors[i][j], true)}`;
    const adjInfo = (i, j) =>
      `adj(A)${ij(i, j)} = C${ij(j, i)} = ${fmt(r.adjugate[i][j], true)} (la adjunta es la transpuesta: la fila ${i + 1}, columna ${j + 1} sale de C en la fila ${j + 1}, columna ${i + 1})`;
    const results = [
      ["Matriz de cofactores C", r.cofactors, { info: cofactorInfo }],
      ["Matriz adjunta adj(A) = Cᵀ", r.adjugate, { info: adjInfo }],
      ["A·adj(A)", check.product],
      [`det(A)·I  (det(A) = ${fmt(check.determinant, true)})`, check.expected],
    ];
    const verdict = check.ok
      ? "Comprobación: A·adj(A) = det(A)·I ✔"
      : `Comprobación: A·adj(A) ≠ det(A)·I ✖. Difiere en ${check.badCells.map(([i, j]) => `(${i + 1},${j + 1})`).join(", ")}: revisa la fila ${check.badCells[0][0] + 1} de A y la columna ${check.badCells[0][1] + 1} de adj(A).`;
    const summary = [
      "adj(A) = Cᵀ: NO es la matriz de cofactores tal cual, sino su transpuesta.",
      `det(A) = ${fmt(check.determinant, true)}.`,
      verdict,
    ];
    return { title: "Matriz adjunta", inputs: [["A", a]], steps: r.steps, results, summary, message: [check.ok ? "ok" : "error", verdict] };
  },

  inverse(a, _b, { invMethod }) {
    const r = inverse(a, invMethod);
    const results = [];
    if (r.determinant !== null) results.push(["det(A)", r.determinant]);
    const summary = [`Método: ${r.method}.`, r.message];
    let message;
    if (r.invertible) {
      if (r.adjugate !== null) results.push(["adj(A)", r.adjugate]);
      results.push(["A⁻¹", r.inverse]);
      const check = matrixEqual(multiply(a, r.inverse).result, identity(a.length));
      summary.push("Comprobación: A·A⁻¹ = I" + (check ? " ✔" : " ✖"));
      message = ["ok", r.message];
    } else {
      message = ["warn", r.message];
    }
    return { title: `Matriz inversa (${r.method})`, inputs: [["A", a]], steps: r.steps, results, summary, message };
  },
};

__exports.OPERATIONS = OPERATIONS;
__exports.DET_METHODS = DET_METHODS;
__exports.INVERSE_METHODS = INVERSE_METHODS;
__exports.GAUSS_MODES = GAUSS_MODES;
__exports.runOperation = runOperation;
};
__defs['js/ui/clipboard.js'] = function (__exports) {
/** Copia texto al portapapeles (con alternativa para navegadores sin la API moderna). */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

__exports.copyText = copyText;
};
__defs['js/ui/resultsPanel.js'] = function (__exports) {
/** Panel derecho: resultado final, dimensiones, mensajes y acciones (copiar, LaTeX, reutilizar). */

const { matrixToLatex, matrixToText } = __req('js/utils/formatting.js');
const { copyText } = __req('js/ui/clipboard.js');
const html = __req('js/ui/htmlRender.js');

class ResultsPanel {
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

__exports.ResultsPanel = ResultsPanel;
};
__defs['js/ui/stepsViewer.js'] = function (__exports) {
/**
 * Panel central: recorre un procedimiento paso a paso.
 * Anterior / siguiente, reproducción automática, línea de tiempo, todos los pasos y reiniciar.
 */

const html = __req('js/ui/htmlRender.js');

const SPEEDS = [
  [2200, "Lenta"],
  [1300, "Normal"],
  [600, "Rápida"],
];

/** Muestra el estado inicial y luego revela una operación nueva por cada «Siguiente». */
class StepsViewer {
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

__exports.StepsViewer = StepsViewer;
};
__defs['js/ui/mainWindow.js'] = function (__exports) {
/**
 * Ventana principal: conecta la interfaz con los módulos matemáticos.
 *
 * Aquí no se calcula nada: cada operación se ejecuta en ui/operations.js (que llama a js/core)
 * y la ventana sólo reparte el resultado entre el visor de pasos y el panel de resultados.
 */

const { MatrixLabError } = __req('js/utils/errors.js');
const { MAX_DIM } = __req('js/utils/validation.js');
const { HELP_EXAMPLES, helpHtml } = __req('js/ui/help.js');
const { clearHistory, isValidEntry, loadHistory, pushEntry } = __req('js/ui/history.js');
const { MatrixEditor } = __req('js/ui/matrixEditor.js');
const { DET_METHODS, GAUSS_MODES, INVERSE_METHODS, OPERATIONS, runOperation } = __req('js/ui/operations.js');
const { ResultsPanel } = __req('js/ui/resultsPanel.js');
const { StepsViewer } = __req('js/ui/stepsViewer.js');

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

class MainWindow {
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

__exports.MainWindow = MainWindow;
};
__defs['js/main.js'] = function (__exports) {
/** MatrixLab — Laboratorio interactivo de Álgebra Lineal (versión web). Punto de entrada. */

const { MainWindow } = __req('js/ui/mainWindow.js');

new MainWindow(document.getElementById("app"));

};
__req('js/main.js');
})();

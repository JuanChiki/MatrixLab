/**
 * Representación legible de números y matrices (texto plano).
 *
 * Las fracciones exactas se conservan: 3/2 se muestra como "3/2".
 * La representación en HTML para la interfaz vive en ui/htmlRender.js.
 */

import { Fraction } from "./fraction.js";

const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";

/** Devuelve n con dígitos subíndice (2 -> ₂). */
export function subscript(n) {
  return String(n).replace(/\d/g, (d) => SUBSCRIPTS[Number(d)]);
}

/** Formatea un número exacto: enteros sin denominador y fracciones como p/q. */
export function fmt(x, pretty = false) {
  const text = Fraction.of(x).toString();
  return pretty ? text.replaceAll("-", "−") : text;
}

/** Como fmt pero entre paréntesis si el valor es negativo (útil en productos). */
export function fmtParen(x, pretty = false) {
  const text = fmt(x, pretty);
  return Fraction.of(x).sign < 0 ? `(${text})` : text;
}

/** Coeficiente para operaciones de fila: 1 se omite, fracciones/negativos van entre paréntesis. */
export function coef(c) {
  c = Fraction.of(c);
  if (c.eq(1)) return "";
  if (c.isInteger() && c.sign > 0) return String(c.numerator);
  return `(${fmt(c)})`;
}

/** Matriz con columnas alineadas, una fila por línea. */
export function matrixToText(m) {
  const cells = m.map((row) => row.map((x) => fmt(x)));
  const widths = cells[0].map((_, j) => Math.max(...cells.map((row) => row[j].length)));
  return cells.map((row) => "[ " + row.map((c, j) => c.padStart(widths[j])).join("  ") + " ]").join("\n");
}

/** Matriz como arreglos de textos (para editores y pruebas legibles). */
export function matrixToLists(m) {
  return m.map((row) => row.map((x) => fmt(x)));
}

/** Un número en LaTeX: enteros tal cual y fracciones como \frac{p}{q} (el signo va delante). */
export function fmtLatex(x) {
  const f = Fraction.of(x);
  if (f.isInteger()) return String(f.numerator);
  const sign = f.sign < 0 ? "-" : "";
  return `${sign}\\frac{${f.abs().numerator}}{${f.denominator}}`;
}

/** Matriz en LaTeX (entorno bmatrix), lista para pegar en un documento. */
export function matrixToLatex(m) {
  const rows = m.map((row) => "  " + row.map((x) => fmtLatex(x)).join(" & "));
  return `\\begin{bmatrix}\n${rows.join(" \\\\\n")}\n\\end{bmatrix}`;
}

/** Decimal redondeado (por defecto a 4 cifras, sin ceros finales). Sólo para mostrar; el cálculo sigue siendo exacto. */
export function fmtDecimal(x, digits = 4, pretty = false) {
  const f = Fraction.of(x);
  const n = f.sign < 0 ? -f.numerator : f.numerator;
  const scale = 10n ** BigInt(digits);
  const scaled = (n * scale * 2n + f.denominator) / (2n * f.denominator); // redondeo half-up con BigInt
  const frac = (scaled % scale).toString().padStart(digits, "0").replace(/0+$/, "");
  let text = `${scaled / scale}${frac ? "." + frac : ""}`;
  if (f.sign < 0 && scaled !== 0n) text = "-" + text;
  return pretty ? text.replaceAll("-", "−") : text;
}

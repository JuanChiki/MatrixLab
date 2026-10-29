/**
 * Operaciones básicas: suma, resta, escalar, producto y transpuesta.
 *
 * Todas devuelven { result, formula, steps } con la matriz resultante, la
 * fórmula utilizada y un paso que detalla cada elemento calculado.
 */

import { Fraction } from "../utils/fraction.js";
import { fmt, fmtParen, subscript } from "../utils/formatting.js";
import { parseValue, requireMultipliable, requireSameDimensions, toMatrix } from "../utils/validation.js";
import { step } from "./steps.js";

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
export const add = (a, b) => elementwise(a, b, 1);

/** A − B (mismas dimensiones). */
export const subtract = (a, b) => elementwise(a, b, -1);

/** k·A. k puede ser entero, fracción o texto como "3/4". */
export function scalarMultiply(a, k) {
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
export function multiply(a, b) {
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
export function transpose(a) {
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

/**
 * Menores, cofactores y matriz adjunta, con el procedimiento paso a paso.
 *
 *   Mᵢⱼ = det(A sin la fila i y la columna j)
 *   Cᵢⱼ = (−1)^(i+j) · Mᵢⱼ
 *   adj(A) = Cᵀ
 */

import { Fraction } from "../utils/fraction.js";
import { fmt, fmtParen, subscript } from "../utils/formatting.js";
import { requireSquare, toMatrix } from "../utils/validation.js";
import { determinantValue, submatrix } from "./determinants.js";
import { multiply } from "./matrixOperations.js";
import { copyMatrix, step } from "./steps.js";

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
export function cofactorProcedure(matrix) {
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
export function verifyAdjugate(matrix, adjugate) {
  const A = toMatrix(matrix);
  requireSquare(A, "la comprobación de la adjunta");
  const det = determinantValue(A);
  const product = multiply(A, adjugate).result;
  const expected = product.map((row, i) => row.map((_, j) => (i === j ? det : new Fraction(0))));
  const badCells = [];
  product.forEach((row, i) => row.forEach((x, j) => !x.eq(expected[i][j]) && badCells.push([i, j])));
  return { ok: badCells.length === 0, determinant: det, product, expected, badCells };
}

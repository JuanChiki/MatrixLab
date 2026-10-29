/**
 * Reconocimiento del tipo de matriz: nula, cuadrada, identidad, diagonal, escalar,
 * triangular, simétrica, antisimétrica y singular.
 *
 * Cada propiedad se comprueba celda por celda y se explica con el primer elemento
 * que la contradice (si lo hay). Devuelve las comprobaciones y los pasos para mostrarlas.
 */

import { fmt, subscript } from "../utils/formatting.js";
import { dimsText, toMatrix } from "../utils/validation.js";
import { determinantValue } from "./determinants.js";
import { step } from "./steps.js";

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
export function classify(matrix) {
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

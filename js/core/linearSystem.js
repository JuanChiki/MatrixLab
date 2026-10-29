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

import { Fraction } from "../utils/fraction.js";
import { ValidationError } from "../utils/errors.js";
import { fmt, subscript } from "../utils/formatting.js";
import { toMatrix } from "../utils/validation.js";
import { gaussJordan } from "./gaussJordan.js";
import { copyMatrix, renumber, step } from "./steps.js";

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
export function solveSystem(augmented) {
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

export { renumber }; // por si la interfaz quiere etiquetar secciones

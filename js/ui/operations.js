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

import { classify } from "../core/classification.js";
import { cofactorProcedure, verifyAdjugate } from "../core/cofactors.js";
import { crossCheck, determinant, submatrix } from "../core/determinants.js";
import { gaussJordan } from "../core/gaussJordan.js";
import { identity, inverse } from "../core/inverse.js";
import { solveSystem } from "../core/linearSystem.js";
import { add, multiply, scalarMultiply, subtract, transpose } from "../core/matrixOperations.js";
import { ValidationError } from "../utils/errors.js";
import { fmt, fmtParen, subscript } from "../utils/formatting.js";
import { dimsText, matrixEqual, parseValue } from "../utils/validation.js";

/** `tab` es el texto corto del botón; `label` y `hint` se muestran sobre el área de trabajo. */
export const OPERATIONS = [
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

export const DET_METHODS = [
  ["auto", "Automático (según el orden)"],
  ["order2", "Fórmula ad − bc (2×2)"],
  ["sarrus", "Regla de Sarrus (3×3)"],
  ["cofactors-row", "Cofactores por una fila"],
  ["cofactors-col", "Cofactores por una columna"],
  ["gauss", "Eliminación por filas"],
];

export const INVERSE_METHODS = [
  ["adjugate", "Con la adjunta: adj(A)/det(A)"],
  ["gauss", "Con Gauss-Jordan sobre [A | I]"],
];

export const GAUSS_MODES = [
  ["jordan", "Gauss-Jordan (reducida)"],
  ["gauss", "Gauss (escalonada)"],
];

const DEFAULT_OPTIONS = { scalar: "2", detMethod: "auto", detIndex: 1, invMethod: "adjugate", gaussMode: "jordan", augmented: false };

const ij = (i, j) => `${subscript(i + 1)}${subscript(j + 1)}`;
const rowText = (m) => "[" + m.map((r) => r.map((x) => fmt(x, true)).join(" ")).join("; ") + "]";

/** Ejecuta una operación. Lanza MatrixLabError (o ValidationError) si los datos no son válidos. */
export function runOperation(key, a, b, options = {}) {
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

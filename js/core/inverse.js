/**
 * Matriz inversa por la adjunta (A⁻¹ = adj(A)/det(A)) o por Gauss-Jordan sobre [A | I].
 *
 * Si la matriz es singular no se lanza una excepción: el resultado trae
 * `invertible = false`, `inverse = null` y un mensaje que explica el motivo.
 */

import { Fraction } from "../utils/fraction.js";
import { fmt } from "../utils/formatting.js";
import { requireSquare, toMatrix } from "../utils/validation.js";
import { cofactorProcedure } from "./cofactors.js";
import { determinant } from "./determinants.js";
import { gaussJordan } from "./gaussJordan.js";
import { copyMatrix, renumber, step } from "./steps.js";

export function identity(n) {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => new Fraction(i === j ? 1 : 0)));
}

/** A⁻¹ = adj(A) / det(A), mostrando determinante, adjunta y la división. */
export function inverseByAdjugate(matrix) {
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
export function inverseByGaussJordan(matrix) {
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
export function inverse(matrix, method = "adjugate") {
  return method === "gauss" ? inverseByGaussJordan(matrix) : inverseByAdjugate(matrix);
}

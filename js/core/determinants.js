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

import { Fraction } from "../utils/fraction.js";
import { DimensionError, ValidationError } from "../utils/errors.js";
import { coef, fmt, fmtParen, subscript } from "../utils/formatting.js";
import { requireSquare, toMatrix } from "../utils/validation.js";
import { copyMatrix, step } from "./steps.js";

export const METHODS = ["auto", "order2", "sarrus", "cofactors", "gauss"];

/** Sólo el valor del determinante (eliminación exacta). La matriz vacía vale 1. */
export function determinantValue(matrix) {
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
export function submatrix(m, i, j) {
  return m.filter((_, k) => k !== i).map((row) => [...row.slice(0, j), ...row.slice(j + 1)]);
}

/**
 * Calcula det(A) y devuelve { value, method, steps, order }.
 * `axis` ("row" o "column") e `index` (base 0) sólo se usan con "cofactors".
 */
export function determinant(matrix, method = "auto", axis = "row", index = 0) {
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
export function crossCheck(matrix) {
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

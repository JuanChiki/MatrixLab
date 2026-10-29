import test from "node:test";
import assert from "node:assert/strict";
import { F, T, rng, randomMatrix } from "./helpers.js";
import { Fraction } from "../js/utils/fraction.js";
import { fmtLatex, matrixToLatex } from "../js/utils/formatting.js";
import { multiply } from "../js/core/matrixOperations.js";
import { solveSystem } from "../js/core/linearSystem.js";
import { ValidationError } from "../js/utils/errors.js";
import { parsePastedMatrix } from "../js/ui/matrixEditor.js";
import { isValidEntry } from "../js/ui/history.js";

test("LaTeX: enteros, fracciones con el signo delante y entorno bmatrix", () => {
  assert.equal(fmtLatex(3), "3");
  assert.equal(fmtLatex(new Fraction(-3, 4)), "-\\frac{3}{4}");
  assert.equal(matrixToLatex(F([[1, "1/2"], [0, -2]])), "\\begin{bmatrix}\n  1 & \\frac{1}{2} \\\\\n  0 & -2\n\\end{bmatrix}");
});

test("sistema con solución única: (2, 3, −1) y A·x = b", () => {
  const aug = F([[2, 1, -1, 8], [-3, -1, 2, -11], [-2, 1, 2, -3]]);
  const r = solveSystem(aug);
  assert.equal(r.kind, "unique");
  assert.deepEqual(r.solution.map(String), ["2", "3", "-1"]);
  const A = aug.map((row) => row.slice(0, 3));
  const x = r.solution.map((v) => [v]);
  assert.deepEqual(T(multiply(A, x).result), aug.map((row) => [row[3].toString()]));
});

test("sistema inconsistente se detecta y no devuelve solución", () => {
  const r = solveSystem(F([[1, 1, 2], [1, 1, 3]]));
  assert.equal(r.kind, "none");
  assert.equal(r.solution, null);
});

test("sistema con infinitas soluciones: la solución general cumple las ecuaciones para cualquier parámetro", () => {
  const aug = F([[1, 2, -1, 3], [2, 4, -2, 6]]);
  const r = solveSystem(aug);
  assert.equal(r.kind, "infinite");
  assert.deepEqual(r.freeColumns, [1, 2]);
  assert.deepEqual(r.lines, ["x₁ = 3 − 2t₁ + t₂", "x₂ = t₁  (variable libre)", "x₃ = t₂  (variable libre)"]);
  // Se arma un x con parámetros arbitrarios a partir de la forma reducida y se comprueba A·x = b.
  const t = { 1: new Fraction(5), 2: new Fraction(-7) };
  const x = [null, t[1], t[2]];
  x[0] = r.rref[0][3].sub(r.rref[0][1].mul(t[1])).sub(r.rref[0][2].mul(t[2]));
  const A = aug.map((row) => row.slice(0, 3));
  assert.deepEqual(T(multiply(A, x.map((v) => [v])).result), aug.map((row) => [row[3].toString()]));
});

test("sistemas aleatorios: si es único, la solución cumple A·x = b", () => {
  const rand = rng(3);
  let unique = 0;
  for (let t = 0; t < 60; t++) {
    const aug = randomMatrix(3, 4, rand);
    const r = solveSystem(aug);
    if (r.kind === "unique") {
      unique++;
      const A = aug.map((row) => row.slice(0, 3));
      const prod = multiply(A, r.solution.map((v) => [v])).result;
      assert.deepEqual(T(prod), aug.map((row) => [row[3].toString()]));
    }
  }
  assert.ok(unique > 10);
});

test("un sistema necesita al menos 2 columnas", () => {
  assert.throws(() => solveSystem(F([[1], [2]])), ValidationError);
});

test("pegado: Excel (tabuladores), 'a b; c d', fracciones con espacios y decimales con coma", () => {
  assert.deepEqual(parsePastedMatrix("1\t2\n3\t4").cells, [["1", "2"], ["3", "4"]]);
  assert.deepEqual(parsePastedMatrix("[1 2; 3 4]").cells, [["1", "2"], ["3", "4"]]);
  assert.deepEqual(parsePastedMatrix("1 / 2   3\n4 5,5").cells, [["1/2", "3"], ["4", "5,5"]]);
  assert.deepEqual(parsePastedMatrix("1, 2, 3").cells, [["1", "2", "3"]]);
  assert.equal(parsePastedMatrix("7").cells, null); // un solo valor: pegado normal
  assert.deepEqual(parsePastedMatrix("1 2 3\n4 5").cells, [["1", "2", "3"], ["4", "5", ""]]); // filas cortas se completan
  assert.ok(parsePastedMatrix(Array(11).fill("1 2").join("\n")).error);
});

test("el historial descarta entradas con formato inválido", () => {
  assert.ok(isValidEntry({ op: "sum", a: [["1"]], b: null }));
  assert.ok(!isValidEntry({ op: "sum", a: [], b: null }));
  assert.ok(!isValidEntry({ op: "sum", a: [["1"], ["1", "2"]], b: null }));
  assert.ok(!isValidEntry(null));
});

import test from "node:test";
import assert from "node:assert/strict";
import { F, T, rng, randomMatrix } from "./helpers.js";
import { matrixEqual } from "../js/utils/validation.js";
import { classify } from "../js/core/classification.js";
import { crossCheck, determinantValue } from "../js/core/determinants.js";
import { cofactorProcedure, verifyAdjugate } from "../js/core/cofactors.js";

const tagsOf = (m) => classify(F(m)).tags;

test("clasificación: identidad, diagonal, escalar, triangulares, simétrica, antisimétrica, nula", () => {
  assert.ok(tagsOf([[1, 0], [0, 1]]).includes("identidad"));
  assert.ok(tagsOf([[2, 0], [0, 3]]).includes("diagonal"));
  assert.ok(!tagsOf([[2, 0], [0, 3]]).includes("escalar"));
  assert.ok(tagsOf([[2, 0], [0, 2]]).includes("escalar"));
  assert.ok(tagsOf([[1, 2], [0, 3]]).includes("triangular superior"));
  assert.ok(tagsOf([[1, 0], [2, 3]]).includes("triangular inferior"));
  assert.ok(tagsOf([[1, 2], [2, 5]]).includes("simétrica"));
  assert.ok(tagsOf([[0, 2], [-2, 0]]).includes("antisimétrica"));
  assert.ok(tagsOf([[0, 0], [0, 0]]).includes("nula"));
  assert.ok(tagsOf([[1, 2], [2, 4]]).includes("singular"));
  assert.ok(!tagsOf([[1, 2], [3, 4]]).includes("singular"));
});

test("clasificación: rectangulares, fila y columna; las propiedades de matrices cuadradas no aplican", () => {
  assert.ok(tagsOf([[1, 2, 3], [4, 5, 6]]).includes("rectangular"));
  assert.ok(tagsOf([[1, 2, 3]]).includes("matriz fila"));
  assert.ok(tagsOf([[1], [2]]).includes("matriz columna"));
  const c = classify(F([[1, 2, 3], [4, 5, 6]]));
  assert.ok(c.checks.filter((x) => x.key !== "zero" && x.key !== "square").every((x) => !x.holds));
});

test("clasificación: cada propiedad que falla señala las celdas que la contradicen", () => {
  const sym = classify(F([[1, 2], [3, 1]])).checks.find((c) => c.key === "symmetric");
  assert.equal(sym.holds, false);
  assert.deepEqual([...sym.cells].sort(), [[0, 1], [1, 0]]);
  assert.match(sym.explanation, /a₁₂ = 2 pero a₂₁ = 3/);
});

test("det: todos los métodos y la transpuesta coinciden (matrices aleatorias de orden 2 a 5)", () => {
  const rand = rng(31);
  for (let n = 2; n <= 5; n++) {
    for (let t = 0; t < 10; t++) {
      const c = crossCheck(randomMatrix(n, n, rand));
      assert.ok(c.allEqual, JSON.stringify(c.entries.map((e) => [e.label, String(e.value)])));
    }
  }
});

test("propiedades de det: identidad = 1, transpuesta, singular = 0, intercambio, escala y suma de filas", () => {
  const I = F([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  assert.ok(determinantValue(I).eq(1));
  assert.ok(crossCheck(I).notes.some((n) => /det\(I\) = 1/.test(n)));
  assert.ok(crossCheck(F([[1, 2], [2, 4]])).notes.some((n) => /singular/.test(n)));
  const m = F([[2, 1, 3], [0, 4, 1], [5, 2, 2]]);
  assert.ok(determinantValue([m[1], m[0], m[2]]).eq(determinantValue(m).neg())); // intercambiar dos filas
  assert.ok(determinantValue([m[0].map((x) => x.mul(3)), m[1], m[2]]).eq(determinantValue(m).mul(3))); // fila × 3
  assert.ok(determinantValue([m[0], m[1], m[2].map((x, j) => x.add(m[0][j].mul(2)))]).eq(determinantValue(m))); // F3 + 2F1
});

test("adjunta: A·adj(A) = det(A)·I se verifica, y si se altera la adjunta se señala la celda", () => {
  const rand = rng(77);
  for (let n = 1; n <= 4; n++) {
    const A = randomMatrix(n, n, rand);
    assert.ok(verifyAdjugate(A, cofactorProcedure(A).adjugate).ok);
  }
  const A = F([[2, 1, 1], [1, 3, 2], [1, 0, 0]]);
  const bad = cofactorProcedure(A).adjugate.map((row) => row.slice());
  bad[0][1] = bad[0][1].add(1); // error deliberado
  const v = verifyAdjugate(A, bad);
  assert.equal(v.ok, false);
  assert.ok(v.badCells.length > 0);
});

test("adjunta ≠ matriz de cofactores: es su transpuesta", () => {
  const A = F([[1, 2, 3], [0, 1, 4], [5, 6, 0]]);
  const r = cofactorProcedure(A);
  assert.ok(matrixEqual(r.adjugate, r.cofactors[0].map((_, j) => r.cofactors.map((row) => row[j]))));
  assert.ok(!matrixEqual(r.adjugate, r.cofactors));
});

test("patrón de signos para tamaños 1 a 4", () => {
  for (let n = 1; n <= 4; n++) {
    const A = F(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i + j + 1)));
    cofactorProcedure(A).signPattern.forEach((row, i) => row.forEach((x, j) => assert.ok(x.eq((i + j) % 2 === 0 ? 1 : -1))));
  }
  assert.deepEqual(T(cofactorProcedure(F([[1, 2], [3, 4]])).signPattern), [["1", "-1"], ["-1", "1"]]);
});

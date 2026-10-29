import test from "node:test";
import assert from "node:assert/strict";
import { Fraction } from "../js/utils/fraction.js";
import { parseValue, parseMatrix } from "../js/utils/validation.js";
import { fmt, fmtParen, coef, subscript } from "../js/utils/formatting.js";
import { ValidationError } from "../js/utils/errors.js";

test("las fracciones se simplifican y mantienen el signo en el numerador", () => {
  assert.equal(new Fraction(2, -4).toString(), "-1/2");
  assert.equal(new Fraction(0, 7).toString(), "0");
  assert.equal(new Fraction(6, 3).toString(), "2");
});

test("aritmética exacta: 1/3 + 1/6 = 1/2 (con float daría error de redondeo)", () => {
  const r = new Fraction(1, 3).add(new Fraction(1, 6));
  assert.ok(r.eq(new Fraction(1, 2)));
  assert.ok(new Fraction(1, 10).add(new Fraction(2, 10)).eq(new Fraction(3, 10))); // 0.1 + 0.2 === 0.30000000000000004 en float
});

test("parseValue acepta enteros, decimales, fracciones, coma decimal y signo unicode", () => {
  assert.equal(parseValue("3").toString(), "3");
  assert.equal(parseValue("-3/4").toString(), "-3/4");
  assert.equal(parseValue("0.5").toString(), "1/2");
  assert.equal(parseValue("2,5").toString(), "5/2");
  assert.equal(parseValue("−2").toString(), "-2");
  assert.equal(parseValue(" 7 / 14 ").toString(), "1/2");
});

test("parseValue rechaza vacío, texto y denominador cero con mensajes claros", () => {
  assert.throws(() => parseValue(""), /vacía/);
  assert.throws(() => parseValue("abc"), /no es un número válido/);
  assert.throws(() => parseValue("1/0"), /denominador cero/);
});

test("parseMatrix indica la celda defectuosa", () => {
  assert.throws(
    () => parseMatrix([["1", "2"], ["3", "x"]], "A"),
    (e) => e instanceof ValidationError && e.row === 1 && e.col === 1 && /A\[2,2\]/.test(e.message),
  );
});

test("formato: negativos entre paréntesis, coeficientes y subíndices", () => {
  assert.equal(fmt(new Fraction(-3, 2)), "-3/2");
  assert.equal(fmt(new Fraction(-3, 2), true), "−3/2");
  assert.equal(fmtParen(-2), "(-2)");
  assert.equal(coef(1), "");
  assert.equal(coef(3), "3");
  assert.equal(coef(new Fraction(1, 2)), "(1/2)");
  assert.equal(subscript(12), "₁₂");
});

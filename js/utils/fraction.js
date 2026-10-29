/**
 * Fraction: número racional exacto (equivalente a `fractions.Fraction` de Python).
 *
 * JavaScript no trae fracciones y sus números normales (`Number`) son decimales
 * binarios: 1/3 se guardaría como 0.3333... y los errores se acumularían.
 * Por eso guardamos numerador y denominador como BigInt (enteros sin límite)
 * y siempre los dejamos simplificados con el máximo común divisor.
 */

function gcd(a, b) {
  if (a < 0n) a = -a;
  if (b < 0n) b = -b;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

/** Error propio para "denominador cero" (lo captura validation.parseValue). */
export class ZeroDenominatorError extends RangeError {}

export class Fraction {
  constructor(numerator, denominator = 1n) {
    let num = BigInt(numerator);
    let den = BigInt(denominator);
    if (den === 0n) throw new ZeroDenominatorError("denominador cero");
    if (den < 0n) {
      num = -num;
      den = -den;
    }
    const g = gcd(num, den) || 1n;
    this.numerator = num / g;
    this.denominator = den / g;
    Object.freeze(this);
  }

  /** Convierte Fraction, BigInt, entero o texto ("3/4", "1.5") en Fraction. */
  static of(x) {
    if (x instanceof Fraction) return x;
    if (typeof x === "bigint") return new Fraction(x);
    if (typeof x === "number") {
      if (!Number.isInteger(x)) throw new TypeError("Use texto para decimales (p. ej. '1.5') o new Fraction(p, q).");
      return new Fraction(BigInt(x));
    }
    if (typeof x === "string") return Fraction.parse(x);
    throw new TypeError(`No se puede convertir a Fraction: ${x}`);
  }

  /**
   * Lee "3", "-3/4", "1.5", "2e3". Lanza SyntaxError si el formato es inválido
   * y ZeroDenominatorError si el denominador es 0.
   */
  static parse(text) {
    const m = /^([-+]?)(?=\d|\.\d)(\d*)(?:\/(\d+)|(?:\.(\d*))?(?:[eE]([-+]?\d+))?)$/.exec(String(text).trim());
    if (!m) throw new SyntaxError(`Fracción inválida: ${text}`);
    const [, sign, intPart, den, decimals = "", exp] = m;
    let result;
    if (den !== undefined) {
      result = new Fraction(BigInt(intPart || "0"), BigInt(den));
    } else {
      // "12.34" = 1234 / 10^2
      result = new Fraction(BigInt((intPart + decimals) || "0"), 10n ** BigInt(decimals.length));
      if (exp !== undefined) {
        const e = parseInt(exp, 10);
        if (Math.abs(e) > 1000) throw new SyntaxError("Exponente demasiado grande.");
        const factor = 10n ** BigInt(Math.abs(e));
        result = e >= 0 ? result.mul(new Fraction(factor)) : result.div(new Fraction(factor));
      }
    }
    return sign === "-" ? result.neg() : result;
  }

  add(o) {
    o = Fraction.of(o);
    return new Fraction(this.numerator * o.denominator + o.numerator * this.denominator, this.denominator * o.denominator);
  }
  sub(o) {
    o = Fraction.of(o);
    return new Fraction(this.numerator * o.denominator - o.numerator * this.denominator, this.denominator * o.denominator);
  }
  mul(o) {
    o = Fraction.of(o);
    return new Fraction(this.numerator * o.numerator, this.denominator * o.denominator);
  }
  div(o) {
    o = Fraction.of(o);
    return new Fraction(this.numerator * o.denominator, this.denominator * o.numerator);
  }
  neg() {
    return new Fraction(-this.numerator, this.denominator);
  }
  abs() {
    return this.numerator < 0n ? this.neg() : this;
  }
  inverse() {
    return new Fraction(this.denominator, this.numerator);
  }

  /** -1, 0 o 1 según el signo. */
  get sign() {
    return this.numerator < 0n ? -1 : this.numerator > 0n ? 1 : 0;
  }
  isZero() {
    return this.numerator === 0n;
  }
  /** this == o ? (las fracciones están simplificadas, basta comparar las partes) */
  eq(o) {
    o = Fraction.of(o);
    return this.numerator === o.numerator && this.denominator === o.denominator;
  }
  isInteger() {
    return this.denominator === 1n;
  }
  toString() {
    return this.isInteger() ? `${this.numerator}` : `${this.numerator}/${this.denominator}`;
  }
}

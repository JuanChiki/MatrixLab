/**
 * Errores previstos de MatrixLab.
 *
 * Todos heredan de MatrixLabError. La interfaz captura esta clase base y muestra
 * el mensaje al usuario sin mostrar trazas internas.
 */

/** Base de los errores matemáticos o de entrada que se informan al usuario. */
export class MatrixLabError extends Error {
  constructor(message) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Un dato de entrada no es válido (celda vacía, texto no numérico, etc.).
 * Si corresponde a una celda concreta se guardan su fila y columna (base 0)
 * para que la interfaz pueda resaltarla.
 */
export class ValidationError extends MatrixLabError {
  constructor(message, row = null, col = null) {
    super(message);
    this.row = row;
    this.col = col;
  }
}

/** Las dimensiones de las matrices no permiten realizar la operación. */
export class DimensionError extends MatrixLabError {}

/** La operación exige una matriz cuadrada y se recibió una rectangular. */
export class NotSquareError extends DimensionError {}

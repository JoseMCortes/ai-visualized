/** Small matrix/vector helpers — everything here operates on plain number[] and number[][]. */

export type Vec = number[];
export type Mat = number[][];

/** row vector × matrix: (1×n) @ (n×m) -> (1×m) */
export function vecMatMul(x: Vec, W: Mat): Vec {
  const out = new Array(W[0]!.length).fill(0);
  for (let j = 0; j < out.length; j++) {
    for (let i = 0; i < x.length; i++) out[j] += x[i]! * W[i]![j]!;
  }
  return out;
}

/** every row of X through the same matrix: (n×k) @ (k×m) -> (n×m) */
export function matMatMul(X: Mat, W: Mat): Mat {
  return X.map((row) => vecMatMul(row, W));
}

/** Xᵀ @ dY — the shape gradients w.r.t. a weight matrix always take. */
export function transposeMatMul(X: Mat, dY: Mat): Mat {
  const rows = X[0]!.length;
  const cols = dY[0]!.length;
  const out: Mat = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      for (let row = 0; row < X.length; row++) out[i]![j]! += X[row]![i]! * dY[row]![j]!;
    }
  }
  return out;
}

/** outer product x ⊗ y -> matrix with out[i][j] = x[i] * y[j] */
export function outer(x: Vec, y: Vec): Mat {
  return x.map((xi) => y.map((yj) => xi * yj));
}

export function dot(a: Vec, b: Vec): number {
  return a.reduce((sum, ai, i) => sum + ai * b[i]!, 0);
}

export function softmax(scores: Vec): Vec {
  const m = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export function subtract(a: Vec, b: Vec): Vec {
  return a.map((ai, i) => ai - b[i]!);
}

export function scaleMat(W: Mat, s: number): Mat {
  return W.map((row) => row.map((v) => v * s));
}

export function subtractMat(A: Mat, B: Mat): Mat {
  return A.map((row, i) => row.map((v, j) => v - B[i]![j]!));
}

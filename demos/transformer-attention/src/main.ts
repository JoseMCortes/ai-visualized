import { scaledDotProductAttention } from './attention';

/**
 * Placeholder wiring. The real visualizer (animated Q/K/V, per-head attention
 * patterns, next-token bars) is on the roadmap; for now we run one attention
 * step and print the resulting weights so the pipeline is visibly alive.
 */
const demo = scaledDotProductAttention(
  [
    [1, 0],
    [0, 1],
  ],
  [
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [1, 0],
    [0, 1],
    [0.5, 0.5],
  ],
);

const canvas = document.querySelector<HTMLCanvasElement>('#attention-canvas');
const ctx = canvas?.getContext('2d');

if (ctx) {
  ctx.fillStyle = '#0b0b0f';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#e6e6e6';
  ctx.font = '15px ui-monospace, monospace';
  ctx.fillText('scaled dot-product attention — softmax weights', 16, 28);
  demo.weights.forEach((row, i) => {
    const pretty = row.map((w) => w.toFixed(3)).join('   ');
    ctx.fillText(`q${i}:  ${pretty}`, 16, 64 + i * 24);
  });
}

console.log('attention output', demo.output);

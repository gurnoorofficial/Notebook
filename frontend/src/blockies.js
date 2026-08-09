function seedrand(seed) {
  const randseed = new Array(4).fill(0);

  for (let i = 0; i < seed.length; i += 1) {
    randseed[i % 4] = (randseed[i % 4] << 5) - randseed[i % 4] + seed.charCodeAt(i);
    randseed[i % 4] |= 0;
  }

  return function rand() {
    const t = randseed[0] ^ (randseed[0] << 11);

    randseed[0] = randseed[1];
    randseed[1] = randseed[2];
    randseed[2] = randseed[3];
    randseed[3] = randseed[3] ^ (randseed[3] >> 19) ^ t ^ (t >> 8);

    return (randseed[3] >>> 0) / 0xffffffff;
  };
}

function drawDot(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A soft, single-hue dot-matrix identicon: symmetric, transparent background
 * (so it sits on the caller's own card background), muted enough to pair
 * with a restrained palette instead of the harsh multi-color pixel look of
 * classic "blockies".
 */
export function blockyDataUrl(seed, gridSize = 4, cell = 13) {
  const rand = seedrand(seed.toLowerCase().trim());

  const hue = Math.floor(rand() * 360);
  const saturation = 38 + rand() * 14;
  const lightness = 52 + rand() * 10;

  const px = gridSize * cell;
  const canvas = document.createElement("canvas");

  canvas.width = px;
  canvas.height = px;

  const ctx = canvas.getContext("2d");
  const cols = Math.ceil(gridSize / 2);
  const radius = cell * 0.42;

  ctx.fillStyle = `hsl(${hue} ${saturation}% ${lightness}%)`;

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (rand() > 0.5) {
        continue;
      }

      const cy = y * cell + cell / 2;
      const mirroredX = gridSize - 1 - x;

      drawDot(ctx, x * cell + cell / 2, cy, radius);

      if (mirroredX !== x) {
        drawDot(ctx, mirroredX * cell + cell / 2, cy, radius);
      }
    }
  }

  return canvas.toDataURL("image/png");
}

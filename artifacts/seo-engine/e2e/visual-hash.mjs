import { PNG } from "pngjs";

function luminance(red, green, blue, alpha) {
  const opacity = alpha / 255;
  const r = red * opacity + 255 * (1 - opacity);
  const g = green * opacity + 255 * (1 - opacity);
  const b = blue * opacity + 255 * (1 - opacity);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function perceptualHash(buffer, gridSize = 16) {
  const png = PNG.sync.read(buffer);
  const values = [];

  for (let gridY = 0; gridY < gridSize; gridY += 1) {
    const yStart = Math.floor((gridY * png.height) / gridSize);
    const yEnd = Math.max(
      yStart + 1,
      Math.floor(((gridY + 1) * png.height) / gridSize),
    );

    for (let gridX = 0; gridX < gridSize; gridX += 1) {
      const xStart = Math.floor((gridX * png.width) / gridSize);
      const xEnd = Math.max(
        xStart + 1,
        Math.floor(((gridX + 1) * png.width) / gridSize),
      );
      let total = 0;
      let count = 0;

      for (let y = yStart; y < yEnd; y += 1) {
        for (let x = xStart; x < xEnd; x += 1) {
          const index = (png.width * y + x) << 2;
          total += luminance(
            png.data[index],
            png.data[index + 1],
            png.data[index + 2],
            png.data[index + 3],
          );
          count += 1;
        }
      }
      values.push(total / count);
    }
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  let hex = "";
  for (let i = 0; i < values.length; i += 4) {
    let nibble = 0;
    for (let bit = 0; bit < 4; bit += 1) {
      if (values[i + bit] >= average) {
        nibble |= 1 << (3 - bit);
      }
    }
    hex += nibble.toString(16);
  }
  return hex;
}

export function hammingDistance(left, right) {
  if (left.length !== right.length) {
    throw new Error("visual_hash_length_mismatch");
  }
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const xor = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    distance += xor.toString(2).replaceAll("0", "").length;
  }
  return distance;
}

import { PNG } from "pngjs";

function luminance(red, green, blue, alpha) {
  const opacity = alpha / 255;
  const r = red * opacity + 255 * (1 - opacity);
  const g = green * opacity + 255 * (1 - opacity);
  const b = blue * opacity + 255 * (1 - opacity);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function blockAverage(png, xStart, xEnd, yStart, yEnd) {
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
  return total / Math.max(count, 1);
}

function sampleGrid(png, columns, rows) {
  const values = [];
  for (let row = 0; row < rows; row += 1) {
    const yStart = Math.floor((row * png.height) / rows);
    const yEnd = Math.max(
      yStart + 1,
      Math.floor(((row + 1) * png.height) / rows),
    );
    const rowValues = [];
    for (let column = 0; column < columns; column += 1) {
      const xStart = Math.floor((column * png.width) / columns);
      const xEnd = Math.max(
        xStart + 1,
        Math.floor(((column + 1) * png.width) / columns),
      );
      rowValues.push(blockAverage(png, xStart, xEnd, yStart, yEnd));
    }
    values.push(rowValues);
  }
  return values;
}

function bitsToHex(bits) {
  let hex = "";
  for (let index = 0; index < bits.length; index += 4) {
    let nibble = 0;
    for (let bit = 0; bit < 4; bit += 1) {
      if (bits[index + bit]) nibble |= 1 << (3 - bit);
    }
    hex += nibble.toString(16);
  }
  return hex;
}

export function perceptualHash(buffer, gridSize = 16) {
  const png = PNG.sync.read(buffer);

  const horizontalSamples = sampleGrid(png, gridSize + 1, gridSize);
  const horizontalBits = [];
  for (const row of horizontalSamples) {
    for (let x = 0; x < gridSize; x += 1) {
      horizontalBits.push(row[x] > row[x + 1]);
    }
  }

  const verticalSamples = sampleGrid(png, gridSize, gridSize + 1);
  const verticalBits = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      verticalBits.push(verticalSamples[y][x] > verticalSamples[y + 1][x]);
    }
  }

  return bitsToHex([...horizontalBits, ...verticalBits]);
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

export type ColorPixelRGBA = [number, number, number, number]
export type ColorPixelRGB = [number, number, number]

export function lineDistance (x1: number, y1: number, x2: number, y2: number) {
  // calculate euclidean distance between (x1, y1) and (x2, y2)
  const xs = Math.pow(x2 - x1, 2);
  const ys = Math.pow(y2 - y1, 2);
  return Math.sqrt(xs + ys);
}

export function hexToRgb (hexColor: string): ColorPixelRGB {
  // Since input type color provides hex and ImageData accepts RGB need to transform
  const m = hexColor.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  return [
    parseInt(m[1], 16),
    parseInt(m[2], 16),
    parseInt(m[3], 16)
  ];
}

export function matchColor (data: number[], compR: number, compG: number, compB: number, compA: number) {
  return (pixelPos: number) => {
    // Pixel color equals comp color?
    const r = data[pixelPos];
    const g = data[pixelPos + 1];
    const b = data[pixelPos + 2];
    const a = data[pixelPos + 3];

    return (r === compR && g === compG && b === compB && a === compA);
  };
}

export function colorPixel (data: number[], fillR: number, fillG: number, fillB: number, startColor: ColorPixelRGBA, alpha: number) {
  const matcher = matchColor(data, ...startColor);

  return (pixelPos: number) => {
    // Update fill color in matrix
    data[pixelPos] = fillR;
    data[pixelPos + 1] = fillG;
    data[pixelPos + 2] = fillB;
    data[pixelPos + 3] = alpha;

    if (!matcher(pixelPos + 4)) {
      data[pixelPos + 4] = data[pixelPos + 4] * 0.01 + fillR * 0.99;
      data[pixelPos + 4 + 1] = data[pixelPos + 4 + 1] * 0.01 + fillG * 0.99;
      data[pixelPos + 4 + 2] = data[pixelPos + 4 + 2] * 0.01 + fillB * 0.99;
      data[pixelPos + 4 + 3] = data[pixelPos + 4 + 3] * 0.01 + alpha * 0.99;
    }

    if (!matcher(pixelPos - 4)) {
      data[pixelPos - 4] = data[pixelPos - 4] * 0.01 + fillR * 0.99;
      data[pixelPos - 4 + 1] = data[pixelPos - 4 + 1] * 0.01 + fillG * 0.99;
      data[pixelPos - 4 + 2] = data[pixelPos - 4 + 2] * 0.01 + fillB * 0.99;
      data[pixelPos - 4 + 3] = data[pixelPos - 4 + 3] * 0.01 + alpha * 0.99;
    }
  };
}

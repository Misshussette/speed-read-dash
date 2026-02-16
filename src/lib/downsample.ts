/**
 * Largest-Triangle-Three-Buckets (LTTB) downsampling algorithm.
 * Preserves visual shape while reducing point count.
 * Never destroys source data — returns indices + sampled array.
 */
export function lttbDownsample<T>(
  data: T[],
  threshold: number,
  getX: (d: T) => number,
  getY: (d: T) => number
): T[] {
  if (threshold >= data.length || threshold <= 2) return data;

  const sampled: T[] = [data[0]];
  const bucketSize = (data.length - 2) / (threshold - 2);

  let prevIndex = 0;

  for (let i = 0; i < threshold - 2; i++) {
    const avgStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);

    let avgX = 0;
    let avgY = 0;
    const avgLen = avgEnd - avgStart;

    for (let j = avgStart; j < avgEnd; j++) {
      avgX += getX(data[j]);
      avgY += getY(data[j]);
    }
    avgX /= avgLen;
    avgY /= avgLen;

    const rangeStart = Math.floor(i * bucketSize) + 1;
    const rangeEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, data.length);

    let maxArea = -1;
    let maxIndex = rangeStart;

    const pointAX = getX(data[prevIndex]);
    const pointAY = getY(data[prevIndex]);

    for (let j = rangeStart; j < rangeEnd; j++) {
      const area = Math.abs(
        (pointAX - avgX) * (getY(data[j]) - pointAY) -
        (pointAX - getX(data[j])) * (avgY - pointAY)
      );
      if (area > maxArea) {
        maxArea = area;
        maxIndex = j;
      }
    }

    sampled.push(data[maxIndex]);
    prevIndex = maxIndex;
  }

  sampled.push(data[data.length - 1]);
  return sampled;
}

/** Compute target point count based on container width */
export function getTargetPoints(containerWidth: number): number {
  return Math.max(80, Math.min(Math.floor(containerWidth / 3), 500));
}

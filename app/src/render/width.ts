export function maxLineWidth(lines: readonly string[]): number {
  let max = 0;
  for (const line of lines) if (line.length > max) max = line.length;
  return max;
}

export function exceedsWidth(lines: readonly string[], width: number): boolean {
  return maxLineWidth(lines) > width;
}

export const space = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  24: 24,
  32: 32,
  48: 48,
  64: 64,
  96: 96,
} as const;

export const matteoYellow = "#fffb00";
export const ink = "#14141a";

export const compactSpace = {
  section: space[16],
  card: space[12],
  gap: space[8],
  tight: space[4],
} as const;

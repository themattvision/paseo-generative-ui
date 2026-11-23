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

export const compactSpace = {
  section: space[16],
  card: space[12],
  gap: space[8],
  tight: space[4],
} as const;

/**
 * Colors that depend on the plugin settings (Settings → Plugins → Generative UI) and the Paseo theme.
 * `look` is mutated by `applyLook` from the top-level timeline item before its children render, so every
 * component reads the current values at render time. Defaults match the "theme" look until settings load.
 *  - accent / onAccent: solid accent fill and the text color on top of it (solid buttons).
 *  - fill / glyph: small filled pills (check marks, status dots) and the glyph drawn inside them.
 */
export const look = {
  accent: "#fffb00",
  onAccent: "#14141a",
  fill: "#14141a",
  glyph: "#fffb00",
};

const defaultInkAccent = "#fffb00";
const ink = "#14141a";

export function applyLook(
  settings: { look: "theme" | "ink"; accentColor: string } | undefined,
  theme: { colors: { accent: string; accentForeground: string } },
) {
  const override = settings?.accentColor ? settings.accentColor : undefined;
  if (settings?.look === "ink") {
    const accent = override ?? defaultInkAccent;
    look.accent = accent;
    look.onAccent = ink;
    look.fill = ink;
    look.glyph = accent;
    return;
  }
  const accent = override ?? theme.colors.accent;
  look.accent = accent;
  look.onAccent = override ? ink : theme.colors.accentForeground;
  look.fill = accent;
  look.glyph = look.onAccent;
}

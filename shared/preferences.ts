import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const defaultBridgePort = 37621;

/**
 * Plugin settings, stored by Paseo on the host (Settings → Plugins → Generative UI).
 * - look "theme": accent controls follow the Paseo theme. look "ink": dark pills with an accent glyph.
 * - accentColor: optional hex override for the accent. Empty uses the Paseo theme accent (look "theme") or yellow (look "ink").
 * - bridgePort: local port of the loopback bridge used by the show_ui MCP tool. Needs a plugin reload to apply.
 */
export const preferences = defineSettings({
  id: "appearance",
  scope: "host",
  version: 1,
  schema: z.object({
    look: z.enum(["theme", "ink"]).default("theme"),
    accentColor: z
      .string()
      .trim()
      .regex(/^(#[0-9a-fA-F]{6})?$/, "Use a hex color like #fffb00, or leave it empty")
      .default(""),
    bridgePort: z.number().int().min(1024, "Use a port from 1024 to 65535").max(65535, "Use a port from 1024 to 65535").default(defaultBridgePort),
  }),
});

export type Preferences = ReturnType<typeof preferences.schema.parse>;

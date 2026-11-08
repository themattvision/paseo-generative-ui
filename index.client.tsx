import type { PluginClientContext } from "@getpaseo/plugin/client";
import { GenerativeUiItem } from "./client/generative-ui.js";
import { generativeUiClientSchema } from "./shared/generative-ui.js";

// Solo il rendering inline nella timeline: la Galleria UI e la sua voce in sidebar sono state tolte
// il 3 novembre 2026 (client/gallery.tsx resta nel repo come banco di prova, non è registrato).
export default function contribute(client: PluginClientContext) {
  const removeRenderer = client.addTimelineRenderer({
    kind: "generative-ui",
    version: 1,
    schema: generativeUiClientSchema,
    Component: GenerativeUiItem,
  });
  return () => { removeRenderer(); };
}

import type { PluginClientContext } from "@getpaseo/plugin/client";
import { ActionChip } from "./client/action-chip.js";
import { GenerativeUiItem } from "./client/generative-ui.js";
import { actionChipSchema } from "./shared/action-chip.js";
import { parseActionLabel } from "./shared/action.js";
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
  // Il messaggio utente «[Azione UI] ...» diventa il chip del bottone premuto (l'agente riceve comunque il testo intero).
  const removeChipRenderer = client.addTimelineRenderer({ kind: "ui-action", version: 1, schema: actionChipSchema, Component: ActionChip });
  const removeChipTransformer = client.addTimelineTransformer({
    id: "ui-action-chip",
    query: { itemType: "user_message" },
    transform: ({ item }) => {
      const label = parseActionLabel(item.text);
      if (label === undefined) return undefined;
      return { items: [{ type: "plugin", id: item.messageId ?? item.clientMessageId, kind: "ui-action", version: 1, data: { label } }] };
    },
  });
  return () => { removeRenderer(); removeChipRenderer(); removeChipTransformer(); };
}

import type { PluginClientContext } from "@getpaseo/plugin/client";
import { ActionChip } from "./client/action-chip.js";
import { AGENT_SCREEN_ID, installAgentNav } from "./client/agent-nav.js";
import { AgentRedirect } from "./client/agent-redirect.js";
import { EmbeddedGenerativeUi, GenerativeUiItem } from "./client/generative-ui.js";
import { installIntelligentUiBridge } from "./client/finale-bridge.js";
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
  // Fusione con Finale: espone il blocco incorporabile (vedi client/finale-bridge.ts).
  const removeBridge = installIntelligentUiBridge(EmbeddedGenerativeUi);
  // AgentLink: schermata di passaggio che apre la chat di un altro agente (vedi client/agent-nav.ts).
  const removeAgentScreen = client.addScreen({ id: AGENT_SCREEN_ID, title: "Apri chat", Component: AgentRedirect });
  const removeAgentNav = installAgentNav((input) => client.openScreen(input));
  return () => { removeRenderer(); removeChipRenderer(); removeChipTransformer(); removeBridge(); removeAgentScreen(); removeAgentNav(); };
}

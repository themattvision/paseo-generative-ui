import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const maxBytes = 64 * 1024;
const bridgeUrl = process.env.GENERATIVE_UI_BRIDGE_URL;
const bridgeToken = process.env.GENERATIVE_UI_BRIDGE_TOKEN;
const agentId = process.env.PASEO_AGENT_ID;
const error = (message) => ({ content: [{ type: "text", text: message }], isError: true });
const mcp = new Server({ name: "generative-ui", version: "1.0.0" }, { capabilities: { tools: {} } });

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "show_ui",
    description: "Inserisce o aggiorna un blocco di interfaccia nella timeline della chat.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Titolo opzionale dell'interfaccia." },
        spec: { type: "object", description: "Spec JSON dell'interfaccia." },
        id: { type: "string", description: "Id opzionale per aggiornare una riga già inviata." },
      },
      required: ["spec"], additionalProperties: false,
    },
  }],
}));
mcp.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "show_ui") return error("Strumento sconosciuto.");
  if (!bridgeUrl || !bridgeToken || !agentId) return error("Bridge Generative UI non configurato per questo agente.");
  const { title, spec, id } = request.params.arguments ?? {};
  if (title !== undefined && typeof title !== "string") return error("title deve essere una stringa.");
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return error("spec deve essere un oggetto JSON.");
  if (id !== undefined && typeof id !== "string") return error("id deve essere una stringa.");
  if (Buffer.byteLength(JSON.stringify({ title, spec }), "utf8") > maxBytes) return error("I dati dell'interfaccia superano il limite di 64 KiB.");
  try {
    const response = await fetch(bridgeUrl, {
      method: "POST", headers: { authorization: `Bearer ${bridgeToken}`, "content-type": "application/json" },
      body: JSON.stringify({ agentId, title, spec, id }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return error(typeof body.error === "string" ? body.error : "Impossibile mostrare l'interfaccia.");
    return { content: [{ type: "text", text: "Interfaccia mostrata nella timeline." }] };
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Impossibile contattare il bridge.");
  }
});
await mcp.connect(new StdioServerTransport());

import { OPENUI_PROMPT } from "../shared/openui-prompt.generated.js";

// Il programma MCP gira come script inline (node --eval) e non può importare moduli: la descrizione
// con il prompt OpenUI viene costruita qui, nel modulo server, e inserita come stringa JSON.
const showUiDescription = `Adds or updates an interface block in the chat timeline.\n\n${OPENUI_PROMPT}`;

export const mcpProgram = String.raw`
const maxBytes = 64 * 1024;
const bridgeUrl = process.env.GENERATIVE_UI_BRIDGE_URL;
const bridgeToken = process.env.GENERATIVE_UI_BRIDGE_TOKEN;
const agentToken = process.env.GENERATIVE_UI_AGENT_TOKEN;
const send = (message) => process.stdout.write(JSON.stringify(message) + "\n");
const tool = {
  name: "show_ui",
  description: ${JSON.stringify(showUiDescription)},
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Titolo opzionale dell'interfaccia." },
      spec: { type: "object", description: "JSON spec of the interface (classic format). Use spec or openui, not both." },
      openui: { type: "string", description: "OpenUI Lang text (root = Col([...]) and definition lines). Alternative to spec, up to 20000 characters." },
      id: { type: "string", description: "Optional id to update a row that was already sent." },
    },
    required: [],
    additionalProperties: false,
  },
};
const failure = (message) => ({ content: [{ type: "text", text: message }], isError: true });
// Le immagini locali (Image("/percorso") o file://) NON si incorporano qui: lo fa il bridge (server/local-images.ts),
// così vale anche per le chat già aperte, che hanno ancora il programma MCP vecchio.
async function callTool(args) {
  const { title, spec, openui, id } = args ?? {};
  if (!bridgeUrl || !bridgeToken || !agentToken) return failure("Generative UI bridge is not configured for this agent.");
  if (title !== undefined && typeof title !== "string") return failure("title must be a string.");
  if (spec !== undefined && openui !== undefined) return failure("Pass spec or openui, not both.");
  if (spec === undefined && openui === undefined) return failure("Pass spec (JSON object) or openui (OpenUI Lang text).");
  if (spec !== undefined && (!spec || typeof spec !== "object" || Array.isArray(spec))) return failure("spec must be a JSON object.");
  if (openui !== undefined && typeof openui !== "string") return failure("openui must be a string.");
  if (id !== undefined && typeof id !== "string") return failure("id must be a string.");
  if (Buffer.byteLength(JSON.stringify({ title, spec, openui }), "utf8") > maxBytes) return failure("Interface data exceeds the 64 KiB limit.");
  try {
    const response = await fetch(bridgeUrl, {
      method: "POST",
      headers: { authorization: "Bearer " + bridgeToken, "content-type": "application/json" },
      body: JSON.stringify({ agentToken, title, spec, openui, id }),
    });
    const body = await response.json().catch(() => ({}));
    return response.ok
      ? { content: [{ type: "text", text: "Interface shown in the timeline." }] }
      : failure(typeof body.error === "string" ? body.error : "Impossibile mostrare l'interfaccia.");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Cannot reach the bridge.");
  }
}
let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, index);
    buffer = buffer.slice(index + 1);
    void handle(line);
  }
});
async function handle(line) {
  if (!line.trim()) return;
  let request;
  try { request = JSON.parse(line); } catch { return; }
  if (request.method === "notifications/initialized") return;
  if (request.method === "initialize") {
    send({ jsonrpc: "2.0", id: request.id, result: { protocolVersion: request.params?.protocolVersion ?? "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "generative-ui", version: "1.0.0" } } });
    return;
  }
  if (request.method === "tools/list") {
    send({ jsonrpc: "2.0", id: request.id, result: { tools: [tool] } });
    return;
  }
  if (request.method === "tools/call") {
    const result = request.params?.name === "show_ui" ? await callTool(request.params.arguments) : failure("Strumento sconosciuto.");
    send({ jsonrpc: "2.0", id: request.id, result });
  }
}
`;

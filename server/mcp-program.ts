export const mcpProgram = String.raw`
const maxBytes = 64 * 1024;
const bridgeUrl = process.env.GENERATIVE_UI_BRIDGE_URL;
const bridgeToken = process.env.GENERATIVE_UI_BRIDGE_TOKEN;
const agentToken = process.env.GENERATIVE_UI_AGENT_TOKEN;
const send = (message) => process.stdout.write(JSON.stringify(message) + "\n");
const tool = {
  name: "show_ui",
  description: "Inserisce o aggiorna un blocco di interfaccia nella timeline della chat.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Titolo opzionale dell'interfaccia." },
      spec: { type: "object", description: "Spec JSON dell'interfaccia." },
      id: { type: "string", description: "Id opzionale per aggiornare una riga già inviata." },
    },
    required: ["spec"],
    additionalProperties: false,
  },
};
const failure = (message) => ({ content: [{ type: "text", text: message }], isError: true });
async function callTool(args) {
  const { title, spec, id } = args ?? {};
  if (!bridgeUrl || !bridgeToken || !agentToken) return failure("Bridge Generative UI non configurato per questo agente.");
  if (title !== undefined && typeof title !== "string") return failure("title deve essere una stringa.");
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return failure("spec deve essere un oggetto JSON.");
  if (id !== undefined && typeof id !== "string") return failure("id deve essere una stringa.");
  if (Buffer.byteLength(JSON.stringify({ title, spec }), "utf8") > maxBytes) return failure("I dati dell'interfaccia superano il limite di 64 KiB.");
  try {
    const response = await fetch(bridgeUrl, {
      method: "POST",
      headers: { authorization: "Bearer " + bridgeToken, "content-type": "application/json" },
      body: JSON.stringify({ agentToken, title, spec, id }),
    });
    const body = await response.json().catch(() => ({}));
    return response.ok
      ? { content: [{ type: "text", text: "Interfaccia mostrata nella timeline." }] }
      : failure(typeof body.error === "string" ? body.error : "Impossibile mostrare l'interfaccia.");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Impossibile contattare il bridge.");
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

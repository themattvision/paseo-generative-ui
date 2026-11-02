import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { PluginHookContext, PluginServerContext } from "@getpaseo/plugin/server";
import { generativeUiSchema, maxGenerativeUiDataBytes } from "./shared/generative-ui.js";

const bridgePath = "/Users/matteozampieri/ProgettiApp/paseo-generative-ui/server/mcp-bridge.mjs";
const bridgePort = 37621;

function readJson(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxGenerativeUiDataBytes + 8_192) {
        reject(new Error("Corpo della richiesta troppo grande."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("JSON non valido."));
      }
    });
    request.on("error", reject);
  });
}

function reply(response: ServerResponse, status: number, body: Record<string, unknown>) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

export default function contribute(server: PluginServerContext) {
  const token = randomBytes(32).toString("hex");
  let paseo: PluginHookContext["paseo"] | undefined;
  const bridge = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/append") {
      reply(response, 404, { error: "Risorsa non trovata." });
      return;
    }
    if (request.headers.authorization !== `Bearer ${token}`) {
      reply(response, 401, { error: "Non autorizzato." });
      return;
    }
    try {
      const input = await readJson(request);
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Input non valido.");
      const { agentId, id, ...data } = input as Record<string, unknown>;
      if (typeof agentId !== "string" || !agentId) throw new Error("agentId mancante.");
      if (id !== undefined && (typeof id !== "string" || !id)) throw new Error("id non valido.");
      const parsed = generativeUiSchema.parse(data);
      if (Buffer.byteLength(JSON.stringify(parsed), "utf8") > maxGenerativeUiDataBytes) {
        throw new Error("I dati dell'interfaccia superano il limite di 64 KiB.");
      }
      if (!paseo) throw new Error("Bridge Generative UI non ancora inizializzato.");
      await paseo.agents.ref(agentId).timeline.append({
        type: "plugin",
        id: typeof id === "string" ? id : `generative-ui-${randomBytes(8).toString("hex")}`,
        kind: "generative-ui",
        version: 1,
        data: parsed,
      });
      reply(response, 200, { ok: true });
    } catch (error) {
      reply(response, 400, { error: error instanceof Error ? error.message : "Input non valido." });
    }
  });
  bridge.on("error", (error) => console.error("Bridge Generative UI non disponibile:", error));
  bridge.listen(bridgePort, "127.0.0.1");
  const bridgeUrl = `http://127.0.0.1:${bridgePort}/append`;
  const removeHook = server.before("agent.create", ({ request }, context) => {
    paseo = context.paseo;
    return {
    ...request,
    config: {
      ...request.config,
      mcpServers: {
        ...request.config.mcpServers,
        "generative-ui": {
          type: "stdio",
          command: process.execPath,
          args: [bridgePath],
          env: { GENERATIVE_UI_BRIDGE_URL: bridgeUrl, GENERATIVE_UI_BRIDGE_TOKEN: token },
          alwaysLoad: true,
        },
      },
    },
    };
  });
  return () => {
    removeHook();
    bridge.close();
  };
}

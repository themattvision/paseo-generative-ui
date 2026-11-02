import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import type { PluginHookContext, PluginServerContext } from "@getpaseo/plugin/server";
import { mcpProgram } from "./server/mcp-program.js";
import { generativeUiSchema, maxGenerativeUiDataBytes } from "./shared/generative-ui.js";
import { sanitizeGenerativeUiData } from "./shared/html.js";
import { readRows, removeRows, saveRow } from "./server/persistence.js";

const bridgePort = 37621;

function resolveNodeCommand(): string {
  for (const directory of (process.env.PATH ?? "").split(":")) {
    const candidate = join(directory, "node");
    if (existsSync(candidate)) return candidate;
  }
  return "node";
}

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
  const nodeCommand = resolveNodeCommand();
  const token = randomBytes(32).toString("hex");
  let paseo: PluginHookContext["paseo"] | undefined;
  const agentTokens = new Map<string, string>();
  async function append(agentId: string, id: string, data: ReturnType<typeof generativeUiSchema.parse>, persist: boolean) {
    if (!paseo) throw new Error("Bridge Generative UI non ancora inizializzato.");
    await paseo.agents.ref(agentId).timeline.append({ type: "plugin", id, kind: "generative-ui", version: 1, data });
    if (persist) await saveRow(agentId, { id, data });
  }
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
      const { agentToken, id, ...data } = input as Record<string, unknown>;
      if (typeof agentToken !== "string") throw new Error("Token agente mancante.");
      const agentId = agentTokens.get(agentToken);
      if (!agentId) throw new Error("Agente non disponibile per questo token.");
      if (id !== undefined && (typeof id !== "string" || !id)) throw new Error("id non valido.");
      const rowId = typeof id === "string" ? id : `generative-ui-${randomBytes(8).toString("hex")}`;
      const parsed = sanitizeGenerativeUiData({ ...generativeUiSchema.parse(data), rowId });
      if (Buffer.byteLength(JSON.stringify(parsed), "utf8") > maxGenerativeUiDataBytes) {
        throw new Error("I dati dell'interfaccia superano il limite di 64 KiB.");
      }
      await append(agentId, rowId, parsed, true);
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
    const agentToken = randomBytes(32).toString("hex");
    return {
    ...request,
    env: { ...request.env, GENERATIVE_UI_AGENT_TOKEN: agentToken },
    config: {
      ...request.config,
      mcpServers: {
        ...request.config.mcpServers,
        "generative-ui": {
          type: "stdio",
          command: nodeCommand,
          args: ["--input-type=commonjs", "--eval", mcpProgram],
          env: {
            GENERATIVE_UI_BRIDGE_URL: bridgeUrl,
            GENERATIVE_UI_BRIDGE_TOKEN: token,
            GENERATIVE_UI_AGENT_TOKEN: agentToken,
          },
          alwaysLoad: true,
        },
      },
    },
    };
  });
  const removeSessionHook = server.before("agent.session_open", async ({ request }, context) => {
    paseo = context.paseo;
    const agentToken = request.env.GENERATIVE_UI_AGENT_TOKEN;
    if (agentToken) agentTokens.set(agentToken, request.agentId);
    for (const row of await readRows(request.agentId)) await append(request.agentId, row.id, row.data, false);
    return request;
  });
  const removeArchiveHook = server.on("agent.archived", ({ agent }) => { void removeRows(agent.id); });
  return () => {
    removeHook();
    removeSessionHook();
    removeArchiveHook();
    bridge.close();
  };
}

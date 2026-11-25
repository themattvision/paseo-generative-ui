import { randomBytes } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { join } from "node:path";
import type { PluginHookContext, PluginServerContext } from "@getpaseo/plugin/server";
import { loadLocalImage, localImagePaths, normalizeImagePath } from "./server/local-images.js";
import { loadImage } from "./shared/images.js";
import { mcpProgram } from "./server/mcp-program.js";
import {
  embeddedImagePattern,
  generativeUiSchema,
  maxEmbeddedImagesBytes,
  maxGenerativeUiBodyBytes,
  maxGenerativeUiDataBytes,
} from "./shared/generative-ui.js";
import { maxOpenUiChars } from "./shared/openui-signatures.js";
import { defaultBridgePort, preferences } from "./shared/preferences.js";
import { sanitizeGenerativeUiData } from "./shared/html.js";
import { loadAgentTokens, loadImagePaths, loadOrCreateBridgeToken, saveImagePaths, readRows, removeRows, saveAgentTokens, saveRow } from "./server/persistence.js";

function tryListen(bridge: Server, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const onError = () => {
      bridge.off("listening", onListening);
      resolve(false);
    };
    const onListening = () => {
      bridge.off("error", onError);
      resolve(true);
    };
    bridge.once("error", onError);
    bridge.once("listening", onListening);
    bridge.listen(port, "127.0.0.1");
  });
}

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
      if (size > maxGenerativeUiBodyBytes) {
        reject(new Error("Request body is too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON."));
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
  // Token del ponte e token agente restano gli stessi dopo un reload del plugin, altrimenti le chat già aperte
  // perdono `show_ui` («Non autorizzato») finché non si riapre la sessione.
  const token = loadOrCreateBridgeToken(() => randomBytes(32).toString("hex"));
  let paseo: PluginHookContext["paseo"] | undefined;
  const agentTokens = loadAgentTokens();
  const imagePaths = loadImagePaths();
  // RPC delle immagini: serve solo i file che un blocco show_ui ha dichiarato.
  server.handle(loadImage, ({ path }) => {
    const file = normalizeImagePath(path);
    if (!imagePaths.has(file)) throw new Error("Image not available.");
    return { uri: loadLocalImage(file, 170 * 1024) };
  });
  const pendingRows = new Map<string, Map<string, ReturnType<typeof generativeUiSchema.parse>>>();
  async function flushPending(agentId: string) {
    const queue = pendingRows.get(agentId);
    if (!queue || queue.size === 0) return;
    pendingRows.delete(agentId);
    for (const [rowId, data] of queue) await append(agentId, rowId, data, true);
  }
  async function append(agentId: string, id: string, data: ReturnType<typeof generativeUiSchema.parse>, persist: boolean) {
    if (!paseo) throw new Error("Generative UI bridge is not initialized yet.");
    await paseo.agents.ref(agentId).timeline.append({ type: "plugin", id, kind: "generative-ui", version: 1, data });
    if (persist) await saveRow(agentId, { id, data });
  }
  const bridge = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/append") {
      reply(response, 404, { error: "Resource not found." });
      return;
    }
    if (request.headers.authorization !== `Bearer ${token}`) {
      reply(response, 401, { error: "Non autorizzato." });
      return;
    }
    try {
      const input = await readJson(request);
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid input.");
      const { agentToken, id, ...data } = input as Record<string, unknown>;
      if (typeof agentToken !== "string") throw new Error("Agent token is missing.");
      const agentId = agentTokens.get(agentToken);
      if (!agentId) throw new Error("Agent not available for this token.");
      if (id !== undefined && (typeof id !== "string" || !id)) throw new Error("Invalid id.");
      const rowId = typeof id === "string" ? id : `generative-ui-${randomBytes(8).toString("hex")}`;
      // Errore leggibile per l'agente (es. riga e riferimento OpenUI non risolti), non il JSON grezzo di Zod.
      // Le immagini incorporate (data URI) si tolgono prima dei controlli di testo e si rimettono dopo: i limiti di
      // 20000 caratteri e 64 KiB riguardano il testo, le immagini hanno un tetto a parte.
      // File locali (Image("/percorso"), file:// e gli elenchi di InstagramPost): NON si incorporano più nella riga
      // (il daemon rifiuta righe plugin oltre 64 KiB, sintomo del 25 novembre: carosello da 13 slide che non
      // compariva mai). Si controlla che esistano e si registrano nell'elenco servito dall'RPC images.load.
      if (typeof data.openui === "string") {
        for (const rawPath of localImagePaths(data.openui)) {
          const file = normalizeImagePath(rawPath);
          if (!existsSync(file) || !statSync(file).isFile()) {
            throw new Error(`Image not found: ${file}. Pass a file that exists on this computer.`);
          }
          imagePaths.add(file);
        }
        saveImagePaths(imagePaths);
      }
      const embedded: string[] = [];
      if (typeof data.openui === "string") {
        const textOnly: string = data.openui.replace(embeddedImagePattern, (uri) => {
          embedded.push(uri);
          return `data:image/jpeg;base64,STUB${embedded.length - 1}END`;
        });
        data.openui = textOnly;
        if (textOnly.length > maxOpenUiChars) throw new Error(`OpenUI text exceeds the limit of ${maxOpenUiChars} characters.`);
      }
      if (embedded.reduce((total, uri) => total + uri.length, 0) > maxEmbeddedImagesBytes) {
        throw new Error("Embedded images exceed the 2.25 MiB limit: use fewer or smaller photos.");
      }
      const checked = generativeUiSchema.safeParse(data);
      if (!checked.success) throw new Error(checked.error.issues[0]?.message ?? "Invalid interface data.");
      const clean = sanitizeGenerativeUiData({ ...checked.data, rowId });
      if (Buffer.byteLength(JSON.stringify(clean), "utf8") > maxGenerativeUiDataBytes) {
        throw new Error("Interface data exceeds the 64 KiB limit.");
      }
      const parsed =
        embedded.length > 0 && typeof clean.openui === "string"
          ? { ...clean, openui: clean.openui.replace(/data:image\/jpeg;base64,STUB(\d+)END/g, (_match, index) => embedded[Number(index)] ?? "") }
          : clean;
      // Il blocco NON si aggiunge subito: una riga inserita fra le chiamate agli strumenti finisce nel
      // gruppo di lavoro che il telefono tiene chiuso. Si accoda e si aggiunge a fine turno (agent.turn_ended),
      // cioè dopo la risposta finale. Con lo stesso id l'ultima versione sostituisce la precedente.
      const queue = pendingRows.get(agentId) ?? new Map<string, ReturnType<typeof generativeUiSchema.parse>>();
      queue.delete(rowId);
      queue.set(rowId, parsed);
      pendingRows.set(agentId, queue);
      reply(response, 200, { ok: true });
    } catch (error) {
      reply(response, 400, { error: error instanceof Error ? error.message : "Invalid input." });
    }
  });
  bridge.on("error", (error) => console.error("Generative UI bridge error:", error));
  // The port comes from Settings → Plugins → Generative UI (default 37621). If it is taken, the next free ports are tried.
  const settings = server.registerSettings(preferences);
  let bridgeUrl = "";
  const bridgeReady = (async () => {
    const current = await settings.read();
    const preferred = current.status === "ready" ? current.values.bridgePort : defaultBridgePort;
    for (let port = preferred; port < preferred + 20 && port <= 65535; port++) {
      if (await tryListen(bridge, port)) {
        bridgeUrl = `http://127.0.0.1:${port}/append`;
        if (port !== preferred) console.error(`Generative UI: port ${preferred} is in use, bridge listening on ${port}.`);
        return;
      }
    }
    console.error(`Generative UI: no free port from ${preferred}; show_ui is unavailable. Set another port in Settings → Plugins → Generative UI.`);
  })();
  const removeHook = server.before("agent.create", async ({ request }, context) => {
    paseo = context.paseo;
    await bridgeReady;
    if (!bridgeUrl) return undefined;
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
    if (agentToken && agentTokens.get(agentToken) !== request.agentId) {
      agentTokens.set(agentToken, request.agentId);
      saveAgentTokens(agentTokens);
    }
    // Il replay dei blocchi salvati è best effort: se l'agente non è ancora caricato in memoria il daemon
    // risponde "Unknown agent" e, lasciando propagare l'errore, fetch_agent_timeline_request fallisce e
    // l'app (telefono incluso) non mostra la timeline della chat. Si salta e si riprova alla prossima apertura.
    try {
      for (const row of await readRows(request.agentId)) await append(request.agentId, row.id, row.data, false);
    } catch {
      // intenzionalmente ignorato: non deve mai bloccare l'apertura della sessione
    }
    return request;
  });
  const removeArchiveHook = server.on("agent.archived", ({ agent }) => {
    pendingRows.delete(agent.id);
    void removeRows(agent.id);
    for (const [agentToken, agentId] of agentTokens) if (agentId === agent.id) agentTokens.delete(agentToken);
    saveAgentTokens(agentTokens);
  });
  const removeTurnEndHook = server.on("agent.turn_ended", async ({ agent }, context) => {
    paseo = context.paseo;
    await flushPending(agent.id);
  });
  return () => {
    removeTurnEndHook();
    removeHook();
    removeSessionHook();
    removeArchiveHook();
    bridge.close();
  };
}

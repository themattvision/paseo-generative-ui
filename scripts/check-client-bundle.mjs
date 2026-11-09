#!/usr/bin/env node
// Controllo del bundle client del plugin, con le stesse opzioni dell'host
// (packages/server/src/server/plugins/compiler.ts, compileTarget) e con la whitelist
// di runtimeRequire (packages/app/src/plugins/evaluate.ts). Fallisce con exit 1 se:
//  1) il bundle importa un modulo esterno fuori dalla whitelist dell'host;
//  2) il bundle non si carica in un vm senza process, document, window e require libero.
import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(root, "index.client.tsx");

// Stessi external di compileTarget per il client (PLUGIN_SDK_SPECIFIERS piu i moduli host).
const EXTERNAL = [
  "@getpaseo/plugin",
  "@getpaseo/plugin/server",
  "@getpaseo/plugin/server/provider",
  "@getpaseo/plugin/server/acp",
  "@getpaseo/plugin/client",
  "@getpaseo/plugin/client/ui",
  "@getpaseo/plugin/client/react-native",
  "@tanstack/react-query",
  "react",
  "react/jsx-runtime",
  "react-native",
  "zod",
];

// Nomi accettati da runtimeRequire dell'host (evaluate.ts).
const WHITELIST = new Set([
  "@getpaseo/plugin/client/ui",
  "react",
  "react/jsx-runtime",
  "react-native",
  "@getpaseo/plugin",
  "@getpaseo/plugin/client",
  "@getpaseo/plugin/client/react-native",
  "@tanstack/react-query",
  "zod",
]);

function fail(message) {
  console.error(`check-client-bundle: ERRORE. ${message}`);
  process.exit(1);
}

let result;
try {
  result = await build({
    entryPoints: [entry],
    bundle: true,
    format: "cjs",
    jsx: "automatic",
    platform: "neutral",
    // Deviazione deliberata: con neutral esbuild non risolve figma-squircle (solo "main", senza exports).
    // Il daemon ha caricato il plugin (log 20261108-2134, "Loaded plugin") senza errori di compilazione,
    // quindi la risoluzione dell host va trattata come equivalente a main,module.
    mainFields: ["main", "module"],
    target: "es2020",
    supported: { "async-await": false },
    external: EXTERNAL,
    treeShaking: true,
    metafile: true,
    logLevel: "silent",
    write: false,
  });
} catch (error) {
  const texts = (error.errors ?? []).map((e) => e.text).join("; ");
  fail(`build del client fallita come nell'host: ${texts || error.message}`);
}

// 1) Import esterni fuori dalla whitelist.
const violations = [];
for (const [input, meta] of Object.entries(result.metafile.inputs)) {
  for (const imp of meta.imports) {
    // "<runtime>" e l'helper virtuale di esbuild, non un modulo: va ignorato.
    if (imp.external && !imp.path.startsWith("<") && !WHITELIST.has(imp.path))
      violations.push({ path: imp.path, importer: input });
  }
}
// Un import "zod/v4" risulta esterno anche se EXTERNAL contiene solo "zod" (sottopercorsi inclusi).
if (violations.length > 0) {
  const lines = violations.map((v) => `import "${v.path}" in ${v.importer}`);
  fail(
    `il client importa moduli non disponibili nel plugin host: ${lines.join("; ")}. ` +
      "Il renderer del telefono non li trova e il plugin non si carica.",
  );
}

// 2) Caricamento in un contesto senza process reale (RN lo definisce con env.NODE_ENV), document e window.
const code = result.outputFiles[0].text;
const req = createRequire(path.join(root, "package.json"));
const stub = new Proxy(
  { Platform: { OS: "ios", select: (o) => o.ios ?? o.default } },
  { get: (t, k) => (k in t ? t[k] : k === "__esModule" ? true : function Stub() { return null; }) },
);
const allowed = {
  "@getpaseo/plugin/client/ui": stub,
  "@getpaseo/plugin/client": stub,
  "@getpaseo/plugin/client/react-native": stub,
  "@getpaseo/plugin": stub,
  "react-native": stub,
  "@tanstack/react-query": {},
  react: req("react"),
  "react/jsx-runtime": req("react/jsx-runtime"),
  zod: req("zod"),
};
const requireFn = (name) => {
  if (WHITELIST.has(name)) return allowed[name];
  throw new Error(`Module "${name}" is not available in plugin client code`);
};
const context = vm.createContext({
  process: { env: { NODE_ENV: "development" }, platform: "ios", versions: {} },
});
let exported;
try {
  const factory = vm.runInContext(
    "(function(require){const module={exports:{}};const exports=module.exports;\n" +
      code +
      "\nreturn module.exports;})",
    context,
  );
  exported = factory(requireFn);
} catch (error) {
  const stack = String(error?.stack ?? "").split("\n").slice(0, 6).join(" | ");
  fail(`il bundle client lancia al caricamento: ${error?.message}. Stack: ${stack}`);
}
if (typeof exported?.default !== "function") {
  fail("il bundle client non espone una default export funzione");
}
console.log(
  `check-client-bundle: OK. ${result.metafile.inputs ? Object.keys(result.metafile.inputs).length : 0} input, ` +
    `${(code.length / 1024).toFixed(1)} KB, import esterni tutti in whitelist, caricamento senza errori.`,
);

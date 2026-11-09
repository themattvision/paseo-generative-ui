#!/usr/bin/env node
// Riscrive in node_modules/@openuidev/* gli import di "zod/v4" e "zod/v4/core" perché usino
// la radice "zod" (zod 4 dell'host Paseo). L'host espone ai plugin client solo "zod"
// (packages/app/src/plugins/evaluate.ts, runtimeRequire), quindi "zod/v4" lancerebbe al caricamento.
// Idempotente: se gli import sono già riscritti non cambia nulla. Termina sempre con 0 se
// le stringhe non ci sono più (upstream cambiato), stampando un avviso.
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scope = path.join(root, "node_modules", "@openuidev");

const rules = [
  // import * as ns from "zod/v4/core"  ->  import { core as ns } from "zod"
  [/import\s*\*\s*as\s+([\w$]+)\s+from\s*(["'])zod\/v4\/core\2/g, 'import { core as $1 } from "zod"'],
  // require("zod/v4/core") -> require("zod").core
  [/require\(\s*(["'])zod\/v4\/core\1\s*\)/g, 'require("zod").core'],
  // from "zod/v4", import("zod/v4"), require("zod/v4"), import "zod/v4" -> "zod"
  [/(\bfrom\s*|\bimport\s*\(\s*|\brequire\(\s*|\bimport\s+)(["'])zod\/v4\2/g, '$1"zod"'],
];

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else if (/\.(c|m)?js$/.test(name)) out.push(full);
  }
  return out;
}

if (!existsSync(scope)) {
  console.warn("patch-openui-zod: node_modules/@openuidev assente, nessuna patch applicata");
  process.exit(0);
}

const files = [];
for (const pkg of readdirSync(scope)) {
  const dist = path.join(scope, pkg, "dist");
  if (existsSync(dist)) files.push(...listFiles(dist));
}

let touched = 0;
let residual = [];
for (const file of files) {
  const before = readFileSync(file, "utf8");
  if (!before.includes("zod/v4")) continue;
  let after = before;
  for (const [re, rep] of rules) after = after.replace(re, rep);
  if (after !== before) {
    writeFileSync(file, after);
    touched++;
  }
  if (after.includes("zod/v4")) residual.push(path.relative(root, file));
}

if (residual.length > 0) {
  console.warn(
    `patch-openui-zod: avviso, restano riferimenti a zod/v4 non riscritti in: ${residual.join(", ")}. ` +
      "Controllare se upstream è cambiato; il controllo del bundle client lo segnalerà.",
  );
}
console.log(`patch-openui-zod: ${touched} file modificati su ${files.length} controllati in @openuidev/*/dist`);

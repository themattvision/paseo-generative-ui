// Genera il system prompt OpenUI Lang del plugin da openUiComponentDefs.
// Scrive docs/openui-prompt.md (leggibile) e shared/openui-prompt.generated.ts (export OPENUI_PROMPT).
// Eseguire con: npm run prompt
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createLibrary, defineComponent, generateSystemPrompt } from "@openuidev/lang-core";
import { openUiComponentDefs } from "../shared/openui-signatures.js";

const root = join(__dirname, "..");

const preamble = [
  "Usa show_ui con il campo openui quando vuoi mostrare una scheda, un riepilogo, una tabella o un grafico nella chat.",
  "Il testo OpenUI deve avere una riga root = Col([...]) obbligatoria; ogni altra riga definisce un componente usato da root.",
  "Non usare grassetto, asterischi o trattini come connettori nei testi: scrivi frasi piene in italiano.",
  "Tutti i testi visibili devono essere in italiano.",
  "Mostra un solo blocco show_ui per risposta, a meno che l'utente chieda esplicitamente più blocchi.",
  "Nei bottoni usa @ToAssistant(\"testo\") per far tornare la scelta dell'utente all'agente.",
  "Non lasciare riferimenti non definiti: ogni nome usato deve avere una riga di definizione.",
  "Il testo OpenUI non supera 20000 caratteri; il campo spec resta disponibile per il formato classico.",
].join("\n");

const importantRules = [
  "Scegli il componente in base al contenuto. Elenchi di locali, luoghi, prodotti, offerte o opzioni NON vanno in Table: usa un Carousel (o una Grid) con una Card per elemento, dentro la card Title per il nome, Badge per voto o categoria, Caption per indirizzo o dettaglio, Text per la nota breve e Link per aprire la mappa o il sito.",
  "Table solo per confronti di numeri o valori brevi con al massimo tre colonne; su telefono ogni riga diventa un blocco, quindi niente frasi lunghe nelle celle.",
  "Usa Chart per andamenti e confronti numerici, Title 2xl con Caption per un numero chiave, List con timeline per sequenze e orari, Button con @ToAssistant per far scegliere all'utente il passo successivo.",
  "Apri il blocco con un Title e una riga di Text che dica cosa mostra; mai più di quattro card per carosello senza motivo.",
];

const library = createLibrary({
  components: openUiComponentDefs.map((def) => defineComponent({ ...def, component: () => null })),
});

const prompt = generateSystemPrompt({ library: library.toSpec(), promptOptions: { preamble, additionalRules: importantRules } });

// Escaping per template literal: backslash, backtick e sequenza ${ devono restare letterali.
const escapeForTemplate = (text: string) =>
  text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const docsPath = join(root, "docs", "openui-prompt.md");
const generatedPath = join(root, "shared", "openui-prompt.generated.ts");

mkdirSync(join(root, "docs"), { recursive: true });
mkdirSync(join(root, "shared"), { recursive: true });

writeFileSync(
  docsPath,
  `# Prompt OpenUI Lang del plugin\n\nFile generato da \`scripts/generate-openui-prompt.ts\` con \`npm run prompt\`. Non modificarlo a mano.\n\n${prompt}\n`,
);

writeFileSync(
  generatedPath,
  `// File generato da scripts/generate-openui-prompt.ts con npm run prompt. Non modificarlo a mano.\nexport const OPENUI_PROMPT = \`${escapeForTemplate(prompt)}\`;\n`,
);

console.log(`docs/openui-prompt.md: ${statSync(docsPath).size} byte`);
console.log(`shared/openui-prompt.generated.ts: ${statSync(generatedPath).size} byte`);
console.log(`prompt generato: ${Buffer.byteLength(prompt, "utf8")} byte`);

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
  "STILE: il blocco è visivo, arioso e senza scatole. Non avvolgere tutto in una Card e non annidare Card dentro Card: una sola Card per elemento di un elenco, mai attorno all'intero blocco. Il resto sta direttamente in Col con Title, Text, immagini e icone.",
  "FOTO: per luoghi, monumenti, locali, piatti, prodotti e persone note metti sempre una SearchImage (query di 2-4 parole precise, per esempio il nome esatto del posto e la città; come secondo argomento un fallback di 1-2 parole generiche sul tipo di cosa, per esempio SearchImage(\"Pasticceria Biasetto Padova\", \"pasticcini\"), perché i locali piccoli non hanno una foto precisa e senza fallback resta un riquadro vuoto) in cima alla card o in una riga di tre foto con Carousel. Una Row di tre SearchImage con aspectRatio 1 funziona bene come striscia iniziale.",
  "ICONE: accanto a ogni dato breve metti una Icon Lucide in una Row (map-pin per l'indirizzo, star per il voto, clock per gli orari, phone, globe, euro, croissant, coffee), e passa icon ai Button (map, external-link, send, check). Niente emoji al posto delle icone.",
  "Elenchi di locali, luoghi, prodotti, offerte o opzioni NON vanno in Table: usa un Carousel (o una Grid) con una Card per elemento. Dentro la card: SearchImage in alto, Title per il nome, Badge per categoria o voto, righe Icon + Caption per indirizzo e orari, Text per la nota breve, Button soft con icon per aprire mappa o sito (o Link).",
  "Table solo per confronti di numeri o valori brevi con al massimo tre colonne; su telefono ogni riga diventa un blocco, quindi niente frasi lunghe nelle celle.",
  "Chart per andamenti e confronti numerici, Title 2xl con Caption per un numero chiave, List con timeline per sequenze e orari, Button con @ToAssistant per far scegliere all'utente il passo successivo.",
  "TITOLO: il parametro title di show_ui compare già come intestazione del blocco, quindi NON ripeterlo con un Title dentro l'OpenUI (comparirebbe due volte): usa title oppure un Title nel contenuto, mai tutti e due. Apri con una riga di Text che dica cosa mostra; non più di sei card per carosello senza motivo.",
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

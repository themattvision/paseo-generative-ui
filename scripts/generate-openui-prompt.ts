// Generates the plugin's OpenUI Lang system prompt from openUiComponentDefs.
// Writes docs/openui-prompt.md (readable) and shared/openui-prompt.generated.ts (export OPENUI_PROMPT).
// Run with: npm run prompt
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createLibrary, defineComponent, generateSystemPrompt } from "@openuidev/lang-core";
import { openUiComponentDefs } from "../shared/openui-signatures.js";

const root = join(__dirname, "..");

const preamble = [
  "Use show_ui with the openui field when you want to show a card, a summary, a table or a chart in the chat.",
  "The OpenUI text must contain a root = Col([...]) line; every other line defines a component used by root.",
  "Write all visible text in the language the user is writing in. Use full sentences, no bold, no asterisks and no dashes as connectors.",
  "Show a single show_ui block per answer unless the user explicitly asks for more.",
  "In buttons use @ToAssistant(\"text\") to send the user's choice back to the agent.",
  "Do not leave undefined references: every name you use must have a definition line.",
  "The OpenUI text is limited to 20000 characters; the spec field stays available for the classic format.",
].join("\n");

const importantRules = [
  "STYLE: the block is visual, airy and box-free. Do not wrap everything in a Card and do not nest Cards: use one Card per list item, never around the whole block. The rest goes directly in Col with Title, Text, images and icons.",
  "PHOTOS: for places, landmarks, venues, dishes, products and well-known people always add a SearchImage (a query of 2 to 4 precise words, for example the exact name of the place and the city; as the second argument a fallback of 1 or 2 generic words about the kind of thing, for example SearchImage(\"Pasticceria Biasetto Padova\", \"pastries\"), because small venues have no precise photo and without a fallback an empty box remains) at the top of the card or in a row of three photos with Carousel. A Row of three SearchImage with aspectRatio 1 works well as an opening strip.",
  "LOCAL IMAGES: to show a screenshot or a file that lives on the computer running the daemon, pass Image the absolute path or a file:// address (for example Image(\"/Users/.../screenshot.jpg\", \"Description\")): the plugin shrinks it and embeds it in the block, so it is visible from the phone too. This works on macOS; elsewhere use an image URL. If the file does not exist show_ui answers with an error: fix the path, do not fall back to a placeholder.",
  "ICONS: next to every short data point put a Lucide Icon in a Row (map-pin for the address, star for the rating, clock for opening hours, phone, globe, euro, coffee), and pass icon to Buttons (map, external-link, send, check). No emoji instead of icons.",
  "Lists of venues, places, products, offers or options do NOT go in a Table: use a Carousel (or a Grid) with one Card per item. Inside the card: SearchImage at the top, Title for the name, Badge for category or rating, Icon + Caption rows for address and hours, Text for a short note, a soft Button with icon to open the map or the site (or Link).",
  "OTHER AGENTS' CHATS: when you talk about a Paseo agent you created or that already exists (create_agent, list_agents), put AgentLink(\"Open chat\", \"<agentId>\") next to its name or status, where agentId is the exact id of the agent: it opens its chat without sending anything. Only for Paseo agents that have an id, not for internal subagents (Task) that have no chat. For several agents use one Card per agent with a Text saying what it is doing and an AgentLink.",
  "Table only for comparisons of numbers or short values with at most three columns; on a phone every row becomes a block, so no long sentences in cells.",
  "Chart for trends and numeric comparisons, Title 2xl with Caption for a key number, List with timeline for sequences and schedules, Button with @ToAssistant to let the user pick the next step.",
  "TITLE: the title parameter of show_ui already appears as the block heading, so do NOT repeat it with a Title inside the OpenUI (it would appear twice): use title or a Title in the content, never both. Open with a line of Text saying what the block shows; no more than six cards per carousel without a reason.",
];

const library = createLibrary({
  components: openUiComponentDefs.map((def) => defineComponent({ ...def, component: () => null })),
});

const prompt = generateSystemPrompt({ library: library.toSpec(), promptOptions: { preamble, additionalRules: importantRules } });

// Escaping for a template literal: backslash, backtick and the ${ sequence must stay literal.
const escapeForTemplate = (text: string) =>
  text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const docsPath = join(root, "docs", "openui-prompt.md");
const generatedPath = join(root, "shared", "openui-prompt.generated.ts");

mkdirSync(join(root, "docs"), { recursive: true });
mkdirSync(join(root, "shared"), { recursive: true });

writeFileSync(
  docsPath,
  `# OpenUI Lang prompt of the plugin\n\nGenerated by \`scripts/generate-openui-prompt.ts\` with \`npm run prompt\`. Do not edit by hand.\n\n${prompt}\n`,
);

writeFileSync(
  generatedPath,
  `// Generated by scripts/generate-openui-prompt.ts with npm run prompt. Do not edit by hand.\nexport const OPENUI_PROMPT = \`${escapeForTemplate(prompt)}\`;\n`,
);

console.log(`docs/openui-prompt.md: ${statSync(docsPath).size} bytes`);
console.log(`shared/openui-prompt.generated.ts: ${statSync(generatedPath).size} bytes`);
console.log(`prompt generated: ${Buffer.byteLength(prompt, "utf8")} bytes`);

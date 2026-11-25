import assert from "node:assert/strict";
import { embeddedImagePattern, generativeUiSchema } from "../shared/generative-ui.js";
import { checkOpenUi, maxOpenUiChars } from "../shared/openui-signatures.js";
import { embedLocalImages, localImagePaths } from "../server/local-images.js";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const legacy = {
  title: "Stato",
  spec: { type: "text", variant: "heading", text: "Pronto" },
};
assert.equal(generativeUiSchema.safeParse(legacy).success, true, "il vecchio formato { title, spec } deve continuare a validarsi");

const validOpenUi = [
  'root = Col([titolo, testo, badges, tabella, azione], 12)',
  'titolo = Title("Piano mensile", "lg")',
  'testo = Text("Il piano è attivo e pronto per la revisione.")',
  'badges = Row([stato, rischio], 8)',
  'stato = Badge("Attivo", "success")',
  'rischio = Badge("Attenzione", "warning")',
  'tabella = Table(["Voce", "Importo"], [["Abbonamento", "12 EUR"], ["Extra", "3 EUR"]])',
  'azione = Button("Conferma", @ToAssistant("Confermo il piano"), "solid", "primary")',
].join("\n");

const openUiPayload = { openui: validOpenUi };
assert.equal(generativeUiSchema.safeParse(openUiPayload).success, true, "un testo OpenUI valido deve passare generativeUiSchema");
assert.deepEqual(checkOpenUi(validOpenUi), { ok: true }, "un testo OpenUI valido deve passare checkOpenUi");

const collapsibleOpenUi = [
  'root = Col([intro, dettagli])',
  'intro = Text("Fatto.")',
  'dettagli = Collapsible("Apri la spiegazione", "Chiudi la spiegazione", [perche])',
  'perche = Text("Il perché sta qui dentro.")',
].join("\n");
assert.deepEqual(checkOpenUi(collapsibleOpenUi), { ok: true }, "Collapsible con etichette e figli deve passare checkOpenUi");
assert.deepEqual(checkOpenUi(collapsibleOpenUi.replace("[perche])", "[perche], true)")), { ok: true }, "Collapsible accetta defaultOpen");

const instagramOpenUi = [
  'root = Col([post], 12)',
  'post = InstagramPost(["/tmp/a.png", "/tmp/b.png"], "themattvision", "Il tuo smanettone di Fiducia", "/tmp/avatar.jpg", "Didascalia")',
].join("\n");
assert.deepEqual(checkOpenUi(instagramOpenUi), { ok: true }, "InstagramPost con immagini, handle, nome, avatar e didascalia deve passare checkOpenUi");
assert.deepEqual(localImagePaths(instagramOpenUi).sort(), ["/tmp/a.png", "/tmp/avatar.jpg", "/tmp/b.png"], "i percorsi dentro gli elenchi di InstagramPost vanno incorporati");
assert.deepEqual(localImagePaths('x = Image("/tmp/c.png", "alt")'), ["/tmp/c.png"], "Image con percorso locale resta riconosciuta");

const unresolved = 'root = Col([titolo, mancante])\ntitolo = Title("Ciao")';
const unresolvedCheck = checkOpenUi(unresolved);
assert.equal(unresolvedCheck.ok, false, "un riferimento non risolto deve essere rifiutato");
assert.ok(!unresolvedCheck.ok && unresolvedCheck.message.includes("Unresolved reference"), "the message must be in English");
assert.ok(!unresolvedCheck.ok && unresolvedCheck.message.includes('"mancante"'), "il messaggio deve citare il riferimento mancante");
assert.ok(!unresolvedCheck.ok && unresolvedCheck.message.includes("line 1"), "il messaggio deve citare la riga");
assert.equal(generativeUiSchema.safeParse({ openui: unresolved }).success, false, "generativeUiSchema rifiuta il riferimento non risolto");

const noRoot = 'titolo = Title("Ciao")';
const noRootCheck = checkOpenUi(noRoot);
assert.equal(noRootCheck.ok, false, "un testo senza root deve essere rifiutato");
assert.ok(!noRootCheck.ok && noRootCheck.message.includes("root"), "il messaggio di root mancante deve citare root");

const tooLong = "x".repeat(maxOpenUiChars + 1);
assert.equal(generativeUiSchema.safeParse({ openui: tooLong }).success, false, "un testo oltre 20000 caratteri deve fallire generativeUiSchema");
assert.equal(checkOpenUi(tooLong).ok, false, "un testo oltre 20000 caratteri deve fallire checkOpenUi");

// Stessa logica di index.server.ts: i data URI si tolgono prima dei controlli di testo e si rimettono dopo.
function checkWithEmbeddedImages(openui: string) {
  const embedded: string[] = [];
  const textOnly = openui.replace(embeddedImagePattern, (uri) => {
    embedded.push(uri);
    return `data:image/jpeg;base64,STUB${embedded.length - 1}END`;
  });
  if (textOnly.length > maxOpenUiChars) return { ok: false as const };
  const checked = generativeUiSchema.safeParse({ openui: textOnly });
  if (!checked.success || typeof checked.data.openui !== "string") return { ok: false as const };
  const restored = checked.data.openui.replace(/data:image\/jpeg;base64,STUB(\d+)END/g, (_match, index) => embedded[Number(index)] ?? "");
  return { ok: true as const, openui: restored };
}

const photoUri = `data:image/jpeg;base64,${Buffer.alloc(110 * 1024, 7).toString("base64")}`;
const withPhoto = `root = Col([img], 12)\nimg = Image("${photoUri}", "Home Switch")`;
const withPhotoResult = checkWithEmbeddedImages(withPhoto);
assert.equal(withPhotoResult.ok, true, "un openui con foto incorporata da circa 150 KiB deve passare");
assert.equal(withPhotoResult.ok && withPhotoResult.openui, withPhoto, "il testo restituito deve contenere il data URI intero");
assert.equal(checkWithEmbeddedImages("x".repeat(maxOpenUiChars + 1)).ok, false, "un testo oltre 20000 caratteri senza immagini deve essere rifiutato");
assert.equal(checkWithEmbeddedImages(`${photoUri}${"x".repeat(maxOpenUiChars + 1)}`).ok, false, "il limite di 20000 caratteri vale per il testo anche con una foto");

// Immagini locali: il bridge le trasforma in data URI (server/local-images.ts). Il PNG di prova è temporaneo e si cancella.
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const localDir = mkdtempSync(join(tmpdir(), "genui-test-"));
try {
  const localFile = join(localDir, "prova.png");
  writeFileSync(localFile, tinyPng);
  const embeddedLocal = embedLocalImages(`img = Image("file://${localFile}", "Prova")`);
  assert.match(embeddedLocal, /Image\("data:image\/png;base64,[A-Za-z0-9+/=]+", "Prova"\)/, "un file locale deve diventare un data URI");
  assert.throws(
    () => embedLocalImages('img = Image("file:///tmp/non-esiste-genui.png", "x")'),
    (error: unknown) => error instanceof Error && error.message.startsWith("Image not found"),
    "un file inesistente deve dare Image not found",
  );
} finally {
  rmSync(localDir, { recursive: true, force: true });
}

console.log("openui tests passed");

// Firme dei componenti OpenUI Lang del plugin. Nessuna dipendenza da React: questo modulo serve sia al server
// (validazione con lang-core) sia al client (libreria React Native in client/openui/library.tsx).
// Nomi e ordine degli argomenti seguono il system prompt upstream di thesysdev (open-intelligent-ui).
// Ordine delle chiavi di z.object = ordine degli argomenti posizionali: non cambiarlo.
import { z } from "zod";
import { createLibrary, createParser, defineComponent } from "@openuidev/lang-core";

const node = z.array(z.any());
const colorName = z.string();

export const openUiComponentDefs: { name: string; description: string; props: z.ZodObject<z.ZodRawShape> }[] = [
  {
    name: "Col",
    description: "Colonna verticale. Senza gap spazia i blocchi come un articolo.",
    props: z.object({
      children: node,
      gap: z.number().optional(),
      align: z.enum(["start", "center", "end", "stretch"]).optional(),
    }),
  },
  {
    name: "Row",
    description: "Riga orizzontale; gli elementi sono centrati verticalmente.",
    props: z.object({
      children: node,
      gap: z.number().optional(),
      align: z.enum(["start", "center", "end", "stretch"]).optional(),
      justify: z.enum(["start", "center", "end", "between"]).optional(),
      wrap: z.boolean().optional(),
    }),
  },
  {
    name: "Card",
    description: "Pannello con bordo. soft è un pannello pieno per i riepiloghi.",
    props: z.object({
      children: node,
      variant: z.enum(["outline", "soft"]).optional(),
      padding: z.number().optional(),
      gap: z.number().optional(),
    }),
  },
  {
    name: "Title",
    description: "Titolo. lg per il titolo di una card, 2xl per un numero grande.",
    props: z.object({
      text: z.string(),
      size: z.enum(["sm", "md", "lg", "xl", "2xl", "3xl"]).optional(),
      color: colorName.optional(),
    }),
  },
  {
    name: "Text",
    description: "Paragrafo. Supporta testo semplice o una lista di stringhe e componenti inline.",
    props: z.object({
      text: z.union([z.string(), node]),
      size: z.enum(["xs", "sm", "md", "lg"]).optional(),
      color: colorName.optional(),
      weight: z.enum(["normal", "medium", "semibold"]).optional(),
      italic: z.boolean().optional(),
      lineThrough: z.boolean().optional(),
      tabularNums: z.boolean().optional(),
      maxLines: z.number().optional(),
    }),
  },
  {
    name: "Caption",
    description: "Testo piccolo secondario.",
    props: z.object({ text: z.string(), color: colorName.optional() }),
  },
  {
    name: "Badge",
    description: "Etichetta breve colorata.",
    props: z.object({
      text: z.string(),
      color: z.enum(["neutral", "info", "success", "warning", "danger", "purple", "pink"]).optional(),
    }),
  },
  {
    name: "Button",
    description: "Bottone. L'azione può essere @ToAssistant, @OpenUrl, @Set, @Reset o @CopyToClipboard.",
    props: z.object({
      label: z.string(),
      action: z.any().optional(),
      variant: z.enum(["solid", "outline", "soft", "ghost"]).optional(),
      color: z.enum(["primary", "danger", "success"]).optional(),
      size: z.enum(["sm", "md", "lg"]).optional(),
      icon: z.string().optional(),
      disabled: z.boolean().optional(),
      block: z.boolean().optional(),
    }),
  },
  {
    name: "Table",
    description: "Tabella. Ogni riga elenca le celle nell'ordine delle colonne.",
    props: z.object({
      columns: z.array(z.string()),
      rows: z.array(z.array(z.any())),
    }),
  },
  {
    name: "Chart",
    description: "Grafico su righe di dati. Nel plugin sono disegnati bar e line.",
    props: z.object({
      type: z.enum(["bar", "line", "area", "pie", "donut", "scatter"]),
      data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
      x: z.string().optional(),
      series: z.array(z.string()).optional(),
      format: z.enum(["number", "currency", "percent"]).optional(),
      currency: z.string().optional(),
      stacked: z.boolean().optional(),
      height: z.number().optional(),
    }),
  },
];

export type OpenUiComponentName = string;

/** Libreria lang-core senza renderer: usata solo per validare il testo sul server. */
const validationLibrary = createLibrary({
  components: openUiComponentDefs.map((def) => defineComponent({ ...def, component: () => null })),
});

export const maxOpenUiChars = 20000;

export type OpenUiCheck = { ok: true } | { ok: false; message: string };

/** Valida un testo OpenUI Lang: root presente, nessun riferimento non risolto, nessun argomento non valido. */
export function checkOpenUi(source: string): OpenUiCheck {
  if (source.trim() === "") return { ok: false, message: "Il campo openui è vuoto." };
  if (source.length > maxOpenUiChars) return { ok: false, message: `Il campo openui supera ${maxOpenUiChars} caratteri.` };
  const result = createParser(validationLibrary.toJSONSchema()).parse(source);
  const lines = source.split("\n");
  if (result.meta.unresolved.length > 0) {
    const name = result.meta.unresolved[0];
    const index = lines.findIndex((line) => new RegExp(`\\b${name}\\b`).test(line));
    const where = index >= 0 ? ` alla riga ${index + 1}: ${lines[index].trim()}` : "";
    return { ok: false, message: `Riferimento non risolto "${name}"${where}. Definisci ${name} come riga separata oppure rimuovilo.` };
  }
  if (result.meta.errors.length > 0) {
    const error = result.meta.errors[0];
    return { ok: false, message: `Argomenti non validi per ${error.component}${error.path ? ` (${error.path})` : ""}: ${error.message}` };
  }
  if (!result.root) return { ok: false, message: 'Manca la riga root. Scrivi per primo "root = Col([...])".' };
  if (result.meta.incomplete) return { ok: false, message: "Il testo OpenUI sembra incompleto: controlla le parentesi chiuse." };
  return { ok: true };
}

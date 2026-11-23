// Firme dei componenti OpenUI Lang del plugin. Nessuna dipendenza da React: questo modulo serve sia al server
// (validazione con lang-core) sia al client (libreria React Native in client/openui/library.tsx).
// Nomi e ordine degli argomenti seguono il system prompt upstream di thesysdev (open-intelligent-ui).
// Ordine delle chiavi di z.object = ordine degli argomenti posizionali: non cambiarlo.
// Le prop $binding usano bindable(): il runtime di react-lang le passa come campo reattivo (value e setValue).
import { z } from "zod";
import { createLibrary, createParser, defineComponent, markReactive } from "@openuidev/lang-core";

const node = z.array(z.any());
const colorName = z.string();

function bindable<T extends z.ZodType>(schema: T): T {
  markReactive(schema);
  return schema;
}

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
    name: "AgentLink",
    description: "Bottone che apre la chat di un altro agente Paseo (agentId restituito da create_agent o list_agents). Nessun messaggio all'agente, solo navigazione.",
    props: z.object({
      label: z.string(),
      agentId: z.string(),
      variant: z.enum(["solid", "outline", "soft", "ghost"]).optional(),
      icon: z.string().optional(),
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
  {
    name: "Divider",
    description: "Linea orizzontale sottile di separazione.",
    props: z.object({}),
  },
  {
    name: "Spacer",
    description: "Riempie lo spazio libero in una Row.",
    props: z.object({}),
  },
  {
    name: "Grid",
    description: "Griglia a colonne uguali (default 2). Con minChildWidth le colonne scendono su schermi stretti.",
    props: z.object({
      children: node,
      columns: z.number().optional(),
      minChildWidth: z.number().optional(),
      gap: z.number().optional(),
    }),
  },
  {
    name: "Carousel",
    description: "Riga di card scorrevole in orizzontale con aggancio. Ideale su telefono per locali, prodotti o opzioni: una Card per elemento.",
    props: z.object({
      children: node,
      gap: z.number().optional(),
      itemWidth: z.number().optional(),
    }),
  },
  {
    name: "List",
    description: "Elenco puntato o numerato. Con timeline le voci sono unite da una linea. Le voci sono stringhe o ListItem.",
    props: z.object({
      items: z.array(z.any()),
      marker: z.enum(["bullet", "number", "none"]).optional(),
      timeline: z.boolean().optional(),
    }),
  },
  {
    name: "ListItem",
    description: "Voce di elenco con titolo, descrizione facoltativa e marker (per esempio un orario).",
    props: z.object({
      title: z.string(),
      description: z.string().optional(),
      marker: z.string().optional(),
      children: node.optional(),
    }),
  },
  {
    name: "Image",
    description: "Foto da un URL http(s) oppure da un file del Mac (percorso assoluto o file://, incorporato dal plugin). aspectRatio è larghezza su altezza, per esempio 1.5.",
    props: z.object({
      src: z.string(),
      alt: z.string(),
      aspectRatio: z.number().optional(),
      radius: z.union([z.string(), z.number()]).optional(),
      fit: z.enum(["cover", "contain"]).optional(),
    }),
  },
  {
    name: "SearchImage",
    description: "Foto trovata da sola su Wikipedia e Commons per una ricerca. query: 2-4 parole precise, per esempio il nome esatto di un luogo, monumento, piatto o prodotto. fallback: 1-2 parole generiche sul tipo di cosa (per esempio pasticcini, tiramisù, cattedrale) usate quando la foto precisa non esiste, come accade per i locali piccoli. Se non trova nulla mostra un segnaposto.",
    props: z.object({
      query: z.string(),
      fallback: z.string().optional(),
      aspectRatio: z.number().optional(),
      radius: z.union([z.string(), z.number()]).optional(),
      fit: z.enum(["cover", "contain"]).optional(),
    }),
  },
  {
    name: "Icon",
    description: "Icona Lucide per nome in kebab-case (map-pin, star, clock, coffee, croissant, phone, globe, shopping-bag, heart, calendar). Usala accanto a un testo, in una Row.",
    props: z.object({
      name: z.string(),
      size: z.number().optional(),
    }),
  },
  {
    name: "Link",
    description: "Link cliccabile che apre un URL http(s).",
    props: z.object({ text: z.string(), url: z.string() }),
  },
  {
    name: "Quote",
    description: "Citazione con filetto laterale. cite indica la fonte.",
    props: z.object({ text: z.string(), cite: z.string().optional() }),
  },
  {
    name: "Code",
    description: "Blocco di codice in monospazio, con scorrimento orizzontale.",
    props: z.object({ code: z.string(), language: z.string().optional() }),
  },
  {
    name: "Label",
    description: "Etichetta di campo o di gruppo.",
    props: z.object({ text: z.string() }),
  },
  {
    name: "Input",
    description: "Campo di testo o numero. value è una variabile $ che altri elementi leggono; un numero salva numeri.",
    props: z.object({
      value: bindable(z.union([z.string(), z.number()])),
      label: z.string().optional(),
      type: z.enum(["text", "number"]).optional(),
      placeholder: z.string().optional(),
    }),
  },
  {
    name: "TextArea",
    description: "Area di testo su più righe collegata a una variabile $.",
    props: z.object({
      value: bindable(z.string()),
      label: z.string().optional(),
      placeholder: z.string().optional(),
      rows: z.number().optional(),
    }),
  },
  {
    name: "Select",
    description: "Menu a tendina per liste di opzioni lunghe. Le opzioni sono stringhe o {value, label}.",
    props: z.object({
      value: bindable(z.string()),
      options: z.array(z.any()),
      label: z.string().optional(),
      placeholder: z.string().optional(),
    }),
  },
  {
    name: "SegmentedControl",
    description: "Due o quattro scelte brevi affiancate. Le opzioni sono stringhe o {value, label}.",
    props: z.object({
      value: bindable(z.string()),
      options: z.array(z.any()),
      block: z.boolean().optional(),
    }),
  },
  {
    name: "Slider",
    description: "Valore numerico tra min e max, con etichetta e unità (% o $). Si regola con i passi −/+.",
    props: z.object({
      value: bindable(z.number()),
      min: z.number(),
      max: z.number(),
      step: z.number().optional(),
      label: z.string().optional(),
      unit: z.string().optional(),
      marks: z.array(z.object({ value: z.number(), label: z.string() })).optional(),
    }),
  },
  {
    name: "Checkbox",
    description: "Casella di spunta collegata a una variabile $ booleana. lineThrough barra l'etichetta quando è spuntata.",
    props: z.object({
      checked: bindable(z.boolean()),
      label: z.string(),
      lineThrough: z.boolean().optional(),
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

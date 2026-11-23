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
    description: "Vertical column. Without gap, blocks are spaced like an article.",
    props: z.object({
      children: node,
      gap: z.number().optional(),
      align: z.enum(["start", "center", "end", "stretch"]).optional(),
    }),
  },
  {
    name: "Row",
    description: "Horizontal row; items are vertically centered.",
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
    description: "Panel with a border. soft is a filled panel for summaries.",
    props: z.object({
      children: node,
      variant: z.enum(["outline", "soft"]).optional(),
      padding: z.number().optional(),
      gap: z.number().optional(),
    }),
  },
  {
    name: "Title",
    description: "Title. lg for a card title, 2xl for a large number.",
    props: z.object({
      text: z.string(),
      size: z.enum(["sm", "md", "lg", "xl", "2xl", "3xl"]).optional(),
      color: colorName.optional(),
    }),
  },
  {
    name: "Text",
    description: "Paragraph. Supports plain text or a list of strings and inline components.",
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
    description: "Small secondary text.",
    props: z.object({ text: z.string(), color: colorName.optional() }),
  },
  {
    name: "Badge",
    description: "Short colored label.",
    props: z.object({
      text: z.string(),
      color: z.enum(["neutral", "info", "success", "warning", "danger", "purple", "pink"]).optional(),
    }),
  },
  {
    name: "Button",
    description: "Button. The action can be @ToAssistant, @OpenUrl, @Set, @Reset or @CopyToClipboard.",
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
    description: "Button that opens the chat of another Paseo agent (agentId returned by create_agent or list_agents). It sends no message to the agent, it only navigates.",
    props: z.object({
      label: z.string(),
      agentId: z.string(),
      variant: z.enum(["solid", "outline", "soft", "ghost"]).optional(),
      icon: z.string().optional(),
    }),
  },
  {
    name: "Table",
    description: "Table. Each row lists its cells in column order.",
    props: z.object({
      columns: z.array(z.string()),
      rows: z.array(z.array(z.any())),
    }),
  },
  {
    name: "Chart",
    description: "Chart over data rows. The plugin draws bar and line.",
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
    description: "Thin horizontal dividing line.",
    props: z.object({}),
  },
  {
    name: "Spacer",
    description: "Fills the free space in a Row.",
    props: z.object({}),
  },
  {
    name: "Grid",
    description: "Grid with equal columns (default 2). With minChildWidth the columns stack on narrow screens.",
    props: z.object({
      children: node,
      columns: z.number().optional(),
      minChildWidth: z.number().optional(),
      gap: z.number().optional(),
    }),
  },
  {
    name: "Carousel",
    description: "Horizontal scrolling row of cards with snap. Ideal on phones for places, products or options: one Card per item.",
    props: z.object({
      children: node,
      gap: z.number().optional(),
      itemWidth: z.number().optional(),
    }),
  },
  {
    name: "List",
    description: "Bulleted or numbered list. With timeline the items are joined by a line. Items are strings or ListItem.",
    props: z.object({
      items: z.array(z.any()),
      marker: z.enum(["bullet", "number", "none"]).optional(),
      timeline: z.boolean().optional(),
    }),
  },
  {
    name: "ListItem",
    description: "List item with a title, optional description and marker (for example a time).",
    props: z.object({
      title: z.string(),
      description: z.string().optional(),
      marker: z.string().optional(),
      children: node.optional(),
    }),
  },
  {
    name: "Image",
    description: "Photo from an http(s) URL or from a file on the Mac (absolute path or file://, embedded by the plugin). aspectRatio is width over height, for example 1.5.",
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
    description: "Photo found automatically on Wikipedia and Commons for a search. query: 2-4 precise words, for example the exact name of a place, monument, dish or product. fallback: 1-2 generic words about the kind of thing (for example pastries, tiramisu, cathedral) used when the exact photo does not exist, as often happens for small places. If nothing is found it shows a placeholder.",
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
    description: "Lucide icon by name in kebab-case (map-pin, star, clock, coffee, croissant, phone, globe, shopping-bag, heart, calendar). Use it next to a text, in a Row.",
    props: z.object({
      name: z.string(),
      size: z.number().optional(),
    }),
  },
  {
    name: "Link",
    description: "Clickable link that opens an http(s) URL.",
    props: z.object({ text: z.string(), url: z.string() }),
  },
  {
    name: "Quote",
    description: "Quote with a side rule. cite gives the source.",
    props: z.object({ text: z.string(), cite: z.string().optional() }),
  },
  {
    name: "Code",
    description: "Monospaced code block, with horizontal scrolling.",
    props: z.object({ code: z.string(), language: z.string().optional() }),
  },
  {
    name: "Label",
    description: "Field or group label.",
    props: z.object({ text: z.string() }),
  },
  {
    name: "Input",
    description: "Text or number field. value is a $ variable that other elements read; a number field stores numbers.",
    props: z.object({
      value: bindable(z.union([z.string(), z.number()])),
      label: z.string().optional(),
      type: z.enum(["text", "number"]).optional(),
      placeholder: z.string().optional(),
    }),
  },
  {
    name: "TextArea",
    description: "Multi-line text area bound to a $ variable.",
    props: z.object({
      value: bindable(z.string()),
      label: z.string().optional(),
      placeholder: z.string().optional(),
      rows: z.number().optional(),
    }),
  },
  {
    name: "Select",
    description: "Dropdown menu for long option lists. Options are strings or {value, label}.",
    props: z.object({
      value: bindable(z.string()),
      options: z.array(z.any()),
      label: z.string().optional(),
      placeholder: z.string().optional(),
    }),
  },
  {
    name: "SegmentedControl",
    description: "Two or four short choices side by side. Options are strings or {value, label}.",
    props: z.object({
      value: bindable(z.string()),
      options: z.array(z.any()),
      block: z.boolean().optional(),
    }),
  },
  {
    name: "Slider",
    description: "Numeric value between min and max, with label and unit (% or $). Adjusted with the −/+ steps.",
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
    description: "Checkbox bound to a boolean $ variable. lineThrough strikes through the label when checked.",
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
  if (source.trim() === "") return { ok: false, message: "The openui field is empty." };
  if (source.length > maxOpenUiChars) return { ok: false, message: `The openui field exceeds ${maxOpenUiChars} characters.` };
  const result = createParser(validationLibrary.toJSONSchema()).parse(source);
  const lines = source.split("\n");
  if (result.meta.unresolved.length > 0) {
    const name = result.meta.unresolved[0];
    const index = lines.findIndex((line) => new RegExp(`\\b${name}\\b`).test(line));
    const where = index >= 0 ? ` at line ${index + 1}: ${lines[index].trim()}` : "";
    return { ok: false, message: `Unresolved reference "${name}"${where}. Define ${name} as a separate line or remove it.` };
  }
  if (result.meta.errors.length > 0) {
    const error = result.meta.errors[0];
    return { ok: false, message: `Invalid arguments for ${error.component}${error.path ? ` (${error.path})` : ""}: ${error.message}` };
  }
  if (!result.root) return { ok: false, message: 'The root line is missing. Write "root = Col([...])" first.' };
  if (result.meta.incomplete) return { ok: false, message: "The OpenUI text looks incomplete: check the closing brackets." };
  return { ok: true };
}

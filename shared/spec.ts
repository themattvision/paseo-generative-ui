import { z } from "zod";

export const MAX_SPEC_DEPTH = 8;
export const MAX_SPEC_NODES = 200;

const gapSchema = z.union([z.literal(4), z.literal(8), z.literal(12), z.literal(16), z.literal(24), z.literal(32), z.literal(48), z.literal(64), z.literal(96)]);
const actionSchema = z.object({
  id: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
});

/** Preserves future component types for the renderer fallback. */
export const specNodeSchema = z.object({ type: z.string().min(1) }).passthrough();
export type SpecNode = z.infer<typeof specNodeSchema>;

const stackSchema = z.object({
  type: z.literal("stack"),
  direction: z.enum(["vertical", "horizontal"]).default("vertical"),
  gap: gapSchema.default(12),
  align: z.enum(["start", "center", "end", "stretch"]).default("stretch"),
  children: z.array(specNodeSchema),
});
const textSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  variant: z.enum(["title", "heading", "body", "caption", "mono"]).default("body"),
});
const cardSchema = z.object({
  type: z.literal("card"),
  title: z.string().optional(),
  tone: z.enum(["default", "accent"]).default("default"),
  children: z.array(specNodeSchema),
});
const statSchema = z.object({
  type: z.literal("stat"),
  label: z.string(),
  value: z.string(),
  delta: z.string().optional(),
  trend: z.enum(["up", "down", "flat"]).optional(),
});
const calloutSchema = z.object({
  type: z.literal("callout"),
  tone: z.enum(["info", "success", "warning", "danger"]),
  title: z.string(),
  text: z.string(),
});
const listSchema = z.object({
  type: z.literal("list"),
  items: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    icon: z.string().optional(),
    status: z.enum(["complete", "pending", "attention"]).optional(),
  })),
});
const badgeSchema = z.object({ type: z.literal("badge"), label: z.string() });
const buttonSchema = z.object({
  type: z.literal("button"),
  label: z.string(),
  variant: z.enum(["primary", "secondary", "ghost"]).default("primary"),
  action: actionSchema,
  disabled: z.boolean().default(false),
});
const dividerSchema = z.object({ type: z.literal("divider") });
const progressSchema = z.object({
  type: z.literal("progress"),
  value: z.number().min(0).max(100),
  label: z.string().optional(),
});

/** The extensible, discriminated catalog for every component implemented in phase 2. */
export const knownSpecNodeSchema = z.discriminatedUnion("type", [
  stackSchema,
  textSchema,
  cardSchema,
  statSchema,
  calloutSchema,
  listSchema,
  badgeSchema,
  buttonSchema,
  dividerSchema,
  progressSchema,
]);

export type KnownSpecNode = z.infer<typeof knownSpecNodeSchema>;
export type Action = z.infer<typeof actionSchema>;
const supportedTypes = new Set(["stack", "text", "card", "stat", "callout", "list", "badge", "button", "divider", "progress"]);

export type SpecValidation = { ok: true; nodeCount: number } | { ok: false; message: string };

export function validateSpec(spec: unknown): SpecValidation {
  let nodeCount = 0;
  const visit = (node: unknown, depth: number): string | undefined => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return "Ogni nodo della spec deve essere un oggetto.";
    const parsed = specNodeSchema.safeParse(node);
    if (!parsed.success) return "Ogni nodo della spec deve avere un type valido.";
    if (supportedTypes.has(parsed.data.type)) {
      const known = knownSpecNodeSchema.safeParse(node);
      if (!known.success) return `Il componente ${parsed.data.type} non è valido: ${known.error.issues[0]?.message ?? "proprietà mancanti"}.`;
    }
    if (depth > MAX_SPEC_DEPTH) return `La spec supera la profondità massima di ${MAX_SPEC_DEPTH} livelli.`;
    nodeCount += 1;
    if (nodeCount > MAX_SPEC_NODES) return `La spec supera il massimo di ${MAX_SPEC_NODES} nodi.`;
    const children = (node as { children?: unknown }).children;
    if (children !== undefined && !Array.isArray(children)) return "children deve essere un array.";
    for (const child of children ?? []) {
      const problem = visit(child, depth + 1);
      if (problem) return problem;
    }
    return undefined;
  };
  const problem = visit(spec, 1);
  return problem ? { ok: false, message: problem } : { ok: true, nodeCount };
}

export function parseKnownNode(node: SpecNode): KnownSpecNode | undefined {
  const parsed = knownSpecNodeSchema.safeParse(node);
  return parsed.success ? parsed.data : undefined;
}

import { z } from "zod";
import { validateSpec, specNodeSchema } from "./spec.js";
import { checkOpenUi, maxOpenUiChars } from "./openui-signatures.js";

export const maxGenerativeUiDataBytes = 64 * 1024;

const generativeUiShape = z.object({
  title: z.string().optional(),
  /** Added by the bridge so UI events can name their timeline row. */
  rowId: z.string().min(1).optional(),
  spec: specNodeSchema.optional(),
  openui: z.string().max(maxOpenUiChars).optional(),
});

// Due formati alternativi: la spec JSON (vecchio formato, blocchi già salvati compresi) oppure openui (testo OpenUI Lang).
// Schema COMPLETO, usato dal server: valida anche il testo OpenUI con lang-core e rifiuta l'errore all'agente.
export const generativeUiSchema = generativeUiShape.superRefine((data, context) => {
  const hasSpec = data.spec !== undefined;
  const hasOpenUi = data.openui !== undefined;
  if (hasSpec === hasOpenUi) {
    context.addIssue({ code: "custom", path: [], message: "Passa spec oppure openui, non entrambi e non nessuno dei due." });
    return;
  }
  if (data.spec !== undefined) {
    const validation = validateSpec(data.spec);
    if (!validation.ok) context.addIssue({ code: "custom", path: ["spec"], message: validation.message });
    return;
  }
  const check = checkOpenUi(data.openui ?? "");
  if (!check.ok) context.addIssue({ code: "custom", path: ["openui"], message: check.message });
});

// Schema LEGGERO, usato dal renderer sul client (9 novembre 2026): il testo OpenUI è già stato validato dal server
// prima di entrare nella timeline, e sul telefono non deve rieseguire il parser di lang-core nello schema
// (un errore lì fa mostrare «Plugin timeline item unavailable» invece del blocco). Gli errori di disegno li gestisce Renderer.
export const generativeUiClientSchema = generativeUiShape.superRefine((data, context) => {
  const hasSpec = data.spec !== undefined;
  const hasOpenUi = data.openui !== undefined;
  if (hasSpec === hasOpenUi) {
    context.addIssue({ code: "custom", path: [], message: "Passa spec oppure openui, non entrambi e non nessuno dei due." });
    return;
  }
  if (data.spec !== undefined) {
    const validation = validateSpec(data.spec);
    if (!validation.ok) context.addIssue({ code: "custom", path: ["spec"], message: validation.message });
  }
});

export type GenerativeUiData = z.infer<typeof generativeUiSchema>;

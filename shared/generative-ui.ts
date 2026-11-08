import { z } from "zod";
import { validateSpec, specNodeSchema } from "./spec.js";
import { checkOpenUi, maxOpenUiChars } from "./openui-signatures.js";

export const maxGenerativeUiDataBytes = 64 * 1024;

// Due formati alternativi: la spec JSON (vecchio formato, blocchi già salvati compresi) oppure openui (testo OpenUI Lang).
export const generativeUiSchema = z.object({
  title: z.string().optional(),
  /** Added by the bridge so UI events can name their timeline row. */
  rowId: z.string().min(1).optional(),
  spec: specNodeSchema.optional(),
  openui: z.string().max(maxOpenUiChars).optional(),
}).superRefine((data, context) => {
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

export type GenerativeUiData = z.infer<typeof generativeUiSchema>;

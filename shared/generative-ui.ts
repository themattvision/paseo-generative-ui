import { z } from "zod";
import { validateSpec, specNodeSchema } from "./spec.js";

export const maxGenerativeUiDataBytes = 64 * 1024;

export const generativeUiSchema = z.object({
  title: z.string().optional(),
  spec: specNodeSchema,
}).superRefine((data, context) => {
  const validation = validateSpec(data.spec);
  if (!validation.ok) context.addIssue({ code: "custom", path: ["spec"], message: validation.message });
});

export type GenerativeUiData = z.infer<typeof generativeUiSchema>;

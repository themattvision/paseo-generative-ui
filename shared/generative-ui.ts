import { z } from "zod";

export const maxGenerativeUiDataBytes = 64 * 1024;

export const generativeUiSchema = z.object({
  title: z.string().optional(),
  spec: z.record(z.string(), z.unknown()),
});

export type GenerativeUiData = z.infer<typeof generativeUiSchema>;

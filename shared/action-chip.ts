import { z } from "zod";

export const actionChipSchema = z.object({ label: z.string() });
export type ActionChipData = z.infer<typeof actionChipSchema>;

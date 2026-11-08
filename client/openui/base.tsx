import { createContext, useContext, type ReactNode } from "react";
import type { ComponentRenderProps } from "@openuidev/react-lang";
import type { UiContext } from "../ds/components.js";

// Contesto del blocco (tema, compatto, invio azioni): i componenti React Native lo leggono qui.
export const OpenUiContext = createContext<UiContext | null>(null);

export function useUi(): UiContext {
  const context = useContext(OpenUiContext);
  if (!context) throw new Error("OpenUiContext mancante.");
  return context;
}

export type Props = ComponentRenderProps<Record<string, any>>;
export type Renderer = (props: Props) => ReactNode;

const radiusNames: Record<string, number> = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };

/** Raggio da numero, nome (sm, md, lg, xl, full) o stringa numerica. */
export function radiusOf(value: unknown, fallback: number): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value in radiusNames) return radiusNames[value];
  if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value)) return Number(value);
  return fallback;
}

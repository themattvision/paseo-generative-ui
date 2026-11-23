import type { ComponentType, ReactNode } from "react";

/**
 * Vetro vero di Finale per i pulsanti reattivi (20 novembre 2026).
 *
 * Il bundle del plugin non può importare expo-glass-effect, quindi l'app Finale pubblica su globalThis
 * `__finaleGlass` (packages/app/src/finale/glass/intelligent-ui-glass-bridge.ts in paseo-finale-ios).
 * Senza ponte, fuori da iOS 26 o con Finale spento `useFinaleGlass()` ritorna null e i pulsanti restano piatti.
 * Contratto version 1: cambiarlo richiede di aggiornare entrambi i repo.
 */
export interface FinaleGlass {
  version: 1;
  GlassSurface: ComponentType<{ radius: number; isInteractive?: boolean; tintColor?: string; effectStyle?: "regular" | "clear" | "none"; style?: unknown; children?: ReactNode }>;
  useGlassAvailable: () => boolean;
}

const scope = globalThis as unknown as { __finaleGlass?: FinaleGlass };

/** Il vetro di Finale se c'è ed è disponibile (iOS 26), altrimenti null. Hook chiamato sempre, mai in condizione. */
export function useFinaleGlass(): FinaleGlass | null {
  const bridge = scope.__finaleGlass?.version === 1 ? scope.__finaleGlass : null;
  // Il bridge è una costante dell'app: l'ordine degli hook resta stabile fra i render.
  const available = bridge ? bridge.useGlassAvailable() : false;
  return bridge && available ? bridge : null;
}

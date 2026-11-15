import { useSyncExternalStore, type ComponentType } from "react";
import type { PluginTheme } from "@getpaseo/plugin";

/**
 * Fusione con il plugin Finale (paseo-final-answer), 15 novembre 2026.
 *
 * I bundle dei plugin sono valutati nello stesso ambiente globale (globalThis.eval), quindi i due plugin si
 * parlano con due oggetti globali, senza dipendenze di build:
 *  - `__intelligentUi` (lo pubblica questo plugin): `Embedded` disegna UN blocco show_ui senza involucro dentro
 *    il contenitore di Finale, con il tema che riceve (i livelli di fondo della card).
 *  - `__finaleCards` (lo pubblica Finale): `claim(rowId)` dice che Finale sta disegnando quel blocco nel proprio
 *    box della risposta; qui la riga si ritira (`useClaimedByFinale`) per non comparire due volte.
 * Se Finale non c'è o è spento tutto resta com'era: il blocco è una riga sotto la risposta. Contratto version 1,
 * speculare a client/intelligent-ui.ts di paseo-final-answer: cambiarlo richiede di aggiornare entrambi.
 */
export interface EmbeddedProps {
  data: unknown;
  agentId: string;
  theme: PluginTheme;
  layout: { compact: boolean; platform: "web" | "ios" | "android" };
}

interface FinaleCards { version: 1; has(rowId: string): boolean; subscribe(listener: () => void): () => void }
const scope = globalThis as unknown as { __finaleCards?: FinaleCards; __intelligentUi?: { version: 1; Embedded: ComponentType<EmbeddedProps> } };

const subscribe = (listener: () => void) => scope.__finaleCards?.version === 1 ? scope.__finaleCards.subscribe(listener) : () => {};

/** Vero se Finale sta mostrando questa riga dentro il proprio box. */
export function useClaimedByFinale(rowId: string | undefined): boolean {
  return useSyncExternalStore(subscribe, () => rowId !== undefined && scope.__finaleCards?.version === 1 && scope.__finaleCards.has(rowId));
}

export function installIntelligentUiBridge(Embedded: ComponentType<EmbeddedProps>): () => void {
  const bridge = { version: 1 as const, Embedded };
  scope.__intelligentUi = bridge;
  return () => { if (scope.__intelligentUi === bridge) delete scope.__intelligentUi; };
}

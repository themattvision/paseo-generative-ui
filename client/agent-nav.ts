// Ponte per aprire la chat di un altro agente dal bottone AgentLink (15 novembre 2026, idea di Matteo).
// Il renderer della timeline NON riceve `navigation` dal client Paseo (solo schermate e pannelli la ricevono),
// ma `client.openScreen` è disponibile in `contribute`. Quindi: il bottone apre la schermata invisibile
// «apri-agente» (client/agent-redirect.tsx), che riceve `navigation.openAgent` e la chiama.
type OpenScreen = (input: { screenId: string; params?: Record<string, string> }) => void;

let openScreen: OpenScreen | undefined;

export function installAgentNav(next: OpenScreen): () => void {
  openScreen = next;
  return () => { if (openScreen === next) openScreen = undefined; };
}

export const AGENT_SCREEN_ID = "apri-agente";

/** Restituisce false se il ponte non è installato (plugin non ancora caricato dal client). */
export function openAgentChat(agentId: string, serverId?: string): boolean {
  if (!openScreen) return false;
  // `t` serve alla schermata per distinguere una nuova richiesta da un ritorno indietro (vedi agent-redirect.tsx).
  openScreen({ screenId: AGENT_SCREEN_ID, params: { agentId, ...(serverId ? { serverId } : {}), t: String(Date.now()) } });
  return true;
}

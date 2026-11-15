import type { Action } from "./spec.js";

const PREFIX = "[Azione UI]";

// L'etichetta del bottone premuto va per prima, tra virgolette JSON: la timeline legge quella e mostra un chip
// al posto del messaggio tecnico. Il resto del testo resta per l'agente.
export function actionMessage(action: Action, rowId: string, title?: string, label?: string): string {
  const head = label ? `${PREFIX} etichetta=${JSON.stringify(label)}` : PREFIX;
  return `${head} id=${action.id} riga=${rowId} titolo=${title ?? "senza titolo"} valori=${JSON.stringify(action.payload ?? {})}`;
}

// Restituisce l'etichetta da mostrare se il testo è un messaggio di azione UI, altrimenti undefined.
export function parseActionLabel(text: string): string | undefined {
  if (!text.startsWith(PREFIX)) return undefined;
  const quoted = /^\[Azione UI\] etichetta=("(?:[^"\\]|\\.)*")/.exec(text);
  if (quoted) {
    try {
      const value: unknown = JSON.parse(quoted[1] ?? "");
      if (typeof value === "string" && value.trim() !== "") return value;
    } catch {
      // etichetta illeggibile: ripiego sotto
    }
  }
  // Messaggi vecchi senza etichetta: usa il testo dell'azione se c'è.
  const legacy = /valori=(\{.*\})\s*$/.exec(text);
  if (legacy) {
    try {
      const values = JSON.parse(legacy[1] ?? "") as { messaggio?: unknown };
      if (typeof values.messaggio === "string" && values.messaggio.trim() !== "") return values.messaggio;
    } catch {
      // niente
    }
  }
  return "Azione inviata";
}

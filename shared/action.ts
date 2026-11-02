import type { Action } from "./spec.js";

export function actionMessage(action: Action, rowId: string, title?: string): string {
  return `[Azione UI] id=${action.id} riga=${rowId} titolo=${title ?? "senza titolo"} valori=${JSON.stringify(action.payload ?? {})}`;
}

import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

// RPC che serve al client le immagini dei blocchi show_ui (anteprime di immagini e caroselli). La riga del blocco
// porta solo il percorso del file; il plugin, che gira sul Mac dove il file esiste, lo legge, lo rimpicciolisce e
// risponde con un data URI. Funziona anche dal telefono: la richiesta passa dal daemon, come tutte le RPC dei plugin.
export const loadImage = defineRpc({
  name: "images.load",
  input: z.object({ path: z.string().min(1).max(2048) }),
  output: z.object({ uri: z.string() }),
});

import { openExternalUrl } from "@getpaseo/plugin/client";

// Apre un URL http(s) con l'opener ufficiale della piattaforma (desktop: shell.openExternal via IPC, mobile: Linking).
// window.open e Linking.openURL diretti NON si usano: nell'app desktop window.open non apre il browser di sistema
// (SINTOMO: il pulsante «Apri su Google Maps» non fa nulla, 11 novembre 2026).
export async function openExternal(url: string): Promise<void> {
  await openExternalUrl(url);
}

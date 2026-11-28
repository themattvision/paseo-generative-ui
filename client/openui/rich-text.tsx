import { Fragment, type ReactNode } from "react";
import { Text } from "react-native";
import { Markdown, useToast } from "@getpaseo/plugin/client/ui";
import { openExternal } from "../web";
import { useUi } from "./base.js";

// Testo dei blocchi show_ui: link toccabili e, dove possibile, selezione vera come nel testo normale della chat.
// SINTOMO (28 novembre 2026, dal telefono): il `Text selectable` di React Native su iOS apre solo il menu «Copy»
// che copia TUTTO il paragrafo, senza maniglie per scegliere una parte, e i link non erano cliccabili.
// Per i paragrafi usiamo il `Markdown` dell'SDK Paseo (stesso tema, stessa selezione e stessi link della chat);
// per le etichette corte (titoli, didascalie, celle) resta `Text selectable` con i link resi toccabili qui.

const linkPattern = /\[([^\]\n]+)\]\(((?:https?|paseo-preview):\/\/[^\s)]+)\)|((?:https?):\/\/[^\s<>"')\]]+)/gi;
// Punteggiatura che chiude la frase e non fa parte dell'indirizzo.
const trailingPunctuation = /[.,;:!?]+$/;

export type LinkPart = { kind: "text"; text: string } | { kind: "link"; text: string; url: string };

/** Spezza un testo in parti semplici e link (markdown `[testo](url)` oppure indirizzo http(s) nudo). */
export function splitLinks(input: string): LinkPart[] {
  const parts: LinkPart[] = [];
  let last = 0;
  for (const match of input.matchAll(linkPattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ kind: "text", text: input.slice(last, index) });
    if (match[1] && match[2]) {
      parts.push({ kind: "link", text: match[1], url: match[2] });
      last = index + match[0].length;
    } else {
      let url = match[3] ?? match[0];
      const trailing = trailingPunctuation.exec(url)?.[0] ?? "";
      if (trailing) url = url.slice(0, -trailing.length);
      parts.push({ kind: "link", text: url, url });
      last = index + url.length;
    }
  }
  if (last < input.length) parts.push({ kind: "text", text: input.slice(last) });
  return parts;
}

/** Testo con i link toccabili, da mettere DENTRO un `Text`. Senza link restituisce la stringa com'è. */
export function LinkedText({ children }: { children: string }): ReactNode {
  const { theme } = useUi();
  const toast = useToast();
  const parts = splitLinks(children);
  if (!parts.some((part) => part.kind === "link")) return children;
  return (
    <>
      {parts.map((part, index) =>
        part.kind === "text" ? (
          <Fragment key={index}>{part.text}</Fragment>
        ) : (
          <Text
            key={index}
            accessibilityRole="link"
            onPress={() => { openExternal(part.url).catch(() => toast.show("Could not open the link", { variant: "error" })); }}
            style={{ color: theme.colors.accent, textDecorationLine: "underline" }}
          >
            {part.text}
          </Text>
        ),
      )}
    </>
  );
}

/**
 * Paragrafo: usa il Markdown dell'app (selezione parziale e link nativi) quando lo stile richiesto è quello di base.
 * Il Markdown dell'SDK non accetta dimensione, corsivo, barrato o numero di righe: in quei casi resta `Text` con i link toccabili.
 */
export function Prose({ text, size, italic, lineThrough, maxLines, weight, color }: { text: string; size: number; italic?: boolean; lineThrough?: boolean; maxLines?: number; weight?: string; color: string }) {
  const plain = size === 16 && !italic && !lineThrough && !maxLines && !weight;
  if (plain) return <Markdown>{text}</Markdown>;
  const fontWeight = weight === "semibold" ? "600" : weight === "medium" ? "500" : "400";
  return (
    <Text
      selectable
      numberOfLines={maxLines}
      style={{ color, fontSize: size, lineHeight: Math.round(size * 1.45), fontWeight, fontStyle: italic ? "italic" : "normal", textDecorationLine: lineThrough ? "line-through" : "none" }}
    >
      <LinkedText>{text}</LinkedText>
    </Text>
  );
}

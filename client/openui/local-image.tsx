import { useEffect, useRef, useState } from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";
import { useRpc } from "@getpaseo/plugin/client";
import { loadImage } from "../../shared/images.js";

// IMMAGINI LOCALI DEL MAC NEI BLOCCHI (25 novembre 2026). SINTOMO che l'ha resa necessaria: il blocco con 13 slide
// incorporate come data URI non compariva mai, perché il daemon rifiuta le righe plugin oltre 64 KiB («Plugin timeline
// item data exceeds 65536 bytes»). Ora la riga porta solo il percorso del file e il client lo chiede al plugin con
// l'RPC `images.load` (il plugin gira sul Mac, legge il file e risponde con un data URI piccolo). Vale anche dal
// telefono: la richiesta passa dal daemon. Le richieste vanno una alla volta e il risultato resta in memoria.

export const isLocalImagePath = (value: unknown): value is string => typeof value === "string" && /^(file:\/\/)?\//.test(value);
export const isDisplayableUri = (value: unknown): value is string => typeof value === "string" && /^(https?:\/\/|data:image\/)/i.test(value);
export const isImageRef = (value: unknown): value is string => isLocalImagePath(value) || isDisplayableUri(value);

const resolved = new Map<string, string>();
const inFlight = new Map<string, Promise<string | undefined>>();
let queue: Promise<unknown> = Promise.resolve();

/** URI già pronto se l'immagine è stata caricata (serve al visualizzatore a schermo intero). */
export function peekImage(ref: string): string | undefined {
  return isLocalImagePath(ref) ? resolved.get(ref) : ref;
}

export function useResolvedImage(ref: string | undefined): string | undefined {
  const load = useRpc(loadImage);
  const loadRef = useRef(load);
  loadRef.current = load;
  const [uri, setUri] = useState<string | undefined>(() => (ref ? peekImage(ref) : undefined));

  useEffect(() => {
    if (!ref) { setUri(undefined); return; }
    const ready = peekImage(ref);
    if (ready) { setUri(ready); return; }
    let current = true;
    let pending = inFlight.get(ref);
    if (!pending) {
      const run = async (): Promise<string | undefined> => {
        try {
          const result = await loadRef.current({ path: ref });
          resolved.set(ref, result.uri);
          return result.uri;
        } catch {
          return undefined;
        }
      };
      pending = queue.then(run);
      queue = pending.catch(() => undefined);
      inFlight.set(ref, pending);
      void pending.finally(() => inFlight.delete(ref));
    }
    void pending.then((value) => { if (current) setUri(value); });
    return () => { current = false; };
  }, [ref]);

  return uri;
}

/** Image che accetta un URL, un data URI o un percorso di file del Mac. */
export function RefImage({ src, style, resizeMode, label }: { src: string; style: StyleProp<ImageStyle>; resizeMode?: "cover" | "contain"; label?: string }) {
  const uri = useResolvedImage(src);
  if (!uri) return null;
  return <Image source={{ uri }} accessibilityLabel={label} resizeMode={resizeMode ?? "cover"} style={style} />;
}

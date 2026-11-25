import { useEffect, useState } from "react";
import { Image, Pressable, View, type ViewStyle } from "react-native";
import { Icon as PaseoIcon } from "@getpaseo/plugin/client/ui";
import { Squircle } from "../ds/squircle.js";
import { ImageViewer } from "./image-viewer.js";
import { isLocalImagePath, useResolvedImage } from "./local-image.js";
import { radiusOf, useUi, type Renderer } from "./base.js";

// Icone Lucide per nome e foto (Image con URL, SearchImage con ricerca su Wikipedia e Commons).
// Nessun riquadro e nessun bordo: la foto è il contenuto, come nel riferimento open-intelligent-ui.

// Foto da URL http(s) oppure immagine incorporata dal server (data URI, per i file locali del Mac).
const isHttpUrl = (value: string) => /^(https?:\/\/|data:image\/)/i.test(value);

// L'SDK Paseo vuole i nomi Lucide in PascalCase ("MapPin"), mentre gli agenti scrivono kebab-case ("map-pin"):
// un nome non riconosciuto non disegna NULLA, senza errori (SINTOMO: icone e segnaposto foto invisibili).
// Si converte qui, in un punto solo; un nome già in PascalCase resta com'è.
export const lucideName = (name: string): string =>
  name.trim().split(/[-_\s]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("") || "Circle";

const Icon: Renderer = ({ props }) => {
  const { theme } = useUi();
  const size = typeof props.size === "number" ? props.size : 20;
  return <PaseoIcon name={lucideName(String(props.name ?? "circle"))} size={size} color={theme.colors.foregroundMuted} />;
};

type Photo = string;
const cache = new Map<string, Promise<Photo[]>>();

const imageExt = /\.(jpe?g|png|webp)(\?|$)/i;

// Ricerca immagini lato client, senza chiavi: it.wikipedia, en.wikipedia (miniature dell'articolo) e Commons.
// Le API di Wikimedia rispondono 429 a una raffica di richieste (SINTOMO verificato l'11 novembre 2026: 4 card x 3 fonti
// insieme, poi anche la ricerca di ripiego, e quasi tutte le chiamate tornano 429 e la card resta col segnaposto).
// Quindi tutte le ricerche passano da UNA coda globale: una richiesta alla volta, distanziate di 400 ms, e su 429
// o rete caduta si riprova fino a 3 volte con attesa crescente (1,2 s, 2,4 s, 3,6 s).
let queue: Promise<unknown> = Promise.resolve();
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function fetchJson(url: string): Promise<any> {
  const run = async (): Promise<any> => {
    for (let attempt = 0; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url);
        if (response.ok) return await response.json();
        if (response.status !== 429 && response.status < 500) return null;
      } catch {
        // rete caduta: si riprova sotto
      }
      await wait(1200 * (attempt + 1));
    }
    return null;
  };
  const result = queue.then(run).finally(() => wait(400));
  queue = result.catch(() => undefined);
  return result;
}

// Pertinenza: la ricerca testuale di Wikipedia e Commons restituisce spesso foto a caso per attività piccole
// (caso reale: «Sicilian Goodness Padova» dava il Palio di Siena). Una foto sbagliata è peggio del segnaposto,
// quindi si tiene un risultato solo se il titolo della pagina o del file contiene almeno metà delle parole della ricerca.
const stopWords = new Set(["della", "delle", "degli", "dello", "del", "dei", "the", "and", "per", "con", "di", "da", "in", "su", "la", "il", "le", "lo", "un", "una", "of", "at"]);
const tokensOf = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 3 && !stopWords.has(word));

function isRelevant(query: string, title: string): boolean {
  const wanted = tokensOf(query);
  if (wanted.length === 0) return false;
  const found = new Set(tokensOf(title));
  const hits = wanted.filter((word) => found.has(word)).length;
  return hits >= Math.ceil(wanted.length / 2) && hits >= Math.min(2, wanted.length);
}

type Candidate = { url: string; title: string };

async function wikipediaPhotos(lang: string, query: string): Promise<Candidate[]> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=4&prop=pageimages&piprop=thumbnail&pithumbsize=960&format=json&origin=*`;
  const json = await fetchJson(url);
  const pages: any[] = Object.values(json?.query?.pages ?? {});
  return pages
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((page) => ({ url: page?.thumbnail?.source, title: String(page?.title ?? "") }))
    .filter((item): item is Candidate => typeof item.url === "string");
}

async function commonsPhotos(query: string): Promise<Candidate[]> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=4&prop=imageinfo&iiprop=url&iiurlwidth=960&format=json&origin=*`;
  const json = await fetchJson(url);
  const pages: any[] = Object.values(json?.query?.pages ?? {});
  return pages
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((page) => ({ url: page?.imageinfo?.[0]?.thumburl, title: String(page?.title ?? "") }))
    .filter((item): item is Candidate => typeof item.url === "string" && imageExt.test(item.url));
}

function searchPhotos(query: string): Promise<Photo[]> {
  const key = query.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  const pending = Promise.all([wikipediaPhotos("it", query), commonsPhotos(query)]).then((lists) => {
    const photos = [...new Set(lists.flat().filter((item) => isRelevant(query, item.title)).map((item) => item.url))];
    if (photos.length === 0) cache.delete(key);
    return photos;
  });
  if (cache.size > 200) cache.clear();
  cache.set(key, pending);
  return pending;
}

// Prima la foto precisa; se non esiste (locali piccoli) la foto generica del tipo di cosa (fallback).
async function searchWithFallback(query: string, fallback?: string): Promise<Photo[]> {
  const exact = await searchPhotos(query);
  if (exact.length > 0 || !fallback || fallback.trim().length < 3) return exact;
  return searchPhotos(fallback);
}

// Aspetta mezzo secondo prima di cercare: durante lo streaming la query arriva a pezzi.
function usePhotos(query: string, fallback: string | undefined, enabled: boolean) {
  const stamp = `${query}|${fallback ?? ""}`;
  const [state, setState] = useState<{ stamp: string; photos: Photo[]; done: boolean }>({ stamp, photos: [], done: false });
  useEffect(() => {
    if (!enabled || query.trim().length < 3) return;
    let current = true;
    const timer = setTimeout(() => {
      void searchWithFallback(query, fallback).then((photos) => {
        if (current) setState({ stamp, photos, done: true });
      });
    }, 500);
    return () => { current = false; clearTimeout(timer); };
  }, [query, fallback, stamp, enabled]);
  return state.stamp === stamp ? state : { stamp, photos: [], done: false };
}

function PhotoBlock({ src, query, fallback, props }: { src?: string; query: string; fallback?: string; props: Record<string, any> }) {
  const { theme } = useUi();
  const [failed, setFailed] = useState<string[]>([]);
  // Percorso di un file del Mac: lo carica il plugin con l'RPC images.load (local-image.tsx), niente ricerca su Wikipedia.
  const local = isLocalImagePath(src);
  const resolvedSrc = useResolvedImage(src && (local || isHttpUrl(src)) ? src : undefined);
  const direct = resolvedSrc && isHttpUrl(resolvedSrc) ? resolvedSrc : undefined;
  const found = usePhotos(query, fallback, !local && (!direct || failed.includes(direct)));
  const candidates = [direct, ...found.photos].filter((url): url is string => Boolean(url) && !failed.includes(url as string));
  const url = candidates[0];
  const [open, setOpen] = useState(false);
  const ratio = typeof props.aspectRatio === "number" && props.aspectRatio > 0.2 && props.aspectRatio < 5 ? props.aspectRatio : 1.5;
  return (
    <>
      {/* Un tocco apre la foto a schermo intero con zoom (image-viewer.tsx). */}
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={query ? `${query}, open full screen` : "Open the photo full screen"}
        disabled={!url}
        onPress={() => setOpen(true)}
        style={{ width: "100%", ...(url ? ({ cursor: "zoom-in" } as unknown as ViewStyle) : {}) }}
      >
        <Squircle radius={radiusOf(props.radius, 16)} style={{ backgroundColor: theme.colors.surface1 }}>
          <View style={{ width: "100%", aspectRatio: ratio, alignItems: "center", justifyContent: "center" }}>
            {url ? (
              <Image
                source={{ uri: url }}
                accessibilityLabel={query}
                resizeMode={props.fit === "contain" ? "contain" : "cover"}
                onError={() => setFailed((list) => [...list, url])}
                style={{ position: "absolute", width: "100%", height: "100%" }}
              />
            ) : (
              <PaseoIcon name="Image" size={28} color={theme.colors.foregroundMuted} />
            )}
          </View>
        </Squircle>
      </Pressable>
      {open && url ? <ImageViewer uri={url} label={query} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

const ImageBlock: Renderer = ({ props }) => <PhotoBlock src={String(props.src ?? "")} query={String(props.alt ?? "")} props={props} />;
const SearchImage: Renderer = ({ props }) => (
  <PhotoBlock query={String(props.query ?? "")} fallback={typeof props.fallback === "string" ? props.fallback : undefined} props={props} />
);

export const mediaRenderers: Record<string, Renderer> = { Icon, Image: ImageBlock, SearchImage };

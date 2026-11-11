import { useEffect, useState } from "react";
import { Image, View } from "react-native";
import { Icon as PaseoIcon } from "@getpaseo/plugin/client/ui";
import { Squircle } from "../ds/squircle.js";
import { radiusOf, useUi, type Renderer } from "./base.js";

// Icone Lucide per nome e foto (Image con URL, SearchImage con ricerca su Wikipedia e Commons).
// Nessun riquadro e nessun bordo: la foto è il contenuto, come nel riferimento open-intelligent-ui.

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

// Nomi Lucide in kebab-case: un nome non valido non disegna nulla (comportamento del plugin SDK).
const Icon: Renderer = ({ props }) => {
  const { theme } = useUi();
  const size = typeof props.size === "number" ? props.size : 20;
  return <PaseoIcon name={String(props.name ?? "circle")} size={size} color={theme.colors.foregroundMuted} />;
};

type Photo = string;
const cache = new Map<string, Promise<Photo[]>>();

const imageExt = /\.(jpe?g|png|webp)(\?|$)/i;

// Ricerca immagini lato client, senza chiavi: it.wikipedia, en.wikipedia (miniature dell'articolo) e Commons.
async function fetchJson(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
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
  const pending = Promise.all([wikipediaPhotos("it", query), wikipediaPhotos("en", query), commonsPhotos(query)]).then((lists) => {
    const photos = [...new Set(lists.flat().filter((item) => isRelevant(query, item.title)).map((item) => item.url))];
    if (photos.length === 0) cache.delete(key);
    return photos;
  });
  if (cache.size > 200) cache.clear();
  cache.set(key, pending);
  return pending;
}

// Aspetta mezzo secondo prima di cercare: durante lo streaming la query arriva a pezzi.
function usePhotos(query: string, enabled: boolean) {
  const [state, setState] = useState<{ query: string; photos: Photo[]; done: boolean }>({ query, photos: [], done: false });
  useEffect(() => {
    if (!enabled || query.trim().length < 3) return;
    let current = true;
    const timer = setTimeout(() => {
      void searchPhotos(query).then((photos) => {
        if (current) setState({ query, photos, done: true });
      });
    }, 500);
    return () => { current = false; clearTimeout(timer); };
  }, [query, enabled]);
  return state.query === query ? state : { query, photos: [], done: false };
}

function PhotoBlock({ src, query, props }: { src?: string; query: string; props: Record<string, any> }) {
  const { theme } = useUi();
  const [failed, setFailed] = useState<string[]>([]);
  const direct = src && isHttpUrl(src) ? src : undefined;
  const found = usePhotos(query, !direct || failed.includes(direct));
  const candidates = [direct, ...found.photos].filter((url): url is string => Boolean(url) && !failed.includes(url as string));
  const url = candidates[0];
  const ratio = typeof props.aspectRatio === "number" && props.aspectRatio > 0.2 && props.aspectRatio < 5 ? props.aspectRatio : 1.5;
  return (
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
          <PaseoIcon name="image" size={28} color={theme.colors.foregroundMuted} />
        )}
      </View>
    </Squircle>
  );
}

const ImageBlock: Renderer = ({ props }) => <PhotoBlock src={String(props.src ?? "")} query={String(props.alt ?? "")} props={props} />;
const SearchImage: Renderer = ({ props }) => <PhotoBlock query={String(props.query ?? "")} props={props} />;

export const mediaRenderers: Record<string, Renderer> = { Icon, Image: ImageBlock, SearchImage };

import { useEffect, useRef, useState } from "react";
import { Pressable, Platform, ScrollView, Text, View, type ViewStyle } from "react-native";
import { Squircle } from "../ds/squircle.js";
import { space } from "../ds/tokens.js";
import { openExternal } from "../web.js";
import { useUi, type Renderer } from "./base.js";

// Componenti statici di contenuto: nessuno stato, solo primitive React Native.

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const Divider: Renderer = () => {
  const { theme } = useUi();
  return <View style={{ height: 1, width: "100%", backgroundColor: theme.colors.border }} />;
};

const Spacer: Renderer = () => <View style={{ flexGrow: 1, minWidth: space[8], minHeight: space[8] }} />;

const Grid: Renderer = ({ props, renderNode }) => {
  const { compact } = useUi();
  const gap: number = props.gap ?? space[16];
  const columns = Math.max(1, Math.min(4, Number(props.columns) || 2));
  const shownColumns = compact ? Math.min(columns, 2) : columns;
  const items: unknown[] = Array.isArray(props.children) ? props.children : [];
  // Il margine negativo compensa il padding delle celle, così il gap non sposta la griglia.
  const cell: ViewStyle = props.minChildWidth
    ? { flexGrow: 1, flexBasis: props.minChildWidth, minWidth: props.minChildWidth }
    : { width: `${100 / shownColumns}%` };
  return (
    <View style={{ width: "100%", flexDirection: "row", flexWrap: "wrap", marginHorizontal: -gap / 2 }}>
      {items.map((child, index) => (
        <View key={index} style={[cell, { paddingHorizontal: gap / 2, paddingBottom: gap }]}>{renderNode(child)}</View>
      ))}
    </View>
  );
};

// Riga scorrevole con aggancio: ogni figlio ha larghezza fissa (default 280, scala 4/8: 280 = 70 x 4).
// Sfumatura sul bordo: niente libreria di gradienti, quindi strisce da 4px con opacità decrescente
// del colore di fondo (surface0), uguale su web e telefono.
const FADE_WIDTH = 48;
const FADE_STEPS = 12;

const EdgeFade = ({ side, color }: { side: "left" | "right"; color: string }) => {
  const stripWidth = FADE_WIDTH / FADE_STEPS;
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, bottom: 0, [side]: 0, width: FADE_WIDTH, flexDirection: side === "left" ? "row" : "row-reverse" }}
    >
      {Array.from({ length: FADE_STEPS }, (_, index) => (
        // Dal bordo verso l'interno l'opacità scende da piena a quasi zero (curva morbida).
        <View key={index} style={{ width: stripWidth, backgroundColor: color, opacity: Math.pow(1 - index / FADE_STEPS, 1.6) }} />
      ))}
    </View>
  );
};

// Elasticità ai bordi. Sul telefono ci pensa il ScrollView nativo (bounces, overScrollMode). Sul web (Paseo desktop)
// non esiste, quindi: quando il trackpad (eventi wheel orizzontali, inerzia compresa) spinge oltre il primo o l'ultimo
// elemento, il contenuto si sposta con una resistenza crescente e, a gesto finito, rientra con una molla leggera
// che supera un filo la posizione (cubic-bezier con overshoot).
// REATTIVITÀ (12 novembre 2026, Matteo: «rimane fermo e poi si muove»): la prima versione smorzava già i primi
// movimenti (guadagno 0,5 con resistenza subito crescente) e i primi eventi wheel di un gesto sono minuscoli, quindi
// per un attimo non si vedeva nulla. Ora lo spostamento è una curva esponenziale della trazione accumulata:
// pendenza iniziale 1,6 (si muove subito, più delle dita) e poi satura a ELASTIC_MAX, come l'elastico di iOS.
const ELASTIC_MAX = 96;
const ELASTIC_GAIN = 1.6;
const ELASTIC_RELEASE_MS = 90;

function useElasticEdges(scrollRef: { current: any }) {
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node: any = scrollRef.current?.getScrollableNode?.();
    const content: any = node?.firstElementChild;
    if (!node || !content) return;
    // pull: trazione accumulata oltre il bordo, con segno (positiva = oltre la fine, negativa = oltre l'inizio).
    let pull = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const apply = (animated: boolean) => {
      const stretch = pull === 0 ? 0 : -Math.sign(pull) * ELASTIC_MAX * (1 - Math.exp((-ELASTIC_GAIN * Math.abs(pull)) / ELASTIC_MAX));
      content.style.transition = animated ? "transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)" : "none";
      content.style.transform = stretch === 0 ? "" : `translateX(${stretch}px)`;
    };
    const onWheel = (event: any) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return; // scorrimento verticale: lascia la chat scorrere
      const max = node.scrollWidth - node.clientWidth;
      if (max <= 0) return;
      const pullingPastEnd = node.scrollLeft >= max - 2 && event.deltaX > 0;
      const pullingPastStart = node.scrollLeft <= 2 && event.deltaX < 0;
      if (pull === 0 && !pullingPastEnd && !pullingPastStart) return;
      const next = pull + event.deltaX;
      // Se il gesto torna verso il contenuto e supera lo zero, l'elastico è rientrato: si azzera e riprende lo scroll normale.
      if ((pull > 0 && next <= 0) || (pull < 0 && next >= 0)) {
        pull = 0;
        apply(false);
        if (timer) clearTimeout(timer);
        return;
      }
      event.preventDefault();
      // Tetto alla trazione accumulata: oltre, lo spostamento è già saturo e al ritorno il gesto resterebbe "incollato".
      pull = Math.max(-ELASTIC_MAX * 2, Math.min(ELASTIC_MAX * 2, next));
      apply(false);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { pull = 0; apply(true); }, ELASTIC_RELEASE_MS);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      if (timer) clearTimeout(timer);
      node.removeEventListener("wheel", onWheel);
      content.style.transition = "";
      content.style.transform = "";
    };
  }, [scrollRef]);
}

// Riga scorrevole con aggancio: ogni figlio ha larghezza fissa (default 280, scala 4/8: 280 = 70 x 4).
// Le sfumature compaiono solo dal lato dove c'è altro contenuto da scoprire scorrendo.
const Carousel: Renderer = ({ props, renderNode }) => {
  const { theme } = useUi();
  const scrollRef = useRef<any>(null);
  useElasticEdges(scrollRef);
  const gap: number = props.gap ?? space[12];
  const width: number = props.itemWidth ?? 280;
  const items: unknown[] = Array.isArray(props.children) ? props.children : [];
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [offset, setOffset] = useState(0);
  const maxOffset = Math.max(0, contentWidth - layoutWidth);
  const showLeft = offset > 4;
  const showRight = maxOffset > 0 && offset < maxOffset - 4;
  return (
    <View style={{ width: "100%" }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        bounces
        alwaysBounceHorizontal
        overScrollMode="always"
        showsHorizontalScrollIndicator={false}
        snapToInterval={width + gap}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContentWidth(w)}
        onScroll={(event) => setOffset(event.nativeEvent.contentOffset.x)}
        style={{ width: "100%" }}
        contentContainerStyle={{ gap, paddingRight: space[16] }}
      >
        {items.map((child, index) => (
          <View key={index} style={{ width }}>{renderNode(child)}</View>
        ))}
      </ScrollView>
      {showLeft ? <EdgeFade side="left" color={theme.colors.surface0} /> : null}
      {showRight ? <EdgeFade side="right" color={theme.colors.surface0} /> : null}
    </View>
  );
};

const ListItem: Renderer =({ props, renderNode }) => {
  const { theme } = useUi();
  return (
    <View style={{ flexDirection: "row", gap: space[8], width: "100%" }}>
      {props.marker ? <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14, lineHeight: 20, minWidth: 32 }}>{String(props.marker)}</Text> : null}
      <View style={{ flex: 1, gap: space[4] }}>
        <Text style={{ color: theme.colors.foreground, fontSize: 16, lineHeight: 23 }}>{String(props.title ?? "")}</Text>
        {props.description ? <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14, lineHeight: 20 }}>{String(props.description)}</Text> : null}
        {props.children ? renderNode(props.children) : null}
      </View>
    </View>
  );
};

// Il marker di una stringa è il numero o il punto; con timeline una linea unisce le voci.
const List: Renderer = ({ props, renderNode }) => {
  const { theme } = useUi();
  const items: unknown[] = Array.isArray(props.items) ? props.items : [];
  const marker = props.marker ?? "bullet";
  return (
    <View style={{ width: "100%", gap: space[8] }}>
      {items.map((item, index) => {
        const isText = typeof item === "string";
        const glyph = isText && marker !== "none" ? (marker === "number" ? `${index + 1}.` : "•") : "";
        const last = index === items.length - 1;
        return (
          <View key={index} style={{ flexDirection: "row", gap: space[8], alignItems: "stretch" }}>
            <View style={{ width: 20, alignItems: "center" }}>
              {glyph ? <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14, lineHeight: 23 }}>{glyph}</Text> : null}
              {props.timeline && !last ? <View style={{ flex: 1, width: 1, marginTop: space[4], backgroundColor: theme.colors.border }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: props.timeline ? space[8] : 0 }}>
              {isText ? <Text style={{ color: theme.colors.foreground, fontSize: 16, lineHeight: 23 }}>{item}</Text> : renderNode(item)}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const LinkBlock: Renderer = ({ props }) => {
  const { theme } = useUi();
  const url = String(props.url ?? "");
  const label = String(props.text ?? url);
  if (!isHttpUrl(url)) return <Text style={{ color: theme.colors.foreground, fontSize: 16, lineHeight: 23 }}>{label}</Text>;
  return (
    <Pressable accessibilityRole="link" onPress={() => void openExternal(url)} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
      <Text style={{ color: theme.colors.foreground, fontSize: 16, lineHeight: 23, textDecorationLine: "underline" }}>{label}</Text>
    </Pressable>
  );
};

// Il filetto laterale usa l'accento del tema, non il giallo pieno.
const Quote: Renderer = ({ props }) => {
  const { theme } = useUi();
  return (
    <View style={{ flexDirection: "row", gap: space[12], width: "100%" }}>
      <View style={{ width: 3, borderRadius: 2, backgroundColor: theme.colors.accent }} />
      <View style={{ flex: 1, gap: space[4] }}>
        <Text style={{ color: theme.colors.foreground, fontSize: 16, lineHeight: 23, fontStyle: "italic" }}>{String(props.text ?? "")}</Text>
        {props.cite ? <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12, lineHeight: 17 }}>{String(props.cite)}</Text> : null}
      </View>
    </View>
  );
};

const monoFamily = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

const Code: Renderer = ({ props }) => {
  const { theme } = useUi();
  return (
    <Squircle radius={16} style={{ backgroundColor: theme.colors.surface1 }}>
      {props.language ? <Text style={{ color: theme.colors.foregroundMuted, fontSize: 11, lineHeight: 15, paddingHorizontal: space[12], paddingTop: space[8] }}>{String(props.language)}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: space[12] }}>
        <Text selectable style={{ color: theme.colors.foreground, fontFamily: monoFamily, fontSize: 13, lineHeight: 19 }}>{String(props.code ?? "")}</Text>
      </ScrollView>
    </Squircle>
  );
};

const Label: Renderer = ({ props }) => {
  const { theme } = useUi();
  return <Text style={{ color: theme.colors.foreground, fontSize: 13, lineHeight: 18, fontWeight: "500" }}>{String(props.text ?? "")}</Text>;
};

export const contentRenderers: Record<string, Renderer> = {
  Divider, Spacer, Grid, Carousel, List, ListItem, Link: LinkBlock, Quote, Code, Label,
};

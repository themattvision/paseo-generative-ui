import { useState } from "react";
import { Image, Pressable, Platform, ScrollView, Text, View, type ViewStyle } from "react-native";
import { Squircle } from "../ds/squircle.js";
import { space } from "../ds/tokens.js";
import { openExternal } from "../web.js";
import { radiusOf, useUi, type Renderer } from "./base.js";

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
const Carousel: Renderer = ({ props, renderNode }) => {
  const gap: number = props.gap ?? space[12];
  const width: number = props.itemWidth ?? 280;
  const items: unknown[] = Array.isArray(props.children) ? props.children : [];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={width + gap}
      decelerationRate="fast"
      style={{ width: "100%" }}
      contentContainerStyle={{ gap, paddingRight: space[16] }}
    >
      {items.map((child, index) => (
        <View key={index} style={{ width }}>{renderNode(child)}</View>
      ))}
    </ScrollView>
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

// Foto remota: il testo alternativo sostituisce l'immagine se l'URL non è http(s) o non si carica.
const ImageBlock: Renderer = ({ props }) => {
  const { theme } = useUi();
  const [failed, setFailed] = useState(false);
  const src = String(props.src ?? "");
  const alt = String(props.alt ?? "");
  const ratio = typeof props.aspectRatio === "number" && props.aspectRatio > 0 ? props.aspectRatio : 16 / 9;
  if (failed || !isHttpUrl(src)) {
    return <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12, lineHeight: 17 }}>{alt || "Immagine non disponibile"}</Text>;
  }
  return (
    <Squircle radius={radiusOf(props.radius, 16)} style={{ backgroundColor: theme.colors.surface1 }}>
      <Image
        source={{ uri: src }}
        accessibilityLabel={alt}
        resizeMode={props.fit === "contain" ? "contain" : "cover"}
        onError={() => setFailed(true)}
        style={{ width: "100%", aspectRatio: ratio }}
      />
    </Squircle>
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
    <Squircle radius={16} style={{ backgroundColor: theme.colors.surface1, borderColor: theme.colors.border, borderWidth: 1 }}>
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
  Divider, Spacer, Grid, Carousel, List, ListItem, Image: ImageBlock, Link: LinkBlock, Quote, Code, Label,
};

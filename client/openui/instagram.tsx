import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ViewStyle } from "react-native";
import { Icon as PaseoIcon } from "@getpaseo/plugin/client/ui";
import { Squircle } from "../ds/squircle.js";
import { space } from "../ds/tokens.js";
import { ImageViewer } from "./image-viewer.js";
import { isImageRef, peekImage, RefImage, useResolvedImage } from "./local-image.js";
import { useUi, type Renderer } from "./base.js";

// ANTEPRIMA DI UN POST INSTAGRAM NELLA CHAT (25 novembre 2026, richiesta di Matteo: «l'anteprima delle immagini singole,
// l'anteprima del carosello di Instagram e tutto, me lo mostri qui dentro la chat con l'intelligent UI, proprio quella
// stessa interfaccia di Instagram»). Riproduce la pagina di anteprima di Scambio AI: schede Griglia e Instagram,
// intestazione con foto profilo, nome e spunta, slide scorrevoli con aggancio, contatore n/N, puntini, icone e didascalia.
// Le immagini sono data URI incorporati dal bridge (server/local-images.ts), perché il telefono non legge i file del Mac.
// Un tocco su una slide la apre a schermo intero con zoom (image-viewer.tsx).

const VERIFIED_BLUE = "#0095f6";
const MAX_WIDTH = 440;

type Tab = "instagram" | "grid";

function Avatar({ uri, name, size }: { uri?: string; name: string; size: number }) {
  const { theme } = useUi();
  const resolvedAvatar = useResolvedImage(uri && isImageRef(uri) ? uri : undefined);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: theme.colors.surface2, alignItems: "center", justifyContent: "center" }}>
      {resolvedAvatar ? (
        <Image source={{ uri: resolvedAvatar }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text style={{ color: theme.colors.foreground, fontSize: size * 0.42, fontWeight: "700" }}>{name.trim().charAt(0).toUpperCase() || "?"}</Text>
      )}
    </View>
  );
}

function TabPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useUi();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{ minHeight: 36, paddingHorizontal: space[16], justifyContent: "center", borderRadius: 999, backgroundColor: active ? theme.colors.surface2 : "transparent" }}
    >
      <Text style={{ color: active ? theme.colors.foreground : theme.colors.foregroundMuted, fontSize: 14, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

function RoundArrow({ side, onPress }: { side: "left" | "right"; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={side === "left" ? "Previous slide" : "Next slide"}
      onPress={onPress}
      style={{ position: "absolute", top: "50%", [side]: space[8], marginTop: -16, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" } as ViewStyle}
    >
      <PaseoIcon name={side === "left" ? "ChevronLeft" : "ChevronRight"} size={18} color="#14141a" />
    </Pressable>
  );
}

const InstagramPost: Renderer = ({ props }) => {
  const { theme } = useUi();
  const images: string[] = (Array.isArray(props.images) ? props.images : []).filter(isImageRef);
  const handle = String(props.handle ?? "themattvision").replace(/^@/, "");
  const name = String(props.name ?? handle);
  const caption = typeof props.caption === "string" ? props.caption : "";
  const [tab, setTab] = useState<Tab>("instagram");
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const total = images.length;

  const goTo = (target: number) => {
    const next = Math.max(0, Math.min(total - 1, target));
    setIndex(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
  };
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next >= 0 && next < total) setIndex(next);
  };
  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width));

  if (total === 0) {
    return <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14 }}>No images to preview.</Text>;
  }

  const iconColor = theme.colors.foreground;
  return (
    <View style={{ width: "100%", maxWidth: MAX_WIDTH, alignSelf: "flex-start", gap: space[12] }}>
      <View style={{ flexDirection: "row", gap: space[4], alignSelf: "flex-start", padding: space[4], borderRadius: 999, backgroundColor: theme.colors.surface1 }}>
        <TabPill label="Grid" active={tab === "grid"} onPress={() => setTab("grid")} />
        <TabPill label="Instagram" active={tab === "instagram"} onPress={() => setTab("instagram")} />
      </View>

      {tab === "grid" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[4] }}>
          {images.map((uri, position) => (
            <Pressable
              key={position}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Slide ${position + 1} of ${total}`}
              onPress={() => setViewer(position)}
              style={{ width: "32.4%", aspectRatio: 0.8, overflow: "hidden", borderRadius: space[8], backgroundColor: theme.colors.surface1 }}
            >
              <RefImage src={uri} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
            </Pressable>
          ))}
        </View>
      ) : (
        <Squircle radius={20} style={{ backgroundColor: theme.colors.surface1 }}>
          <View style={{ paddingHorizontal: space[12], paddingVertical: space[12], flexDirection: "row", alignItems: "center", gap: space[12] }}>
            <Avatar uri={typeof props.avatar === "string" ? props.avatar : undefined} name={name} size={40} />
            <Text selectable style={{ flexShrink: 1, color: theme.colors.foreground, fontSize: 15, fontWeight: "600" }} numberOfLines={1}>{handle}</Text>
            <PaseoIcon name="BadgeCheck" size={16} color={VERIFIED_BLUE} />
          </View>

          <View onLayout={onLayout} style={{ width: "100%", aspectRatio: 0.8, backgroundColor: "#000" }}>
            {width > 0 ? (
              <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={32}
                onScroll={onScroll}
                style={{ width, height: "100%" }}
              >
                {images.map((uri, position) => (
                  <Pressable key={position} accessibilityRole="imagebutton" accessibilityLabel={`Slide ${position + 1} of ${total}, open full screen`} onPress={() => setViewer(position)} style={{ width, height: "100%" }}>
                    <RefImage src={uri} resizeMode="cover" style={{ width, height: "100%" }} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            {total > 1 ? (
              <View pointerEvents="none" style={{ position: "absolute", top: space[12], right: space[12], paddingHorizontal: space[12], paddingVertical: space[4], borderRadius: 999, backgroundColor: "rgba(20,20,26,0.72)" }}>
                <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "600" }}>{index + 1}/{total}</Text>
              </View>
            ) : null}
            {total > 1 && index > 0 ? <RoundArrow side="left" onPress={() => goTo(index - 1)} /> : null}
            {total > 1 && index < total - 1 ? <RoundArrow side="right" onPress={() => goTo(index + 1)} /> : null}
          </View>

          <View style={{ paddingHorizontal: space[12], paddingTop: space[12], flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", gap: space[16], alignItems: "center", width: 96 }}>
              <PaseoIcon name="Heart" size={24} color={iconColor} />
              <PaseoIcon name="MessageCircle" size={24} color={iconColor} />
              <PaseoIcon name="Send" size={24} color={iconColor} />
            </View>
            {total > 1 ? (
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                {images.slice(0, 7).map((_, dot) => {
                  // Oltre 7 slide i puntini seguono la posizione compressa (come Instagram).
                  const active = total <= 7 ? dot === index : dot === Math.min(6, Math.round((index / (total - 1)) * 6));
                  return <View key={dot} style={{ width: active ? 7 : 6, height: active ? 7 : 6, borderRadius: 4, backgroundColor: active ? VERIFIED_BLUE : theme.colors.foregroundMuted, opacity: active ? 1 : 0.5 }} />;
                })}
              </View>
            ) : <View />}
            <View style={{ width: 96, alignItems: "flex-end" }}>
              <PaseoIcon name="Bookmark" size={24} color={iconColor} />
            </View>
          </View>

          {caption ? (
            <View style={{ padding: space[12], paddingTop: space[8] }}>
              <Text selectable style={{ color: theme.colors.foreground, fontSize: 14, lineHeight: 20 }}>
                <Text style={{ fontWeight: "700" }}>{handle} </Text>
                {caption}
              </Text>
            </View>
          ) : <View style={{ height: space[12] }} />}
        </Squircle>
      )}

      {viewer !== null && images[viewer] && peekImage(images[viewer]) ? <ImageViewer uri={peekImage(images[viewer]) as string} label={`Slide ${viewer + 1} of ${total}`} onClose={() => setViewer(null)} /> : null}
    </View>
  );
};

export const instagramRenderers: Record<string, Renderer> = { InstagramPost };

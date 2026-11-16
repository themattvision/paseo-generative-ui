import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Modal, Platform, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Icon as PaseoIcon } from "@getpaseo/plugin/client/ui";
import { Squircle } from "../ds/squircle.js";

// Visualizzatore a schermo intero per le foto dei blocchi (16 novembre 2026, richiesta di Matteo: «se tocco
// l'immagine me la apri in una modale che posso zoomare»). Solo `react-native` (il bundle del plugin non può
// importare gesture-handler né reanimated, vedi scripts/check-client-bundle.mjs).
// - iPhone: lo zoom a pizzico è quello NATIVO del ScrollView (min/maxZoomScale), il doppio tocco alterna 1x e 2,5x
//   con `zoomScale`.
// - Web e Android: il ScrollView non zooma da solo, quindi l'immagine cambia dimensione e si scorre con i
//   ScrollView annidati; zoom con i pulsanti più e meno, doppio tocco, e su web anche trackpad (pizzico) e
//   Ctrl o Cmd + rotella.

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const DOUBLE_TAP_ZOOM = 2.5;
const DOUBLE_TAP_MS = 300;
const clamp = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

function RoundButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}>
      <Squircle radius={22} fill={false} style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
        <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <PaseoIcon name={icon} size={22} color="#ffffff" />
        </View>
      </Squircle>
    </Pressable>
  );
}

// Dimensione base: l'immagine intera dentro lo schermo (contain), da cui parte lo zoom.
function useFittedSize(uri: string) {
  const { width, height } = useWindowDimensions();
  const [ratio, setRatio] = useState(1.5);
  useEffect(() => {
    let current = true;
    Image.getSize(
      uri,
      (w, h) => { if (current && w > 0 && h > 0) setRatio(w / h); },
      () => undefined,
    );
    return () => { current = false; };
  }, [uri]);
  const baseWidth = Math.min(width, height * ratio);
  return { width, height, baseWidth, baseHeight: baseWidth / ratio };
}

function useDoubleTap(onDouble: () => void) {
  const last = useRef(0);
  return useCallback(() => {
    const now = Date.now();
    if (now - last.current < DOUBLE_TAP_MS) {
      last.current = 0;
      onDouble();
    } else {
      last.current = now;
    }
  }, [onDouble]);
}

// iPhone: zoom nativo del ScrollView.
function NativeZoomImage({ uri, label }: { uri: string; label: string }) {
  const { width, height, baseWidth, baseHeight } = useFittedSize(uri);
  const [zoom, setZoom] = useState(1);
  const currentZoom = useRef(1);
  // `zoomScale` è una prop controllata: se il valore richiesto è uguale a quello già nello stato (ma il pizzico
  // ha cambiato lo zoom reale) React non la riapplicherebbe, quindi si alterna con una differenza impercettibile.
  const requestZoom = useCallback((target: number) => setZoom((previous) => (previous === target ? target + 0.0001 : target)), []);
  const onTap = useDoubleTap(useCallback(() => requestZoom(currentZoom.current > 1.05 ? 1 : DOUBLE_TAP_ZOOM), [requestZoom]));
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ width, height, alignItems: "center", justifyContent: "center" }}
      minimumZoomScale={MIN_ZOOM}
      maximumZoomScale={MAX_ZOOM}
      zoomScale={zoom}
      bouncesZoom
      centerContent
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={32}
      onScroll={(event) => { currentZoom.current = event.nativeEvent.zoomScale ?? 1; }}
    >
      <Pressable onPress={onTap}>
        <Image source={{ uri }} accessibilityLabel={label} resizeMode="contain" style={{ width: baseWidth, height: baseHeight }} />
      </Pressable>
    </ScrollView>
  );
}

// Web e Android: zoom con dimensione dell'immagine e scorrimento nativo dei due ScrollView annidati.
function ScaledImage({ uri, label, scale, onScale }: { uri: string; label: string; scale: number; onScale: (next: number) => void }) {
  const { width, height, baseWidth, baseHeight } = useFittedSize(uri);
  const area = useRef<View>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const onTap = useDoubleTap(useCallback(() => onScale(scaleRef.current > 1.05 ? 1 : DOUBLE_TAP_ZOOM), [onScale]));

  // Trackpad (pizzico = rotella con ctrlKey) e Ctrl o Cmd + rotella: solo su web, e senza passive per poter
  // bloccare lo zoom della pagina.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    type WebTarget = { addEventListener: (type: string, listener: (event: WheelLike) => void, options?: unknown) => void; removeEventListener: (type: string, listener: (event: WheelLike) => void) => void };
    type WheelLike = { ctrlKey: boolean; metaKey: boolean; deltaY: number; preventDefault: () => void };
    const element = area.current as unknown as WebTarget | null;
    if (!element) return;
    const onWheel = (event: WheelLike) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      onScale(clamp(scaleRef.current * Math.exp(-event.deltaY * 0.01)));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [onScale]);

  return (
    <View ref={area} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={scale > 1.05}>
        <ScrollView
          horizontal
          style={{ minHeight: height }}
          contentContainerStyle={{ minWidth: width, minHeight: height, alignItems: "center", justifyContent: "center" }}
          showsHorizontalScrollIndicator={scale > 1.05}
        >
          <Pressable onPress={onTap}>
            <Image
              source={{ uri }}
              accessibilityLabel={label}
              resizeMode="contain"
              style={{ width: baseWidth * scale, height: baseHeight * scale }}
            />
          </Pressable>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

export function ImageViewer({ uri, label, onClose }: { uri: string; label: string; onClose: () => void }) {
  const isIos = Platform.OS === "ios";
  const [scale, setScale] = useState(1);
  const zoomBy = (factor: number) => setScale((value) => clamp(value * factor));
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        {isIos ? <NativeZoomImage uri={uri} label={label} /> : <ScaledImage uri={uri} label={label} scale={scale} onScale={setScale} />}
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: isIos ? 56 : 16, paddingHorizontal: 16, alignItems: "flex-end" }}
        >
          <RoundButton icon="X" label="Chiudi immagine" onPress={onClose} />
        </View>
        {isIos ? null : (
          <View
            pointerEvents="box-none"
            style={{ position: "absolute", bottom: 24, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 12 }}
          >
            <RoundButton icon="Minus" label="Riduci" onPress={() => zoomBy(1 / 1.6)} />
            <RoundButton icon="Maximize" label="Adatta allo schermo" onPress={() => setScale(1)} />
            <RoundButton icon="Plus" label="Ingrandisci" onPress={() => zoomBy(1.6)} />
          </View>
        )}
      </View>
    </Modal>
  );
}

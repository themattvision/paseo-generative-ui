import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { Icon as PaseoIcon } from "@getpaseo/plugin/client/ui";
import { space } from "../ds/tokens.js";
import { useUi, type Renderer } from "./base.js";

// Un solo pulsante apri/chiudi (richiesta di Matteo, 25 novembre 2026: «quando è aperto diventa chiudi, quando è
// chiuso apri, con un fade o un collapsible smooth»). Prima l'agente usava due Button con @Set su una $variabile:
// due pulsanti, contenuto che compare di colpo. Ora uno stato locale e un solo valore animato (progress, 0..1) che
// guida altezza, dissolvenza e rotazione della freccia. L'altezza vera del contenuto si misura con onLayout su un
// involucro assoluto (resta misurabile anche da chiuso): l'involucro esterno la anima con overflow nascosto.
const DURATION_MS = 280;
const CHEVRON_ROTATION = ["0deg", "180deg"];

const Collapsible: Renderer = ({ props, renderNode }) => {
  const { theme } = useUi();
  const [open, setOpen] = useState(props.defaultOpen === true);
  const [measured, setMeasured] = useState(0);
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const first = useRef(true);

  useEffect(() => {
    // Nessuna animazione al primo disegno: parte già nello stato giusto (defaultOpen).
    if (first.current) { first.current = false; return; }
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // l'altezza non si anima con il driver nativo
    }).start();
  }, [open, progress]);

  const height = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(measured, 0)] });
  // La dissolvenza parte un po' dopo l'inizio dell'apertura e finisce prima della fine, così il testo non si
  // vede tagliato a metà mentre l'altezza cresce.
  const opacity = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: CHEVRON_ROTATION });
  const label = String(open ? props.closeLabel : props.openLabel);

  return (
    <View style={{ width: "100%" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={label}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => ({ minHeight: 44, alignSelf: "flex-start", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: space[8] }}>
          <Text style={{ color: theme.colors.foreground, fontSize: 15, fontWeight: "600" }}>{label}</Text>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <PaseoIcon name="ChevronDown" size={18} color={theme.colors.foreground} />
          </Animated.View>
        </View>
      </Pressable>
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? "auto" : "no-hide-descendants"}
        style={{ height, opacity, overflow: "hidden" }}
      >
        <View
          // Assoluto: la sua altezza naturale non dipende da quella animata dell'involucro.
          style={{ position: "absolute", top: 0, left: 0, right: 0 }}
          onLayout={(event) => {
            const next = Math.round(event.nativeEvent.layout.height);
            setMeasured((previous) => (previous === next ? previous : next));
          }}
        >
          <View style={{ paddingTop: space[8], gap: space[8] }}>{renderNode(props.children)}</View>
        </View>
      </Animated.View>
    </View>
  );
};

export const collapsibleRenderers: Record<string, Renderer> = { Collapsible };

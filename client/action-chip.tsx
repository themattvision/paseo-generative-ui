import type { PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { Icon as PaseoIcon } from "@getpaseo/plugin/client/ui";
import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import type { ActionChipData } from "../shared/action-chip.js";
import { Squircle } from "./ds/squircle.js";
import { space } from "./ds/tokens.js";

// Un messaggio appena inviato entra con una molla; quelli della cronologia compaiono fermi.
const FRESH_MS = 5000;

// Al posto del testo tecnico «[Azione UI] ...» mostra il bottone che l'utente ha premuto, a destra come un suo messaggio.
export function ActionChip({ item, theme, timestamp }: PluginTimelineItemProps<ActionChipData>) {
  const fresh = Date.now() - timestamp.getTime() < FRESH_MS;
  const progress = useRef(new Animated.Value(fresh ? 0 : 1)).current;
  useEffect(() => {
    if (!fresh) return;
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 9 }).start();
  }, [fresh, progress]);
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const opacity = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });
  return (
    <View style={{ width: "100%", alignItems: "flex-end", paddingVertical: space[4] }}>
      <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
        <Squircle radius={22} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: space[16], backgroundColor: theme.colors.foreground }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space[8] }}>
            <PaseoIcon name="Check" size={18} color={theme.colors.surface0} />
            <Text style={{ color: theme.colors.surface0, fontSize: 15, fontWeight: "600" }}>{item.data.label}</Text>
          </View>
        </Squircle>
      </Animated.View>
    </View>
  );
}

import type { PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { useMemo } from "react";
import { Text, View } from "react-native";
import type { GenerativeUiData } from "../shared/generative-ui.js";

export function GenerativeUiItem({ item, theme, layout }: PluginTimelineItemProps<GenerativeUiData>) {
  const spec = useMemo(() => JSON.stringify(item.data.spec, null, 2), [item.data.spec]);
  const compact = layout.compact;
  const styles = useMemo(
    () => ({
      card: {
        gap: compact ? 8 : 16,
        padding: compact ? 12 : 24,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
      },
      title: { color: theme.colors.foreground, fontSize: 16, fontWeight: "600" as const },
      label: { color: theme.colors.foregroundMuted, fontSize: 12 },
      spec: { color: theme.colors.foreground, fontFamily: "monospace", fontSize: 12, lineHeight: 16 },
    }),
    [compact, theme],
  );
  return (
    <View style={styles.card}>
      {item.data.title ? <Text style={styles.title}>{item.data.title}</Text> : null}
      <Text style={styles.label}>Spec</Text>
      <Text style={styles.spec}>{spec}</Text>
    </View>
  );
}

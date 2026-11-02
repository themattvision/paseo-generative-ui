import type { PluginTheme } from "@getpaseo/plugin";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import type { Action } from "../../shared/spec.js";
import { ink, matteoYellow, space } from "./tokens.js";
import { Squircle } from "./squircle.js";

export type UiContext = { theme: PluginTheme; compact: boolean; agentId: string; onAction: (event: Action & { agentId: string }) => void };

export function UiText({ children, variant = "body", context }: { children: string; variant?: "title" | "heading" | "body" | "caption" | "mono"; context: UiContext }) {
  const { theme, compact } = context;
  const styles = useMemo(() => {
    const title = variant === "title";
    const heading = variant === "heading";
    const caption = variant === "caption";
    const mono = variant === "mono";
    return {
      color: caption ? theme.colors.foregroundMuted : theme.colors.foreground,
      fontSize: title ? (compact ? 24 : 32) : heading ? (compact ? 18 : 21) : caption ? 12 : mono ? 12 : compact ? 14 : 15,
      lineHeight: title ? (compact ? 27 : 36) : heading ? (compact ? 22 : 25) : caption ? 16 : mono ? 18 : compact ? 20 : 23,
      letterSpacing: title || heading ? -0.4 : 0,
      fontWeight: title || heading ? "700" as const : caption ? "500" as const : "400" as const,
      fontFamily: mono ? "monospace" : undefined,
    };
  }, [compact, theme, variant]);
  return <Text style={styles}>{children}</Text>;
}

export function Card({ title, tone = "default", children, context }: { title?: string; tone?: "default" | "accent"; children: React.ReactNode; context: UiContext }) {
  const { theme, compact } = context;
  return (
    <Squircle
      radius={24}
      style={{ backgroundColor: theme.colors.surface1, borderColor: tone === "accent" ? theme.colors.accent : theme.colors.border, borderWidth: 1 }}
    >
      <View style={{ gap: compact ? space[8] : space[12], padding: compact ? space[12] : space[16] }}>
        {title ? <UiText variant="heading" context={context}>{title}</UiText> : null}
        {children}
      </View>
    </Squircle>
  );
}

export function UiButton({ label, variant, action, disabled, context }: { label: string; variant: "primary" | "secondary" | "ghost"; action: Action; disabled: boolean; context: UiContext }) {
  const { theme, compact, onAction } = context;
  const backgroundColor = variant === "primary" ? theme.colors.foreground : variant === "secondary" ? theme.colors.surface2 : "transparent";
  const borderColor = variant === "ghost" ? "transparent" : variant === "primary" ? theme.colors.foreground : theme.colors.border;
  const color = variant === "primary" ? theme.colors.surface0 : theme.colors.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onAction({ ...action, agentId: context.agentId })}
      style={({ pressed }) => ({ width: compact ? "100%" : undefined, opacity: disabled ? 0.42 : pressed ? 0.78 : 1 })}
    >
      <Squircle radius={18} style={{ backgroundColor, borderColor, borderWidth: variant === "ghost" ? 0 : 1 }}>
        <View style={{ minHeight: 44, paddingHorizontal: space[16], paddingVertical: compact ? space[8] : space[12], alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color, fontSize: 14, fontWeight: "700", lineHeight: 18 }}>{label}</Text>
        </View>
      </Squircle>
    </Pressable>
  );
}

export function Badge({ label, context }: { label: string; context: UiContext }) {
  return (
    <Squircle fill={false} radius={16} style={{ backgroundColor: ink }}>
      <View style={{ paddingHorizontal: space[8], paddingVertical: space[4] }}><Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "700", lineHeight: 16 }}>{label}</Text></View>
    </Squircle>
  );
}

export function CheckGlyph({ status = "complete", context }: { status?: "complete" | "pending" | "attention"; context: UiContext }) {
  const glyph = status === "complete" ? "✓" : status === "attention" ? "!" : "·";
  return (
    <View accessibilityLabel={status} style={{ width: 24, height: 24, borderRadius: 12, borderCurve: "continuous", backgroundColor: ink, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: matteoYellow, fontWeight: "800", fontSize: 14, lineHeight: 17 }}>{glyph}</Text>
    </View>
  );
}

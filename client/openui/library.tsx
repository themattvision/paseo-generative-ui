import { useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { rememberPressedLabel } from "../pressed.js";
import { createLibrary, defineComponent, useTriggerAction } from "./react-lang";
import { openUiComponentDefs } from "../../shared/openui-signatures.js";
import { Squircle } from "../ds/squircle.js";
import { space, matteoYellow } from "../ds/tokens.js";
import { OpenUiContext, useUi, type Renderer } from "./base.js";
import { contentRenderers } from "./content.js";
import { controlRenderers } from "./controls.js";
import { lucideName, mediaRenderers } from "./media.js";
import { Icon as PaseoIcon } from "@getpaseo/plugin/client/ui";

export { OpenUiContext };

const alignMap = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" } as const;
const gapOf = (value: number | undefined, fallback: number) => (value ?? fallback) as number;

const Col: Renderer = ({ props, renderNode }) => (
  <View style={{ width: "100%", gap: gapOf(props.gap, useUi().compact ? space[8] : space[16]), alignItems: alignMap[props.align as keyof typeof alignMap] ?? "stretch" }}>
    {renderNode(props.children)}
  </View>
);

const Row: Renderer = ({ props, renderNode }) => {
  const { compact } = useUi();
  const justify = props.justify === "between" ? "space-between" : props.justify === "end" ? "flex-end" : props.justify === "center" ? "center" : "flex-start";
  return (
    <View style={{ width: "100%", flexDirection: "row", flexWrap: props.wrap || compact ? "wrap" : "nowrap", gap: gapOf(props.gap, space[8]), alignItems: alignMap[props.align as keyof typeof alignMap] ?? "center", justifyContent: justify }}>
      {renderNode(props.children)}
    </View>
  );
};

const Card: Renderer = ({ props, renderNode }) => {
  const context = useUi();
  const soft = props.variant === "soft";
  return (
    // Nessun bordo: la card è un riempimento morbido (soft più marcato), come nel riferimento open-intelligent-ui.
    <Squircle radius={20} style={{ backgroundColor: soft ? context.theme.colors.surface2 : context.theme.colors.surface1 }}>
      <View style={{ padding: gapOf(props.padding, context.compact ? space[12] : space[16]), gap: gapOf(props.gap, space[8]) }}>
        {renderNode(props.children)}
      </View>
    </Squircle>
  );
};

const titleSize = { sm: 16, md: 20, lg: 24, xl: 30, "2xl": 40, "3xl": 52 } as const;

const Title: Renderer = ({ props }) => {
  const context = useUi();
  const size = titleSize[props.size as keyof typeof titleSize] ?? 24;
  return <Text accessibilityRole="header" style={{ color: context.theme.colors.foreground, fontSize: size, lineHeight: Math.round(size * 1.1), fontWeight: "600", letterSpacing: -size * 0.02 }}>{props.text}</Text>;
};

const Text_: Renderer = ({ props, renderNode }) => {
  const context = useUi();
  const size = props.size === "xs" ? 12 : props.size === "sm" ? 14 : props.size === "lg" ? 18 : 16;
  const content = typeof props.text === "string" ? props.text : renderNode(props.text);
  return <Text numberOfLines={props.maxLines} style={{ color: context.theme.colors.foreground, fontSize: size, lineHeight: Math.round(size * 1.45), fontWeight: props.weight === "semibold" ? "600" : props.weight === "medium" ? "500" : "400", fontStyle: props.italic ? "italic" : "normal", textDecorationLine: props.lineThrough ? "line-through" : "none" }}>{content}</Text>;
};

const Caption: Renderer = ({ props }) => {
  const context = useUi();
  return <Text style={{ color: context.theme.colors.foregroundMuted, fontSize: 12, lineHeight: 17 }}>{props.text}</Text>;
};

const badgeTone: Record<string, string> = {
  neutral: "foregroundMuted", info: "accent", success: "statusSuccess", warning: "statusWarning", danger: "statusDanger", purple: "accent", pink: "accent",
};

const Badge: Renderer = ({ props }) => {
  const context = useUi();
  const tone = (context.theme.colors as Record<string, string>)[badgeTone[props.color ?? "neutral"] ?? "foregroundMuted"];
  return (
    <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: space[4], paddingHorizontal: space[8], paddingVertical: space[4], borderRadius: 999, backgroundColor: context.theme.colors.surface2 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone }} />
      <Text style={{ color: context.theme.colors.foreground, fontSize: 12, fontWeight: "500" }}>{props.text}</Text>
    </View>
  );
};

const Button: Renderer = ({ props }) => {
  const context = useUi();
  const trigger = useTriggerAction();
  const solid = props.variant === "solid" || props.variant === undefined;
  const tinted = props.variant === "soft" || props.variant === "outline";
  const labelColor = solid ? context.theme.colors.surface0 : context.theme.colors.foreground;
  // Feedback di pressione: il bottone si schiaccia con una molla e torna su al rilascio.
  const scale = useRef(new Animated.Value(1)).current;
  const springTo = (value: number) => Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 60, bounciness: value < 1 ? 0 : 10 }).start();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: props.disabled === true }}
      disabled={props.disabled}
      onPressIn={() => springTo(0.94)}
      onPressOut={() => springTo(1)}
      onPress={() => { rememberPressedLabel(String(props.label)); trigger(props.label, undefined, props.action); }}
      style={{ minHeight: 44, alignSelf: props.block ? "stretch" : "flex-start", opacity: props.disabled ? 0.4 : 1 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
      <Squircle radius={22} fill={props.block === true} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: space[16], backgroundColor: solid ? context.theme.colors.foreground : tinted ? context.theme.colors.surface2 : "transparent" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space[8] }}>
          {props.icon ? <PaseoIcon name={lucideName(String(props.icon))} size={18} color={labelColor} /> : null}
          <Text style={{ textAlign: "center", color: labelColor, fontSize: 15, fontWeight: "600" }}>{props.label}</Text>
        </View>
      </Squircle>
      </Animated.View>
    </Pressable>
  );
};

const Table: Renderer = ({ props }) => {
  const context = useUi();
  const columns: string[] = props.columns ?? [];
  const rows: unknown[][] = props.rows ?? [];
  const cell = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value) : "");
  // Su telefono le colonne strette spezzano il testo: ogni riga diventa un blocco con il primo valore come titolo.
  if (context.compact && columns.length > 2) {
    return (
      <View style={{ width: "100%" }}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={{ paddingVertical: space[12], gap: space[4], borderTopWidth: rowIndex === 0 ? 0 : 1, borderColor: context.theme.colors.border }}>
            <Text style={{ color: context.theme.colors.foreground, fontSize: 16, lineHeight: 23, fontWeight: "600" }}>{cell(row[0])}</Text>
            {columns.slice(1).map((column, offset) => (
              <Text key={offset} style={{ color: context.theme.colors.foregroundMuted, fontSize: 14, lineHeight: 20 }}>
                {column}: <Text style={{ color: context.theme.colors.foreground }}>{cell(row[offset + 1])}</Text>
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={{ width: "100%" }}>
      <View style={{ flexDirection: "row" }}>
        {columns.map((column, index) => (
          <Text key={index} style={{ flex: 1, paddingVertical: space[8], paddingRight: space[8], color: context.theme.colors.foregroundMuted, fontSize: 12, fontWeight: "600" }}>{column}</Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: "row", borderTopWidth: 1, borderColor: context.theme.colors.border }}>
          {columns.map((_, cellIndex) => (
            <Text key={cellIndex} style={{ flex: 1, paddingVertical: space[12], paddingRight: space[8], color: context.theme.colors.foreground, fontSize: 14 }}>{cell(row[cellIndex])}</Text>
          ))}
        </View>
      ))}
    </View>
  );
};

// Grafico a barre e a linee solo con View (niente react-native-svg nel runtime plugin).
const Chart: Renderer = ({ props }) => {
  const context = useUi();
  const data: Record<string, string | number>[] = props.data ?? [];
  const series: string[] = props.series ?? Object.keys(data[0] ?? {}).filter((key) => key !== props.x && typeof data[0]?.[key] === "number");
  const max = Math.max(1, ...data.flatMap((row) => series.map((key) => Number(row[key]) || 0)));
  const height = props.height ?? 160;
  if (props.type !== "bar" && props.type !== "line") {
    return <Text style={{ color: context.theme.colors.foregroundMuted, fontSize: 12 }}>Grafico {props.type} non ancora disponibile nel plugin.</Text>;
  }
  return (
    <View style={{ width: "100%", height, flexDirection: "row", alignItems: "flex-end", gap: space[8] }}>
      {data.map((row, index) => (
        <View key={index} style={{ flex: 1, height: "100%", justifyContent: "flex-end", gap: space[4] }}>
          <View style={{ height: `${Math.round(((Number(row[series[0]]) || 0) / max) * 100)}%`, borderRadius: 8, backgroundColor: context.theme.colors.accent, minHeight: 2 }} />
          <Text numberOfLines={1} style={{ color: context.theme.colors.foregroundMuted, fontSize: 11 }}>{String(row[props.x ?? "x"] ?? "")}</Text>
        </View>
      ))}
    </View>
  );
};

// Accento giallo solo come bordo sottile sul primo blocco, mai pieno.
export const accentRule = matteoYellow;

const renderers: Record<string, Renderer> = {
  Col, Row, Card, Title, Text: Text_, Caption, Badge, Button, Table, Chart, ...contentRenderers, ...controlRenderers, ...mediaRenderers,
};

export const openUiLibrary = createLibrary({
  components: openUiComponentDefs.map((def) =>
    defineComponent({ name: def.name, description: def.description, props: def.props, component: renderers[def.name] }),
  ),
});

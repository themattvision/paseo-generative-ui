import { createContext, useContext, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { createLibrary, defineComponent, useTriggerAction, type ComponentRenderProps } from "@openuidev/react-lang";
import { openUiComponentDefs } from "../../shared/openui-signatures.js";
import type { UiContext } from "../ds/components.js";
import { space, matteoYellow } from "../ds/tokens.js";

// Contesto del blocco (tema, compatto, invio azioni): i componenti React Native lo leggono qui.
export const OpenUiContext = createContext<UiContext | null>(null);

function useUi(): UiContext {
  const context = useContext(OpenUiContext);
  if (!context) throw new Error("OpenUiContext mancante.");
  return context;
}

type Props = ComponentRenderProps<Record<string, any>>;
type Renderer = (props: Props) => ReactNode;

const alignMap = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" } as const;
const gapOf = (value: number | undefined, fallback: number) => (value ?? fallback) as number;

const Col: Renderer = ({ props, renderNode }) => (
  <View style={{ width: "100%", gap: gapOf(props.gap, useUi().compact ? space[8] : space[16]), alignItems: alignMap[props.align as keyof typeof alignMap] ?? "stretch" }}>
    {renderNode(props.children)}
  </View>
);

const Row: Renderer = ({ props, renderNode }) => {
  const justify = props.justify === "between" ? "space-between" : props.justify === "end" ? "flex-end" : props.justify === "center" ? "center" : "flex-start";
  return (
    <View style={{ width: "100%", flexDirection: useUi().compact ? "column" : "row", flexWrap: props.wrap ? "wrap" : "nowrap", gap: gapOf(props.gap, space[8]), alignItems: alignMap[props.align as keyof typeof alignMap] ?? "center", justifyContent: justify }}>
      {renderNode(props.children)}
    </View>
  );
};

const Card: Renderer = ({ props, renderNode }) => {
  const context = useUi();
  const soft = props.variant === "soft";
  return (
    <View style={{ width: "100%", padding: gapOf(props.padding, context.compact ? space[12] : space[16]), gap: gapOf(props.gap, space[8]), borderRadius: 20, borderWidth: soft ? 0 : 1, borderColor: context.theme.colors.border, backgroundColor: soft ? context.theme.colors.surface1 : context.theme.colors.surface0 }}>
      {renderNode(props.children)}
    </View>
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
    <View style={{ alignSelf: "flex-start", paddingHorizontal: space[8], paddingVertical: space[4], borderRadius: 999, borderWidth: 1, borderColor: tone, backgroundColor: context.theme.colors.surface2 }}>
      <Text style={{ color: context.theme.colors.foreground, fontSize: 12, fontWeight: "500" }}>{props.text}</Text>
    </View>
  );
};

const Button: Renderer = ({ props }) => {
  const context = useUi();
  const trigger = useTriggerAction();
  const solid = props.variant !== "outline" && props.variant !== "ghost";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled}
      onPress={() => trigger(props.label, undefined, props.action)}
      style={{ minHeight: 44, alignSelf: props.block ? "stretch" : "flex-start", justifyContent: "center", paddingHorizontal: space[16], borderRadius: 999, borderWidth: solid ? 0 : 1, borderColor: context.theme.colors.border, backgroundColor: solid ? context.theme.colors.foreground : "transparent", opacity: props.disabled ? 0.4 : 1 }}
    >
      <Text style={{ color: solid ? context.theme.colors.surface0 : context.theme.colors.foreground, fontSize: 15, fontWeight: "600" }}>{props.label}</Text>
    </Pressable>
  );
};

const Table: Renderer = ({ props }) => {
  const context = useUi();
  const columns: string[] = props.columns ?? [];
  const rows: unknown[][] = props.rows ?? [];
  const cell = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value) : "");
  return (
    <View style={{ width: "100%", borderWidth: 1, borderColor: context.theme.colors.border, borderRadius: 16, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", backgroundColor: context.theme.colors.surface1 }}>
        {columns.map((column, index) => (
          <Text key={index} style={{ flex: 1, padding: space[8], color: context.theme.colors.foregroundMuted, fontSize: 12, fontWeight: "600" }}>{column}</Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: "row", borderTopWidth: 1, borderColor: context.theme.colors.border }}>
          {columns.map((_, cellIndex) => (
            <Text key={cellIndex} style={{ flex: 1, padding: space[8], color: context.theme.colors.foreground, fontSize: 14 }}>{cell(row[cellIndex])}</Text>
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

const renderers: Record<string, Renderer> = { Col, Row, Card, Title, Text: Text_, Caption, Badge, Button, Table, Chart };

export const openUiLibrary = createLibrary({
  components: openUiComponentDefs.map((def) =>
    defineComponent({ name: def.name, description: def.description, props: def.props, component: renderers[def.name] }),
  ),
});

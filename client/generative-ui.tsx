import type { PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { useEffect, useMemo, useState } from "react";
import { Platform, Text, View } from "react-native";
import { openExternal } from "./web";
import { usePaseo } from "@getpaseo/plugin/client";
import { DocumentFrame, useToast } from "@getpaseo/plugin/client/ui";
import { Renderer } from "./openui/react-lang";
import type { GenerativeUiData } from "../shared/generative-ui.js";
import { OpenUiContext, openUiLibrary } from "./openui/library.js";
import { parseKnownNode, type Action, type KnownSpecNode, type SpecNode, validateSpec } from "../shared/spec.js";
import { actionMessage } from "../shared/action.js";
import { takePressedLabel } from "./pressed.js";
import { documentHtml } from "../shared/html.js";
import { Badge, Card, CheckGlyph, UiButton, UiText, type UiContext } from "./ds/components.js";
import { Squircle } from "./ds/squircle.js";
import { ink, matteoYellow, space } from "./ds/tokens.js";
import { DataTable, Chart } from "./data-views.js";
import { Form } from "./forms.js";

export type GenerativeUiRendererProps = PluginTimelineItemProps<GenerativeUiData>;

export function GenerativeUiItem({ item, theme, layout, agentId }: GenerativeUiRendererProps) {
  const toast = useToast();
  const paseo = usePaseo();
  const context = useMemo<UiContext>(() => ({
    theme,
    compact: layout.compact,
    agentId,
    rowId: item.data.rowId ?? "riga-senza-id",
    title: item.data.title,
    onAction: async (event) => {
      try {
        await paseo.agents.ref(agentId).send(actionMessage(event, item.data.rowId ?? "riga-senza-id", item.data.title, takePressedLabel()));
        // Niente toast di conferma: il feedback è il chip del bottone premuto che compare nella timeline.
      } catch (error) {
        toast.show("Invio non riuscito. Puoi riprovare.", { variant: "error" });
        throw error;
      }
    },
  }), [agentId, item.data.rowId, item.data.title, layout.compact, paseo, theme, toast]);
  if (item.data.openui !== undefined) return <OpenUiBlock title={item.data.title} openui={item.data.openui} context={context} />;
  if (item.data.spec === undefined) return null;
  return <GenerativeUiBlock title={item.data.title} spec={item.data.spec} context={context} />;
}

// Blocco OpenUI Lang: stesso involucro del formato classico, contenuto dalla libreria client/openui/library.tsx.
function OpenUiBlock({ title, openui, context }: { title?: string; openui: string; context: UiContext }) {
  // Nessun involucro: il contenuto sta direttamente nella chat, come nel riferimento open-intelligent-ui.
  const toast = useToast();
  return (
    <View style={{ width: "100%", paddingVertical: space[8], gap: context.compact ? space[8] : space[16] }}>
      {title && !openui.includes(JSON.stringify(title)) ? <UiText variant="heading" context={context}>{title}</UiText> : null}
      <OpenUiContext.Provider value={context}>
          <Renderer
            response={openui}
            library={openUiLibrary}
            onAction={(event) => {
              // Stesso canale delle azioni classiche: il messaggio torna all'agente nella stessa chat.
              if (event.type === "open_url") {
                // Link esterno: apertura diretta, nessun messaggio all'agente. Stesso helper del pulsante del saluto
                // (window.open sul web, Linking altrove). L'errore non si ingoia: toast visibile.
                const url = String(event.params.url ?? "");
                if (!/^https?:\/\//i.test(url)) {
                  toast.show("Link non valido", { variant: "error" });
                  return;
                }
                openExternal(url).catch(() => toast.show("Non sono riuscito ad aprire il link", { variant: "error" }));
                return;
              }
              if (event.type === "continue_conversation") {
                void context.onAction({ id: "openui", once: true, agentId: context.agentId, payload:{ messaggio: event.humanFriendlyMessage, valori: event.formState ?? {} } });
              }
            }}
          />
      </OpenUiContext.Provider>
    </View>
  );
}

export function GenerativeUiBlock({ title, spec, context }: { title?: string; spec: SpecNode; context: UiContext }) {
  const validation = validateSpec(spec);
  const padding = context.compact ? space[12] : space[24];
  return (
    <Squircle radius={28} style={{ backgroundColor: context.theme.colors.surface0, borderColor: context.theme.colors.border, borderWidth: 1 }}>
      <View style={{ padding, gap: context.compact ? space[8] : space[16] }}>
        {title ? <UiText variant="heading" context={context}>{title}</UiText> : null}
        {!validation.ok ? <SpecProblem message={validation.message} context={context} /> : <RenderNode node={spec} context={context} />}
      </View>
    </Squircle>
  );
}

function RenderNode({ node, context }: { node: SpecNode; context: UiContext }) {
  const known = parseKnownNode(node);
  if (!known) return <SpecProblem message={`Componente non supportato: ${node.type}`} context={context} />;
  return <KnownNode node={known} context={context} />;
}

function KnownNode({ node, context }: { node: KnownSpecNode; context: UiContext }) {
  switch (node.type) {
    case "stack": {
      const alignItems = node.align === "start" ? "flex-start" : node.align === "end" ? "flex-end" : node.align === "center" ? "center" : "stretch";
      return <View style={{ width: "100%", alignSelf: "stretch", flexDirection: node.direction === "horizontal" && !context.compact ? "row" : "column", flexWrap: node.direction === "horizontal" && !context.compact ? "wrap" : "nowrap", gap: node.gap, alignItems }}>{node.children.map((child, index) => <RenderNode key={index} node={child} context={context} />)}</View>;
    }
    case "text": return <UiText variant={node.variant} context={context}>{node.text}</UiText>;
    case "card": return <Card title={node.title} tone={node.tone} context={context}>{node.children.map((child, index) => <RenderNode key={index} node={child} context={context} />)}</Card>;
    case "stat": return <Stat node={node} context={context} />;
    case "callout": return <Callout node={node} context={context} />;
    case "list": return <List node={node} context={context} />;
    case "badge": return <Badge label={node.label} context={context} />;
    case "button": return <UiButton {...node} context={context} />;
    case "divider": return <View accessibilityRole="none" style={{ height: 1, width: "100%", backgroundColor: context.theme.colors.border }} />;
    case "progress": return <Progress node={node} context={context} />;
    case "table": return <DataTable node={node} context={context} />;
    case "chart": return <Chart node={node} context={context} />;
    case "html": return <Html node={node} context={context} />;
    case "form": return <Form node={node} context={context} />;
    case "input":
    case "select":
    case "multiselect":
    case "switch":
    case "slider":
    case "radio": return <SpecProblem message={`Il campo ${node.type} deve stare dentro un form.`} context={context} />;
  }
}

function Html({ node, context }: { node: Extract<KnownSpecNode, { type: "html" }>; context: UiContext }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const blob = new Blob([documentHtml(node.html, context.theme.colors.foreground, context.theme.colors.surface0)], { type: "text/html", lastModified: Date.now() });
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [context.theme.colors.foreground, context.theme.colors.surface0, node.html]);
  if (Platform.OS !== "web") return <SpecProblem message="L’HTML libero è disponibile nel client web. Su mobile questo runtime non espone una scrittura file locale sicura." context={context} />;
  if (!url) return <View style={{ height: node.height }} />;
  return <View style={{ height: node.height, width: "100%", overflow: "hidden", borderRadius: 16 }}><DocumentFrame url={url} testID="generative-ui-html" /></View>;
}

function Stat({ node, context }: { node: Extract<KnownSpecNode, { type: "stat" }>; context: UiContext }) {
  const deltaColor = node.trend === "up" ? context.theme.colors.statusSuccess : node.trend === "down" ? context.theme.colors.statusDanger : context.theme.colors.foregroundMuted;
  const mark = node.trend === "up" ? "↑" : node.trend === "down" ? "↓" : "•";
  return <Card context={context}><View style={{ gap: space[4] }}><UiText variant="caption" context={context}>{node.label}</UiText><UiText variant="title" context={context}>{node.value}</UiText>{node.delta ? <Text style={{ color: deltaColor, fontSize: 13, fontWeight: "700" }}>{mark} {node.delta}</Text> : null}</View></Card>;
}

function Callout({ node, context }: { node: Extract<KnownSpecNode, { type: "callout" }>; context: UiContext }) {
  const color = node.tone === "success" ? context.theme.colors.statusSuccess : node.tone === "warning" ? context.theme.colors.statusWarning : node.tone === "danger" ? context.theme.colors.statusDanger : context.theme.colors.accent;
  return <Squircle radius={20} style={{ backgroundColor: context.theme.colors.surface1, borderColor: color, borderWidth: 1 }}><View style={{ padding: context.compact ? space[12] : space[16], gap: space[4], borderLeftWidth: 3, borderLeftColor: color }}><UiText variant="heading" context={context}>{node.title}</UiText><UiText context={context}>{node.text}</UiText></View></Squircle>;
}

function List({ node, context }: { node: Extract<KnownSpecNode, { type: "list" }>; context: UiContext }) {
  return <View style={{ width: "100%", gap: space[8] }}>{node.items.map((item, index) => <View key={`${item.title}-${index}`} style={{ flexDirection: "row", alignItems: "flex-start", gap: space[8], paddingVertical: space[4] }}><CheckGlyph status={item.status} context={context} /><View style={{ flex: 1, gap: space[4] }}><UiText variant="body" context={context}>{item.icon ? `${item.icon} ${item.title}` : item.title}</UiText>{item.description ? <UiText variant="caption" context={context}>{item.description}</UiText> : null}</View></View>)}</View>;
}

function Progress({ node, context }: { node: Extract<KnownSpecNode, { type: "progress" }>; context: UiContext }) {
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: node.value }} style={{ gap: space[4], width: "100%" }}>{node.label ? <UiText variant="caption" context={context}>{node.label}</UiText> : null}<View style={{ height: 8, width: "100%", overflow: "hidden", borderRadius: 4, backgroundColor: context.theme.colors.surface2 }}><View style={{ height: "100%", width: `${node.value}%`, backgroundColor: ink, borderRightWidth: 2, borderRightColor: matteoYellow }} /></View></View>;
}

function SpecProblem({ message, context }: { message: string; context: UiContext }) {
  return <View style={{ padding: space[12], backgroundColor: context.theme.colors.surface2, borderLeftWidth: 2, borderLeftColor: context.theme.colors.statusWarning, gap: space[4] }}><Text style={{ color: context.theme.colors.foreground, fontSize: 13, fontWeight: "700" }}>Spec non visualizzabile</Text><Text style={{ color: context.theme.colors.foregroundMuted, fontSize: 13, lineHeight: 18 }}>{message}</Text></View>;
}

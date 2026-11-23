import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { useMemo, useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { useToast } from "@getpaseo/plugin/client/ui";
import type { SpecNode } from "../shared/spec.js";
import { GenerativeUiBlock } from "./generative-ui.js";
import type { UiContext } from "./ds/components.js";
import { space } from "./ds/tokens.js";

const gallerySpec: SpecNode = {
  type: "stack", gap: 24, children: [
    { type: "text", variant: "title", text: "Essential catalog" },
    { type: "text", variant: "body", text: "Every block follows the Paseo theme and stays readable in compact mode." },
    { type: "stack", direction: "horizontal", gap: 12, children: [
      { type: "stat", label: "Interfaces viewed", value: "24", delta: "+12%", trend: "up" },
      { type: "stat", label: "Status", value: "Stable", delta: "No waiting", trend: "flat" },
    ] },
    { type: "card", title: "Today's plan", tone: "accent", children: [
      { type: "text", variant: "heading", text: "The next step is ready" },
      { type: "text", variant: "caption", text: "Card, text and content hierarchy" },
      { type: "badge", label: "In progress" },
      { type: "divider" },
      { type: "progress", label: "Progress", value: 68 },
      { type: "button", label: "Confirm the plan", variant: "primary", action: { id: "confirm-plan", payload: { source: "gallery" } }, disabled: false },
      { type: "button", label: "Skip for now", variant: "ghost", action: { id: "skip-plan" }, disabled: false },
    ] },
    { type: "callout", tone: "info", title: "One detail at a time", text: "Yellow stays an accent, it does not become a fill." },
    { type: "callout", tone: "success", title: "Ready", text: "The action is recorded locally in this phase." },
    { type: "callout", tone: "warning", title: "Check first", text: "Review the impact before continuing." },
    { type: "callout", tone: "danger", title: "Needs attention", text: "This choice needs a review." },
    { type: "list", items: [
      { title: "Spec validated", description: "Depth and node count checked", status: "complete" },
      { title: "Agent action", description: "Comes in the next phase", status: "pending" },
      { title: "Compact check", description: "Forces the mobile variant above", status: "attention" },
    ] },
    { type: "table", columns: [{ key: "nome", label: "Name" }, { key: "stato", label: "Status", align: "end" }], rows: [{ nome: "Spec", stato: "Ready" }, { nome: "Renderer", stato: "In progress" }] },
    { type: "chart", kind: "bar", series: [{ label: "Week", values: [12, 18, 9, 24, 16] }, { label: "Goal", values: [14, 14, 14, 14, 14] }] },
    { type: "chart", kind: "line", series: [{ label: "Usage", values: [4, 9, 7, 15, 18] }] },
    { type: "form", id: "demo-form", children: [
      { type: "input", name: "titolo", label: "Title", placeholder: "Write a title", required: true },
      { type: "select", name: "priorita", label: "Priority", required: true, options: [{ label: "Normal", value: "normal" }, { label: "High", value: "high" }] },
      { type: "multiselect", name: "canali", label: "Channels", options: [{ label: "Web", value: "web" }, { label: "Mobile", value: "mobile" }] },
      { type: "switch", name: "avviso", label: "Send a notice", initialValue: false },
      { type: "slider", name: "durata", label: "Duration", min: 5, max: 60, step: 5, initialValue: 30 },
      { type: "radio", name: "visibilita", label: "Visibility", required: true, options: [{ label: "Private", value: "private" }, { label: "Shared", value: "shared" }] },
    ], submit: { label: "Submit data", action: { id: "gallery-form" } } },
    { type: "button", label: "Secondary action", variant: "secondary", action: { id: "secondary-action" }, disabled: false },
  ],
};

export function UiGallery({ theme, layout }: PluginScreenProps) {
  const [forceCompact, setForceCompact] = useState(false);
  const toast = useToast();
  const compact = forceCompact || layout.compact;
  const context = useMemo<UiContext>(() => ({
    theme,
    compact,
    agentId: "gallery",
    rowId: "gallery",
    title: "UI gallery",
    onAction: async (event) => { console.log("[generative-ui gallery] action", event); toast.show("Action recorded", { variant: "success" }); },
  }), [compact, theme, toast]);
  return (
    <ScrollView contentContainerStyle={{ padding: compact ? space[12] : space[24], gap: compact ? space[12] : space[24] }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[12] }}>
        <View style={{ flex: 1, gap: space[4] }}><Text style={{ color: theme.colors.foreground, fontSize: 16, fontWeight: "700" }}>Force compact</Text><Text style={{ color: theme.colors.foregroundMuted, fontSize: 13 }}>Simulates the mobile layout.</Text></View>
        <Switch value={forceCompact} onValueChange={setForceCompact} accessibilityLabel="Force compact" />
      </View>
      <GenerativeUiBlock title="UI gallery" spec={gallerySpec} context={context} />
    </ScrollView>
  );
}

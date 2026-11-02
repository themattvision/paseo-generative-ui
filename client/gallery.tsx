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
    { type: "text", variant: "title", text: "Catalogo essenziale" },
    { type: "text", variant: "body", text: "Ogni blocco segue il tema di Paseo e resta leggibile anche in compatto." },
    { type: "stack", direction: "horizontal", gap: 12, children: [
      { type: "stat", label: "Interfacce viste", value: "24", delta: "+12%", trend: "up" },
      { type: "stat", label: "Stato", value: "Stabile", delta: "Nessuna attesa", trend: "flat" },
    ] },
    { type: "card", title: "Piano di oggi", tone: "accent", children: [
      { type: "text", variant: "heading", text: "Il prossimo passo è pronto" },
      { type: "text", variant: "caption", text: "Card, testo e gerarchia del contenuto" },
      { type: "badge", label: "In corso" },
      { type: "divider" },
      { type: "progress", label: "Avanzamento", value: 68 },
      { type: "button", label: "Conferma il piano", variant: "primary", action: { id: "confirm-plan", payload: { source: "gallery" } }, disabled: false },
      { type: "button", label: "Salta per ora", variant: "ghost", action: { id: "skip-plan" }, disabled: false },
    ] },
    { type: "callout", tone: "info", title: "Un dettaglio alla volta", text: "Il giallo resta un accento, non diventa un riempimento." },
    { type: "callout", tone: "success", title: "Pronto", text: "L'azione viene registrata localmente in questa fase." },
    { type: "callout", tone: "warning", title: "Controlla prima", text: "Rivedi l'impatto prima di continuare." },
    { type: "callout", tone: "danger", title: "Serve attenzione", text: "Questa scelta richiede una verifica." },
    { type: "list", items: [
      { title: "Spec validata", description: "Profondità e numero di nodi controllati", status: "complete" },
      { title: "Azione agente", description: "Arriva nella fase successiva", status: "pending" },
      { title: "Controllo compatto", description: "Forza la variante mobile qui sopra", status: "attention" },
    ] },
    { type: "table", columns: [{ key: "nome", label: "Nome" }, { key: "stato", label: "Stato", align: "end" }], rows: [{ nome: "Spec", stato: "Pronta" }, { nome: "Renderer", stato: "In corso" }] },
    { type: "chart", kind: "bar", series: [{ label: "Settimana", values: [12, 18, 9, 24, 16] }, { label: "Obiettivo", values: [14, 14, 14, 14, 14] }] },
    { type: "chart", kind: "line", series: [{ label: "Uso", values: [4, 9, 7, 15, 18] }] },
    { type: "form", id: "demo-form", children: [
      { type: "input", name: "titolo", label: "Titolo", placeholder: "Scrivi un titolo", required: true },
      { type: "select", name: "priorita", label: "Priorità", required: true, options: [{ label: "Normale", value: "normal" }, { label: "Alta", value: "high" }] },
      { type: "multiselect", name: "canali", label: "Canali", options: [{ label: "Web", value: "web" }, { label: "Mobile", value: "mobile" }] },
      { type: "switch", name: "avviso", label: "Invia un avviso", initialValue: false },
      { type: "slider", name: "durata", label: "Durata", min: 5, max: 60, step: 5, initialValue: 30 },
      { type: "radio", name: "visibilita", label: "Visibilità", required: true, options: [{ label: "Privata", value: "private" }, { label: "Condivisa", value: "shared" }] },
    ], submit: { label: "Invia dati", action: { id: "gallery-form" } } },
    { type: "button", label: "Azione secondaria", variant: "secondary", action: { id: "secondary-action" }, disabled: false },
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
    title: "Galleria UI",
    onAction: async (event) => { console.log("[generative-ui gallery] action", event); toast.show("Azione registrata", { variant: "success" }); },
  }), [compact, theme, toast]);
  return (
    <ScrollView contentContainerStyle={{ padding: compact ? space[12] : space[24], gap: compact ? space[12] : space[24] }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[12] }}>
        <View style={{ flex: 1, gap: space[4] }}><Text style={{ color: theme.colors.foreground, fontSize: 16, fontWeight: "700" }}>Forza compatto</Text><Text style={{ color: theme.colors.foregroundMuted, fontSize: 13 }}>Simula la disposizione mobile.</Text></View>
        <Switch value={forceCompact} onValueChange={setForceCompact} accessibilityLabel="Forza compatto" />
      </View>
      <GenerativeUiBlock title="Galleria UI" spec={gallerySpec} context={context} />
    </ScrollView>
  );
}

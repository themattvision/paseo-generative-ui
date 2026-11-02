import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Switch, Text, TextInput, View } from "react-native";
import type { KnownSpecNode } from "../shared/spec.js";
import { Squircle } from "./ds/squircle.js";
import { ink, matteoYellow, space } from "./ds/tokens.js";
import { UiButton, UiText, type UiContext } from "./ds/components.js";

type Field = Extract<KnownSpecNode, { type: "input" | "select" | "multiselect" | "switch" | "slider" | "radio" }>;
type Values = Record<string, string | string[] | boolean | number>;

export function Form({ node, context }: { node: Extract<KnownSpecNode, { type: "form" }>; context: UiContext }) {
  const fields = node.children.filter((child): child is Field => ["input", "select", "multiselect", "switch", "slider", "radio"].includes(child.type));
  const initial = useMemo<Values>(() => Object.fromEntries(fields.map((field) => [field.name, field.type === "switch" ? field.initialValue : field.type === "slider" ? field.initialValue : field.type === "multiselect" ? [] : ""])), [fields]);
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (name: string, value: Values[string]) => setValues((previous) => ({ ...previous, [name]: value }));
  const submit = () => {
    const next: Record<string, string> = {};
    for (const field of fields) {
      const value = values[field.name];
      if ("required" in field && field.required && (value === "" || (Array.isArray(value) && value.length === 0))) next[field.name] = "Questo campo è obbligatorio.";
    }
    setErrors(next);
    if (Object.keys(next).length === 0) return context.onAction({ ...node.submit.action, payload: { ...node.submit.action.payload, values }, agentId: context.agentId });
    return Promise.resolve();
  };
  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} accessibilityLabel={node.id} style={{ gap: context.compact ? space[12] : space[16], width: "100%" }}>{fields.map((field) => <FieldView key={field.name} field={field} value={values[field.name]} error={errors[field.name]} set={set} context={context} />)}<UiButton label={node.submit.label} variant="primary" disabled={false} action={node.submit.action} context={{ ...context, onAction: submit }} /></KeyboardAvoidingView>;
}

function FieldView({ field, value, error, set, context }: { field: Field; value: Values[string]; error?: string; set: (name: string, value: Values[string]) => void; context: UiContext }) {
  const label = <UiText variant="body" context={context}>{field.label}</UiText>;
  const errorView = error ? <Text style={{ color: context.theme.colors.statusDanger, fontSize: 12, lineHeight: 16 }}>{error}</Text> : null;
  if (field.type === "input") return <View style={{ gap: space[4] }}>{label}<Squircle radius={16} style={{ backgroundColor: context.theme.colors.surface1, borderColor: error ? context.theme.colors.statusDanger : context.theme.colors.border, borderWidth: 1 }}><TextInput value={String(value)} onChangeText={(text) => set(field.name, text)} placeholder={field.placeholder} placeholderTextColor={context.theme.colors.foregroundMuted} keyboardType={field.kind === "number" ? "numeric" : "default"} multiline={field.kind === "multiline"} accessibilityLabel={field.label} style={{ minHeight: field.kind === "multiline" ? 96 : 44, paddingHorizontal: space[12], paddingVertical: space[8], color: context.theme.colors.foreground, fontSize: 15, textAlignVertical: field.kind === "multiline" ? "top" : "center" }} /></Squircle>{errorView}</View>;
  if (field.type === "switch") return <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[12] }}>{label}<Switch value={Boolean(value)} onValueChange={(next) => set(field.name, next)} accessibilityLabel={field.label} /></View>;
  if (field.type === "slider") return <Slider field={field} value={Number(value)} set={set} context={context} />;
  const multiple = field.type === "multiselect";
  return <View style={{ gap: space[8] }}>{label}<View style={{ gap: space[8] }}>{field.options.map((option) => { const selected = multiple ? (value as string[]).includes(option.value) : value === option.value; return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => set(field.name, multiple ? (selected ? (value as string[]).filter((item) => item !== option.value) : [...value as string[], option.value]) : option.value)}><Squircle radius={16} style={{ backgroundColor: context.theme.colors.surface1, borderColor: selected ? matteoYellow : context.theme.colors.border, borderWidth: 1 }}><View style={{ minHeight: 44, paddingHorizontal: space[12], flexDirection: "row", alignItems: "center", gap: space[8] }}><View style={{ width: 20, height: 20, backgroundColor: ink, borderRadius: 10, alignItems: "center", justifyContent: "center" }}><Text style={{ color: selected ? matteoYellow : "#ffffff", fontWeight: "800" }}>{selected ? "✓" : "·"}</Text></View><Text style={{ color: context.theme.colors.foreground, fontSize: 14, flex: 1 }}>{option.label}</Text></View></Squircle></Pressable>; })}</View>{errorView}</View>;
}

function Slider({ field, value, set, context }: { field: Extract<Field, { type: "slider" }>; value: number; set: (name: string, value: number) => void; context: UiContext }) {
  const [width, setWidth] = useState(1);
  const ratio = (value - field.min) / (field.max - field.min);
  return <View style={{ gap: space[8] }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><UiText context={context}>{field.label}</UiText><UiText variant="caption" context={context}>{String(value)}</UiText></View><Pressable accessibilityRole="adjustable" accessibilityLabel={field.label} accessibilityValue={{ min: field.min, max: field.max, now: value }} onLayout={(event) => setWidth(Math.max(1, event.nativeEvent.layout.width))} onPress={(event) => { const raw = field.min + (event.nativeEvent.locationX / width) * (field.max - field.min); set(field.name, Math.min(field.max, Math.max(field.min, Math.round(raw / field.step) * field.step))); }} style={{ minHeight: 44, justifyContent: "center" }}><View style={{ height: 8, backgroundColor: context.theme.colors.surface2, overflow: "hidden", borderRadius: 4 }}><View style={{ height: 8, width: `${ratio * 100}%`, backgroundColor: ink, borderRightColor: matteoYellow, borderRightWidth: 2 }} /></View></Pressable></View>;
}

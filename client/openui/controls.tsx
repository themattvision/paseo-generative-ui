import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Squircle } from "../ds/squircle.js";
import { ink, matteoYellow, space } from "../ds/tokens.js";
import { useUi, type Renderer } from "./base.js";

// Componenti con stato. Una prop $variabile arriva come campo reattivo (value e setValue) e aggiorna lo store
// di react-lang; un valore fisso resta nello stato locale del componente.
// NON verificato a runtime: il binding reattivo e' coperto solo dai tipi di react-lang 1.1.0.

type Field<T> = { value: T; setValue: (next: T) => void };

function isField<T>(prop: unknown): prop is Field<T> {
  return typeof prop === "object" && prop !== null && typeof (prop as Field<T>).setValue === "function";
}

export function useBound<T>(prop: unknown): [T, (next: T) => void] {
  const [local, setLocal] = useState<T>(() => (isField<T>(prop) ? prop.value : (prop as T)));
  if (isField<T>(prop)) return [prop.value, prop.setValue];
  return [local, setLocal];
}

type Option = { value: string; label: string };

function toOptions(raw: unknown): Option[] {
  const list: unknown[] = Array.isArray(raw) ? raw : [];
  return list.map((item) => {
    if (typeof item === "string") return { value: item, label: item };
    const option = (item ?? {}) as { value?: unknown; label?: unknown };
    const value = String(option.value ?? "");
    return { value, label: String(option.label ?? value) };
  });
}

function FieldLabel({ text }: { text?: string }) {
  const { theme } = useUi();
  if (!text) return null;
  return <Text style={{ color: theme.colors.foregroundMuted, fontSize: 13, lineHeight: 18, fontWeight: "500" }}>{text}</Text>;
}

const Input: Renderer = ({ props }) => {
  const { theme } = useUi();
  const [value, setValue] = useBound<string | number>(props.value);
  const numeric = props.type === "number";
  // La bozza mostra quello che digita l'utente (anche un campo vuoto); lo store riceve il valore convertito.
  const [draft, setDraft] = useState(String(value ?? ""));
  return (
    <View style={{ width: "100%", gap: space[4] }}>
      <FieldLabel text={props.label} />
      <Squircle radius={16} style={{ backgroundColor: theme.colors.surface1, borderColor: theme.colors.border, borderWidth: 1 }}>
        <TextInput
          accessibilityLabel={String(props.label ?? props.placeholder ?? "Campo")}
          value={draft}
          placeholder={props.placeholder}
          placeholderTextColor={theme.colors.foregroundMuted}
          keyboardType={numeric ? "numeric" : "default"}
          onChangeText={(text) => {
            setDraft(text);
            setValue(numeric ? Number(text.replace(",", ".")) || 0 : text);
          }}
          style={{ minHeight: 44, paddingHorizontal: space[12], color: theme.colors.foreground, fontSize: 16 }}
        />
      </Squircle>
    </View>
  );
};

const TextAreaBlock: Renderer = ({ props }) => {
  const { theme } = useUi();
  const [value, setValue] = useBound<string>(props.value);
  const rows = Math.max(2, Number(props.rows) || 4);
  return (
    <View style={{ width: "100%", gap: space[4] }}>
      <FieldLabel text={props.label} />
      <Squircle radius={16} style={{ backgroundColor: theme.colors.surface1, borderColor: theme.colors.border, borderWidth: 1 }}>
        <TextInput
          accessibilityLabel={String(props.label ?? props.placeholder ?? "Testo")}
          value={String(value ?? "")}
          onChangeText={setValue}
          placeholder={props.placeholder}
          placeholderTextColor={theme.colors.foregroundMuted}
          multiline
          numberOfLines={rows}
          textAlignVertical="top"
          style={{ minHeight: rows * 22 + space[24], padding: space[12], color: theme.colors.foreground, fontSize: 16, lineHeight: 22 }}
        />
      </Squircle>
    </View>
  );
};

const Select: Renderer = ({ props }) => {
  const { theme } = useUi();
  const [value, setValue] = useBound<string>(props.value);
  const [open, setOpen] = useState(false);
  const options = toOptions(props.options);
  const current = options.find((option) => option.value === value);
  return (
    <View style={{ width: "100%", gap: space[4] }}>
      <FieldLabel text={props.label} />
      <Squircle radius={16} style={{ backgroundColor: theme.colors.surface1, borderColor: theme.colors.border, borderWidth: 1 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: space[12] }}>
          <Text style={{ color: current ? theme.colors.foreground : theme.colors.foregroundMuted, fontSize: 16 }}>{current?.label ?? String(props.placeholder ?? "Scegli")}</Text>
        </Pressable>
        {open ? options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: option.value === value }}
            onPress={() => { setValue(option.value); setOpen(false); }}
            style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: space[12], borderTopWidth: 1, borderColor: theme.colors.border, backgroundColor: option.value === value ? theme.colors.surface2 : "transparent" }}
          >
            <Text style={{ color: theme.colors.foreground, fontSize: 16 }}>{option.label}</Text>
          </Pressable>
        )) : null}
      </Squircle>
    </View>
  );
};

const SegmentedControl: Renderer = ({ props }) => {
  const { theme } = useUi();
  const [value, setValue] = useBound<string>(props.value);
  const options = toOptions(props.options);
  const block = props.block === true;
  return (
    <Squircle radius={22} fill={block} style={{ backgroundColor: theme.colors.surface1, borderColor: theme.colors.border, borderWidth: 1, padding: space[4] }}>
      <View style={{ flexDirection: "row", gap: space[4] }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setValue(option.value)} style={{ flex: block ? 1 : undefined, minHeight: 44 }}>
              <Squircle radius={18} fill={block} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: space[16], backgroundColor: selected ? theme.colors.foreground : "transparent" }}>
                <Text style={{ color: selected ? theme.colors.surface0 : theme.colors.foreground, fontSize: 15, fontWeight: "600", textAlign: "center" }}>{option.label}</Text>
              </Squircle>
            </Pressable>
          );
        })}
      </View>
    </Squircle>
  );
};

// Nessun trascinamento: RN core non ha uno slider. Il valore si regola con i passi −/+ (aree di tocco 44).
const Slider: Renderer = ({ props }) => {
  const { theme } = useUi();
  const [value, setValue] = useBound<number>(props.value);
  const min = Number(props.min ?? 0);
  const max = Math.max(min + 1, Number(props.max ?? 100));
  const step = Number(props.step) > 0 ? Number(props.step) : 1;
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  const current = clamp(Number(value) || 0);
  const fraction = (current - min) / (max - min);
  const unit = String(props.unit ?? "");
  const shown = unit === "$" ? `$${current}` : `${current}${unit}`;
  const stepButton = (label: string, next: number) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label === "−" ? "Diminuisci" : "Aumenta"} onPress={() => setValue(clamp(next))} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: theme.colors.foreground, fontSize: 20, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ width: "100%", gap: space[4] }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <FieldLabel text={props.label} />
        <Text style={{ color: theme.colors.foreground, fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{shown}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {stepButton("−", current - step)}
        <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, overflow: "hidden" }}>
          <View style={{ width: `${Math.round(fraction * 100)}%`, height: 4, backgroundColor: theme.colors.foreground }} />
        </View>
        {stepButton("+", current + step)}
      </View>
    </View>
  );
};

// Spunta: quadrato pieno nero con glifo giallo, come da regola di design.
const Checkbox: Renderer = ({ props }) => {
  const { theme } = useUi();
  const [checked, setChecked] = useBound<boolean>(props.checked);
  const on = checked === true;
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => setChecked(!on)} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: space[12] }}>
      <Squircle radius={6} fill={false} style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center", backgroundColor: on ? ink : "transparent", borderColor: on ? ink : theme.colors.border, borderWidth: 1.5 }}>
        {on ? <Text style={{ color: matteoYellow, fontSize: 14, fontWeight: "700", lineHeight: 16 }}>✓</Text> : null}
      </Squircle>
      <Text style={{ flex: 1, color: on ? theme.colors.foregroundMuted : theme.colors.foreground, fontSize: 16, lineHeight: 23, textDecorationLine: on && props.lineThrough ? "line-through" : "none" }}>{String(props.label ?? "")}</Text>
    </Pressable>
  );
};

export const controlRenderers: Record<string, Renderer> = {
  Input, TextArea: TextAreaBlock, Select, SegmentedControl, Slider, Checkbox,
};

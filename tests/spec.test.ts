import assert from "node:assert/strict";
import { generativeUiSchema } from "../shared/generative-ui.js";
import { MAX_SPEC_DEPTH, MAX_SPEC_NODES, validateSpec } from "../shared/spec.js";

const valid = {
  title: "Stato",
  spec: {
    type: "stack",
    gap: 12,
    children: [
      { type: "text", variant: "heading", text: "Pronto" },
      { type: "button", label: "Continua", variant: "primary", action: { id: "continue" }, disabled: false },
    ],
  },
};

assert.equal(generativeUiSchema.safeParse(valid).success, true, "una spec valida deve passare");
assert.equal(generativeUiSchema.safeParse({ spec: { type: "future-widget", answer: 42 } }).success, true, "un tipo futuro deve arrivare al fallback del renderer");
assert.equal(generativeUiSchema.safeParse({ spec: { type: "button", label: "Manca azione" } }).success, false, "un componente noto incompleto deve fallire");
assert.equal(generativeUiSchema.safeParse({ spec: { type: "table", columns: [{ key: "name", label: "Nome" }], rows: [{ name: "Ada" }] } }).success, true, "una tabella valida deve passare");
assert.equal(generativeUiSchema.safeParse({ spec: { type: "table", columns: Array.from({ length: 13 }, (_, index) => ({ key: String(index), label: String(index) })), rows: [] } }).success, false, "la tabella non supera dodici colonne");
assert.equal(generativeUiSchema.safeParse({ spec: { type: "chart", kind: "line", series: [{ label: "Uso", values: [1, 3, 2] }] } }).success, true, "un grafico a linee valido deve passare");
assert.equal(generativeUiSchema.safeParse({ spec: { type: "chart", kind: "donut", series: [{ label: "Uso", values: [1] }] } }).success, false, "il donut non è incluso senza SVG");
assert.equal(generativeUiSchema.safeParse({ spec: { type: "form", id: "a", children: [{ type: "input", name: "email", label: "Email", required: true }], submit: { label: "Invia", action: { id: "submit" } } } }).success, true, "un form valido deve passare");
assert.equal(generativeUiSchema.safeParse({ spec: { type: "slider", name: "x", label: "X", min: 10, max: 1, step: 1, initialValue: 5 } }).success, false, "lo slider rifiuta intervalli non validi");

let deep: Record<string, unknown> = { type: "text", text: "fine" };
for (let index = 0; index < MAX_SPEC_DEPTH; index += 1) deep = { type: "stack", children: [deep] };
assert.equal(validateSpec(deep).ok, false, "la profondità oltre il limite deve fallire");

const many = { type: "stack", children: Array.from({ length: MAX_SPEC_NODES }, (_, index) => ({ type: "text", text: String(index) })) };
assert.equal(validateSpec(many).ok, false, "un numero di nodi oltre il limite deve fallire");

console.log("spec tests passed");

import assert from "node:assert/strict";
import { generativeUiSchema } from "../shared/generative-ui.js";
import { MAX_SPEC_DEPTH, MAX_SPEC_NODES, validateSpec } from "../shared/spec.js";
import { actionMessage } from "../shared/action.js";
import { sanitizeHtml } from "../shared/html.js";

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
assert.equal(generativeUiSchema.safeParse({ spec: { type: "html", html: "<h1>Grafico</h1>", height: 320 } }).success, true, "un blocco HTML valido deve passare");
assert.equal(generativeUiSchema.safeParse({ spec: { type: "html", html: "x".repeat(48 * 1024 + 1) } }).success, false, "HTML oltre 48 KiB deve fallire");
assert.equal(actionMessage({ id: "conferma", payload: { piano: "pro" }, once: true }, "riga-7", "Offerta"), "[Azione UI] id=conferma riga=riga-7 titolo=Offerta valori={\"piano\":\"pro\"}", "il messaggio azione deve essere compatto e completo");
const sanitized = sanitizeHtml('<script>alert(1)</script><button onclick="go()">Vai</button><a href="javascript:go()">x</a><img src="https://example.test/a.png"><div style="background:url(//example.test/a)">ok</div>');
assert.equal(/script|onclick|javascript:|https?:|\/\//i.test(sanitized), false, "la sanificazione rimuove script, handler, javascript e risorse remote");

let deep: Record<string, unknown> = { type: "text", text: "fine" };
for (let index = 0; index < MAX_SPEC_DEPTH; index += 1) deep = { type: "stack", children: [deep] };
assert.equal(validateSpec(deep).ok, false, "la profondità oltre il limite deve fallire");

const many = { type: "stack", children: Array.from({ length: MAX_SPEC_NODES }, (_, index) => ({ type: "text", text: String(index) })) };
assert.equal(validateSpec(many).ok, false, "un numero di nodi oltre il limite deve fallire");

console.log("spec tests passed");

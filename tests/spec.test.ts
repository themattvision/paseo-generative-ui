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

let deep: Record<string, unknown> = { type: "text", text: "fine" };
for (let index = 0; index < MAX_SPEC_DEPTH; index += 1) deep = { type: "stack", children: [deep] };
assert.equal(validateSpec(deep).ok, false, "la profondità oltre il limite deve fallire");

const many = { type: "stack", children: Array.from({ length: MAX_SPEC_NODES }, (_, index) => ({ type: "text", text: String(index) })) };
assert.equal(validateSpec(many).ok, false, "un numero di nodi oltre il limite deve fallire");

console.log("spec tests passed");

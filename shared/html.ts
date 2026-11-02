import type { GenerativeUiData } from "./generative-ui.js";

/** Removes executable and network-capable HTML before storage or framing. */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script\b[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:href|src|action|formaction)\s*=\s*(?:"\s*(?:javascript:|(?:https?:)?\/\/)[^"]*"|'\s*(?:javascript:|(?:https?:)?\/\/)[^']*'|(?:javascript:|(?:https?:)?\/\/)[^\s>]+)/gi, "")
    .replace(/url\(\s*(?:"|')?\s*(?:javascript:|(?:https?:)?\/\/)[^)]*\)/gi, "")
    .replace(/(?:https?:)?\/\//gi, "");
}

function sanitizeNode(node: unknown): unknown {
  if (!node || typeof node !== "object" || Array.isArray(node)) return node;
  const next = { ...(node as Record<string, unknown>) };
  if (next.type === "html" && typeof next.html === "string") next.html = sanitizeHtml(next.html);
  if (Array.isArray(next.children)) next.children = next.children.map(sanitizeNode);
  return next;
}

export function sanitizeGenerativeUiData(data: GenerativeUiData): GenerativeUiData {
  return { ...data, spec: sanitizeNode(data.spec) as GenerativeUiData["spec"] };
}

export function documentHtml(html: string, foreground: string, surface: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{color:${foreground};background:${surface};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}html,body{margin:0;min-height:100dvh;padding:16px;background:transparent;color:inherit}h1,h2,h3{text-wrap:balance;margin:0 0 12px}p,li{text-wrap:pretty}p{margin:0 0 8px}article,section,div{border-radius:16px}a{color:inherit;text-decoration-color:#fffb00}mark{background:#fffb00;color:#14141a}</style></head><body>${sanitizeHtml(html)}</body></html>`;
}

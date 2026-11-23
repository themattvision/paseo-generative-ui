# Generative UI for Paseo

A Paseo plugin that lets agents answer with interactive blocks (cards, tables, charts, lists, photos, forms, buttons) through a `show_ui` tool, on desktop and mobile. See `OVERVIEW.md` for what it does and how it behaves.

## Install

On the machine running the Paseo daemon (Paseo 0.13.0 or later, npm available):

```bash
paseo plugin install github:themattvision/paseo-generative-ui
```

Plugins must be enabled on the daemon (Settings → Plugins → Enable plugins). The install runs `npm ci --omit=dev` and a small patch script from the manifest `build` step. Then open a new chat: only agents created after the install get the `show_ui` tool.

Configure it in Settings → Plugins → Generative UI (look, accent color, bridge port).

## Update

```bash
paseo plugin update generative-ui
```

## Develop

```bash
npm install
npm run prompt      # regenerate docs/openui-prompt.md and shared/openui-prompt.generated.ts after changing component signatures
npm run typecheck
npm test
paseo plugin install /absolute/path/to/this/repo
paseo plugin reload generative-ui
```

Layout: `index.server.ts` (MCP injection, loopback bridge, persistence), `index.client.tsx` (timeline renderer, settings screen), `client/` (React Native renderer and design system), `server/` (MCP program, persistence), `shared/` (Zod schemas, OpenUI signatures, settings).

Component catalog: `docs/catalogo.md` (classic JSON spec) and `docs/openui-prompt.md` (OpenUI Lang, generated).

## License

MIT, see `LICENSE`.

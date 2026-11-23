Generative UI lets your agents answer with interactive blocks instead of plain text: cards, tables, charts, lists, photos, forms and buttons. When a block helps more than a paragraph, the agent calls a `show_ui` tool and the block appears in the chat timeline, on desktop and on mobile.

Blocks are written in OpenUI Lang, a compact format from the open-intelligent-ui project. The plugin validates the text, tells the agent which line is wrong when it is not valid, and renders the result with Paseo's own components and theme.

## How it works

The plugin adds a small MCP server named `generative-ui` to every agent it starts. The tool talks to a loopback HTTP bridge inside the plugin on `127.0.0.1`, protected by tokens, and the bridge appends the block to the agent's timeline once the turn ends, so it shows below the final answer. Pressing a button sends a short message back to the agent, and the timeline shows the pressed button as a small chip.

Only agents created after the plugin is installed get the tool. Open a new chat after installing or updating.

## Setup

Open Settings, Plugins, Generative UI:

- Look: follow the Paseo theme (default), or use dark pills with an accent glyph.
- Accent color: an optional hex color. Empty uses the theme accent.
- Bridge port: the local port of the bridge, 37621 by default. If it is busy the next free ports are tried. Reload the plugin after changing it; chats opened before the change need a new session.

Requires Paseo 0.13.0 or later and npm on the daemon host.

## What it reads and stores

- Blocks are saved per agent under the Paseo home (`plugin-data/generative-ui`) so they come back when a chat is reopened, up to 200 blocks per agent.
- Local images referenced by an agent as a file path are resized with `/usr/bin/sips` and embedded in the block. This works on macOS only; elsewhere use image URLs.
- Photo search for `SearchImage` queries Wikipedia and Wikimedia Commons from the app.
- If the Finale plugin is installed, blocks are drawn inside its answer box.

## Known limits

Map, Math, Popover, HtmlView, YouTube, Svg, DatePicker and Timer components are not implemented. Slider has no dragging. Button haptics are not available to plugins.

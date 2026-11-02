import type { PluginClientContext } from "@getpaseo/plugin/client";
import { GenerativeUiItem } from "./client/generative-ui.js";
import { generativeUiSchema } from "./shared/generative-ui.js";

export default function contribute(client: PluginClientContext) {
  return client.addTimelineRenderer({
    kind: "generative-ui",
    version: 1,
    schema: generativeUiSchema,
    Component: GenerativeUiItem,
  });
}

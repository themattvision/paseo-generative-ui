import type { PluginClientContext } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { UiGallery } from "./client/gallery.js";
import { GenerativeUiItem } from "./client/generative-ui.js";
import { generativeUiSchema } from "./shared/generative-ui.js";

export default function contribute(client: PluginClientContext) {
  const removeRenderer = client.addTimelineRenderer({
    kind: "generative-ui",
    version: 1,
    schema: generativeUiSchema,
    Component: GenerativeUiItem,
  });
  const removeScreen = client.addScreen({ id: "ui-gallery", title: "Galleria UI", Component: UiGallery });
  const removeSidebar = client.addSidebarHeaderItem({
    id: "ui-gallery",
    title: "Galleria UI",
    Component: ({ currentScreen, openScreen }) => <SidebarRow icon="PanelsTopLeft" active={currentScreen?.screenId === "ui-gallery"} onPress={() => openScreen({ screenId: "ui-gallery" })} />,
  });
  return () => { removeSidebar(); removeScreen(); removeRenderer(); };
}

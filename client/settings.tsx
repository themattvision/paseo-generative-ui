import { useCallback, useMemo, useState } from "react";
import { Text } from "react-native";
import { useSettings, type PluginSurfaceProps, type SettingsState } from "@getpaseo/plugin/client";
import {
  SettingsAction,
  SettingsCard,
  SettingsInput,
  SettingsSection,
  SettingsSelect,
} from "@getpaseo/plugin/client/ui";
import { preferences } from "../shared/preferences.js";

type Ready = Extract<SettingsState<typeof preferences.schema>, { status: "ready" }>;

const looks = [
  { label: "Follow the Paseo theme", value: "theme" },
  { label: "Dark pills with accent glyph", value: "ink" },
] as const;

function Appearance({ settings }: { settings: Ready }) {
  const [accent, setAccent] = useState(settings.values.accentColor);
  const [port, setPort] = useState(String(settings.values.bridgePort));
  const [portError, setPortError] = useState<string | undefined>();
  const changeLook = useCallback(
    (look: Ready["values"]["look"]) => {
      void settings.save({ ...settings.values, look }, settings.revision);
    },
    [settings],
  );
  const saveAccent = useCallback(() => {
    void settings.save({ ...settings.values, accentColor: accent.trim() }, settings.revision);
  }, [settings, accent]);
  const savePort = useCallback(async () => {
    const value = Number(port);
    if (!Number.isInteger(value)) {
      setPortError("Enter a whole number from 1024 to 65535");
      return;
    }
    setPortError(undefined);
    await settings.save({ ...settings.values, bridgePort: value }, settings.revision);
  }, [settings, port]);
  return (
    <>
      <SettingsSection title="Appearance">
        <SettingsCard>
          <SettingsSelect
            label="Look"
            hint="How buttons, check marks and progress bars are colored in show_ui blocks."
            value={settings.values.look}
            options={looks}
            disabled={settings.saving}
            onValueChange={changeLook}
          />
          <SettingsInput
            label="Accent color"
            hint="Hex color such as #fffb00. Leave empty to use the Paseo theme accent."
            initialValue={settings.values.accentColor}
            placeholder="#rrggbb"
            onChangeText={setAccent}
            disabled={settings.saving}
            error={settings.saveError}
          />
          <SettingsAction label="Accent color" actionLabel="Save accent" disabled={settings.saving} onPress={saveAccent} />
        </SettingsCard>
      </SettingsSection>
      <SettingsSection title="Advanced">
        <SettingsCard>
          <SettingsInput
            label="Bridge port"
            hint="Local port used by the show_ui tool. Reload the plugin after changing it; chats opened before the change need a new session."
            initialValue={String(settings.values.bridgePort)}
            placeholder="37621"
            onChangeText={setPort}
            disabled={settings.saving}
            error={portError}
          />
          <SettingsAction label="Bridge port" actionLabel="Save port" disabled={settings.saving} onPress={savePort} />
        </SettingsCard>
      </SettingsSection>
    </>
  );
}

export function GenerativeUiSettings({ theme }: PluginSurfaceProps) {
  const settings = useSettings(preferences);
  const style = useMemo(() => ({ color: theme.colors.foreground }), [theme]);
  if (settings.status === "loading") return <Text style={style}>Loading settings…</Text>;
  if (settings.status !== "ready") {
    return (
      <SettingsSection title="Generative UI">
        <Text style={style}>{settings.error}</Text>
        <SettingsAction label="Try again" actionLabel="Reload" onPress={settings.reload} />
        {settings.status === "invalid" ? (
          <SettingsAction label="Restore default settings" actionLabel="Reset" onPress={settings.reset} />
        ) : null}
      </SettingsSection>
    );
  }
  return <Appearance settings={settings} />;
}

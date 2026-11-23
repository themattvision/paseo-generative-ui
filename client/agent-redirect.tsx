import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { space } from "./ds/tokens.js";

// Schermate già consumate: tornando indietro dalla chat aperta non si deve riaprirla in loop.
const handled = new Set<string>();

/** Schermata di passaggio: apre la chat dell'agente richiesto con la navigazione del client. */
export function AgentRedirect({ theme, host, params, navigation }: PluginScreenProps) {
  const { agentId, serverId, t } = params;
  const key = `${agentId}:${t ?? ""}`;
  const ready = Boolean(navigation && agentId);

  useEffect(() => {
    if (!navigation || !agentId || handled.has(key)) return;
    handled.add(key);
    navigation.openAgent({ agentId, serverId: serverId ?? host.id });
  }, [agentId, host.id, key, navigation, serverId]);

  const colors = theme.colors;
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space[12], padding: space[24], backgroundColor: colors.surface0 }}>
      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "600" }}>
        {ready ? "Apro la chat dell'agente" : "Non riesco ad aprire la chat da qui"}
      </Text>
      {ready ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation?.openAgent({ agentId, serverId: serverId ?? host.id })}
          style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: space[16] }}
        >
          <Text style={{ color: colors.accent, fontSize: 15, fontWeight: "600" }}>Aprila di nuovo</Text>
        </Pressable>
      ) : (
        <Text style={{ color: colors.foregroundMuted, fontSize: 14, textAlign: "center" }}>
          Questa versione di Paseo non passa la navigazione ai plugin. Apri la chat dalla lista.
        </Text>
      )}
    </View>
  );
}

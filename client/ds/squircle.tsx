import type { PropsWithChildren } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

type SquircleProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  radius?: number;
  fill?: boolean;
}>;

/**
 * Native iOS renders continuous corners. The plugin runtime does not include
 * react-native-svg, so web deliberately uses this bounded fallback until an SVG
 * host dependency is available. `width: "100%"` prevents RN Web flex collapse.
 */
export function Squircle({ children, style, radius = 20, fill = true }: SquircleProps) {
  return (
    <View style={[fill ? { width: "100%", alignSelf: "stretch" } : { alignSelf: "flex-start" }, style]}>
      <View
        style={{
          width: fill ? "100%" : undefined,
          alignSelf: fill ? "stretch" : "flex-start",
          overflow: "hidden",
          borderRadius: radius,
          borderCurve: "continuous",
        }}
      >
        {children}
      </View>
    </View>
  );
}

import type { PropsWithChildren } from "react";
import { useState } from "react";
import { getSvgPath } from "figma-squircle";
import { Platform, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";

type SquircleProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  radius?: number;
  fill?: boolean;
}>;

/**
 * On web a measured wrapper applies Figma's smoothing-1 path. A second clipped
 * layer owns the border because a normal border would be cut by clipPath.
 */
export function Squircle({ children, style, radius = 20, fill = true }: SquircleProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };
  const path = Platform.OS === "web" && size.width > 0 && size.height > 0
    ? getSvgPath({ width: size.width, height: size.height, cornerRadius: radius, cornerSmoothing: 1 })
    : undefined;
  const clipStyle = path ? ({ clipPath: `path('${path}')` } as ViewStyle) : undefined;
  const resolved = StyleSheet.flatten(style) ?? {};
  const { borderWidth, borderColor, ...contentStyle } = resolved;
  return (
    <View onLayout={onLayout} style={fill ? { width: "100%", alignSelf: "stretch" } : { alignSelf: "flex-start" }}>
      <View
        style={[{
          width: fill ? "100%" : undefined,
          alignSelf: fill ? "stretch" : "flex-start",
          overflow: "hidden",
          borderRadius: radius,
          borderCurve: "continuous",
        }, path ? contentStyle : resolved, clipStyle]}
      >
        {children}
      </View>
      {path ? <View pointerEvents="none" style={[{ position: "absolute", inset: 0, borderWidth, borderColor }, clipStyle]} /> : null}
    </View>
  );
}

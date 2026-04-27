import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "../../estilo";

type Props = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function TelaBaseIdoso({ title, subtitle, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.telaIdosoRoot}>
      <View style={styles.telaIdosoOrbTop} />
      <View style={styles.telaIdosoOrbBottom} />

      <ScrollView
        style={styles.telaIdosoScroll}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom, 16) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.telaIdosoContent, { paddingTop: Math.max(insets.top, 12) + 16, paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          {(title || subtitle) && (
            <View style={styles.telaIdosoHeader}>
              {title && (
                <Text style={{ color: "#12384c", fontSize: 32, fontWeight: "700" }}>
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text style={{ color: "#54707f", fontSize: 17, lineHeight: 26, marginTop: 8 }}>
                  {subtitle}
                </Text>
              )}
            </View>
          )}

          {children}
        </View>
      </ScrollView>
    </View>
  );
}

import React from "react";
import { ScrollView, View, Text, StyleProp, ViewStyle, TouchableOpacity } from "react-native";
import Icon from "@react-native-vector-icons/fontawesome6";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTamanhoFonte } from "../hooks/useTamanhoFonte";
import styles, { bodyText, inverseText } from "../estilo";

type Props = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  onBackPress?: () => void;
};

export default function TelaBase({ title, subtitle, children, contentContainerStyle, onBackPress }: Props) {
  const { fontScale } = useTamanhoFonte();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.telaBaseRoot}>
      <View style={styles.telaBaseOrbTop} />
      <View style={styles.telaBaseOrbBottom} />

      <ScrollView
        style={styles.telaBaseScroll}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom, 16) }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.telaBaseContent,
            { paddingTop: Math.max(insets.top, 12) + 16, paddingBottom: Math.max(insets.bottom, 16) + 12 },
            contentContainerStyle,
          ]}
        >
          {onBackPress && (
            <TouchableOpacity
              onPress={onBackPress}
              activeOpacity={0.9}
              style={styles.telaBaseBackButton}
            >
              <Icon name="chevron-left" size={Math.max(16, fontScale.body)} color="#ffffff" iconStyle="solid" />
            </TouchableOpacity>
          )}

          {(title || subtitle) && (
            <View style={styles.telaBaseHeader}>
              {title && (
                <Text style={inverseText(fontScale.title, { fontWeight: "700" })}>
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text style={bodyText(fontScale.body, "#bedbe8", { lineHeight: 21, marginTop: 6 })}>
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

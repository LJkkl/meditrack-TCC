import React from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import styles from "../estilo";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function CartaoBase({ children, style }: Props) {
  return (
    <View
      style={[
        styles.cardBase,
        style,
      ]}
    >
      {children}
    </View>
  );
}

import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Image, Text, View } from "react-native";
import styles, { theme } from "../estilo";

export default function TelaAbertura() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(18)).current;
  const logoAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.spring(logoAnim, {
        toValue: 1,
        friction: 6,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, logoAnim, translateAnim]);

  return (
    <View style={[styles.containerHome, { paddingHorizontal: 24 }]}>
      <View style={styles.telaBaseOrbTop} />
      <View style={styles.telaBaseOrbBottom} />

      <Animated.View
        style={{
          width: "100%",
          maxWidth: 380,
          alignItems: "center",
          backgroundColor: "rgba(247, 251, 253, 0.1)",
          borderRadius: 28,
          paddingVertical: 36,
          paddingHorizontal: 24,
          borderWidth: 1,
          borderColor: "rgba(223, 244, 251, 0.14)",
          opacity: fadeAnim,
          transform: [{ translateY: translateAnim }],
        }}
      >
        <Animated.View
          style={{
            transform: [{ scale: logoAnim }],
            alignItems: "center",
          }}
        >
          <Image
            source={require("../assets/logo.png")}
            resizeMode="contain"
            style={{ width: 240, height: 180 }}
          />
        </Animated.View>

        <Image
          source={require("../assets/FigL.png")}
          resizeMode="contain"
          style={{ width: 82, height: 82, marginTop: 2, opacity: 0.96 }}
        />

        <Text
          style={{
            color: theme.colors.textInverse,
            fontSize: 28,
            fontWeight: "700",
            marginTop: 14,
            textAlign: "center",
            letterSpacing: 0.4,
          }}
        >
          Meditrack
        </Text>

        <Text
          style={{
            color: "#d7eaf4",
            fontSize: 15,
            marginTop: 10,
            textAlign: "center",
            lineHeight: 23,
            maxWidth: 280,
          }}
        >
          Seu cuidado diário com remédios, horários e acompanhamento em um lugar só.
        </Text>

        <View
          style={{
            marginTop: 22,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.08)",
          }}
        >
          <ActivityIndicator size="small" color={theme.colors.textInverse} />
          <Text
            style={{
              color: "#eaf6fb",
              marginLeft: 10,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            Preparando seu acesso...
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

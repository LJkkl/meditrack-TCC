import { ImageStyle, StyleSheet, TextStyle, ViewStyle } from "react-native";

export const theme = {
  colors: {
    primary: "#0b3954",
    primaryDark: "#06263a",
    primarySoft: "#0d4669",
    accent: "#1f6b75",
    accentLight: "#dceef4",
    text: "#12384c",
    textMuted: "#5f7f92",
    textInverse: "#ffffff",
    card: "#f7fbfd",
    cardBorder: "#d9e9f0",
    cardWarm: "#fffdf8",
    cardWarmBorder: "#d9e8ea",
    success: "#1b5e20",
    successBg: "#e8f5e9",
    warning: "#e65100",
    warningBg: "#fff3e0",
    danger: "#ef5350",
    dangerBg: "#3c1f2e",
    infoBg: "#00334d",
    infoSoft: "#eef7fa",
    surface: "#ffffff",
    background: "#003f5c",
    backgroundSoft: "#eef6f7",
    border: "#dceaf0",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    round: 999,
  },
  spacing: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
  },
} as const;

const centeredRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
};

const cardShadow: ViewStyle = {
  shadowColor: "#02131f",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.18,
  shadowRadius: 16,
  elevation: 9,
};

const segmentedOptionBase: ViewStyle = {
  flex: 1,
  paddingVertical: 10,
  borderRadius: 10,
  alignItems: "center",
};

const segmentedSurfaceBase: ViewStyle = {
  flexDirection: "row",
  backgroundColor: theme.colors.accentLight,
  borderRadius: 14,
  padding: 5,
};

export function segmentedButton(selected: boolean, activeColor: string = theme.colors.primary): ViewStyle {
  return {
    ...segmentedOptionBase,
    backgroundColor: selected ? activeColor : "transparent",
  };
}

export function segmentedButtonText(selected: boolean, fontSize?: number): TextStyle {
  return {
    color: selected ? theme.colors.textInverse : "#29576d",
    fontWeight: "700",
    ...(fontSize ? { fontSize } : {}),
  };
}

export function buttonState(
  loading: boolean,
  activeColor: string = theme.colors.primary,
  loadingColor: string = "#7da3b8"
): ViewStyle {
  return {
    backgroundColor: loading ? loadingColor : activeColor,
  };
}

export function titleText(fontSize: number, color: string = theme.colors.primary, extra: TextStyle = {}): TextStyle {
  return {
    color,
    fontSize,
    fontWeight: "700",
    ...extra,
  };
}

export function bodyText(fontSize: number, color: string = theme.colors.text, extra: TextStyle = {}): TextStyle {
  return {
    color,
    fontSize,
    ...extra,
  };
}

export function captionText(fontSize: number, color: string = theme.colors.textMuted, extra: TextStyle = {}): TextStyle {
  return {
    color,
    fontSize,
    ...extra,
  };
}

export function inverseText(fontSize: number, extra: TextStyle = {}): TextStyle {
  return {
    color: theme.colors.textInverse,
    fontSize,
    ...extra,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  } as ViewStyle,
  containerHome: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  } as ViewStyle,
  screenKeyboard: {
    flex: 1,
  } as ViewStyle,
  fullWidth: {
    width: "100%",
  } as ViewStyle,
  flexOne: {
    flex: 1,
  } as ViewStyle,
  screenHorizontalPadding: {
    paddingHorizontal: 18,
  } as ViewStyle,
  centeredItems: {
    alignItems: "center",
  } as ViewStyle,
  centeredRow,
  contentStartGrow: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingTop: 14,
  } as ViewStyle,
  contentCenteredGrow: {
    flexGrow: 1,
    justifyContent: "center",
  } as ViewStyle,
  inputSpacingSm: {
    marginBottom: 12,
  } as ViewStyle,
  inputSpacingMd: {
    marginBottom: 14,
  } as ViewStyle,
  inputSpacingLg: {
    marginBottom: 18,
  } as ViewStyle,
  cardBase: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...cardShadow,
  } as ViewStyle,
  authHeaderBlock: {
    marginBottom: 18,
  } as ViewStyle,
  authLogoWrapper: {
    alignItems: "center",
    marginBottom: 16,
  } as ViewStyle,
  authLogoLarge: {
    width: 300,
    height: 300,
  } as ImageStyle,
  authLogoSmall: {
    width: 88,
    height: 88,
    alignSelf: "center",
    marginBottom: 10,
  } as ImageStyle,
  authPrimaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  } as ViewStyle,
  authPrimaryButtonSpaced: {
    marginBottom: 12,
  } as ViewStyle,
  authFooterRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  } as ViewStyle,
  textCenter: {
    textAlign: "center",
  } as TextStyle,
  inputSurface: {
    backgroundColor: theme.colors.surface,
  } as ViewStyle,
  sectionLabel: {
    color: "#45667a",
    marginBottom: 8,
    fontWeight: "600",
  } as TextStyle,
  sectionSelector: {
    ...segmentedSurfaceBase,
    marginBottom: 18,
  } as ViewStyle,
  sectionSelectorCompact: {
    ...segmentedSurfaceBase,
    marginBottom: 0,
    marginTop: 12,
  } as ViewStyle,
  infoCard: {
    marginBottom: 18,
    backgroundColor: theme.colors.infoSoft,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#d9e8ef",
  } as ViewStyle,
  telaBaseRoot: {
    flex: 1,
    backgroundColor: theme.colors.primaryDark,
  } as ViewStyle,
  telaBaseOrbTop: {
    position: "absolute",
    top: -60,
    right: -30,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#2a6f97",
    opacity: 0.24,
  } as ViewStyle,
  telaBaseOrbBottom: {
    position: "absolute",
    bottom: -70,
    left: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#89c2d9",
    opacity: 0.14,
  } as ViewStyle,
  telaBaseScroll: {
    flex: 1,
  } as ViewStyle,
  telaBaseContent: {
    width: "100%",
    maxWidth: 410,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 28,
  } as ViewStyle,
  telaBaseBackButton: {
    alignSelf: "flex-start",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(223, 244, 251, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(223, 244, 251, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  } as ViewStyle,
  telaBaseHeader: {
    marginBottom: 18,
  } as ViewStyle,
  telaIdosoRoot: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSoft,
  } as ViewStyle,
  telaIdosoOrbTop: {
    position: "absolute",
    top: -40,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#dceef1",
    opacity: 0.95,
  } as ViewStyle,
  telaIdosoOrbBottom: {
    position: "absolute",
    bottom: -50,
    left: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#d8ebe3",
    opacity: 0.9,
  } as ViewStyle,
  telaIdosoScroll: {
    flex: 1,
  } as ViewStyle,
  telaIdosoContent: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 28,
  } as ViewStyle,
  telaIdosoHeader: {
    marginBottom: 20,
  } as ViewStyle,
  profileBackgroundOrbTop: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#2a6f97",
    opacity: 0.28,
  } as ViewStyle,
  profileBackgroundOrbBottom: {
    position: "absolute",
    bottom: -60,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#89c2d9",
    opacity: 0.18,
  } as ViewStyle,
  profileScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 28,
  } as ViewStyle,
  profileShell: {
    width: "100%",
    maxWidth: 390,
    alignSelf: "center",
    backgroundColor: theme.colors.card,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#02131f",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
  } as ViewStyle,
  profileHeader: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 34,
  } as ViewStyle,
  profileHeaderRow: {
    ...centeredRow,
    marginTop: 18,
  } as ViewStyle,
  profileAvatarWrap: {
    marginRight: 16,
    alignItems: "center",
  } as ViewStyle,
  profileAvatarButton: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#157a9c",
    borderWidth: 3,
    borderColor: "#b9e6f2",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  } as ViewStyle,
  profileAvatarImage: {
    width: "100%",
    height: "100%",
  } as ImageStyle,
  profileAvatarLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(11, 57, 84, 0.65)",
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  profileStatusPill: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.round,
    backgroundColor: "#124f6b",
  } as ViewStyle,
  profileBody: {
    padding: 22,
  } as ViewStyle,
  infoSurface: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  } as ViewStyle,
  settingsCard: {
    backgroundColor: theme.colors.infoSoft,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#cde4ec",
    marginTop: 14,
  } as ViewStyle,
  settingsCardFirst: {
    marginTop: 0,
  } as ViewStyle,
  settingsSegmented: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: theme.colors.accentLight,
    borderRadius: 16,
    padding: 6,
  } as ViewStyle,
  profileCodeBox: {
    marginTop: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d6e8f0",
    padding: 14,
    alignItems: "center",
  } as ViewStyle,
  profilePrimaryAction: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  } as ViewStyle,
  profileSecondaryAction: {
    marginTop: 16,
    backgroundColor: "#dff1f7",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdeea",
  } as ViewStyle,
  logoutButton: {
    backgroundColor: "#005f99",
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 16,
    marginTop: 22,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  logoutText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  } as TextStyle,
  emptyStateCard: {
    alignItems: "center",
    paddingVertical: 30,
  } as ViewStyle,
  idosoCard: {
    backgroundColor: theme.colors.cardWarm,
    borderColor: theme.colors.cardWarmBorder,
  } as ViewStyle,
  idosoAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  } as ViewStyle,
  idosoSegmented: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: "#e8f1f2",
    borderRadius: 16,
    padding: 6,
  } as ViewStyle,
  idosoSegmentedButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  } as ViewStyle,
  idosoCodeBox: {
    marginTop: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d6e8f0",
    padding: 14,
    alignItems: "center",
  } as ViewStyle,
  idosoPrimaryButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  } as ViewStyle,
  idosoSoftPanel: {
    marginTop: 14,
    backgroundColor: "#f4faf7",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#d6e8df",
  } as ViewStyle,
  idosoLargeButton: {
    marginTop: 20,
    backgroundColor: theme.colors.accent,
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: "center",
  } as ViewStyle,
  idosoDangerButton: {
    backgroundColor: "#fdeaea",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#f3c7c7",
    paddingVertical: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  } as ViewStyle,
  menuUserSwitcher: {
    marginRight: 12,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.round,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#2f6f95",
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 124,
    minHeight: 36,
  } as ViewStyle,
  menuCalendarBadge: {
    marginLeft: 12,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.round,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#2f6f95",
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 112,
    minHeight: 36,
  } as ViewStyle,
  menuCalendarIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(231, 244, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  } as ViewStyle,
  menuFab: {
    top: -25,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#052542",
    width: 65,
    height: 65,
    borderRadius: 32.5,
    borderWidth: 3,
    borderColor: "#ffffff",
    elevation: 5,
  } as ViewStyle,
  menuFabIdoso: {
    top: -25,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.accent,
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: "#ffffff",
    elevation: 5,
  } as ViewStyle,
  menuModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-start",
  } as ViewStyle,
  menuModalCard: {
    marginTop: 92,
    marginHorizontal: 12,
    backgroundColor: "#f4fbff",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#cae0ef",
  } as ViewStyle,
  menuModalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  } as ViewStyle,
  menuModalOption: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  } as ViewStyle,
  menuModalOptionSelected: {
    backgroundColor: "#d8ecfa",
    borderColor: "#82b5d7",
  } as ViewStyle,
  menuDeleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#ffebee",
    borderWidth: 1,
    borderColor: "#ffcdd2",
  } as ViewStyle,
  summaryIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#deedf3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  } as ViewStyle,
  summaryRow: {
    flexDirection: "row",
    marginTop: 16,
  } as ViewStyle,
  summarySuccessBox: {
    flex: 1,
    backgroundColor: theme.colors.successBg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#cfe8d2",
    marginRight: 6,
  } as ViewStyle,
  summaryWarningBox: {
    flex: 1,
    backgroundColor: theme.colors.warningBg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ffe0b2",
    marginLeft: 6,
  } as ViewStyle,
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  modalCard: {
    width: 320,
    marginHorizontal: 20,
  } as ViewStyle,
});

export default styles;

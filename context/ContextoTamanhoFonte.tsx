import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { auth, firestore } from "../firebase";

export type FontSizeOption = "Pequeno" | "Medio" | "Grande";

type FontScale = {
  title: number;
  sectionTitle: number;
  body: number;
  caption: number;
  button: number;
};

type FontSizeContextValue = {
  selectedFontSize: FontSizeOption;
  fontScale: FontScale;
  loadingFontSize: boolean;
  setSelectedFontSize: (option: FontSizeOption) => Promise<void>;
};

const FONT_SCALES: Record<FontSizeOption, FontScale> = {
  Pequeno: {
    title: 24,
    sectionTitle: 17,
    body: 14,
    caption: 12,
    button: 16,
  },
  Medio: {
    title: 32,
    sectionTitle: 24,
    body: 19,
    caption: 15,
    button: 22,
  },
  Grande: {
    title: 38,
    sectionTitle: 28,
    body: 22,
    caption: 17,
    button: 26,
  },
};

const FontSizeContext = createContext<FontSizeContextValue | undefined>(undefined);

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [selectedFontSize, setSelectedFontSizeState] = useState<FontSizeOption>("Medio");
  const [loadingFontSize, setLoadingFontSize] = useState(true);

  useEffect(() => {
    let unsubscribePerfil: (() => void) | undefined;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (unsubscribePerfil) {
        unsubscribePerfil();
        unsubscribePerfil = undefined;
      }

      if (!user) {
        setSelectedFontSizeState("Medio");
        setLoadingFontSize(false);
        return;
      }

      setLoadingFontSize(true);
      const ref = firestore.collection("Usuario").doc(user.uid);

      unsubscribePerfil = ref.onSnapshot(
        async (doc) => {
          const data = doc.data();
          const tamanho = data?.tamanhoFonte;

          if (tamanho === "Pequeno" || tamanho === "Medio" || tamanho === "Grande") {
            setSelectedFontSizeState(tamanho);
          } else {
            await ref.set({ tamanhoFonte: "Medio" }, { merge: true });
            setSelectedFontSizeState("Medio");
          }

          setLoadingFontSize(false);
        },
        () => {
          setSelectedFontSizeState("Medio");
          setLoadingFontSize(false);
        }
      );
    });

    return () => {
      if (unsubscribePerfil) {
        unsubscribePerfil();
      }
      unsubscribeAuth();
    };
  }, []);

  const setSelectedFontSize = useCallback(async (option: FontSizeOption) => {
    setSelectedFontSizeState(option);

    const user = auth.currentUser;
    if (!user) {
      return;
    }

    await firestore.collection("Usuario").doc(user.uid).set(
      {
        tamanhoFonte: option,
      },
      { merge: true }
    );
  }, []);

  const value = useMemo(
    () => ({
      selectedFontSize,
      fontScale: FONT_SCALES[selectedFontSize],
      loadingFontSize,
      setSelectedFontSize,
    }),
    [loadingFontSize, selectedFontSize, setSelectedFontSize]
  );

  return <FontSizeContext.Provider value={value}>{children}</FontSizeContext.Provider>;
}

export function useFontSizeContext() {
  const context = useContext(FontSizeContext);

  if (!context) {
    throw new Error("useFontSizeContext must be used within FontSizeProvider");
  }

  return context;
}

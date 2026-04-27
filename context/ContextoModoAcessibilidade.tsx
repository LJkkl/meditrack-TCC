import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { auth, firestore } from "../firebase";

type AccessibilityMode = "normal" | "idoso";

type AccessibilityModeContextValue = {
  mode: AccessibilityMode;
  isModoIdoso: boolean;
  loadingMode: boolean;
  setMode: (mode: AccessibilityMode) => Promise<void>;
  toggleModoIdoso: () => Promise<void>;
};

const AccessibilityModeContext = createContext<AccessibilityModeContextValue | undefined>(undefined);

export function AccessibilityModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AccessibilityMode>("normal");
  const [loadingMode, setLoadingMode] = useState(true);

  useEffect(() => {
    let unsubscribePerfil: (() => void) | undefined;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (unsubscribePerfil) {
        unsubscribePerfil();
        unsubscribePerfil = undefined;
      }

      if (!user) {
        setModeState("normal");
        setLoadingMode(false);
        return;
      }

      setLoadingMode(true);
      const ref = firestore.collection("Usuario").doc(user.uid);

      unsubscribePerfil = ref.onSnapshot(
        async (doc) => {
          const data = doc.data();
          const modoSalvo = data?.modoInterface;

          if (modoSalvo === "idoso" || modoSalvo === "normal") {
            setModeState(modoSalvo);
          } else {
            await ref.set({ modoInterface: "normal" }, { merge: true });
            setModeState("normal");
          }

          setLoadingMode(false);
        },
        () => {
          setModeState("normal");
          setLoadingMode(false);
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

  const setMode = useCallback(async (nextMode: AccessibilityMode) => {
    const user = auth.currentUser;
    setModeState(nextMode);

    if (!user) {
      return;
    }

    await firestore.collection("Usuario").doc(user.uid).set(
      {
        modoInterface: nextMode,
      },
      { merge: true }
    );
  }, []);

  const toggleModoIdoso = useCallback(async () => {
    await setMode(mode === "idoso" ? "normal" : "idoso");
  }, [mode, setMode]);

  const value = useMemo(
    () => ({
      mode,
      isModoIdoso: mode === "idoso",
      loadingMode,
      setMode,
      toggleModoIdoso,
    }),
    [loadingMode, mode, setMode, toggleModoIdoso]
  );

  return (
    <AccessibilityModeContext.Provider value={value}>
      {children}
    </AccessibilityModeContext.Provider>
  );
}

export function useAccessibilityModeContext() {
  const context = useContext(AccessibilityModeContext);

  if (!context) {
    throw new Error("useAccessibilityModeContext must be used within AccessibilityModeProvider");
  }

  return context;
}

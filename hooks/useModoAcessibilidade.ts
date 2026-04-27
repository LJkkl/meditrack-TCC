import { useAccessibilityModeContext } from "../context/ContextoModoAcessibilidade";

export function useModoAcessibilidade() {
  return useAccessibilityModeContext();
}

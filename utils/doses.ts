export const TOLERANCIA_ATRASO_MS = 3 * 60 * 1000;

export function passouDaTolerancia(previstoPara: number, agora = Date.now()) {
  return agora > previstoPara + TOLERANCIA_ATRASO_MS;
}

export function calcularAtrasoComToleranciaMs(previstoPara: number, realizadoEm?: number | null) {
  if (realizadoEm == null) {
    return 0;
  }

  return Math.max(0, realizadoEm - previstoPara - TOLERANCIA_ATRASO_MS);
}

export const formatoDataHoraBR: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
};

export function formatarDataHoraBR(valor: number | Date): string {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return '--/--/---- --:--';
  }
  return data.toLocaleString('pt-BR', formatoDataHoraBR);
}

/**
 * Validação de placa veicular brasileira
 * Padrões: ABC-1234 (antiga) e ABC1D23 (Mercosul)
 */

/** Normaliza a placa: trim, uppercase, remove espaços e hífen */
export function normalizePlate(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/\s/g, '')
    .replace(/-/g, '');
}

/** Valida placa brasileira (antiga ou Mercosul). Aceita entrada já normalizada ou normaliza internamente. */
export function isValidBrazilPlate(plate: string): boolean {
  const n = normalizePlate(plate);
  if (n.length === 0) return false;
  // Antiga: ABC1234 | Mercosul: ABC1D23
  return /^(?:[A-Z]{3}[0-9]{4}|[A-Z]{3}[0-9][A-Z][0-9]{2})$/.test(n);
}

/** Formata para exibição: antiga com hífen (ABC-1234), Mercosul sem hífen (ABC1D23) */
export function formatPlateForDisplay(plate: string): string {
  const n = normalizePlate(plate);
  if (n.length === 0) return '';
  if (/^[A-Z]{3}[0-9]{4}$/.test(n)) {
    return `${n.slice(0, 3)}-${n.slice(3)}`;
  }
  return n;
}

/** Filtra caracteres: permite apenas A-Z, 0-9, hífen e espaço */
export function filterPlateInput(value: string): string {
  return value.replace(/[^A-Za-z0-9\s-]/g, '');
}

/*
 * Exemplos de teste:
 * normalizePlate("abc-1234") => "ABC1234" | isValidBrazilPlate("abc-1234") => true
 * normalizePlate("ABC1234") => "ABC1234" | isValidBrazilPlate("ABC1234") => true
 * normalizePlate("abc1d23") => "ABC1D23" | isValidBrazilPlate("abc1d23") => true
 * isValidBrazilPlate("AB12C34") => false
 * isValidBrazilPlate("AAAA123") => false
 * isValidBrazilPlate("abc 1234") => true (espaço removido)
 */

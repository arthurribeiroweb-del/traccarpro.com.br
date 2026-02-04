/**
 * Geração de contrato com placeholders
 * Favorável à empresa (comodato, devolução, prazo mínimo, R$300, inadimplência)
 */

export const CONTRACT_PLACEHOLDERS = {
  monthly_card_price: '49,90',
  monthly_boleto_price: '59,90',
  min_term_months: '6',
  return_days: '10',
  equipment_fee: '300,00',
  foro_city: 'Marabá',
  foro_uf: 'PA',
} as const;

export function fillContractTemplate(
  html: string,
  overrides?: Partial<Record<keyof typeof CONTRACT_PLACEHOLDERS, string>>
): string {
  const vars = { ...CONTRACT_PLACEHOLDERS, ...overrides };
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return result;
}

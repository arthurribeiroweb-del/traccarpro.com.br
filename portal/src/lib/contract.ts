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
  // Dados do veículo
  vehicle_tipo: '',
  vehicle_placa: '',
  vehicle_marca_modelo: '',
  vehicle_ano: '',
  vehicle_cor: '',
  vehicle_renavam: '',
  vehicle_chassi: '',
} as const;

export type VehicleData = {
  tipo?: string;
  placa?: string;
  marcaModelo?: string;
  ano?: string;
  cor?: string;
  renavam?: string;
  chassi?: string;
};

export function fillContractTemplate(
  html: string,
  overrides?: Partial<Record<keyof typeof CONTRACT_PLACEHOLDERS, string>>,
  vehicle?: VehicleData | null
): string {
  const vars = { ...CONTRACT_PLACEHOLDERS, ...overrides };
  if (vehicle) {
    vars.vehicle_tipo = vehicle.tipo ?? '';
    vars.vehicle_placa = vehicle.placa ?? '';
    vars.vehicle_marca_modelo = vehicle.marcaModelo ?? '';
    vars.vehicle_ano = vehicle.ano ?? '';
    vars.vehicle_cor = vehicle.cor ?? '';
    vars.vehicle_renavam = vehicle.renavam ?? '';
    vars.vehicle_chassi = vehicle.chassi ?? '';
  }
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value ?? ''));
  }
  return result;
}

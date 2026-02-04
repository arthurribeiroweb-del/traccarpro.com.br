/**
 * Validação de formulários brasileiros
 * CPF, E-mail, WhatsApp (sem libs externas)
 */

// --- CPF ---

/** Normaliza CPF: remove tudo que não for dígito */
export function normalizeCPF(input: string): string {
  return input.replace(/\D/g, '');
}

/** Valida CPF com dígitos verificadores */
export function isValidCPF(input: string): boolean {
  const digits = normalizeCPF(input);
  if (digits.length !== 11) return false;
  // Rejeitar sequências iguais
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * (10 - i);
  }
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * (11 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[10], 10)) return false;

  return true;
}

/** Formata CPF para exibição: 000.000.000-00 */
export function formatCPF(digits: string): string {
  const d = normalizeCPF(digits).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Filtra entrada: apenas dígitos */
export function filterCPFInput(value: string): string {
  return value.replace(/\D/g, '');
}

// --- E-mail ---

/** Normaliza e-mail: trim + lowercase */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/** Valida e-mail (prático, sem RFC completa) */
export function isValidEmail(input: string): boolean {
  const n = normalizeEmail(input);
  if (n.length === 0) return false;
  if (/\s/.test(n)) return false;
  // 1 @, parte local e domínio, domínio com pelo menos 1 ponto
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(n);
}

/** Filtra e-mail: remove espaços (e-mail não permite espaços) */
export function filterEmailInput(value: string): string {
  return value.replace(/\s/g, '');
}

// --- WhatsApp BR ---

/** Normaliza WhatsApp: apenas dígitos. Para E.164 BR: 55 + DDD + número (13 dígitos) */
export function normalizeWhatsAppBR(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length === 13) return digits;
  if (digits.length === 11) return `55${digits}`; // Converte para E.164
  return digits;
}

/** Valida WhatsApp brasileiro: 11 dígitos (DD 9xxxx-xxxx) ou 13 com 55 */
export function isValidWhatsAppBR(input: string): boolean {
  const digits = normalizeWhatsAppBR(input);
  // 11 dígitos: DDD(2) + 9 + 8 dígitos (celular)
  if (/^\d{2}9\d{8}$/.test(digits)) return true;
  // 13 dígitos: 55 + DDD(2) + 9 + 8 dígitos
  if (/^55\d{2}9\d{8}$/.test(digits)) return true;
  return false;
}

/** Formata WhatsApp para exibição: (94) 9 9999-9999 ou +55 (94) 9 9999-9999 */
export function formatWhatsAppBR(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.startsWith('55') && d.length === 13) {
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 5)} ${d.slice(5, 9)}-${d.slice(9)}`;
  }
  if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
  return digits;
}

/** Filtra entrada: apenas dígitos, + e espaços (para digitação) */
export function filterWhatsAppInput(value: string): string {
  return value.replace(/[^\d\s+()-]/g, '');
}

/*
 * Exemplos de teste:
 * CPF: isValidCPF("00000000000") => false, isValidCPF("11111111111") => false
 * CPF válido (ex.): 529.982.247-25 => isValidCPF => true
 * Email: isValidEmail("a@b.com") => true, isValidEmail("a@b") => false, isValidEmail("a@@b.com") => false
 * WhatsApp: isValidWhatsAppBR("94999999999") => true, isValidWhatsAppBR("+55 94 99999-9999") => true
 * WhatsApp: isValidWhatsAppBR("999999999") => false (curto)
 */

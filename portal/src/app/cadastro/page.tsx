'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/** Sanitiza CEP: remove tudo que não for dígito */
function sanitizeCEP(value: string): string {
  return value.replace(/\D/g, '');
}

const VIA_CEP_BASE = 'https://viacep.com.br/ws';
const CEP_DEBOUNCE_MS = 400;
const CEP_FETCH_TIMEOUT_MS = 10000;
import Link from 'next/link';
import { normalizePlate, isValidBrazilPlate, filterPlateInput } from '@/lib/plate';
import {
  normalizeCPF,
  isValidCPF,
  filterCPFInput,
  formatCPF,
  normalizeEmail,
  isValidEmail,
  filterEmailInput,
  normalizeWhatsAppBR,
  isValidWhatsAppBR,
  filterWhatsAppInput,
} from '@/lib/validation';

const STORAGE_KEY = 'cadastroDraft';
const STEPS = ['Identificação', 'Veículo', 'Documentos', 'Revisão & Envio'];
const API_REQUEST_TIMEOUT_MS = 20000;
const API_UPLOAD_TIMEOUT_MS = 90000;

const WHATSAPP_URL =
  'https://api.whatsapp.com/send/?phone=559491796309&text=' +
  encodeURIComponent('Olá! Tenho dúvidas sobre o cadastro TraccarPro.');

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  if (text.trim().startsWith('<')) {
    throw new Error('O servidor retornou uma resposta inválida. Tente novamente em alguns segundos.');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Resposta inválida do servidor. Tente novamente.');
  }
}

function normalizeApiError(error: unknown): Error {
  if (error instanceof Error) {
    const msg = error.message?.toLowerCase() || '';
    if (
      msg.includes('load failed')
      || msg.includes('failed to fetch')
      || msg.includes('networkerror')
      || msg.includes('network request failed')
    ) {
      return new Error('Falha de conexão no envio. Verifique sua internet e tente novamente.');
    }
    return error;
  }
  return new Error('Não foi possível conectar ao servidor.');
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = API_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('A conexão demorou demais. Verifique o sinal de internet e tente novamente.');
    }
    throw normalizeApiError(error);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonApi(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: { timeoutMs?: number; retries?: number } = {}
) {
  const timeoutMs = options.timeoutMs ?? API_REQUEST_TIMEOUT_MS;
  const retries = options.retries ?? 1;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(input, init, timeoutMs);
      const json = await parseJsonResponse(res);
      return { res, json };
    } catch (error) {
      lastError = normalizeApiError(error);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 700 * attempt));
      }
    }
  }

  throw lastError ?? new Error('Não foi possível concluir a comunicação com o servidor.');
}

const defaultForm = {
  type: 'PF' as 'PF' | 'PJ',
  name: '',
  companyName: '',
  responsibleName: '',
  cpf: '',
  cnpj: '',
  responsibleCpf: '',
  birthDate: '',
  email: '',
  phone: '',
  address: { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
  vehicle: { tipo: '', placa: '', marcaModelo: '', ano: '', cor: '', observacoes: '' },
  documents: [] as { key: string; path?: string; filename: string; size: number; pending?: boolean }[],
  acceptedLgpd: false,
};

export default function CadastroWizardPage() {
  const pendingFilesRef = useRef<Record<string, File>>({});
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(defaultForm);
  const [id, setId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setForm((prev) => ({ ...defaultForm, ...prev, ...parsed }));
        if (parsed.id) setId(parsed.id);
      }
    } catch {
      //
    }
  }, []);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const saveDraft = useCallback(
    (data: Partial<typeof form> & { id?: string }) => {
      const next = { ...form, ...data };
      setForm(next);
      if (data.id) setId(data.id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, id: id || data.id }));
      } catch {
        //
      }
    },
    [form, id]
  );

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (form.type === 'PF') {
      if (!form.name?.trim()) e.name = 'Nome completo é obrigatório';
      if (!form.cpf?.trim()) e.cpf = 'CPF é obrigatório';
      else if (!isValidCPF(form.cpf)) e.cpf = 'CPF inválido. Verifique os dígitos.';
    } else {
      if (!form.companyName?.trim()) e.companyName = 'Razão social é obrigatória';
      if (!form.cnpj?.trim()) e.cnpj = 'CNPJ é obrigatório';
      if (!form.responsibleName?.trim()) e.responsibleName = 'Nome do responsável é obrigatório';
      if (!form.responsibleCpf?.trim()) e.responsibleCpf = 'CPF do responsável é obrigatório';
      else if (!isValidCPF(form.responsibleCpf || '')) e.responsibleCpf = 'CPF inválido. Verifique os dígitos.';
    }
    if (!form.email?.trim()) e.email = 'E-mail é obrigatório';
    else if (!isValidEmail(form.email)) e.email = 'E-mail inválido. Ex: nome@dominio.com';
    if (!form.phone?.trim()) e.phone = 'Celular/WhatsApp é obrigatório';
    else if (!isValidWhatsAppBR(form.phone)) e.phone = 'WhatsApp inválido. Use DDD + número. Ex: (94) 9XXXX-XXXX';
    const a = form.address;
    if (!a.cep?.trim() || !a.rua?.trim() || !a.numero?.trim() || !a.bairro?.trim() || !a.cidade?.trim() || !a.uf?.trim()) {
      e.address = 'Endereço completo é obrigatório (CEP, rua, número, bairro, cidade, UF)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.vehicle.tipo?.trim()) e.tipo = 'Tipo do veículo é obrigatório';
    if (!form.vehicle.placa?.trim()) {
      e.placa = 'Placa é obrigatória';
    } else if (!isValidBrazilPlate(form.vehicle.placa)) {
      e.placa = 'Placa inválida. Use ABC-1234 (antiga) ou ABC1D23 (Mercosul).';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    const docs = form.documents || [];
    const hasDoc = (k: string) => docs.some((d) => d.key === k);
    if (form.type === 'PF') {
      if (!hasDoc('doc_foto')) e.doc_foto = 'Documento com foto (CNH ou RG) é obrigatório';
      if (!hasDoc('comprovante_residencia')) e.comprovante = 'Comprovante de residência é obrigatório';
    } else {
      if (!hasDoc('cartao_cnpj')) e.cartao_cnpj = 'Cartão CNPJ é obrigatório';
      if (!hasDoc('doc_responsavel')) e.doc_responsavel = 'Documento do responsável é obrigatório';
      if (!hasDoc('comprovante_residencia')) e.comprovante = 'Comprovante de endereço é obrigatório';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep4 = () => {
    const e: Record<string, string> = {};
    if (!form.acceptedLgpd) e.lgpd = 'Aceite o tratamento de dados LGPD';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    let ok = false;
    if (step === 1) ok = validateStep1();
    else if (step === 2) ok = validateStep2();
    else if (step === 3) ok = validateStep3();
    if (ok && step < 4) {
      if (step === 2 && !id) {
        setSubmitting(true);
        try {
          const payload = {
            id: undefined,
            type: form.type,
            name: form.name,
            companyName: form.companyName,
            responsibleName: form.responsibleName,
            cpf: form.cpf,
            cnpj: form.cnpj,
            responsibleCpf: form.responsibleCpf,
            birthDate: form.birthDate || null,
            email: form.email,
            phone: form.phone,
            addressJson: form.address,
            vehicleJson: form.vehicle,
            documentsJson: JSON.stringify(form.documents),
          };
          const { res, json } = await fetchJsonApi('/api/signup-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok && json.id) {
            setId(json.id);
            saveDraft({ id: json.id });
          }
        } catch {
          //
        } finally {
          setSubmitting(false);
        }
      }
      setStep(step + 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep4()) return;

    setSubmitting(true);
    setErrors({});
    try {
      let currentId = id;
      let documents = form.documents.filter((d) => !d.pending);

      // Se há arquivos pendentes, criar rascunho e fazer upload primeiro
      const pending = pendingFilesRef.current;
      const pendingKeys = Object.keys(pending);
      if (pendingKeys.length > 0) {
        if (!currentId) {
          const { res, json } = await fetchJsonApi('/api/signup-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: form.type,
              name: form.name,
              companyName: form.companyName,
              responsibleName: form.responsibleName,
              cpf: form.cpf,
              cnpj: form.cnpj,
              responsibleCpf: form.responsibleCpf,
              birthDate: form.birthDate || null,
              email: form.email,
              phone: form.phone,
              addressJson: form.address,
              vehicleJson: form.vehicle,
              documentsJson: JSON.stringify(documents),
              formaPagamento: 'cartao',
            }),
          });
          if (!res.ok || !json.id) throw new Error(json.error || 'Erro ao salvar');
          currentId = json.id;
          setId(currentId);
        }
        for (const key of pendingKeys) {
          const file = pending[key];
          const fd = new FormData();
          fd.append('file', file);
          fd.append('key', key);
          const { res, json } = await fetchJsonApi(`/api/signup-requests/${currentId}/documents`, {
            method: 'POST',
            body: fd,
          }, { timeoutMs: API_UPLOAD_TIMEOUT_MS, retries: 2 });
          if (!res.ok) throw new Error(json.error || 'Erro ao enviar arquivo');
          documents = [...documents.filter((d) => d.key !== key), { key, path: json.path, filename: file.name, size: file.size }];
        }
        pendingFilesRef.current = {};
      }

      const vehicleForSubmit = {
        ...form.vehicle,
        placa: normalizePlate(form.vehicle.placa),
      };
      const payload = {
        id: currentId || undefined,
        _action: 'submit',
        type: form.type,
        name: form.name?.trim(),
        companyName: form.companyName?.trim(),
        responsibleName: form.responsibleName?.trim(),
        cpf: form.type === 'PF' ? normalizeCPF(form.cpf) : undefined,
        cnpj: form.cnpj,
        responsibleCpf: form.type === 'PJ' ? normalizeCPF(form.responsibleCpf || '') : undefined,
        birthDate: form.birthDate || null,
        email: normalizeEmail(form.email),
        phone: normalizeWhatsAppBR(form.phone),
        addressJson: form.address,
        vehicleJson: vehicleForSubmit,
        documentsJson: JSON.stringify(documents),
        formaPagamento: 'cartao',
        acceptedLgpd: form.acceptedLgpd,
      };

      const { res, json } = await fetchJsonApi('/api/signup-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, { retries: 2 });
      if (!res.ok) throw new Error(json.error || 'Erro ao enviar');

      setId(json.id || currentId);
      localStorage.removeItem(STORAGE_KEY);
      setSubmitted(true);
    } catch (e) {
      setErrors({ submit: e instanceof Error ? e.message : 'Erro ao enviar' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      const payload = {
        id: id || undefined,
        type: form.type,
        name: form.name,
        companyName: form.companyName,
        responsibleName: form.responsibleName,
        cpf: form.cpf,
        cnpj: form.cnpj,
        responsibleCpf: form.responsibleCpf,
        birthDate: form.birthDate || null,
        email: form.email,
        phone: form.phone,
        addressJson: form.address,
        vehicleJson: form.vehicle,
        documentsJson: JSON.stringify(form.documents),
      };

      const { res, json } = await fetchJsonApi('/api/signup-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok && json.id) {
        setId(json.id);
        saveDraft({ id: json.id });
      }
    } catch {
      //
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <h1 className="text-2xl font-semibold text-white">Recebido ✅</h1>
          <p className="mt-4 text-zinc-300">
            Sua solicitação está em análise. Você será avisado quando o contrato estiver pronto para assinar.
          </p>
          <p className="mt-8 text-center">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Falar no WhatsApp
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-white">Cadastro para Contrato TraccarPro</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Preencha seus dados e envie os documentos. Após análise, enviaremos o contrato para assinatura.
        </p>

        <div className="mt-8 flex gap-2" role="tablist" aria-label="Progresso">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded ${i + 1 <= step ? 'bg-blue-600' : 'bg-zinc-700'}`}
              title={s}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">Passo {step} de 4: {STEPS[step - 1]}</p>

        {Object.keys(errors).length > 0 && (
          <div className="mt-6 rounded-lg border border-amber-700/50 bg-amber-950/20 p-4" role="alert">
            <p className="text-sm font-medium text-amber-200">Corrija os erros:</p>
            <ul className="mt-2 list-inside list-disc text-sm text-amber-100">
              {Object.entries(errors).map(([k, v]) => (
                <li key={k}>{v}</li>
              ))}
            </ul>
          </div>
        )}

        {step === 1 && (
          <Step1Form form={form} setForm={saveDraft} errors={errors} setErrors={setErrors} />
        )}
        {step === 2 && (
          <Step2Form form={form} setForm={saveDraft} errors={errors} setErrors={setErrors} />
        )}
        {step === 3 && (
          <Step3Form form={form} setForm={saveDraft} id={id} pendingFilesRef={pendingFilesRef} onInvalidId={() => {
            setId(null);
            try {
              const raw = localStorage.getItem(STORAGE_KEY);
              if (raw) {
                const parsed = JSON.parse(raw);
                delete parsed.id;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
              }
            } catch { /* ignore */ }
          }} onEnsureId={async () => {
            if (id) return id;
            setSubmitting(true);
            try {
              const payload = {
                type: form.type,
                name: form.name,
                companyName: form.companyName,
                responsibleName: form.responsibleName,
                cpf: form.cpf,
                cnpj: form.cnpj,
                responsibleCpf: form.responsibleCpf,
                birthDate: form.birthDate || null,
                email: form.email,
                phone: form.phone,
                addressJson: form.address,
                vehicleJson: form.vehicle,
                documentsJson: JSON.stringify(form.documents),
              };
              const { res, json } = await fetchJsonApi('/api/signup-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              }, { retries: 2 });
              if (res.ok && json.id) {
                setId(json.id);
                saveDraft({ id: json.id });
                return json.id;
              }
              return null;
            } catch {
              return null;
            } finally {
              setSubmitting(false);
            }
          }} errors={errors} />
        )}
        {step === 4 && (
          <Step4Form form={form} setForm={saveDraft} errors={errors} />
        )}

        <div className="mt-10 flex flex-col gap-3">
          {step < 4 ? (
            <>
              <button
                type="button"
                onClick={() => handleNext()}
                disabled={submitting}
                className="min-h-[44px] w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {submitting ? 'Salvando...' : 'Continuar'}
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={submitting}
                className="min-h-[44px] w-full rounded-lg border border-zinc-600 px-6 py-3 font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                {submitting ? 'Salvando...' : 'Continuar depois'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="min-h-[44px] w-full rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Enviar para análise'}
            </button>
          )}
        </div>

        {step > 1 && (
          <p className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="text-sm text-zinc-500 hover:underline"
            >
              ← Voltar
            </button>
          </p>
        )}

        <p className="mt-8 text-center">
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">
            Falar no WhatsApp
          </a>
        </p>
      </div>
    </main>
  );
}

function Step1Form({
  form,
  setForm,
  errors,
  setErrors,
}: {
  form: typeof defaultForm;
  setForm: (d: Partial<typeof defaultForm>) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [cepFetching, setCepFetching] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchViaCEP = useCallback(
    async (cepRaw: string) => {
      const cep = sanitizeCEP(cepRaw);
      if (cep.length !== 8) return;

      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const controller = abortRef.current;
      const signal = controller.signal;
      const timeoutId = setTimeout(() => controller.abort(), CEP_FETCH_TIMEOUT_MS);
      setCepError(null);
      setCepFetching(true);

      try {
        const res = await fetch(`${VIA_CEP_BASE}/${cep}/json/`, {
          signal,
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
        if (data.erro === true || !data.logradouro) {
          setCepError('CEP não encontrado');
          return;
        }
        setForm({
          address: {
            ...form.address,
            rua: data.logradouro ?? '',
            bairro: data.bairro ?? '',
            cidade: data.localidade ?? '',
            uf: (data.uf ?? '').toUpperCase(),
          },
        });
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setCepError('Não foi possível consultar agora. Preencha manualmente.');
      } finally {
        clearTimeout(timeoutId);
        setCepFetching(false);
        abortRef.current = null;
      }
    },
    [form.address, setForm]
  );

  const handleCepChange = useCallback(
    (value: string) => {
      const digits = sanitizeCEP(value).slice(0, 8);
      setForm({ address: { ...form.address, cep: digits } });
      setCepError(null);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (digits.length === 8) {
        debounceRef.current = setTimeout(() => fetchViaCEP(digits), CEP_DEBOUNCE_MS);
      }
    },
    [form.address, setForm, fetchViaCEP]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return (
    <div className="mt-8 space-y-6">
      <fieldset>
        <legend className="text-sm font-medium text-zinc-300">Tipo de cadastro</legend>
        <div className="mt-2 flex gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="type"
              checked={form.type === 'PF'}
              onChange={() => setForm({ type: 'PF' })}
              className="rounded-full border-zinc-600 text-blue-600"
            />
            <span>Pessoa Física</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="type"
              checked={form.type === 'PJ'}
              onChange={() => setForm({ type: 'PJ' })}
              className="rounded-full border-zinc-600 text-blue-600"
            />
            <span>Pessoa Jurídica</span>
          </label>
        </div>
      </fieldset>

      {form.type === 'PF' ? (
        <>
          <div>
            <label htmlFor="name" className="block text-sm text-zinc-400">Nome completo</label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white"
              aria-describedby={errors.name ? 'err-name' : undefined}
            />
          </div>
          <div>
            <label htmlFor="cpf" className="block text-sm text-zinc-400">CPF</label>
            <input
              id="cpf"
              type="text"
              value={form.cpf}
              onChange={(e) => setForm({ cpf: formatCPF(filterCPFInput(e.target.value)) })}
              onBlur={() => {
                if (form.cpf && !isValidCPF(form.cpf)) {
                  setErrors((p) => ({ ...p, cpf: 'CPF inválido. Verifique os dígitos.' }));
                } else if (errors.cpf) setErrors((p) => { const n = { ...p }; delete n.cpf; return n; });
              }}
              placeholder="000.000.000-00"
              maxLength={14}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500"
              aria-invalid={!!errors.cpf}
              aria-describedby={errors.cpf ? 'cpf-error' : undefined}
            />
            {errors.cpf && <p id="cpf-error" className="mt-1 text-sm text-amber-500" role="alert">{errors.cpf}</p>}
          </div>
          <div>
            <label htmlFor="birthDate" className="block text-sm text-zinc-400">Data de nascimento</label>
            <input
              id="birthDate"
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm({ birthDate: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="companyName" className="block text-sm text-zinc-400">Razão social</label>
            <input
              id="companyName"
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ companyName: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label htmlFor="cnpj" className="block text-sm text-zinc-400">CNPJ</label>
            <input
              id="cnpj"
              type="text"
              value={form.cnpj}
              onChange={(e) => setForm({ cnpj: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label htmlFor="responsibleName" className="block text-sm text-zinc-400">Nome do responsável</label>
            <input
              id="responsibleName"
              type="text"
              value={form.responsibleName}
              onChange={(e) => setForm({ responsibleName: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label htmlFor="responsibleCpf" className="block text-sm text-zinc-400">CPF do responsável</label>
            <input
              id="responsibleCpf"
              type="text"
              value={form.responsibleCpf}
              onChange={(e) => setForm({ responsibleCpf: formatCPF(filterCPFInput(e.target.value)) })}
              onBlur={() => {
                if (form.responsibleCpf && !isValidCPF(form.responsibleCpf)) {
                  setErrors((p) => ({ ...p, responsibleCpf: 'CPF inválido. Verifique os dígitos.' }));
                } else if (errors.responsibleCpf) setErrors((p) => { const n = { ...p }; delete n.responsibleCpf; return n; });
              }}
              placeholder="000.000.000-00"
              maxLength={14}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500"
              aria-invalid={!!errors.responsibleCpf}
              aria-describedby={errors.responsibleCpf ? 'responsibleCpf-error' : undefined}
            />
            {errors.responsibleCpf && <p id="responsibleCpf-error" className="mt-1 text-sm text-amber-500" role="alert">{errors.responsibleCpf}</p>}
          </div>
        </>
      )}

      <div>
        <label htmlFor="email" className="block text-sm text-zinc-400">E-mail</label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ email: filterEmailInput(e.target.value) })}
          onBlur={() => {
            if (form.email && !isValidEmail(form.email)) {
              setErrors((p) => ({ ...p, email: 'E-mail inválido. Ex: nome@dominio.com' }));
            } else if (errors.email) setErrors((p) => { const n = { ...p }; delete n.email; return n; });
          }}
          placeholder="nome@dominio.com"
          className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && <p id="email-error" className="mt-1 text-sm text-amber-500" role="alert">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm text-zinc-400">Celular/WhatsApp</label>
        <input
          id="phone"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ phone: filterWhatsAppInput(e.target.value) })}
          onBlur={() => {
            if (form.phone && !isValidWhatsAppBR(form.phone)) {
              setErrors((p) => ({ ...p, phone: 'WhatsApp inválido. Use DDD + número. Ex: (94) 9XXXX-XXXX' }));
            } else if (errors.phone) setErrors((p) => { const n = { ...p }; delete n.phone; return n; });
          }}
          placeholder="(94) 9 9999-9999"
          className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500"
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? 'phone-error' : undefined}
        />
        <p className="mt-1 text-xs text-zinc-500">Aceita com ou sem +55. Ex: (94) 9XXXX-XXXX</p>
        {errors.phone && <p id="phone-error" className="mt-1 text-sm text-amber-500" role="alert">{errors.phone}</p>}
      </div>

      <div className="border-t border-zinc-700 pt-6">
        <h3 className="text-sm font-medium text-zinc-300">Endereço</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cep" className="block text-sm text-zinc-400">CEP</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="cep"
                type="text"
                inputMode="numeric"
                value={form.address.cep}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="00000000"
                maxLength={9}
                className="flex-1 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500"
                aria-describedby={cepError ? 'cep-error' : cepFetching ? 'cep-status' : undefined}
                aria-invalid={!!cepError}
              />
              {cepFetching && (
                <span id="cep-status" className="shrink-0 text-xs text-blue-400" aria-live="polite">
                  Buscando CEP…
                </span>
              )}
            </div>
            {cepError && (
              <p id="cep-error" className="mt-1 text-sm text-amber-500" role="alert">
                {cepError}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="rua" className="block text-sm text-zinc-400">Rua</label>
            <input
              id="rua"
              type="text"
              value={form.address.rua}
              onChange={(e) => setForm({ address: { ...form.address, rua: e.target.value } })}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label htmlFor="numero" className="block text-sm text-zinc-400">Número</label>
            <input
              id="numero"
              type="text"
              value={form.address.numero}
              onChange={(e) => setForm({ address: { ...form.address, numero: e.target.value } })}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label htmlFor="complemento" className="block text-sm text-zinc-400">Complemento</label>
            <input
              id="complemento"
              type="text"
              value={form.address.complemento}
              onChange={(e) => setForm({ address: { ...form.address, complemento: e.target.value } })}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label htmlFor="bairro" className="block text-sm text-zinc-400">Bairro</label>
            <input
              id="bairro"
              type="text"
              value={form.address.bairro}
              onChange={(e) => setForm({ address: { ...form.address, bairro: e.target.value } })}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label htmlFor="cidade" className="block text-sm text-zinc-400">Cidade</label>
            <input
              id="cidade"
              type="text"
              value={form.address.cidade}
              onChange={(e) => setForm({ address: { ...form.address, cidade: e.target.value } })}
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label htmlFor="uf" className="block text-sm text-zinc-400">UF</label>
            <input
              id="uf"
              type="text"
              value={form.address.uf}
              onChange={(e) => setForm({ address: { ...form.address, uf: e.target.value.toUpperCase().slice(0, 2) } })}
              maxLength={2}
              placeholder="PA"
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Step2Form({
  form,
  setForm,
  errors,
  setErrors,
}: {
  form: typeof defaultForm;
  setForm: (d: Partial<typeof defaultForm>) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const tipos = ['Moto', 'Carro', 'Caminhão', 'Utilitário', 'Máquina'];
  return (
    <div className="mt-8 space-y-6">
      <div>
        <label className="block text-sm text-zinc-400">Tipo do veículo</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {tipos.map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-600 px-4 py-2">
              <input
                type="radio"
                name="tipo"
                checked={form.vehicle.tipo === t}
                onChange={() => setForm({ vehicle: { ...form.vehicle, tipo: t } })}
                className="rounded-full border-zinc-600 text-blue-600"
              />
              <span>{t}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="placa" className="block text-sm text-zinc-400">Placa</label>
        <input
          id="placa"
          type="text"
          value={form.vehicle.placa}
          onChange={(e) => {
            const filtered = filterPlateInput(e.target.value).toUpperCase();
            setForm({ vehicle: { ...form.vehicle, placa: filtered } });
          }}
          onBlur={() => {
            if (form.vehicle.placa && !isValidBrazilPlate(form.vehicle.placa)) {
              setErrors((prev) => ({ ...prev, placa: 'Placa inválida. Use ABC-1234 (antiga) ou ABC1D23 (Mercosul).' }));
            } else if (errors.placa) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.placa;
                return next;
              });
            }
          }}
          placeholder="Ex: ABC1D23 ou ABC-1234"
          maxLength={8}
          className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500"
          aria-describedby={errors.placa ? 'placa-error' : 'placa-help'}
          aria-invalid={!!errors.placa}
        />
        <p id="placa-help" className="mt-1 text-xs text-zinc-500">
          Aceita Mercosul (ABC1D23) e padrão antigo (ABC-1234).
        </p>
        {errors.placa && (
          <p id="placa-error" className="mt-1 text-sm text-amber-500" role="alert">
            {errors.placa}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="marcaModelo" className="block text-sm text-zinc-400">Marca/Modelo</label>
        <input
          id="marcaModelo"
          type="text"
          value={form.vehicle.marcaModelo}
          onChange={(e) => setForm({ vehicle: { ...form.vehicle, marcaModelo: e.target.value } })}
          className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ano" className="block text-sm text-zinc-400">Ano</label>
          <input
            id="ano"
            type="text"
            value={form.vehicle.ano}
            onChange={(e) => setForm({ vehicle: { ...form.vehicle, ano: e.target.value } })}
            placeholder="2024"
            className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white"
          />
        </div>
        <div>
          <label htmlFor="cor" className="block text-sm text-zinc-400">Cor</label>
          <input
            id="cor"
            type="text"
            value={form.vehicle.cor}
            onChange={(e) => setForm({ vehicle: { ...form.vehicle, cor: e.target.value } })}
            className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white"
          />
        </div>
      </div>
      <div>
        <label htmlFor="observacoes" className="block text-sm text-zinc-400">Observações</label>
        <textarea
          id="observacoes"
          value={form.vehicle.observacoes}
          onChange={(e) => setForm({ vehicle: { ...form.vehicle, observacoes: e.target.value } })}
          rows={2}
          className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white"
        />
      </div>
    </div>
  );
}

function Step3Form({
  form,
  setForm,
  id,
  pendingFilesRef,
  onEnsureId,
  onInvalidId,
  errors,
}: {
  form: typeof defaultForm;
  setForm: (d: Partial<typeof defaultForm>) => void;
  id: string | null;
  pendingFilesRef: React.MutableRefObject<Record<string, File>>;
  onEnsureId: () => Promise<string | null>;
  onInvalidId: () => void;
  errors: Record<string, string>;
}) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const required =
    form.type === 'PF'
      ? [
          { key: 'doc_foto', label: 'Documento com foto (CNH ou RG)' },
          { key: 'comprovante_residencia', label: 'Comprovante de residência (últimos 90 dias)' },
        ]
      : [
          { key: 'cartao_cnpj', label: 'Cartão CNPJ (ou comprovante de inscrição)' },
          { key: 'doc_responsavel', label: 'Documento do responsável (CNH/RG)' },
          { key: 'comprovante_residencia', label: 'Comprovante de endereço' },
        ];

  const isAllowedFile = (mime: string) => {
    if (mime.startsWith('image/')) return true;
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'application/vnd.oasis.opendocument.text',
    ];
    return allowed.includes(mime);
  };

  const handleFile = async (key: string, file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Arquivo excede 15MB');
      return;
    }
    const mime = file.type;
    if (!mime || !isAllowedFile(mime)) {
      setUploadError('Formato não permitido. Use imagens ou documentos (PDF, DOC, DOCX, etc.)');
      return;
    }

    let currentId = id;
    if (!currentId) {
      setUploadError(null);
      setUploading(key);
      currentId = await onEnsureId();
      if (!currentId) {
        setUploading(null);
        pendingFilesRef.current = { ...pendingFilesRef.current, [key]: file };
        setForm({
          documents: [...form.documents.filter((d) => d.key !== key), { key, filename: file.name, size: file.size, pending: true }],
        });
        setUploadError('Arquivo selecionado. Será enviado ao clicar em "Enviar para análise" no último passo.');
        return;
      }
      setUploading(null);
    }

    setUploadError(null);
    setUploading(key);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('key', key);
      const { res, json } = await fetchJsonApi(`/api/signup-requests/${currentId}/documents`, {
        method: 'POST',
        body: fd,
      }, { timeoutMs: API_UPLOAD_TIMEOUT_MS, retries: 3 });
      if (!res.ok) {
        if (res.status === 404 || json.error === 'Solicitação não encontrada') {
          onInvalidId();
          pendingFilesRef.current = { ...pendingFilesRef.current, [key]: file };
          setForm({
            documents: [...form.documents.filter((d) => d.key !== key), { key, filename: file.name, size: file.size, pending: true }],
          });
          setUploadError('Solicitação anterior expirou. Arquivos salvos — serão enviados ao clicar em "Enviar para análise".');
          return;
        }
        throw new Error(json.error || 'Erro');
      }
      const doc = { key, path: json.path, filename: file.name, size: file.size };
      setForm({
        documents: [...form.documents.filter((d) => d.key !== key), doc],
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Não foi possível enviar o arquivo. Tente novamente.');
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="mt-8 space-y-6">
      <p className="text-sm text-zinc-400">Arquivos: imagens e documentos (PDF, DOC, DOCX, etc.) até 15MB cada.</p>
      {uploadError && (
        <p className="text-sm text-amber-500" role="alert">
          {uploadError}
        </p>
      )}
      {required.map(({ key, label }) => {
        const doc = form.documents.find((d) => d.key === key);
        return (
          <div key={key} className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
            <label className="block text-sm font-medium text-zinc-300">{label}</label>
            {doc ? (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-zinc-400">
                  {doc.filename} ({(doc.size / 1024).toFixed(1)} KB)
                  {doc.pending && <span className="ml-1 text-amber-400">(será enviado ao finalizar)</span>}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    delete pendingFilesRef.current[key];
                    setForm({ documents: form.documents.filter((d) => d.key !== key) });
                  }}
                  className="text-sm text-red-400 hover:underline"
                >
                  Remover
                </button>
              </div>
            ) : (
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.odt,.txt,.rtf"
                  disabled={!!uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(key, f);
                    e.currentTarget.value = '';
                  }}
                  className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded file:border-0 file:bg-zinc-700 file:px-4 file:py-2 file:text-white"
                />
                {uploading === key && <p className="mt-1 text-xs text-blue-400">Fazendo upload…</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Step4Form({
  form,
  setForm,
  errors,
}: {
  form: typeof defaultForm;
  setForm: (d: Partial<typeof defaultForm>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-medium text-white">Resumo</h2>
        <ul className="mt-4 space-y-1 text-sm text-zinc-400">
          <li>{form.type === 'PF' ? form.name : form.companyName}</li>
          <li>{form.type === 'PF' ? `CPF: ${form.cpf}` : `CNPJ: ${form.cnpj}`}</li>
          <li>{form.email} • {form.phone}</li>
          <li>
            {form.address.rua}, {form.address.numero} — {form.address.bairro}, {form.address.cidade}/{form.address.uf}
          </li>
          <li>
            Veículo: {form.vehicle.tipo} — {form.vehicle.placa} {form.vehicle.marcaModelo && `— ${form.vehicle.marcaModelo}`}
          </li>
        </ul>
        <p className="mt-2 text-sm text-zinc-500">Use o botão &quot;Voltar&quot; abaixo para editar.</p>
      </section>

      <section className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-medium text-white">Aceite obrigatório</h2>
        <div className="mt-4">
          <label className="flex cursor-pointer gap-4">
            <input
              type="checkbox"
              checked={form.acceptedLgpd}
              onChange={(e) => setForm({ acceptedLgpd: e.target.checked })}
              className="mt-1 h-5 w-5 rounded border-zinc-600 text-blue-600"
            />
            <span className="text-sm text-zinc-300">
              Concordo com o tratamento de dados conforme LGPD (finalidades: contrato, suporte, alertas operacionais).
            </span>
          </label>
          <p className="mt-3 text-xs text-zinc-500">
            As demais condições (contrato 6 meses, comodato, taxa R$ 300) serão apresentadas no contrato enviado por link para assinatura.
          </p>
        </div>
      </section>
    </div>
  );
}

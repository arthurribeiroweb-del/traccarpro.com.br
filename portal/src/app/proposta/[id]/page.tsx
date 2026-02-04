'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const WHATSAPP_URL =
  'https://api.whatsapp.com/send/?phone=559491796309&text=' +
  encodeURIComponent('Olá! Tenho dúvidas sobre minha proposta.');

interface StatusData {
  status: string;
  returnDeadlineAt: string | null;
  returnTrackingCode: string | null;
  equipmentFeeDueCents: number;
  contractPdfUrl: string | null;
  flags: {
    isReturnPending: boolean;
    returnDeadlinePassed: boolean;
    feeDue: boolean;
    hasReturnTracking: boolean;
  };
}

export default function PropostaPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingSubmitting, setTrackingSubmitting] = useState(false);
  const [trackingSuccess, setTrackingSuccess] = useState(false);
  const [cancelRequesting, setCancelRequesting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/onboarding/${id}/status`)
      .then((r) => {
        if (!r.ok) throw new Error('Proposta não encontrada');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const fetchStatus = () => {
    fetch(`/api/onboarding/${id}/status`)
      .then((r) => r.json())
      .then(setData);
  };

  const handleRequestCancel = async () => {
    setCancelRequesting(true);
    try {
      const res = await fetch(`/api/onboarding/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'cliente' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao solicitar cancelamento');
      fetchStatus();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro');
    } finally {
      setCancelRequesting(false);
    }
  };

  const handleSubmitTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackingError(null);
    const code = trackingCode.trim();
    if (code.length < 8 || code.length > 20) {
      setTrackingError('Código deve ter entre 8 e 20 caracteres');
      return;
    }
    setTrackingSubmitting(true);
    try {
      const res = await fetch(`/api/onboarding/${id}/return-tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao enviar');
      setTrackingSuccess(true);
      setData((prev) =>
        prev
          ? {
              ...prev,
              returnTrackingCode: code,
              flags: { ...prev.flags, hasReturnTracking: true },
            }
          : null
      );
    } catch (e) {
      setTrackingError(e instanceof Error ? e.message : 'Erro ao enviar');
    } finally {
      setTrackingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <p className="text-zinc-400">Carregando proposta...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <p className="text-amber-500">{error || 'Proposta não encontrada'}</p>
          <Link href="/" className="mt-4 inline-block text-sm text-blue-400 hover:underline">
            ← Voltar
          </Link>
        </div>
      </main>
    );
  }

  const isReturnPending = data.status === 'RETURN_PENDING';
  const hasReturnTracking = data.flags.hasReturnTracking;
  const isFeeDue = data.status === 'FEE_DUE' || data.equipmentFeeDueCents > 0;
  const canRequestCancel = ['ACTIVE', 'DELINQUENT_SUSPENDED'].includes(data.status);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-white">
          Proposta #{id.slice(0, 8)}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">Status: {data.status}</p>

        <section className="mt-8 rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-medium text-white">Ações</h2>
          <ul className="mt-4 space-y-3">
            <li>
              <a
                href={`/api/onboarding/${id}/generate-contract`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Baixar contrato (PDF)
              </a>
            </li>
            {canRequestCancel && (
              <li>
                <button
                  type="button"
                  onClick={handleRequestCancel}
                  disabled={cancelRequesting}
                  className="rounded-lg border border-amber-600 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-950/30 disabled:opacity-50"
                >
                  {cancelRequesting ? 'Solicitando...' : 'Solicitar cancelamento'}
                </button>
                <p className="mt-1 text-xs text-zinc-500">
                  Após cancelar, será necessário devolver o rastreador e chip em até 10 dias.
                </p>
              </li>
            )}
          </ul>
        </section>

        {/* FEE_DUE */}
        {isFeeDue && (
          <section className="mt-8 rounded-xl border border-amber-700/50 bg-amber-950/20 p-6">
            <h2 className="text-lg font-medium text-amber-200">
              Taxa de reposição
            </h2>
            <p className="mt-2 text-sm text-zinc-300">
              Foi registrada taxa de R$ 300,00 referente ao equipamento (não
              devolução, perda, roubo ou dano). Entre em contato para
              regularização.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              Falar no WhatsApp
            </a>
          </section>
        )}

        {/* RETURN_PENDING */}
        {isReturnPending && (
          <section className="mt-8 rounded-xl border border-amber-700/50 bg-amber-950/20 p-6">
            <h2 className="text-lg font-medium text-amber-200">
              Devolução do equipamento
            </h2>
            <p className="mt-2 text-sm text-zinc-300">
              Após o cancelamento, envie o rastreador e chip e informe o código
              de rastreio. Sem devolução em 10 dias, poderá ser cobrada taxa de
              R$ 300,00.
            </p>
            {!hasReturnTracking ? (
              <form onSubmit={handleSubmitTracking} className="mt-4">
                <label
                  htmlFor="tracking"
                  className="block text-sm text-zinc-400"
                >
                  Código de rastreio (Correios)
                </label>
                <input
                  id="tracking"
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Ex: AA123456789BR"
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-describedby="tracking-help tracking-error"
                  minLength={8}
                  maxLength={20}
                />
                <p id="tracking-help" className="mt-1 text-xs text-zinc-500">
                  Entre 8 e 20 caracteres
                </p>
                {trackingError && (
                  <p
                    id="tracking-error"
                    className="mt-1 text-sm text-red-400"
                    role="alert"
                  >
                    {trackingError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={trackingSubmitting}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {trackingSubmitting ? 'Enviando...' : 'Enviar código'}
                </button>
              </form>
            ) : (
              <p className="mt-4 text-sm text-emerald-400">
                Código informado. Aguardando confirmação de recebimento.
              </p>
            )}
          </section>
        )}

        <p className="mt-8 text-center">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:underline"
          >
            Falar no WhatsApp
          </a>
        </p>

        <p className="mt-4 text-center">
          <Link href="/" className="text-sm text-zinc-500 hover:underline">
            ← Voltar
          </Link>
        </p>
      </div>
    </main>
  );
}

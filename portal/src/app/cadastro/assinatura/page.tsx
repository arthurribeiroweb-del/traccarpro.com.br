'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const WHATSAPP_URL = 'https://api.whatsapp.com/send/?phone=559491796309&text=' + encodeURIComponent('Olá! Tenho dúvidas sobre a assinatura.');

function AssinaturaContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [acceptedContract, setAcceptedContract] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedImageAuth, setAcceptedImageAuth] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [flow, setFlow] = useState<'signup' | 'onboarding' | null>(null);
  const [contractUrl, setContractUrl] = useState<string | null>(null);

  const acceptedComodato = acceptedContract;
  const allAccepted = acceptedContract && acceptedPrivacy && acceptedComodato && acceptedImageAuth;

  useEffect(() => {
    if (!id) return;
    fetch(`/api/signup-requests/${id}`)
      .then((r) => {
        if (r.ok) return r.json().then((d) => ({ flow: 'signup' as const, status: d.status }));
        throw new Error('not signup');
      })
      .then(({ flow: f, status: s }) => {
        setFlow(f);
        setStatus(s);
        setContractUrl(`/api/signup-requests/${id}/contract`);
      })
      .catch(() => {
        fetch(`/api/onboarding/${id}/status`)
          .then((r) => r.ok ? r.json() : Promise.reject())
          .then((d) => {
            setFlow('onboarding');
            setStatus(d.status);
            setContractUrl(d.contractPdfUrl || `/api/onboarding/${id}/generate-contract`);
          })
          .catch(() => setStatus(null));
      });
  }, [id]);

  const handleSign = async () => {
    if (!id || !allAccepted) return;
    setError(null);
    setSigning(true);
    const signUrl = flow === 'signup' ? `/api/signup-requests/${id}/sign` : `/api/onboarding/${id}/sign`;
    const redirectTo = flow === 'signup' ? `/cadastro/concluido?id=${id}` : `/proposta/${id}`;
    try {
      const res = await fetch(signUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptedContract,
          acceptedPrivacy,
          acceptedComodato,
          acceptedImageAuth,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao assinar');
      window.location.href = redirectTo;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao assinar');
    } finally {
      setSigning(false);
    }
  };

  if (!id) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <h1 className="text-2xl font-semibold text-white">Assinatura do contrato</h1>
          <p className="mt-4 text-sm text-zinc-400">
            É necessário um link válido para assinar. Entre em contato para receber o link de assinatura.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block text-blue-400 hover:underline"
          >
            Falar no WhatsApp
          </a>
        </div>
      </main>
    );
  }

  const canSign = flow === 'signup'
    ? status === 'CONTRACT_SENT'
    : ['APPROVED', 'SIGNING'].includes(status || '');

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-white">Assinatura do contrato</h1>

        <p className="mt-2 text-sm text-zinc-400">
          Marque todos os itens abaixo para prosseguir com a assinatura.
        </p>

        <section className="mt-8 rounded-xl border border-zinc-700 bg-zinc-900/50 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium text-white">Contrato</h2>
            {contractUrl && (
              <a
                href={contractUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline"
              >
                Abrir em nova aba
              </a>
            )}
          </div>
          {contractUrl ? (
            <iframe
              src={contractUrl}
              title="Contrato TraccarPro"
              className="mt-3 h-[420px] w-full rounded-lg border border-zinc-800 bg-white"
            />
          ) : (
            <p className="mt-3 text-sm text-amber-400">
              Contrato indisponível no momento. Tente novamente em alguns segundos.
            </p>
          )}
        </section>

        {/* Checkboxes obrigatórios */}
        <div className="mt-8 space-y-6" role="group" aria-labelledby="termos-label">
          <h2 id="termos-label" className="sr-only">
            Termos e condições
          </h2>

          <label className="flex cursor-pointer gap-4 rounded-xl border border-zinc-700 bg-zinc-900/50 p-5 transition hover:border-zinc-600">
            <input
              type="checkbox"
              checked={acceptedContract}
              onChange={(e) => setAcceptedContract(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
              aria-describedby="contract-desc"
            />
            <span id="contract-desc" className="text-sm text-zinc-300">
              Li e aceito o Contrato de Prestação de Serviço e Comodato.
            </span>
          </label>

          <label className="flex cursor-pointer gap-4 rounded-xl border border-zinc-700 bg-zinc-900/50 p-5 transition hover:border-zinc-600">
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
              aria-describedby="privacy-desc"
            />
            <span id="privacy-desc" className="text-sm text-zinc-300">
              Li e aceito a Política de Privacidade (LGPD).
            </span>
          </label>

          <label className="flex cursor-pointer gap-4 rounded-xl border border-zinc-700 bg-zinc-900/50 p-5 transition hover:border-zinc-600">
            <input
              type="checkbox"
              checked={acceptedImageAuth}
              onChange={(e) => setAcceptedImageAuth(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
              aria-describedby="images-desc"
            />
            <span id="images-desc" className="text-sm text-zinc-300">
              Autorizo o registro de imagens do veículo e da instalação para fins de execução do contrato, suporte e segurança.
            </span>
          </label>
        </div>

        {/* CTA Assinar - bloqueado até marcar todos */}
        <div className="mt-10">
          {!canSign && status && (
            <p className="mb-4 text-center text-sm text-amber-500" role="status">
              Este contrato não está disponível para assinatura no momento (status: {status}).
            </p>
          )}
          <button
            type="button"
            onClick={handleSign}
            disabled={!allAccepted || !canSign || signing}
            className="w-full flex min-h-[48px] items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600"
            aria-disabled={!allAccepted || !canSign || signing}
          >
            {signing ? 'Assinando...' : 'Assinar contrato'}
          </button>
          {!allAccepted && canSign && (
            <p className="mt-2 text-center text-sm text-amber-500" role="status">
              Marque todos os checkboxes para continuar.
            </p>
          )}
          {error && (
            <p className="mt-2 text-center text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>

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
          <Link href="/cadastro" className="text-sm text-zinc-500 hover:underline">
            ← Voltar ao cadastro
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function AssinaturaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Carregando...</div>}>
      <AssinaturaContent />
    </Suspense>
  );
}

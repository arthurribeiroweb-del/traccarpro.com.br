'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const WHATSAPP_URL = 'https://api.whatsapp.com/send/?phone=559491796309&text=' + encodeURIComponent('Olá! Tenho dúvidas sobre o cadastro TraccarPro.');

function RevisaoContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const assinaturaHref = id ? `/cadastro/assinatura?id=${id}` : '/cadastro/assinatura';

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-white">Revisão do pedido</h1>

        {/* A) Resumo do Plano */}
        <section className="mt-8 rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-medium text-white">Resumo do Plano</h2>
          <ul className="mt-4 space-y-2 text-sm text-zinc-300">
            <li>• Mensalidade: R$ 49,90/mês (cartão) ou R$ 59,90/mês (boleto)</li>
            <li>• Rastreador + chip inclusos em comodato (devolução no cancelamento)</li>
            <li>• Instalação: contratação e pagamento direto com o instalador (fora do TraccarPro)</li>
          </ul>
        </section>

        {/* CTAs — fixo no mobile */}
        <div className="sticky bottom-0 left-0 right-0 z-10 mt-10 flex flex-col gap-3 bg-zinc-950/95 py-4 pb-safe md:relative md:bg-transparent md:py-0">
          <Link
            href={assinaturaHref}
            className="flex min-h-[48px] items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            Revisar e assinar
          </Link>
          <Link
            href="/"
            className="flex min-h-[48px] items-center justify-center rounded-lg border border-zinc-600 bg-transparent px-6 py-3 font-medium text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            Salvar e continuar depois
          </Link>
        </div>

        {/* WhatsApp */}
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
      </div>
    </main>
  );
}

export default function RevisaoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Carregando...</div>}>
      <RevisaoContent />
    </Suspense>
  );
}

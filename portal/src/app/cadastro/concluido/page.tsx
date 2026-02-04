'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

const WHATSAPP_URL =
  'https://api.whatsapp.com/send/?phone=559491796309&text=' +
  encodeURIComponent('Olá! Assinei o contrato TraccarPro e tenho dúvidas.');

function ConcluidoContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-white">Contrato assinado ✅</h1>
        <p className="mt-4 text-zinc-300">
          Parabéns! Seu contrato foi assinado com sucesso. Em breve nossa equipe entrará em contato para os próximos passos.
        </p>
        {id && (
          <p className="mt-6 text-sm text-zinc-500">
            Protocolo: {id.slice(0, 12)}…
          </p>
        )}
        <p className="mt-8 text-center">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            Falar no WhatsApp
          </a>
        </p>
        <p className="mt-4 text-center">
          <Link href="/" className="text-sm text-zinc-500 hover:underline">
            ← Voltar ao início
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function ConcluidoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Carregando...</div>}>
      <ConcluidoContent />
    </Suspense>
  );
}

'use client';

import Link from 'next/link';
import AdminLogoutButton from '@/components/AdminLogoutButton';

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-white">Admin</h1>
          <AdminLogoutButton />
        </div>
        <p className="mt-2 text-sm text-zinc-400">Area administrativa do TraccarPro.</p>
        <div className="mt-8 space-y-4">
          <Link
            href="/admin/solicitacoes"
            className="block rounded-lg border border-zinc-700 bg-zinc-900/50 p-6 transition hover:border-zinc-600"
          >
            <h2 className="font-medium text-white">Solicitacoes de Cadastro</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Listar, aprovar ou reprovar solicitacoes. Gerar contrato e enviar link de assinatura.
            </p>
          </Link>
          <Link
            href="/admin/propostas/sample-id"
            className="block rounded-lg border border-zinc-700 bg-zinc-900/50 p-6 transition hover:border-zinc-600"
          >
            <h2 className="font-medium text-white">Propostas (legado)</h2>
            <p className="mt-1 text-sm text-zinc-400">Fluxo antigo de propostas OnboardingApplication.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}

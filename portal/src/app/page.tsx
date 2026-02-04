import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-3xl font-bold text-white">TraccarPro — Portal</h1>
        <p className="mt-4 text-zinc-400">
          Rastreamento veicular. Portal de contrato e onboarding.
        </p>
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/cadastro/revisao"
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Iniciar cadastro
          </Link>
          <Link
            href="https://traccarpro.com.br"
            className="rounded-lg border border-zinc-600 px-6 py-3 font-medium text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/50"
          >
            Ir para o site
          </Link>
        </div>
      </div>
    </main>
  );
}

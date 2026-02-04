'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function getErrorMessage(errorCode: string | null): string | null {
  if (errorCode === 'config') return 'Autenticacao admin ainda nao configurada no servidor.';
  return null;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(getErrorMessage(searchParams.get('error')));

  const returnTo = useMemo(() => {
    const path = searchParams.get('returnTo') || '/admin';
    return path.startsWith('/admin') ? path : '/admin';
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json.error || 'Nao foi possivel autenticar.');
        return;
      }

      router.replace(returnTo);
      router.refresh();
    } catch {
      setError('Falha de rede ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-2xl font-semibold text-white">Admin - Login</h1>
        <p className="mt-2 text-sm text-zinc-400">Entre para acessar a area administrativa.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-xl border border-zinc-700 bg-zinc-900/60 p-6">
          <div>
            <label htmlFor="username" className="block text-sm text-zinc-400">
              Usuario
            </label>
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-white"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-zinc-400">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-white"
            />
          </div>

          {error && <p className="text-sm text-amber-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}


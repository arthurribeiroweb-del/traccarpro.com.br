'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/admin/login');
      router.refresh();
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-60"
    >
      {loading ? 'Saindo...' : 'Sair'}
    </button>
  );
}


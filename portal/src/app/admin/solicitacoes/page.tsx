'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLogoutButton from '@/components/AdminLogoutButton';

interface Solicitacao {
  id: string;
  type: string;
  name: string | null;
  companyName: string | null;
  cpf: string | null;
  cnpj: string | null;
  email: string;
  status: string;
  protocolo: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Em analise',
  NEEDS_FIX: 'Precisa corrigir',
  APPROVED: 'Aprovado',
  CONTRACT_SENT: 'Aguardando assinatura',
  SIGNED: 'Assinado',
  EXPIRED: 'Expirado',
};

export default function AdminSolicitacoesPage() {
  const [list, setList] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/signup-requests')
      .then((r) => r.json())
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin" className="text-sm text-zinc-500 hover:underline">
            {'<-'} Admin
          </Link>
          <AdminLogoutButton />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-white">Solicitacoes de Cadastro</h1>

        {loading ? (
          <p className="mt-8 text-zinc-400">Carregando...</p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="py-3 font-medium text-zinc-300">Status</th>
                  <th className="py-3 font-medium text-zinc-300">Nome/Empresa</th>
                  <th className="py-3 font-medium text-zinc-300">CPF/CNPJ</th>
                  <th className="py-3 font-medium text-zinc-300">Data</th>
                  <th className="py-3 font-medium text-zinc-300">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      Nenhuma solicitacao encontrada.
                    </td>
                  </tr>
                )}
                {list.map((s) => (
                  <tr key={s.id} className="border-b border-zinc-800">
                    <td className="py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          s.status === 'SIGNED'
                            ? 'bg-emerald-900/50 text-emerald-300'
                            : s.status === 'CONTRACT_SENT'
                              ? 'bg-amber-900/50 text-amber-300'
                              : s.status === 'NEEDS_FIX'
                                ? 'bg-red-900/50 text-red-300'
                                : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                    </td>
                    <td className="py-3 text-zinc-300">
                      {s.type === 'PF' ? s.name : s.companyName} <span className="text-zinc-500">({s.type})</span>
                    </td>
                    <td className="py-3 text-zinc-400">{s.type === 'PF' ? s.cpf : s.cnpj}</td>
                    <td className="py-3 text-zinc-400">{new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3">
                      <Link href={`/admin/solicitacoes/${s.id}`} className="text-blue-400 hover:underline">
                        Ver {'->'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

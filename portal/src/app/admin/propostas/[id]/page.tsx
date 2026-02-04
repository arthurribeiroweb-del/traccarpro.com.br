'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Application {
  id: string;
  nome: string;
  email: string;
  status: string;
  returnTrackingCode: string | null;
  returnDeadlineAt: string | null;
  equipmentReturnStatus: string;
  equipmentFeeDueCents: number;
  statusHistory: Array<{
    fromStatus: string;
    toStatus: string;
    actor: string | null;
    note: string | null;
    createdAt: string;
  }>;
}

export default function AdminPropostaPage() {
  const params = useParams();
  const id = params.id as string;
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [showReject, setShowReject] = useState(false);

  const fetchApp = () => {
    if (!id) return;
    fetch(`/api/onboarding/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Proposta não encontrada');
        return r.json();
      })
      .then(setApp)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApp();
  }, [id]);

  const callApi = async (
    key: string,
    url: string,
    method: string,
    body?: object
  ) => {
    setActionLoading(key);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro');
      fetchApp();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = () =>
    callApi('approve', `/api/onboarding/${id}/transition`, 'POST', {
      action: 'approve',
    });
  const handleReject = () => {
    if (!rejectNote.trim()) {
      alert('Informe o motivo da reprovação.');
      return;
    }
    callApi('reject', `/api/onboarding/${id}/transition`, 'POST', {
      action: 'reject',
      note: rejectNote,
    }).then(() => {
      setShowReject(false);
      setRejectNote('');
    });
  };
  const handleActivate = () =>
    callApi('activate', `/api/onboarding/${id}/transition`, 'POST', {
      action: 'activate',
    });
  const handleCancel = () =>
    callApi('cancel', `/api/onboarding/${id}/cancel`, 'POST', {
      reason: 'admin',
    });
  const handleReturnReceived = () =>
    callApi(
      'return',
      `/api/onboarding/${id}/mark-return-received`,
      'POST'
    );
  const handleFeeDue = () =>
    callApi('fee', `/api/onboarding/${id}/mark-fee-due`, 'POST', {
      note: 'Admin marcou taxa devida',
    });

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <p className="text-zinc-400">Carregando...</p>
        </div>
      </main>
    );
  }

  if (error || !app) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <p className="text-amber-500">{error || 'Proposta não encontrada'}</p>
          <Link href="/admin" className="mt-4 inline-block text-blue-400 hover:underline">
            ← Admin
          </Link>
        </div>
      </main>
    );
  }

  const isReturnPending = app.status === 'RETURN_PENDING';
  const canApprove = ['SUBMITTED', 'IN_REVIEW'].includes(app.status);
  const canActivate = ['SIGNED', 'APPROVED'].includes(app.status);
  const canCancel = ['ACTIVE', 'DELINQUENT_SUSPENDED'].includes(app.status);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/admin" className="text-sm text-zinc-500 hover:underline">
          ← Admin
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">
          Proposta #{id.slice(0, 8)}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {app.nome} — {app.email} — Status: {app.status}
        </p>

        <section className="mt-8 rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-medium text-white">Ações</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {canApprove && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={!!actionLoading}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading === 'approve' ? '...' : 'Aprovar'}
              </button>
            )}
            {canApprove && (
              <button
                type="button"
                onClick={() => setShowReject(true)}
                disabled={!!actionLoading}
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                Reprovar (motivo)
              </button>
            )}
            {showReject && (
              <div className="w-full rounded-lg border border-amber-700/50 bg-amber-950/20 p-4">
                <label className="block text-sm text-zinc-400">
                  Motivo da reprovação
                </label>
                <input
                  type="text"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-white"
                  placeholder="Ex: Documentação incompleta"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={!!actionLoading}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                  >
                    Confirmar reprovação
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReject(false)}
                    className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {canActivate && (
              <button
                type="button"
                onClick={handleActivate}
                disabled={!!actionLoading}
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                {actionLoading === 'activate' ? '...' : 'Marcar ACTIVE'}
              </button>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-medium text-white">
            Cancelamento / Devolução
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {canCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={!!actionLoading}
                className="rounded-lg border border-amber-600 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-950/30 disabled:opacity-50"
              >
                {actionLoading === 'cancel' ? '...' : 'Iniciar cancelamento'}
              </button>
            )}
            {isReturnPending && (
              <button
                type="button"
                onClick={handleReturnReceived}
                disabled={!!actionLoading}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading === 'return' ? '...' : 'Confirmar devolução'}
              </button>
            )}
            {(isReturnPending || app.status === 'ACTIVE') && (
              <button
                type="button"
                onClick={handleFeeDue}
                disabled={!!actionLoading}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {actionLoading === 'fee' ? '...' : 'Marcar taxa R$ 300 devida'}
              </button>
            )}
          </div>
          {app.returnTrackingCode && (
            <p className="mt-4 text-sm text-zinc-400">
              Rastreio informado: <strong>{app.returnTrackingCode}</strong>
            </p>
          )}
          {app.returnDeadlineAt && (
            <p className="mt-1 text-sm text-zinc-400">
              Prazo devolução: {new Date(app.returnDeadlineAt).toLocaleDateString('pt-BR')}
            </p>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-medium text-white">Histórico</h2>
          <ul className="mt-4 space-y-2 text-sm text-zinc-400">
            {app.statusHistory.map((h, i) => (
              <li key={i}>
                {h.fromStatus} → {h.toStatus} ({h.actor || 'system'})
                {h.note && ` — ${h.note}`}{' '}
                {new Date(h.createdAt).toLocaleString('pt-BR')}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

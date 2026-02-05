'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminLogoutButton from '@/components/AdminLogoutButton';

interface RequestData {
  id: string;
  type: string;
  name: string | null;
  companyName: string | null;
  responsibleName: string | null;
  cpf: string | null;
  cnpj: string | null;
  responsibleCpf: string | null;
  email: string;
  phone: string;
  addressJson: Record<string, string> | null;
  vehicleJson: Record<string, string> | null;
  documentsJson: Array<{ key: string; path: string; filename?: string; size?: number }>;
  status: string;
  rejectReason: string | null;
  contractPdfUrl: string | null;
  protocolo: string | null;
  createdAt: string;
}

export default function AdminSolicitacaoDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [req, setReq] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/signup-requests/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Não encontrado');
        return r.json();
      })
      .then(setReq)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      const res = await fetch(`/api/admin/signup-requests/${id}/approve`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro');
      alert(`Aprovado. Link de assinatura: ${json.signLink}`);
      if (req) setReq({ ...req, status: 'CONTRACT_SENT', contractPdfUrl: json.contractUrl });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (rejectReason.length < 20 || rejectReason.length > 500) {
      alert('Motivo deve ter entre 20 e 500 caracteres');
      return;
    }
    setActionLoading('reject');
    try {
      const res = await fetch(`/api/admin/signup-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro');
      setShowReject(false);
      setRejectReason('');
      if (req) setReq({ ...req, status: 'NEEDS_FIX', rejectReason });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <p className="text-zinc-400">Carregando...</p>
        </div>
      </main>
    );
  }

  if (error || !req) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <p className="text-amber-500">{error || 'Solicitação não encontrada'}</p>
          <Link href="/admin/solicitacoes" className="mt-4 inline-block text-blue-400 hover:underline">
            ← Voltar
          </Link>
        </div>
      </main>
    );
  }

  const canApprove = ['SUBMITTED', 'NEEDS_FIX'].includes(req.status);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin/solicitacoes" className="text-sm text-zinc-500 hover:underline">
            {"<-"} Solicitacoes
          </Link>
          <AdminLogoutButton />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-white">
          Solicitação #{req.protocolo || req.id.slice(0, 8)}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">Status: {req.status}</p>

        <section className="mt-8 rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-medium text-white">Dados</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">Tipo</dt>
              <dd className="text-zinc-300">{req.type}</dd>
            </div>
            {req.type === 'PF' ? (
              <>
                <div><dt className="text-zinc-500">Nome</dt><dd className="text-zinc-300">{req.name}</dd></div>
                <div><dt className="text-zinc-500">CPF</dt><dd className="text-zinc-300">{req.cpf}</dd></div>
              </>
            ) : (
              <>
                <div><dt className="text-zinc-500">Razão social</dt><dd className="text-zinc-300">{req.companyName}</dd></div>
                <div><dt className="text-zinc-500">CNPJ</dt><dd className="text-zinc-300">{req.cnpj}</dd></div>
                <div><dt className="text-zinc-500">Responsável</dt><dd className="text-zinc-300">{req.responsibleName} (CPF: {req.responsibleCpf})</dd></div>
              </>
            )}
            <div><dt className="text-zinc-500">E-mail</dt><dd className="text-zinc-300">{req.email}</dd></div>
            <div><dt className="text-zinc-500">Telefone</dt><dd className="text-zinc-300">{req.phone}</dd></div>
            {req.addressJson && (
              <div>
                <dt className="text-zinc-500">Endereço</dt>
                <dd className="text-zinc-300">
                  {req.addressJson.rua}, {req.addressJson.numero} — {req.addressJson.bairro}, {req.addressJson.cidade}/{req.addressJson.uf}
                </dd>
              </div>
            )}
            {req.vehicleJson && (
              <div>
                <dt className="text-zinc-500">Veículo</dt>
                <dd className="text-zinc-300">
                  {req.vehicleJson.tipo} — {req.vehicleJson.placa} — {req.vehicleJson.marcaModelo}
                  {req.vehicleJson.ano && ` (${req.vehicleJson.ano})`}
                  {req.vehicleJson.cor && ` — ${req.vehicleJson.cor}`}
                  {req.vehicleJson.renavam && ` — Renavam: ${req.vehicleJson.renavam}`}
                  {req.vehicleJson.chassi && ` — Chassi: ${req.vehicleJson.chassi}`}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="mt-8 rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-medium text-white">Documentos</h2>
          <ul className="mt-4 space-y-2">
            {(req.documentsJson || []).map((d) => {
              const labels: Record<string, string> = {
                doc_foto: 'Documento com foto (CNH/RG)',
                comprovante_residencia: 'Comprovante de residência',
                doc_veiculo: 'Documento do veículo (CRLV)',
                cartao_cnpj: 'Cartão CNPJ',
                doc_responsavel: 'Documento do responsável',
              };
              return (
                <li key={d.key}>
                  <a
                    href={`/api/signup-requests/${id}/documents/${d.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    {labels[d.key] || d.key} {d.filename && `(${d.filename})`} →
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        {req.rejectReason && (
          <section className="mt-8 rounded-xl border border-amber-700/50 bg-amber-950/20 p-6">
            <h2 className="text-lg font-medium text-amber-200">Motivo da reprovação</h2>
            <p className="mt-2 text-sm text-zinc-300">{req.rejectReason}</p>
          </section>
        )}

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
                {actionLoading === 'approve' ? '...' : 'Aprovar e Gerar Contrato'}
              </button>
            )}
            {canApprove && (
              <button
                type="button"
                onClick={() => setShowReject(true)}
                disabled={!!actionLoading}
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                Reprovar
              </button>
            )}
            {req.status === 'CONTRACT_SENT' && (
              <>
                <a
                  href={`/api/signup-requests/${id}/contract`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Ver contrato
                </a>
                <p className="w-full text-sm text-zinc-400">
                  Link de assinatura: {baseUrl}/cadastro/assinatura?id={id}
                </p>
              </>
            )}
          </div>

          {showReject && (
            <div className="mt-6 rounded-lg border border-amber-700/50 bg-amber-950/20 p-4">
              <label className="block text-sm text-zinc-400">Motivo da reprovação (20–500 caracteres)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-white"
                placeholder="Precisamos ajustar algumas informações: …"
              />
              <p className="mt-2 text-xs text-zinc-500">
                O cliente verá: &quot;Precisamos ajustar algumas informações: {rejectReason.slice(0, 50)}…&quot;
              </p>
              <div className="mt-3 flex gap-2">
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
        </section>
      </div>
    </main>
  );
}



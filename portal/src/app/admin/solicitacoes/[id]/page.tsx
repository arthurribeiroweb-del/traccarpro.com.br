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

interface EditForm {
  name: string;
  cpf: string;
  companyName: string;
  cnpj: string;
  responsibleName: string;
  responsibleCpf: string;
  email: string;
  phone: string;
  address: {
    cep: string;
    rua: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  vehicle: {
    tipo: string;
    placa: string;
    marcaModelo: string;
    ano: string;
    cor: string;
    renavam: string;
    chassi: string;
  };
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
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const buildForm = (data: RequestData): EditForm => ({
    name: data.name || '',
    cpf: data.cpf || '',
    companyName: data.companyName || '',
    cnpj: data.cnpj || '',
    responsibleName: data.responsibleName || '',
    responsibleCpf: data.responsibleCpf || '',
    email: data.email || '',
    phone: data.phone || '',
    address: {
      cep: data.addressJson?.cep || '',
      rua: data.addressJson?.rua || '',
      numero: data.addressJson?.numero || '',
      complemento: data.addressJson?.complemento || '',
      bairro: data.addressJson?.bairro || '',
      cidade: data.addressJson?.cidade || '',
      uf: data.addressJson?.uf || '',
    },
    vehicle: {
      tipo: data.vehicleJson?.tipo || '',
      placa: data.vehicleJson?.placa || '',
      marcaModelo: data.vehicleJson?.marcaModelo || '',
      ano: data.vehicleJson?.ano || '',
      cor: data.vehicleJson?.cor || '',
      renavam: data.vehicleJson?.renavam || '',
      chassi: data.vehicleJson?.chassi || '',
    },
  });

  useEffect(() => {
    if (!id) return;
    fetch(`/api/signup-requests/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Não encontrado');
        return r.json();
      })
      .then((data) => {
        setReq(data);
        setForm(buildForm(data));
      })
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

  const handleEdit = () => {
    if (!req) return;
    setForm(buildForm(req));
    setSaveError(null);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    if (req) setForm(buildForm(req));
    setSaveError(null);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.email.trim() || !form.phone.trim()) {
      setSaveError('E-mail e telefone são obrigatórios.');
      return;
    }
    setActionLoading('save');
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/signup-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: req?.type,
          name: form.name,
          cpf: form.cpf,
          companyName: form.companyName,
          cnpj: form.cnpj,
          responsibleName: form.responsibleName,
          responsibleCpf: form.responsibleCpf,
          email: form.email,
          phone: form.phone,
          addressJson: form.address,
          vehicleJson: form.vehicle,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar');
      setReq(json);
      setForm(buildForm(json));
      setEditing(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erro ao salvar');
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
  const canEdit = canApprove;
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-white">Dados</h2>
            {canEdit && !editing && (
              <button
                type="button"
                onClick={handleEdit}
                className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Editar dados
              </button>
            )}
            {canEdit && editing && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={actionLoading === 'save'}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading === 'save' ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={actionLoading === 'save'}
                  className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
          {saveError && (
            <p className="mt-3 text-sm text-amber-400">{saveError}</p>
          )}
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">Tipo</dt>
              <dd className="text-zinc-300">{req.type}</dd>
            </div>
            {req.type === 'PF' ? (
              <>
                <div>
                  <dt className="text-zinc-500">Nome</dt>
                  <dd className="text-zinc-300">
                    {editing ? (
                      <input
                        value={form?.name ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="Nome completo"
                      />
                    ) : (
                      req.name
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">CPF</dt>
                  <dd className="text-zinc-300">
                    {editing ? (
                      <input
                        value={form?.cpf ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, cpf: e.target.value } : prev)}
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="CPF"
                      />
                    ) : (
                      req.cpf
                    )}
                  </dd>
                </div>
              </>
            ) : (
              <>
                <div>
                  <dt className="text-zinc-500">Razão social</dt>
                  <dd className="text-zinc-300">
                    {editing ? (
                      <input
                        value={form?.companyName ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, companyName: e.target.value } : prev)}
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="Razão social"
                      />
                    ) : (
                      req.companyName
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">CNPJ</dt>
                  <dd className="text-zinc-300">
                    {editing ? (
                      <input
                        value={form?.cnpj ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, cnpj: e.target.value } : prev)}
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="CNPJ"
                      />
                    ) : (
                      req.cnpj
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Responsável</dt>
                  <dd className="text-zinc-300">
                    {editing ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        <input
                          value={form?.responsibleName ?? ''}
                          onChange={(e) => setForm((prev) => prev ? { ...prev, responsibleName: e.target.value } : prev)}
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                          placeholder="Nome do responsável"
                        />
                        <input
                          value={form?.responsibleCpf ?? ''}
                          onChange={(e) => setForm((prev) => prev ? { ...prev, responsibleCpf: e.target.value } : prev)}
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                          placeholder="CPF do responsável"
                        />
                      </div>
                    ) : (
                      `${req.responsibleName} (CPF: ${req.responsibleCpf})`
                    )}
                  </dd>
                </div>
              </>
            )}
            <div>
              <dt className="text-zinc-500">E-mail</dt>
              <dd className="text-zinc-300">
                {editing ? (
                  <input
                    value={form?.email ?? ''}
                    onChange={(e) => setForm((prev) => prev ? { ...prev, email: e.target.value } : prev)}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                    placeholder="E-mail"
                  />
                ) : (
                  req.email
                )}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Telefone</dt>
              <dd className="text-zinc-300">
                {editing ? (
                  <input
                    value={form?.phone ?? ''}
                    onChange={(e) => setForm((prev) => prev ? { ...prev, phone: e.target.value } : prev)}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                    placeholder="WhatsApp"
                  />
                ) : (
                  req.phone
                )}
              </dd>
            </div>
            {(req.addressJson || editing) && (
              <div>
                <dt className="text-zinc-500">Endereço</dt>
                <dd className="text-zinc-300">
                  {editing ? (
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <input
                        value={form?.address?.cep ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, address: { ...prev.address, cep: e.target.value } } : prev)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="CEP"
                      />
                      <input
                        value={form?.address?.rua ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, address: { ...prev.address, rua: e.target.value } } : prev)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="Rua"
                      />
                      <input
                        value={form?.address?.numero ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, address: { ...prev.address, numero: e.target.value } } : prev)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="Número"
                      />
                      <input
                        value={form?.address?.complemento ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, address: { ...prev.address, complemento: e.target.value } } : prev)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="Complemento"
                      />
                      <input
                        value={form?.address?.bairro ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, address: { ...prev.address, bairro: e.target.value } } : prev)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="Bairro"
                      />
                      <input
                        value={form?.address?.cidade ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, address: { ...prev.address, cidade: e.target.value } } : prev)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="Cidade"
                      />
                      <input
                        value={form?.address?.uf ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, address: { ...prev.address, uf: e.target.value } } : prev)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="UF"
                      />
                    </div>
                  ) : (
                    `${req.addressJson?.rua || ''}, ${req.addressJson?.numero || ''} — ${req.addressJson?.bairro || ''}, ${req.addressJson?.cidade || ''}/${req.addressJson?.uf || ''}`
                  )}
                </dd>
              </div>
            )}
            {(req.vehicleJson || editing) && (
              <div>
                <dt className="text-zinc-500">Veículo</dt>
                <dd className="text-zinc-300">
                  {editing ? (
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <input
                        value={form?.vehicle?.tipo ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, vehicle: { ...prev.vehicle, tipo: e.target.value } } : prev)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="Tipo"
                      />
                      <input
                        value={form?.vehicle?.placa ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, vehicle: { ...prev.vehicle, placa: e.target.value } } : prev)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="Placa"
                      />
                      <input
                        value={form?.vehicle?.marcaModelo ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, vehicle: { ...prev.vehicle, marcaModelo: e.target.value } } : prev)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="Marca/Modelo"
                      />
                      <input
                        value={form?.vehicle?.ano ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, vehicle: { ...prev.vehicle, ano: e.target.value } } : prev)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="Ano"
                      />
                      <input
                        value={form?.vehicle?.cor ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, vehicle: { ...prev.vehicle, cor: e.target.value } } : prev)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="Cor"
                      />
                      <input
                        value={form?.vehicle?.renavam ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, vehicle: { ...prev.vehicle, renavam: e.target.value } } : prev)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="Renavam"
                      />
                      <input
                        value={form?.vehicle?.chassi ?? ''}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, vehicle: { ...prev.vehicle, chassi: e.target.value } } : prev)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-100"
                        placeholder="Chassi"
                      />
                    </div>
                  ) : (
                    <>
                      {req.vehicleJson?.tipo} — {req.vehicleJson?.placa} — {req.vehicleJson?.marcaModelo}
                      {req.vehicleJson?.ano && ` (${req.vehicleJson.ano})`}
                      {req.vehicleJson?.cor && ` — ${req.vehicleJson.cor}`}
                      {req.vehicleJson?.renavam && ` — Renavam: ${req.vehicleJson.renavam}`}
                      {req.vehicleJson?.chassi && ` — Chassi: ${req.vehicleJson.chassi}`}
                    </>
                  )}
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



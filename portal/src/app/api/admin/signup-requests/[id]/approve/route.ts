import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { readFile } from 'fs/promises';
import path from 'path';
import { fillContractTemplate } from '@/lib/contract';

/** POST: aprovar + gerar contrato + status CONTRACT_SENT */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  }

  try {
    const req = await prisma.signupRequest.findUnique({ where: { id } });
    if (!req) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    if (!['SUBMITTED', 'NEEDS_FIX'].includes(req.status)) {
      return NextResponse.json(
        { error: `Aprovação não permitida no status ${req.status}` },
        { status: 400 }
      );
    }

    const docs = req.documentsJson ? JSON.parse(req.documentsJson) : [];
    const requiredKeys =
      req.type === 'PF'
        ? ['doc_foto', 'comprovante_residencia']
        : ['cartao_cnpj', 'doc_responsavel', 'comprovante_residencia'];
    const hasAll = requiredKeys.every((k) => docs.some((d: { key: string }) => d.key === k));
    if (!hasAll) {
      return NextResponse.json(
        { error: 'Documentos obrigatórios ausentes. Verifique o envio.' },
        { status: 400 }
      );
    }

    const templateName = req.type === 'PJ' ? 'contract_pj.html' : 'contract_pf.html';
    const templatePath = path.join(process.cwd(), 'templates', templateName);
    const html = await readFile(templatePath, 'utf-8');
    const filled = fillContractTemplate(html);

    const contractDir = path.join(process.cwd(), 'uploads', id);
    const contractPath = path.join(contractDir, 'contrato.html');
    const { writeFile, mkdir } = await import('fs/promises');
    await mkdir(contractDir, { recursive: true });
    await writeFile(contractPath, filled, 'utf-8');

    const contractRelativeUrl = `/api/signup-requests/${id}/contract`;

    const [updated] = await prisma.$transaction([
      prisma.signupRequest.update({
        where: { id },
        data: {
          status: 'CONTRACT_SENT',
          contractPdfUrl: contractRelativeUrl,
          rejectReason: null,
        },
      }),
      prisma.signupStatusHistory.create({
        data: {
          requestId: id,
          fromStatus: req.status,
          toStatus: 'CONTRACT_SENT',
          actor: 'admin',
          note: 'Aprovado. Contrato gerado. Aguardando assinatura.',
        },
      }),
    ]);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const signLink = `${baseUrl}/cadastro/assinatura?id=${id}`;

    return NextResponse.json({
      ok: true,
      status: updated.status,
      contractUrl: contractRelativeUrl,
      signLink,
      message: 'Aprovado. Contrato gerado. Envie o link de assinatura ao cliente.',
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao aprovar solicitação' },
      { status: 500 }
    );
  }
}

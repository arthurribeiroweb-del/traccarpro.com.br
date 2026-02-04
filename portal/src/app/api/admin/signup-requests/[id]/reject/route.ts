import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** POST: reprovar com motivo obrigatório */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const reason = (body.reason as string) || '';

    if (reason.length < 20 || reason.length > 500) {
      return NextResponse.json(
        { error: 'Motivo da reprovação deve ter entre 20 e 500 caracteres' },
        { status: 400 }
      );
    }

    const req = await prisma.signupRequest.findUnique({ where: { id } });
    if (!req) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    if (!['SUBMITTED', 'NEEDS_FIX'].includes(req.status)) {
      return NextResponse.json(
        { error: `Reprovação não permitida no status ${req.status}` },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.signupRequest.update({
        where: { id },
        data: {
          status: 'NEEDS_FIX',
          rejectReason: reason,
        },
      }),
      prisma.signupStatusHistory.create({
        data: {
          requestId: id,
          fromStatus: req.status,
          toStatus: 'NEEDS_FIX',
          actor: 'admin',
          note: reason,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      status: 'NEEDS_FIX',
      message: 'Solicitação reprovada. Cliente poderá corrigir e reenviar.',
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao reprovar solicitação' },
      { status: 500 }
    );
  }
}

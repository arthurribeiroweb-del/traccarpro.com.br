import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const ALLOWED_CANCEL_STATUSES = ['ACTIVE', 'DELINQUENT_SUSPENDED'];

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
    const reason = (body.reason as string) || 'cliente';

    const app = await prisma.onboardingApplication.findUnique({
      where: { id },
    });

    if (!app) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    if (!ALLOWED_CANCEL_STATUSES.includes(app.status)) {
      return NextResponse.json(
        { error: `Cancelamento não permitido no status ${app.status}` },
        { status: 400 }
      );
    }

    const returnDeadline = new Date();
    returnDeadline.setDate(returnDeadline.getDate() + 10);

    const [updated] = await prisma.$transaction([
      prisma.onboardingApplication.update({
        where: { id },
        data: {
          status: 'RETURN_PENDING',
          canceledAt: new Date(),
          cancellationReason: reason,
          returnDeadlineAt: returnDeadline,
          equipmentReturnStatus: 'PENDING',
        },
      }),
      prisma.statusHistory.create({
        data: {
          applicationId: id,
          fromStatus: app.status,
          toStatus: 'RETURN_PENDING',
          actor: 'cliente',
          note: `Cancelamento (${reason}). Devolução até ${returnDeadline.toISOString().split('T')[0]}.`,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      status: updated.status,
      returnDeadlineAt: updated.returnDeadlineAt,
      message: 'Cancelamento iniciado. Envie o equipamento em até 10 dias e informe o código de rastreio.',
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao processar cancelamento' },
      { status: 500 }
    );
  }
}

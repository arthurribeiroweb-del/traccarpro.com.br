import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** Admin: confirma recebimento do equipamento e finaliza cancelamento */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  }

  try {
    const app = await prisma.onboardingApplication.findUnique({
      where: { id },
    });

    if (!app) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    if (app.status !== 'RETURN_PENDING') {
      return NextResponse.json(
        { error: 'Devolução não está pendente para esta proposta' },
        { status: 400 }
      );
    }

    const [updated] = await prisma.$transaction([
      prisma.onboardingApplication.update({
        where: { id },
        data: {
          status: 'CANCELED',
          equipmentReturnStatus: 'RECEIVED',
        },
      }),
      prisma.statusHistory.create({
        data: {
          applicationId: id,
          fromStatus: app.status,
          toStatus: 'CANCELED',
          actor: 'admin',
          note: 'Devolução confirmada. Equipamento recebido.',
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      status: updated.status,
      message: 'Devolução confirmada. Cancelamento concluído.',
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao confirmar devolução' },
      { status: 500 }
    );
  }
}

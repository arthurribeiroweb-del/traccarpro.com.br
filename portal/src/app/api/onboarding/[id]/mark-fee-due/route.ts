import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const EQUIPMENT_FEE_CENTS = 30000; // R$ 300,00

/** Admin: marca taxa de reposição R$ 300 devida (não devolução / dano / incompleto) */
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
    const note = (body.note as string) || 'Equipamento não devolvido/danificado/incompleto';

    const app = await prisma.onboardingApplication.findUnique({
      where: { id },
    });

    if (!app) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    const fromStatus = app.status;
    const allowedStatuses = ['RETURN_PENDING', 'CANCELED', 'ACTIVE'];
    if (!allowedStatuses.includes(fromStatus)) {
      return NextResponse.json(
        { error: `Operação não permitida no status ${fromStatus}` },
        { status: 400 }
      );
    }

    const [updated] = await prisma.$transaction([
      prisma.onboardingApplication.update({
        where: { id },
        data: {
          status: 'FEE_DUE',
          equipmentFeeDueCents: EQUIPMENT_FEE_CENTS,
          equipmentReturnStatus: 'WAIVED_LOST',
        },
      }),
      prisma.statusHistory.create({
        data: {
          applicationId: id,
          fromStatus,
          toStatus: 'FEE_DUE',
          actor: 'admin',
          note: `Taxa de reposição R$ 300,00. ${note}`,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      status: updated.status,
      equipmentFeeDueCents: updated.equipmentFeeDueCents,
      message: 'Taxa de R$ 300,00 marcada como devida.',
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao marcar taxa' },
      { status: 500 }
    );
  }
}

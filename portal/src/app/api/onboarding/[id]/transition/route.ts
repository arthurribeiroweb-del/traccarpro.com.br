import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** Admin: transição de status (aprovar, reprovar, marcar ACTIVE) */
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
    const action = body.action as string;
    const note = (body.note as string) || '';

    const app = await prisma.onboardingApplication.findUnique({
      where: { id },
    });

    if (!app) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    let newStatus: string;
    const fromStatus = app.status;

    switch (action) {
      case 'approve':
        if (!['SUBMITTED', 'IN_REVIEW'].includes(fromStatus)) {
          return NextResponse.json(
            { error: `Aprovação não permitida no status ${fromStatus}` },
            { status: 400 }
          );
        }
        newStatus = 'APPROVED';
        break;
      case 'reject':
        if (!['SUBMITTED', 'IN_REVIEW'].includes(fromStatus)) {
          return NextResponse.json(
            { error: `Reprovação não permitida no status ${fromStatus}` },
            { status: 400 }
          );
        }
        newStatus = 'REJECTED';
        if (!note.trim()) {
          return NextResponse.json(
            { error: 'Motivo da reprovação é obrigatório' },
            { status: 400 }
          );
        }
        break;
      case 'activate':
        if (!['SIGNED', 'APPROVED'].includes(fromStatus)) {
          return NextResponse.json(
            { error: `Marcar ACTIVE não permitido no status ${fromStatus}` },
            { status: 400 }
          );
        }
        newStatus = 'ACTIVE';
        break;
      default:
        return NextResponse.json(
          { error: 'Ação inválida. Use: approve, reject ou activate' },
          { status: 400 }
        );
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'ACTIVE') {
      updateData.activatedAt = new Date();
    }

    const [updated] = await prisma.$transaction([
      prisma.onboardingApplication.update({
        where: { id },
        data: updateData,
      }),
      prisma.statusHistory.create({
        data: {
          applicationId: id,
          fromStatus,
          toStatus: newStatus,
          actor: 'admin',
          note: note || `Status alterado para ${newStatus}`,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      status: updated.status,
      message: `Status alterado para ${newStatus}`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao alterar status' },
      { status: 500 }
    );
  }
}

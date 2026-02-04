import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
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
      select: {
        id: true,
        status: true,
        minTermMonths: true,
        activatedAt: true,
        canceledAt: true,
        returnDeadlineAt: true,
        returnTrackingCode: true,
        equipmentReturnStatus: true,
        equipmentFeeDueCents: true,
        contractPdfUrl: true,
      },
    });

    if (!app) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    const now = new Date();
    const isReturnPending = app.status === 'RETURN_PENDING';
    const returnDeadlinePassed =
      app.returnDeadlineAt && now > app.returnDeadlineAt;
    const feeDue = app.status === 'FEE_DUE' || app.equipmentFeeDueCents > 0;

    return NextResponse.json({
      ...app,
      flags: {
        isReturnPending,
        returnDeadlinePassed,
        feeDue,
        hasReturnTracking: !!app.returnTrackingCode,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao buscar status' },
      { status: 500 }
    );
  }
}

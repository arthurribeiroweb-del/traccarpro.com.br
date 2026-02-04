import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const TRACKING_MIN_LEN = 8;
const TRACKING_MAX_LEN = 20;

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
    const code = String(body.code ?? '').trim();

    if (!code || code.length < TRACKING_MIN_LEN || code.length > TRACKING_MAX_LEN) {
      return NextResponse.json(
        { error: `Código de rastreio deve ter entre ${TRACKING_MIN_LEN} e ${TRACKING_MAX_LEN} caracteres` },
        { status: 400 }
      );
    }

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

    const updated = await prisma.onboardingApplication.update({
      where: { id },
      data: { returnTrackingCode: code },
    });

    return NextResponse.json({
      ok: true,
      returnTrackingCode: updated.returnTrackingCode,
      message: 'Código de rastreio registrado. Aguardando confirmação de recebimento.',
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao registrar rastreio' },
      { status: 500 }
    );
  }
}

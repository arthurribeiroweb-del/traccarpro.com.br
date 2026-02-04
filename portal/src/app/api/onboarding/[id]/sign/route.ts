import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

/**
 * POST: Assinar contrato (MVP sem OTP)
 * Requer: acceptedContract, acceptedPrivacy, acceptedComodato = true
 * Status permitidos: APPROVED, SIGNING
 */
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
    const acceptedContract = body.acceptedContract === true;
    const acceptedPrivacy = body.acceptedPrivacy === true;
    const acceptedComodato = body.acceptedComodato === true;

    if (!acceptedContract || !acceptedPrivacy || !acceptedComodato) {
      return NextResponse.json(
        { error: 'Todos os termos devem ser aceitos' },
        { status: 400 }
      );
    }

    const app = await prisma.onboardingApplication.findUnique({
      where: { id },
    });

    if (!app) {
      return NextResponse.json(
        { error: 'Proposta não encontrada' },
        { status: 404 }
      );
    }

    if (!['APPROVED', 'SIGNING'].includes(app.status)) {
      return NextResponse.json(
        {
          error: `Assinatura não permitida no status atual (${app.status})`,
        },
        { status: 400 }
      );
    }

    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null;
    const userAgent = headersList.get('user-agent') || null;

    await prisma.$transaction([
      prisma.onboardingApplication.update({
        where: { id },
        data: {
          status: 'SIGNED',
          signedAt: new Date(),
          acceptedTermsV2: true,
        },
      }),
      prisma.statusHistory.create({
        data: {
          applicationId: id,
          fromStatus: app.status,
          toStatus: 'SIGNED',
          actor: 'cliente',
          note: 'Contrato assinado eletronicamente',
        },
      }),
      prisma.signatureAudit.create({
        data: {
          applicationId: id,
          ip,
          userAgent,
          acceptedTerms: acceptedContract,
          acceptedPrivacy,
          acceptedComodato,
          otpVerified: false,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      status: 'SIGNED',
      message: 'Contrato assinado com sucesso',
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao assinar contrato' },
      { status: 500 }
    );
  }
}

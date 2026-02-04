import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

/** POST: assinar contrato (SignupRequest CONTRACT_SENT -> SIGNED) */
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

    const req = await prisma.signupRequest.findUnique({ where: { id } });
    if (!req) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    if (req.status !== 'CONTRACT_SENT') {
      return NextResponse.json(
        { error: `Assinatura não permitida (status: ${req.status})` },
        { status: 400 }
      );
    }

    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null;
    const userAgent = headersList.get('user-agent') || null;

    await prisma.$transaction([
      prisma.signupRequest.update({
        where: { id },
        data: {
          status: 'SIGNED',
          signedAt: new Date(),
        },
      }),
      prisma.signupStatusHistory.create({
        data: {
          requestId: id,
          fromStatus: 'CONTRACT_SENT',
          toStatus: 'SIGNED',
          actor: 'cliente',
          note: `Assinatura eletrônica. IP: ${ip || 'N/A'}`,
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

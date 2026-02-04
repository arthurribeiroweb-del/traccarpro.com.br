import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** GET: detalhes da proposta (cliente ou admin) */
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
      include: {
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!app) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    return NextResponse.json(app);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao buscar proposta' },
      { status: 500 }
    );
  }
}

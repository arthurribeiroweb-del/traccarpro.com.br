import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** GET: detalhe da solicitação (cliente ou admin) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  }

  try {
    const req = await prisma.signupRequest.findUnique({
      where: { id },
      include: {
        SignupStatusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!req) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    const safe = {
      ...req,
      addressJson: req.addressJson ? JSON.parse(req.addressJson) : null,
      vehicleJson: req.vehicleJson ? JSON.parse(req.vehicleJson) : null,
      documentsJson: req.documentsJson ? JSON.parse(req.documentsJson) : [],
    };

    return NextResponse.json(safe);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao buscar solicitação' },
      { status: 500 }
    );
  }
}

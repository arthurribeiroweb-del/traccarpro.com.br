import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** GET: lista solicitações (admin) */
export async function GET() {
  try {
    const list = await prisma.signupRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        name: true,
        companyName: true,
        cpf: true,
        cnpj: true,
        email: true,
        status: true,
        protocolo: true,
        createdAt: true,
      },
    });
    return NextResponse.json(list);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao listar solicitações' },
      { status: 500 }
    );
  }
}

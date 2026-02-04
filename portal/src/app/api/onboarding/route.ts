import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** GET: lista propostas (admin) */
export async function GET() {
  try {
    const apps = await prisma.onboardingApplication.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        nome: true,
        email: true,
        status: true,
        tipoPessoa: true,
        createdAt: true,
      },
    });
    return NextResponse.json(apps);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao listar propostas' },
      { status: 500 }
    );
  }
}

/** POST: criar proposta (admin / cadastro inicial) */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const tipoPessoa = (body.tipoPessoa as string) || 'PF';
    const nome = (body.nome as string) || 'Cliente';
    const email = (body.email as string) || 'cliente@exemplo.com';
    const telefone = (body.telefone as string) || '';
    const cpfCnpj = (body.cpfCnpj as string) || '';
    const formaPagamento = (body.formaPagamento as string) || 'cartao';

    const app = await prisma.onboardingApplication.create({
      data: {
        tipoPessoa,
        nome,
        email,
        telefone: telefone || '00000000000',
        cpfCnpj: cpfCnpj || '00000000000',
        formaPagamento,
        monthlyPriceCents: formaPagamento === 'boleto' ? 5990 : 4990,
        status: 'APPROVED', // pronto para assinatura
        minTermMonths: 6,
      },
    });

    return NextResponse.json({
      ok: true,
      id: app.id,
      message: 'Proposta criada. Envie o link de assinatura ao cliente.',
      linkRevisao: `/cadastro/revisao?id=${app.id}`,
      linkAssinatura: `/cadastro/assinatura?id=${app.id}`,
      linkProposta: `/proposta/${app.id}`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao criar proposta' },
      { status: 500 }
    );
  }
}

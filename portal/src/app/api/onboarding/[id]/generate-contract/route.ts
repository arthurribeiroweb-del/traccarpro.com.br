import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { fillContractTemplate } from '@/lib/contract';
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
      select: { tipoPessoa: true },
    });
    const templateName = app?.tipoPessoa === 'PJ' ? 'contract_pj.html' : 'contract_pf.html';
    const templatePath = path.join(process.cwd(), 'templates', templateName);
    const html = await readFile(templatePath, 'utf-8');
    const filled = fillContractTemplate(html);

    return new NextResponse(filled, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'inline; filename="contrato-traccarpro.html"',
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao gerar contrato' }, { status: 500 });
  }
}

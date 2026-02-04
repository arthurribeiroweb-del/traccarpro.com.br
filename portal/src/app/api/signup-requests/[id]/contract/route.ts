import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

/** GET: exibir contrato HTML (assinatura ou download) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  }

  try {
    const contractPath = path.join(process.cwd(), 'uploads', id, 'contrato.html');
    const html = await readFile(contractPath, 'utf-8');
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'inline; filename="contrato-traccarpro.html"',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
  }
}

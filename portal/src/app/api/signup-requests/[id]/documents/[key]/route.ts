import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { readFile } from 'fs/promises';
import path from 'path';

/** GET: download documento (admin/cliente com id) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; key: string }> }
) {
  const { id, key } = await params;
  if (!id || !key) {
    return NextResponse.json({ error: 'ID e key obrigatórios' }, { status: 400 });
  }

  try {
    const req = await prisma.signupRequest.findUnique({ where: { id } });
    if (!req) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    const docs = req.documentsJson ? JSON.parse(req.documentsJson) : [];
    const doc = docs.find((d: { key: string }) => d.key === key);
    if (!doc?.path) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), doc.path);
    const buffer = await readFile(filePath);
    const mime = doc.mime || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${doc.filename || key}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar documento' }, { status: 500 });
  }
}

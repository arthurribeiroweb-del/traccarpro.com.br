import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
];

function isAllowedMime(mime: string): boolean {
  if (mime.startsWith('image/')) return true;
  return ALLOWED_DOCUMENT_TYPES.includes(mime);
}

function getExtensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt',
    'application/rtf': 'rtf',
    'application/vnd.oasis.opendocument.text': 'odt',
  };
  if (map[mime]) return map[mime];
  if (mime.startsWith('image/')) return mime.split('/')[1] || 'jpg';
  return 'bin';
}

/** POST: upload de documento */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  }

  try {
    const req = await prisma.signupRequest.findUnique({ where: { id } });
    if (!req) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }
    if (req.status !== 'DRAFT' && req.status !== 'NEEDS_FIX') {
      return NextResponse.json(
        { error: 'Solicitação não aceita mais uploads' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const key = (formData.get('key') as string) || 'doc';

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo excede 10MB.' },
        { status: 400 }
      );
    }

    const mime = file.type;
    if (!mime || !isAllowedMime(mime)) {
      return NextResponse.json(
        { error: 'Formato não permitido. Use imagens ou documentos (PDF, DOC, DOCX, etc.).' },
        { status: 400 }
      );
    }

    const ext = getExtensionFromMime(mime);
    const filename = `${key}_${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads', id);
    await mkdir(uploadDir, { recursive: true });
    const filepath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const storedPath = `uploads/${id}/${filename}`;
    const docs = req.documentsJson ? JSON.parse(req.documentsJson) : [];
    const filtered = docs.filter((d: { key: string }) => d.key !== key);
    filtered.push({
      key,
      path: storedPath,
      mime,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      filename,
    });

    await prisma.signupRequest.update({
      where: { id },
      data: { documentsJson: JSON.stringify(filtered) },
    });

    return NextResponse.json({
      ok: true,
      key,
      path: storedPath,
      size: file.size,
      message: 'Arquivo enviado com sucesso',
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Não foi possível enviar o arquivo. Tente novamente.' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const nullIfEmpty = (value: unknown) => {
  const v = clean(value);
  return v ? v : null;
};

const pickAddress = (raw: any) => {
  if (!raw || typeof raw !== 'object') return null;
  return {
    cep: clean(raw.cep),
    rua: clean(raw.rua),
    numero: clean(raw.numero),
    complemento: clean(raw.complemento),
    bairro: clean(raw.bairro),
    cidade: clean(raw.cidade),
    uf: clean(raw.uf),
  };
};

const pickVehicle = (raw: any) => {
  if (!raw || typeof raw !== 'object') return null;
  return {
    tipo: clean(raw.tipo),
    placa: clean(raw.placa),
    marcaModelo: clean(raw.marcaModelo),
    ano: clean(raw.ano),
    cor: clean(raw.cor),
    renavam: clean(raw.renavam),
    chassi: clean(raw.chassi),
  };
};

/** PATCH: atualizar dados da solicitação (admin) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const email = body.email !== undefined ? clean(body.email) : undefined;
  const phone = body.phone !== undefined ? clean(body.phone) : undefined;
  if (email !== undefined && !email) {
    return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 });
  }
  if (phone !== undefined && !phone) {
    return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 });
  }

  const data: Record<string, any> = {};
  if ('name' in body) data.name = nullIfEmpty(body.name);
  if ('cpf' in body) data.cpf = nullIfEmpty(body.cpf);
  if ('companyName' in body) data.companyName = nullIfEmpty(body.companyName);
  if ('cnpj' in body) data.cnpj = nullIfEmpty(body.cnpj);
  if ('responsibleName' in body) data.responsibleName = nullIfEmpty(body.responsibleName);
  if ('responsibleCpf' in body) data.responsibleCpf = nullIfEmpty(body.responsibleCpf);
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone;

  if ('addressJson' in body) {
    const address = pickAddress(body.addressJson);
    data.addressJson = address ? JSON.stringify(address) : null;
  }

  if ('vehicleJson' in body) {
    const vehicle = pickVehicle(body.vehicleJson);
    data.vehicleJson = vehicle ? JSON.stringify(vehicle) : null;
  }

  try {
    const updated = await prisma.signupRequest.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      ...updated,
      addressJson: updated.addressJson ? JSON.parse(updated.addressJson) : null,
      vehicleJson: updated.vehicleJson ? JSON.parse(updated.vehicleJson) : null,
      documentsJson: updated.documentsJson ? JSON.parse(updated.documentsJson) : [],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao salvar dados' }, { status: 500 });
  }
}

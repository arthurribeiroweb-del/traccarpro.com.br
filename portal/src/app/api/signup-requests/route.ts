import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** POST: criar ou atualizar solicitação (rascunho ou envio) */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const id = body.id as string | undefined;
    const isSubmit = body._action === 'submit';
    const type = (body.type as string) || 'PF';
    const email = (body.email as string) || '';
    const phone = (body.phone as string) || '';

    if (!email.trim() || !phone.trim()) {
      return NextResponse.json(
        { error: 'E-mail e celular são obrigatórios' },
        { status: 400 }
      );
    }

    const baseData = {
      type,
      name: body.name as string | undefined,
      companyName: body.companyName as string | undefined,
      responsibleName: body.responsibleName as string | undefined,
      cpf: body.cpf as string | undefined,
      cnpj: body.cnpj as string | undefined,
      responsibleCpf: body.responsibleCpf as string | undefined,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      email: email.trim(),
      phone: phone.trim(),
      addressJson: body.addressJson ? JSON.stringify(body.addressJson) : null,
      vehicleJson: body.vehicleJson ? JSON.stringify(body.vehicleJson) : null,
      documentsJson: body.documentsJson || null,
      formaPagamento: (body.formaPagamento as string) || 'cartao',
      monthlyPriceCents: body.formaPagamento === 'boleto' ? 5990 : 4990,
    };

    if (isSubmit) {
      // Validação de envio
      if (type === 'PF') {
        if (!baseData.name?.trim() || !baseData.cpf?.trim()) {
          return NextResponse.json(
            { error: 'Nome e CPF são obrigatórios para Pessoa Física' },
            { status: 400 }
          );
        }
      } else {
        if (
          !baseData.companyName?.trim() ||
          !baseData.cnpj?.trim() ||
          !baseData.responsibleName?.trim() ||
          !baseData.responsibleCpf?.trim()
        ) {
          return NextResponse.json(
            { error: 'Razão social, CNPJ, nome e CPF do responsável são obrigatórios para PJ' },
            { status: 400 }
          );
        }
      }

      if (!baseData.addressJson || baseData.addressJson === '{}') {
        return NextResponse.json(
          { error: 'Endereço completo é obrigatório' },
          { status: 400 }
        );
      }

      const docs = baseData.documentsJson ? JSON.parse(baseData.documentsJson) : [];
      const requiredKeys =
        type === 'PF'
          ? ['doc_foto', 'comprovante_residencia', 'doc_veiculo']
          : ['cartao_cnpj', 'doc_responsavel', 'comprovante_residencia', 'doc_veiculo'];
      const hasAll = requiredKeys.every((k) => docs.some((d: { key: string }) => d.key === k));
      if (!hasAll) {
        return NextResponse.json(
          { error: 'Todos os documentos obrigatórios devem ser enviados' },
          { status: 400 }
        );
      }

      if (!body.acceptedLgpd) {
        return NextResponse.json(
          { error: 'Aceite do tratamento de dados LGPD é obrigatório' },
          { status: 400 }
        );
      }
    }

    if (id) {
      const existing = await prisma.signupRequest.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
      }
      if (existing.status !== 'DRAFT' && existing.status !== 'NEEDS_FIX') {
        return NextResponse.json(
          { error: 'Solicitação não pode mais ser editada' },
          { status: 400 }
        );
      }

      const updateData: Record<string, unknown> = { ...baseData };
      if (isSubmit) {
        updateData.status = 'SUBMITTED';
        updateData.rejectReason = null;
        const count = await prisma.signupRequest.count();
        updateData.protocolo = `TRA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.signupRequest.update({
          where: { id },
          data: updateData,
        });
        if (isSubmit) {
          await tx.signupStatusHistory.create({
            data: {
              requestId: id,
              fromStatus: existing.status,
              toStatus: 'SUBMITTED',
              actor: 'cliente',
              note: 'Enviado para análise',
            },
          });
        }
        return u;
      });

      return NextResponse.json({
        ok: true,
        id: updated.id,
        status: updated.status,
        protocolo: updated.protocolo,
        message: isSubmit ? 'Solicitação enviada com sucesso' : 'Rascunho salvo',
      });
    }

    // Nova solicitação
    const created = await prisma.signupRequest.create({
      data: {
        ...baseData,
        status: isSubmit ? 'SUBMITTED' : 'DRAFT',
        protocolo: isSubmit
          ? `TRA-${new Date().getFullYear()}-${String(await prisma.signupRequest.count() + 1).padStart(4, '0')}`
          : null,
      },
    });

    if (isSubmit) {
      await prisma.signupStatusHistory.create({
        data: {
          requestId: created.id,
          fromStatus: 'DRAFT',
          toStatus: 'SUBMITTED',
          actor: 'cliente',
          note: 'Enviado para análise',
        },
      });
    }

    return NextResponse.json({
      ok: true,
      id: created.id,
      status: created.status,
      protocolo: created.protocolo,
      message: isSubmit ? 'Solicitação enviada com sucesso' : 'Rascunho criado',
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
}

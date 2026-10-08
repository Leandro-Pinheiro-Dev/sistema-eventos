"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

const PRICE_PER_BARBER = 69.9;

export async function addBarber(
  barbershopId: string,
  name: string,
  email: string,
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Não autenticado.");
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedName) {
    throw new Error("Informe o nome do barbeiro.");
  }

  if (!normalizedEmail) {
    throw new Error("Informe o e-mail do barbeiro.");
  }

  // Verifica se o usuário logado é o OWNER desta barbearia.
  const ownerMembership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
      barbershopId,
      role: "OWNER",
      active: true,
    },
  });

  if (!ownerMembership) {
    throw new Error(
      "Você não tem permissão para adicionar barbeiros nesta barbearia.",
    );
  }

  // Procura um usuário existente pelo e-mail.
  let user = await db.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  // Se ainda não existir, cria o usuário.
  if (!user) {
    user = await db.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        role: "BARBER",
        needsRoleSelection: false,
      },
    });
  } else {
    // Garante que o usuário tenha perfil de barbeiro.
    user = await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        name: normalizedName || user.name,
        role: "BARBER",
        needsRoleSelection: false,
      },
    });
  }

  // Verifica se esse usuário já possui uma membership nesta barbearia.
  const existingMembership = await db.membership.findUnique({
    where: {
      userId_barbershopId: {
        userId: user.id,
        barbershopId,
      },
    },
  });

  if (existingMembership?.active) {
    throw new Error("Este barbeiro já está ativo nesta barbearia.");
  }

  // Reativa uma membership existente.
  if (existingMembership) {
    await db.membership.update({
      where: {
        id: existingMembership.id,
      },
      data: {
        role: "BARBER",
        active: true,
      },
    });
  } else {
    // Cria uma nova membership de BARBER.
    await db.membership.create({
      data: {
        userId: user.id,
        barbershopId,
        role: "BARBER",
        active: true,
      },
    });
  }

  // Recalcula a quantidade de barbeiros ativos.
  const barberCount = await db.membership.count({
    where: {
      barbershopId,
      role: "BARBER",
      active: true,
    },
  });

  // Recalcula o valor mensal.
  const totalAmount = barberCount * PRICE_PER_BARBER;

  await db.subscription.update({
    where: {
      barbershopId,
    },
    data: {
      barberCount,
      pricePerBarber: PRICE_PER_BARBER,
      totalAmount,
    },
  });

  // Busca a membership real criada/reativada.
  const membership = await db.membership.findUnique({
    where: {
      userId_barbershopId: {
        userId: user.id,
        barbershopId,
      },
    },
    select: {
      id: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!membership) {
    throw new Error("Não foi possível localizar o barbeiro cadastrado.");
  }

  return {
    success: true,
    membershipId: membership.id,
    name: membership.user.name,
    email: membership.user.email,
    barberCount,
    totalAmount,
  };
}

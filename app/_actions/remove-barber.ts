"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

const PRICE_PER_BARBER = 69.9;

export async function removeBarber(
  barbershopId: string,
  membershipId: string,
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Não autenticado.");
  }

  // Somente o OWNER desta barbearia pode remover/desativar barbeiros.
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
      "Você não tem permissão para remover barbeiros desta barbearia.",
    );
  }

  // Localiza a membership que será desativada.
  const barberMembership = await db.membership.findFirst({
    where: {
      id: membershipId,
      barbershopId,
      role: "BARBER",
      active: true,
    },
  });

  if (!barberMembership) {
    throw new Error("Barbeiro não encontrado ou já está desativado.");
  }

  // Não apagamos a membership.
  // Apenas desativamos para preservar o histórico.
  await db.membership.update({
    where: {
      id: barberMembership.id,
    },
    data: {
      active: false,
    },
  });

  // Conta novamente somente os barbeiros ativos.
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

  return {
    success: true,
    barberCount,
    totalAmount,
  };
}

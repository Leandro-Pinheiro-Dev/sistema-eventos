"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

const PRICE_PER_BARBER = 29.9;

function createSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createBarbershop(data: {
  name: string;
  address: string;
  phone: string;
  description: string;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      success: false,
      error: "Você precisa estar logado para criar uma barbearia.",
    };
  }

  const name = data.name.trim();
  const address = data.address.trim();
  const phone = data.phone.trim();
  const description = data.description.trim();

  if (!name) {
    return {
      success: false,
      error: "Informe o nome da barbearia.",
    };
  }

  if (name.length < 3) {
    return {
      success: false,
      error: "O nome deve possuir pelo menos 3 caracteres.",
    };
  }

  if (!address) {
    return {
      success: false,
      error: "Informe o endereço da barbearia.",
    };
  }

  if (!phone) {
    return {
      success: false,
      error: "Informe o telefone da barbearia.",
    };
  }

  if (!description) {
    return {
      success: false,
      error: "Informe uma descrição.",
    };
  }

  const existingMembership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
      active: true,
    },
    select: {
      id: true,
      barbershopId: true,
      role: true,
    },
  });

  if (existingMembership) {
    return {
      success: false,
      error: "Você já possui uma barbearia vinculada à sua conta.",
    };
  }

  const baseSlug = createSlug(name);

  if (!baseSlug) {
    return {
      success: false,
      error: "Não foi possível gerar o identificador da barbearia.",
    };
  }

  let slug = baseSlug;

  const existingSlug = await db.barbershop.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
    },
  });

  if (existingSlug) {
    slug = `${baseSlug}-${Date.now()}`;
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const barbershop = await tx.barbershop.create({
        data: {
          name,
          slug,
          address,
          phones: [phone],
          description,
        },
      });

      const membership = await tx.membership.create({
        data: {
          userId: session.user.id,
          barbershopId: barbershop.id,
          role: "OWNER",
          active: true,
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          barbershopId: barbershop.id,
          status: "TRIAL",
          barberCount: 0,
          pricePerBarber: PRICE_PER_BARBER,
          totalAmount: 0,
          startedAt: new Date(),
        },
      });

      return {
        barbershop,
        membership,
        subscription,
      };
    });

    revalidatePath("/");
    revalidatePath("/login");
    revalidatePath("/criar-barbearia");

    return {
      success: true,
      barbershopId: result.barbershop.id,
      slug: result.barbershop.slug,
    };
  } catch (error) {
    console.error("ERRO AO CRIAR BARBEARIA:", error);

    return {
      success: false,
      error: "Não foi possível criar a barbearia.",
    };
  }
}

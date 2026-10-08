"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

interface PayDebtParams {
  userId?: string | null;
  bookingId?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  amount: number;
}

const normalizePhone = (phone?: string | null) => {
  if (!phone) {
    return "";
  }

  return phone.replace(/\D/g, "");
};

const isManualUserId = (userId?: string | null) => {
  return userId?.startsWith("manual:PHONE:") ?? false;
};

const getPhoneFromManualUserId = (userId?: string | null) => {
  if (!userId || !isManualUserId(userId)) {
    return "";
  }

  return normalizePhone(userId.replace("manual:PHONE:", ""));
};

export const payDebt = async ({
  userId,
  bookingId,
  clientName,
  clientPhone,
  amount,
}: PayDebtParams) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  if (session.user.role !== "BARBER") {
    throw new Error("Acesso não autorizado.");
  }

  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
      active: true,
      role: {
        in: ["OWNER", "BARBER"],
      },
    },
    select: {
      barbershopId: true,
    },
  });

  if (!membership) {
    throw new Error("Barbearia não encontrada para este usuário.");
  }

  const barbershopId = membership.barbershopId;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("O valor do pagamento deve ser maior que zero.");
  }

  if (!userId && !bookingId && !clientName && !clientPhone) {
    throw new Error("Não foi possível identificar o cliente do pagamento.");
  }

  const manualPhoneFromUserId = getPhoneFromManualUserId(userId);
  const normalizedClientPhone = normalizePhone(clientPhone);
  const manualPhone = manualPhoneFromUserId || normalizedClientPhone;
  const manualClient = isManualUserId(userId);

  let transactions;

  if (manualClient) {
    const manualTransactions = await db.customerDebt.findMany({
      where: {
        barbershopId,
        userId: null,
      },
      select: {
        id: true,
        userId: true,
        bookingId: true,
        clientName: true,
        clientPhone: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    transactions = manualTransactions.filter((transaction) => {
      return normalizePhone(transaction.clientPhone) === manualPhone;
    });
  } else if (userId) {
    transactions = await db.customerDebt.findMany({
      where: {
        barbershopId,
        userId,
      },
      select: {
        id: true,
        userId: true,
        bookingId: true,
        clientName: true,
        clientPhone: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  } else if (bookingId) {
    transactions = await db.customerDebt.findMany({
      where: {
        barbershopId,
        bookingId,
      },
      select: {
        id: true,
        userId: true,
        bookingId: true,
        clientName: true,
        clientPhone: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  } else {
    const manualTransactions = await db.customerDebt.findMany({
      where: {
        barbershopId,
        userId: null,
      },
      select: {
        id: true,
        userId: true,
        bookingId: true,
        clientName: true,
        clientPhone: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    transactions = manualTransactions.filter((transaction) => {
      const sameName =
        !clientName ||
        transaction.clientName?.trim().toLowerCase() ===
          clientName.trim().toLowerCase();

      const samePhone =
        !normalizedClientPhone ||
        normalizePhone(transaction.clientPhone) === normalizedClientPhone;

      return sameName && samePhone;
    });
  }

  if (!transactions || transactions.length === 0) {
    throw new Error("Nenhuma movimentação encontrada para este cliente.");
  }

  const totalDebt = transactions.reduce((total, transaction) => {
    const value = Number(transaction.amount);

    if (transaction.type === "DEBT") {
      return total + value;
    }

    if (transaction.type === "PAYMENT") {
      return total - value;
    }

    return total;
  }, 0);

  if (totalDebt <= 0) {
    throw new Error("Este cliente não possui fiado em aberto.");
  }

  if (amount > totalDebt) {
    throw new Error(
      `O pagamento não pode ser maior que a dívida de R$ ${totalDebt.toFixed(
        2,
      )}.`,
    );
  }

  const lastTransaction = transactions[transactions.length - 1];

  const finalClientName = clientName ?? lastTransaction?.clientName ?? null;

  const finalClientPhone =
    clientPhone ?? lastTransaction?.clientPhone ?? null;

  const finalBookingId = bookingId ?? lastTransaction?.bookingId ?? null;

  const finalUserId = manualClient
    ? null
    : (userId ?? lastTransaction?.userId ?? null);

  await db.customerDebt.create({
    data: {
      barbershopId,
      userId: finalUserId,
      bookingId: finalBookingId,
      clientName: finalClientName,
      clientPhone: finalClientPhone,
      amount,
      type: "PAYMENT",
      description: "Pagamento de fiado",
    },
  });

  await db.financialTransaction.create({
    data: {
      barbershopId,
      amount,
      type: "DEBT_PAYMENT",
      description: "Pagamento de fiado",
      bookingId: finalBookingId,
      clientName: finalClientName,
      clientPhone: finalClientPhone,
    },
  });

  const remainingAmount = totalDebt - amount;

  revalidatePath("/barbeiro/dashboard");

  return {
    success: true,
    paidAmount: amount,
    remainingAmount,
  };
};

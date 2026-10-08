"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";

interface CompleteBookingParams {
  bookingId: string;
  paymentType: "PAID" | "DEBT";
}

export const completeBooking = async ({
  bookingId,
  paymentType,
}: CompleteBookingParams) => {
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

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const booking = await tx.booking.findFirst({
      where: {
        id: bookingId,
        barbershopId: membership.barbershopId,
      },
      include: {
        service: true,
        bookingItems: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!booking) {
      throw new Error("Agendamento não encontrado.");
    }

    if (booking.status === "COMPLETED") {
      throw new Error("Este agendamento já foi concluído.");
    }

    const bookingTotal = Number(booking.total);

    const updatedBooking = await tx.booking.updateMany({
      where: {
        id: bookingId,
        barbershopId: membership.barbershopId,
        status: {
          not: "COMPLETED",
        },
      },
      data: {
        status: "COMPLETED",
      },
    });

    if (updatedBooking.count === 0) {
      throw new Error("Este agendamento já foi concluído.");
    }

    if (paymentType === "DEBT") {
      await tx.customerDebt.create({
        data: {
          barbershopId: booking.barbershopId,
          userId: booking.userId,
          bookingId: booking.id,
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
          amount: bookingTotal,
          type: "DEBT",
          description: `Fiado - ${
            booking.bookingItems.length > 0
              ? booking.bookingItems.map((item) => item.service.name).join(", ")
              : booking.service.name
          }`,
        },
      });
    }

    if (paymentType === "PAID") {
      await tx.financialTransaction.create({
        data: {
          barbershopId: booking.barbershopId,
          amount: bookingTotal,
          type: "SERVICE_PAYMENT",
          description: `Pagamento - ${
            booking.bookingItems.length > 0
              ? booking.bookingItems.map((item) => item.service.name).join(", ")
              : booking.service.name
          }`,
          bookingId: booking.id,
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
        },
      });
    }
  });

  revalidatePath("/barbeiro/dashboard");
  revalidatePath("/bookings");
  revalidatePath("/");

  return {
    success: true,
  };
};

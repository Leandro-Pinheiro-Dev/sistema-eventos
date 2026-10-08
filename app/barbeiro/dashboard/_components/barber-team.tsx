"use client";

import { useState } from "react";

import { addBarber } from "@/app/_actions/add-barber";
import { removeBarber } from "@/app/_actions/remove-barber";

type Barber = {
  membershipId: string;
  name: string | null;
  email: string | null;
};

type BarberTeamProps = {
  barbershopId: string;
  initialBarbers: Barber[];
  initialBarberCount: number;
  initialTotalAmount: number;
  isOwner: boolean;
};

export default function BarberTeam({
  barbershopId,
  initialBarbers,
  initialBarberCount,
  initialTotalAmount,
  isOwner,
}: BarberTeamProps) {
  const [barbers, setBarbers] = useState(initialBarbers);
  const [barberCount, setBarberCount] = useState(initialBarberCount);
  const [totalAmount, setTotalAmount] = useState(initialTotalAmount);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAddBarber(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const result = await addBarber(barbershopId, name, email);

      setBarberCount(result.barberCount);
      setTotalAmount(result.totalAmount);

      setBarbers((current) => [
        ...current,
        {
          membershipId: result.membershipId,
          name: result.name,
          email: result.email,
        },
      ]);

      setName("");
      setEmail("");

      setMessage("Barbeiro adicionado com sucesso.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar o barbeiro.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveBarber(membershipId: string) {
    const confirmed = window.confirm(
      "Deseja realmente desativar este barbeiro?",
    );

    if (!confirmed) {
      return;
    }

    setRemovingId(membershipId);
    setMessage(null);
    setError(null);

    try {
      const result = await removeBarber(barbershopId, membershipId);

      setBarbers((current) =>
        current.filter((barber) => barber.membershipId !== membershipId),
      );

      setBarberCount(result.barberCount);
      setTotalAmount(result.totalAmount);

      setMessage("Barbeiro desativado com sucesso.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível desativar o barbeiro.",
      );
    } finally {
      setRemovingId(null);
    }
  }

  if (!isOwner) {
    return null;
  }

  return (
    <section className="space-y-6 rounded-xl border bg-background p-6">
      <div>
        <h2 className="text-xl font-semibold">Equipe de barbeiros</h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie os barbeiros desta barbearia e acompanhe a mensalidade.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Barbeiros ativos
          </p>

          <p className="mt-1 text-2xl font-bold">{barberCount}</p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Valor por barbeiro
          </p>

          <p className="mt-1 text-2xl font-bold">
            R$ 69,90
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Mensalidade atual
          </p>

          <p className="mt-1 text-2xl font-bold">
            {totalAmount.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleAddBarber}
        className="space-y-4 rounded-lg border p-4"
      >
        <div>
          <h3 className="font-semibold">Adicionar barbeiro</h3>

          <p className="text-sm text-muted-foreground">
            Informe o nome e o e-mail que o barbeiro utilizará para entrar no
            sistema.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="barber-name"
              className="text-sm font-medium"
            >
              Nome
            </label>

            <input
              id="barber-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do barbeiro"
              required
              disabled={loading}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="barber-email"
              className="text-sm font-medium"
            >
              E-mail
            </label>

            <input
              id="barber-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="barbeiro@email.com"
              required
              disabled={loading}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Adicionando..." : "Adicionar barbeiro"}
        </button>
      </form>

      {message && (
        <p className="rounded-md border p-3 text-sm">
          {message}
        </p>
      )}

      {error && (
        <p className="rounded-md border border-destructive p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold">
          Barbeiros ativos
        </h3>

        {barbers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum barbeiro ativo cadastrado.
          </p>
        ) : (
          <div className="space-y-2">
            {barbers.map((barber) => (
              <div
                key={barber.membershipId}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {barber.name || "Sem nome"}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {barber.email || "Sem e-mail"}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={removingId === barber.membershipId}
                  onClick={() =>
                    handleRemoveBarber(barber.membershipId)
                  }
                  className="rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {removingId === barber.membershipId
                    ? "Desativando..."
                    : "Desativar"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

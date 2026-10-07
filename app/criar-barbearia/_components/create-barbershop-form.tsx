"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createBarbershop } from "@/app/_actions/create-barbershop";

import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";

const CreateBarbershopForm = () => {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await createBarbershop({
        name,
        address,
        phone,
        description,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Barbearia criada com sucesso!");

      router.push("/");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Nome da barbearia
        </label>

        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Barbearia Premium"
          disabled={isPending}
          required
          className="bg-zinc-950"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="address" className="text-sm font-medium">
          Endereço
        </label>

        <Input
          id="address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Rua, número, bairro, cidade - SP"
          disabled={isPending}
          required
          className="bg-zinc-950"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium">
          Telefone
        </label>

        <Input
          id="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="(11) 99999-9999"
          disabled={isPending}
          required
          className="bg-zinc-950"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Descrição
        </label>

        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Conte um pouco sobre sua barbearia..."
          disabled={isPending}
          required
          rows={4}
          className="flex w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <p className="text-sm font-medium">
          Plano inicial
        </p>

        <p className="mt-1 text-sm text-zinc-400">
          O proprietário não é cobrado como barbeiro.
        </p>

        <p className="mt-2 text-sm text-zinc-400">
          Cada barbeiro cadastrado terá o valor
          <strong className="ml-1 text-white">
            R$ 29,90/mês
          </strong>
          .
        </p>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full"
      >
        {isPending
          ? "Criando barbearia..."
          : "Criar minha barbearia"}
      </Button>
    </form>
  );
};

export default CreateBarbershopForm;

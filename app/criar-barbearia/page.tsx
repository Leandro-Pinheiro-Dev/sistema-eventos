import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

import CreateBarbershopForm from "./_components/create-barbershop-form";

const CreateBarbershopPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-5">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-white shadow-xl sm:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Crie sua barbearia
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Cadastre sua barbearia para começar a utilizar a plataforma.
          </p>
        </div>

        <CreateBarbershopForm />
      </div>
    </main>
  );
};

export default CreateBarbershopPage;

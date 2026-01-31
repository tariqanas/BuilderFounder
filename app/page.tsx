import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 py-10">
      <div className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
          MVP BuilderFounder
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-white sm:text-5xl">
          Trouve ton cofondateur, transforme tes idées en produit.
        </h1>
        <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
          BuilderFounder connecte les porteurs d'idées et les builders pour créer
          vite, valider et lancer.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Link
          className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300"
          href="/signup"
        >
          Créer un compte
        </Link>
        <Link
          className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500"
          href="/login"
        >
          Se connecter
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {[
          {
            title: "Match instantané",
            text: "Identifie rapidement les profils complémentaires.",
          },
          {
            title: "Feuille de route claire",
            text: "Partage tes objectifs et ta vision dès le départ.",
          },
          {
            title: "Communauté active",
            text: "Accède à un feed d'idées et de builders engagés.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
          >
            <h3 className="mb-2 text-lg font-semibold text-white">
              {item.title}
            </h3>
            <p className="text-sm text-slate-300">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
        404
      </p>
      <h1 className="text-3xl font-semibold text-white">
        Page introuvable
      </h1>
      <p className="text-sm text-slate-300">
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300"
      >
        Retour à l&apos;accueil
      </Link>
    </section>
  );
}

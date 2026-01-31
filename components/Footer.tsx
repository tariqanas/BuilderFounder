export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-2 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>© BuilderFounder 2026 – MVP</span>
        <a
          className="text-emerald-200 hover:text-emerald-100"
          href="mailto:hello@builderfounder.co"
        >
          hello@builderfounder.co
        </a>
      </div>
    </footer>
  );
}

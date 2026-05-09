import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 py-16">
      <div className="w-full max-w-xl rounded-xl border border-border/60 bg-background/80 p-10 text-center shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Error 404
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          The page you requested does not exist or was moved.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-foreground px-6 text-sm font-medium text-background transition hover:opacity-90"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
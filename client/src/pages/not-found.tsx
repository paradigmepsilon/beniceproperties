import { Link } from "wouter";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
      <h1 className="text-4xl font-semibold">404</h1>
      <p className="mt-2 text-muted-foreground">This page doesn&apos;t exist.</p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent-foreground"
      >
        Back home
      </Link>
    </main>
  );
}

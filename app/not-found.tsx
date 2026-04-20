import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-foreground flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-20 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-md text-center text-sm opacity-80">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="bg-accent text-background rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
      >
        Back to home
      </Link>
    </div>
  );
}

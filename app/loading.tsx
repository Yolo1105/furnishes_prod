export default function Loading() {
  return (
    <div
      className="min-h-[40vh] w-full animate-pulse font-sans"
      aria-busy
      aria-label="Loading"
    >
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="bg-foreground/8 mb-4 h-8 max-w-xs rounded" />
        <div className="bg-foreground/6 mb-3 h-4 max-w-2xl rounded" />
        <div className="bg-foreground/6 h-4 max-w-xl rounded" />
      </div>
    </div>
  );
}

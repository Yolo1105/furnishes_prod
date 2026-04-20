import { PageSkeleton } from "@/components/eva-dashboard/account/shared";

export default function CartLoading() {
  return (
    <main className="border-border bg-card flex min-h-0 flex-1 flex-col overflow-y-auto border lg:overflow-hidden">
      <PageSkeleton eyebrow="CART" cards={0}>
        <div className="mx-auto w-full max-w-[1180px]">
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="border p-4"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="flex gap-4">
                    <div className="skeleton h-24 w-24 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-40" />
                      <div className="skeleton h-3 w-28" />
                      <div className="skeleton h-3 w-20" />
                    </div>
                    <div className="skeleton h-8 w-24" />
                  </div>
                </div>
              ))}
            </div>
            <aside
              className="border p-5"
              style={{
                background: "var(--card-soft)",
                borderColor: "var(--border)",
              }}
            >
              <div className="skeleton h-3 w-20" />
              <div className="mt-5 space-y-3">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-3/4" />
              </div>
              <div className="skeleton mt-6 h-10 w-full" />
            </aside>
          </div>
        </div>
      </PageSkeleton>
    </main>
  );
}

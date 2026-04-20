import { PageSkeleton } from "@/components/eva-dashboard/account/shared";

export default function CheckoutLoading() {
  return (
    <PageSkeleton eyebrow="CHECKOUT" cards={0} subtitle={false}>
      <div>
        <div className="mb-8 flex items-center gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="skeleton h-4 w-4" />
              <div className="skeleton h-3 w-16" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="border p-5"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="skeleton h-4 w-36" />
                  <div className="skeleton mt-2 h-3 w-80" />
                </div>
              ))}
            </div>
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
  );
}

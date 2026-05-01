"use client";

import "@studio/dev/install-playground-console-filters";

import dynamic from "next/dynamic";

const Studio = dynamic(
  () =>
    import("@/components/studio/studio/Studio").then((m) => ({
      default: m.Studio,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#1a1a1a",
          fontSize: 14,
        }}
      >
        Loading studio…
      </div>
    ),
  },
);

export function PlaygroundStudioClient() {
  return (
    <>
      <div className="bg-fluid" aria-hidden="true">
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
      </div>
      <Studio />
    </>
  );
}

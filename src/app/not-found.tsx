import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>This route does not exist.</p>
    </main>
  );
}

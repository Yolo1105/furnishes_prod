import { publicSiteOrigin, siteJsonLd } from "@/lib/seo";

export function SiteJsonLd() {
  const origin = publicSiteOrigin();
  if (!origin.startsWith("https://")) return null;
  return (
    <script type="application/ld+json">
      {JSON.stringify(siteJsonLd(origin))}
    </script>
  );
}

import type { Metadata } from "next";
import CoachCatalog from "./coach-catalog";

export const metadata: Metadata = {
  title: "Find a Coach | CoachConnect Pakistan",
  description: "Browse approved cricket, tennis and strength coaches across Pakistan.",
};

type CatalogSearchParams = Promise<{
  query?: string | string[];
  city?: string | string[];
}>;

export default async function CoachesPage({ searchParams }: { searchParams: CatalogSearchParams }) {
  const params = await searchParams;
  const query = typeof params.query === "string" ? params.query : "";
  const city = typeof params.city === "string" ? params.city : "any";

  return <CoachCatalog initialQuery={query} initialCity={city} />;
}

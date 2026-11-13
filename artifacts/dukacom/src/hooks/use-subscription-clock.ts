import { useEffect, useState } from "react";
import type { EntrepriseDoc } from "@/lib/firestore-helpers";

const MAX_TIMEOUT_MS = 2_147_000_000;

export function useSubscriptionClock(
  entreprises: readonly (EntrepriseDoc | null | undefined)[],
): number {
  const [now, setNow] = useState(() => Date.now());

  let nextExpiration = Number.POSITIVE_INFINITY;
  for (const entreprise of entreprises) {
    if (entreprise?.statut_abonnement !== "actif") continue;
    const expiration = entreprise.date_expiration_abonnement.toMillis();
    if (expiration > now && expiration < nextExpiration) {
      nextExpiration = expiration;
    }
  }

  useEffect(() => {
    if (!Number.isFinite(nextExpiration)) return;

    const delay = Math.min(
      Math.max(nextExpiration - now + 1, 1),
      MAX_TIMEOUT_MS,
    );
    const timer = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [nextExpiration, now]);

  return now;
}

"use client";

import { useEffect, useState } from "react";
import type { Address, Cart } from "@/lib/site/commerce/types";

export type CheckoutBootstrap = {
  authenticated: boolean;
  commerceBackendEnabled: boolean;
  addresses: Address[];
  cart: Cart | null;
};

const empty: CheckoutBootstrap = {
  authenticated: false,
  commerceBackendEnabled: false,
  addresses: [],
  cart: null,
};

/**
 * Loads `/api/checkout/context` once. Returns 401-style empty state when unauthenticated.
 */
export function useCheckoutBootstrap(): CheckoutBootstrap & {
  loading: boolean;
} {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CheckoutBootstrap>(empty);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/checkout/context")
      .then(async (res) => {
        const json = (await res.json()) as Record<string, unknown>;
        if (res.status === 401) {
          return {
            ...empty,
            commerceBackendEnabled: !!json.commerceBackendEnabled,
          };
        }
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        if (!json || typeof json !== "object" || !("authenticated" in json)) {
          setData(empty);
          return;
        }
        const j = json as CheckoutBootstrap;
        setData({
          authenticated: !!j.authenticated,
          commerceBackendEnabled: !!j.commerceBackendEnabled,
          addresses: j.addresses ?? [],
          cart: j.cart ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setData(empty);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, ...data };
}

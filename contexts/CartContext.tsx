"use client";

/**
 * contexts/CartContext.tsx
 *
 * ⚠️  STUB — This file was generated with assumed types.
 * Please confirm (or correct) the CartItem shape and action signatures
 * before using in production.
 *
 * Assumed interface (from sidebar panel description):
 *   CartItem: { id, name, image (URL string), price, quantity, variant? }
 *   Actions:  addItem, removeItem(id), clearCart
 *
 * Questions:
 *   1. Is `image` a plain URL string, or an object { src, alt }?
 *   2. Are the action names exactly addItem / removeItem / clearCart?
 *   3. Any additional fields on CartItem (e.g. sku, slug, collection)?
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type {
  CartContextValue,
  CartItem,
} from "@/components/shared/layout/sidebar/types";

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i,
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{ items, subtotal, addItem, removeItem, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

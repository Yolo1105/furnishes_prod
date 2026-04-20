import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Matches Tailwind `md:` breakpoint (pixels). Used for responsive layout / matchMedia checks. */
export const MOBILE_BREAKPOINT = 768;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * General-purpose utility functions for UI and data formatting.
 */

/**
 * Merges Tailwind CSS classes with CLSX support, resolving conflicts intelligently.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

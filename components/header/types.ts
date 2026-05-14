/**
 * Search Suggestion Structure.
 * Represents a single post suggestion displayed in the real-time search dialog.
 */
export type SearchSuggestion = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  authorName: string;
  previewUrl: string | null;
};

/**
 * Header User Metadata.
 * Simplified user object containing only the fields necessary for header navigation 
 * and profile menus.
 */
export type HeaderUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isPro?: boolean;
};
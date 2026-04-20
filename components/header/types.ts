export type SearchSuggestion = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  authorName: string;
  previewUrl: string | null;
};

export type HeaderUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isPro?: boolean;
};
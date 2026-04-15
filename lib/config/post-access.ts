import { Globe, Lock, BadgeDollarSign, type LucideIcon } from "lucide-react";

export type PostAccessType = "public" | "private" | "paid";

export const POST_ACCESS_OPTIONS: {
  value: PostAccessType;
  label: string;
  description: string;
  icon: LucideIcon;
  className: string;
}[] = [
  {
    value: "public",
    label: "Public",
    description: "visible to everyone",
    icon: Globe,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  {
    value: "private",
    label: "Private",
    description: "only you",
    icon: Lock,
    className: "text-amber-600 dark:text-amber-400",
  },
  {
    value: "paid",
    label: "Paid",
    description: "for subscribers",
    icon: BadgeDollarSign,
    className: "text-violet-600 dark:text-violet-400",
  },
];

export const ACCESS_META = POST_ACCESS_OPTIONS.reduce((acc, option) => {
  acc[option.value] = {
    label: option.label,
    Icon: option.icon,
    className: option.className,
  };
  return acc;
}, {} as Record<string, { label: string; Icon: LucideIcon; className: string }>);

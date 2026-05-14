import { Globe, Lock, BadgeDollarSign, type LucideIcon } from "lucide-react";
import { ACCESS_TYPES } from "@/lib/db/auth-schema";

export type PostAccessType = number;

export const POST_ACCESS_OPTIONS: {
  value: PostAccessType;
  label: string;
  description: string;
  icon: LucideIcon;
  className: string;
}[] = [
  {
    value: ACCESS_TYPES.PUBLIC,
    label: "Public",
    description: "visible to everyone",
    icon: Globe,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  {
    value: ACCESS_TYPES.PRIVATE,
    label: "Private",
    description: "only you",
    icon: Lock,
    className: "text-amber-600 dark:text-amber-400",
  },
  {
    value: ACCESS_TYPES.PAID,
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
}, {} as Record<number, { label: string; Icon: LucideIcon; className: string }>);

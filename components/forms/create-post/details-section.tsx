import Link from "next/link";
import { ChevronDown, Check, KeyRound, EyeOff, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { POST_ACCESS_OPTIONS } from "@/lib/config/post-access";

interface DetailsSectionProps {
  entriesLength: number;
  access: "public" | "private" | "paid";
  handleAccessChange: (newAccess: "public" | "private" | "paid") => void;
  addPassword: boolean;
  setAddPassword: (val: boolean) => void;
  passwordValue: string;
  setPasswordValue: (val: string) => void;
  isPending: boolean;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
}

export function DetailsSection({
  entriesLength,
  access,
  handleAccessChange,
  addPassword,
  setAddPassword,
  passwordValue,
  setPasswordValue,
  isPending,
  showPassword,
  setShowPassword,
}: DetailsSectionProps) {
  const selectedAccess = POST_ACCESS_OPTIONS.find((a) => a.value === access) || POST_ACCESS_OPTIONS[0];

  return (
    <FieldGroup className="gap-4 p-0">
      <Field>
        <FieldLabel htmlFor="title">Title</FieldLabel>
        <Input
          id="title"
          name="title"
          maxLength={120}
          required
          placeholder="Give your post a short title"
        />
        <FieldDescription>
          A title helps users quickly understand your post.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea
          id="description"
          name="description"
          maxLength={500}
          required
          placeholder="Describe what you are sharing"
          className="min-h-40 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          showCount
        />
        <FieldDescription>
          One description is attached to the whole post.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="access">Access type</FieldLabel>
        <Input type="hidden" name="access" value={access} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between font-normal h-10 border-input bg-background hover:bg-background/90 px-3" disabled={isPending}>
              <span className="flex items-center gap-2 min-w-0 truncate">
                <selectedAccess.icon className="size-4 shrink-0" />
                <span className="truncate">{selectedAccess.label} - {selectedAccess.description}</span>
              </span>
              <ChevronDown className="size-4 opacity-50 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {POST_ACCESS_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleAccessChange(option.value as "public" | "private" | "paid")}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <option.icon className="size-4" />
                  {option.label}
                </span>
                {access === option.value && <Check className="size-4 text-emerald-500" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <FieldDescription>
          Controls who can see this post in the feed.
        </FieldDescription>
      </Field>

      {access === "private" && (
        <Field>
          <div className="flex items-center gap-2">
            <Input
              id="add-password"
              type="checkbox"
              checked={addPassword}
              onChange={(e) => {
                setAddPassword(e.target.checked);
                if (!e.target.checked) setPasswordValue("");
              }}
              className="size-4 rounded border-input accent-primary cursor-pointer w-auto h-auto min-w-0"
            />
            <FieldLabel htmlFor="add-password" className="text-sm font-medium cursor-pointer select-none flex items-center gap-1.5 font-normal">
              <KeyRound className="size-3.5 text-muted-foreground shrink-0" />
              Add password?
            </FieldLabel>
          </div>

          {addPassword && (
            <div className="relative mt-2">
              <Input
                id="post-password"
                type={showPassword ? "text" : "password"}
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                maxLength={100}
                placeholder="Enter a password for this post"
                className="pr-10"
                required={addPassword}
              />
              <Button
                variant="ghost"
                size="icon"
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-0 bottom-0 my-auto h-7 w-7 text-muted-foreground hover:bg-transparent hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          )}
          <FieldDescription>
            Visitors with the direct link will need this password to view the post.
          </FieldDescription>
        </Field>
      )}

      {entriesLength === 0 && (
        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          Add at least one media file to publish your post.
        </p>
      )}

      <Button
        type="submit"
        className="mt-2 h-10 w-full hover:bg-primary/80"
        disabled={isPending || entriesLength === 0}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Create post"
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Upload content according to <Link href="/rules" className="underline underline-offset-2">site rules</Link>
      </p>
    </FieldGroup>
  );
}

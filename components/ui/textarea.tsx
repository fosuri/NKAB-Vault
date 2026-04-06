import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  showCount?: boolean;
}

function Textarea({ className, showCount, maxLength, value, defaultValue, onChange, ...props }: TextareaProps) {
  const [internalValue, setInternalValue] = React.useState(value || defaultValue || "");

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (value === undefined) {
      setInternalValue(e.target.value);
    }
    if (onChange) {
      onChange(e);
    }
  };

  const textareaContent = (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      maxLength={maxLength}
      value={value}
      defaultValue={defaultValue}
      onChange={handleChange}
      {...props}
    />
  );

  if (showCount) {
    const currentLength = String(internalValue).length;
    return (
      <div className="w-full flex flex-col items-end gap-1.5">
        {textareaContent}
        <div className="text-xs text-muted-foreground px-1">
          {currentLength}{maxLength ? `/${maxLength}` : ""}
        </div>
      </div>
    );
  }

  return textareaContent;
}

export { Textarea }

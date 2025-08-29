import * as React from "react";
import { cn } from "@/lib/ui/cn";

export function Button({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors",
        "bg-foreground text-background hover:opacity-90",
        className
      )}
      {...props}
    />
  );
}

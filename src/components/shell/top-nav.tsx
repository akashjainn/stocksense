import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

function Search(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("w-full max-w-sm border rounded-md px-3 py-2", props.className)} placeholder="Search tickers..." />;
}

export function TopNav() {
  return (
    <div className="h-14 flex items-center justify-between px-4">
      <Search />
      <div className="text-sm text-muted-foreground">User</div>
    </div>
  );
}

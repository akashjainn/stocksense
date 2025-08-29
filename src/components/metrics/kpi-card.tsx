import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="mt-2 flex items-end gap-3">
          <span className="text-3xl font-semibold tracking-tight">{value}</span>
          {delta && (
            <span className={`text-sm ${delta.startsWith("-") ? "text-red-600" : "text-emerald-600"}`}>{delta}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

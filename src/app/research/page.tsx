import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function ResearchPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Research</h1>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/research/live">
          <Card className="rounded-2xl hover:shadow-sm transition-shadow">
            <CardContent className="p-5">
              <div className="text-sm text-neutral-500">Realtime</div>
              <div className="mt-1 text-lg font-medium">Live Markets</div>
              <div className="mt-3 text-xs text-neutral-500">Stream live quotes over SSE for popular symbols.</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

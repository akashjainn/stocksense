import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import type { ObjectId, WithId } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UserMinimal = { _id: ObjectId };

async function ensureDemoUser() {
  const db = await getMongoDb();
  const users = db.collection("users");
  const email = "demo@stocksense.local";
  const existing = await users.findOne<UserMinimal>({ email }, { projection: { _id: 1 } });
  if (existing?._id) return { id: String(existing._id) };
  const ins = await users.insertOne({ email, name: "Demo User", createdAt: new Date() });
  if (!ins.insertedId) throw new Error("Failed to create or find demo user.");
  return { id: String(ins.insertedId) };
}

export async function GET() {
  try {
    const db = await getMongoDb();
    const accountsCol = db.collection("accounts");
    const cursor = accountsCol
      .find({}, { projection: { name: 1, userId: 1, baseCcy: 1, createdAt: 1 } })
      .sort({ createdAt: 1 });
  type AccountDoc = { _id: ObjectId; name: string; userId?: string; baseCcy?: string; createdAt?: Date };
  const docs: WithId<AccountDoc>[] = await cursor.toArray() as WithId<AccountDoc>[];
  const accounts = docs.map((d) => ({
      id: String(d._id),
      name: d.name,
      userId: d.userId,
      baseCcy: d.baseCcy ?? "USD",
      createdAt: d.createdAt ?? null,
    }));
    return NextResponse.json({ data: accounts });
  } catch (e) {
    const error = e as Error;
    console.error("[/api/accounts] GET failed:", error);
    return NextResponse.json(
      { error: "Accounts query failed", detail: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const user = await ensureDemoUser();
    const name = body.name?.trim() || "My Portfolio";

    const db = await getMongoDb();
    const accountsCol = db.collection("accounts");
    const doc = { userId: user.id, name, baseCcy: "USD", createdAt: new Date() };
    const ins = await accountsCol.insertOne(doc);
    if (!ins.insertedId) {
      console.error("[/api/accounts] Created account missing id:", ins);
      return NextResponse.json(
        { error: "Account creation failed to return an ID" },
        { status: 500 }
      );
    }
    const account = {
      id: String(ins.insertedId),
      name,
      userId: user.id,
      baseCcy: "USD",
      createdAt: doc.createdAt,
    };
    return NextResponse.json({ data: account }, { status: 201 });
  } catch (e) {
    const error = e as Error;
    console.error("[/api/accounts] POST failed:", error);
    return NextResponse.json(
      { error: "Account creation failed", detail: error.message },
      { status: 500 }
    );
  }
}

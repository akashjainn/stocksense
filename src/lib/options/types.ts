import { z } from "zod";

export const CreateLotSchema = z.object({
  accountId: z.string(),
  symbol: z.string().min(1),
  openedAt: z.string(),
  quantity: z.number().int().positive(),
  pricePerShare: z.number().positive(),
  fees: z.number().optional().default(0),
  notes: z.string().optional(),
});

export const SellFromLotSchema = z.object({
  occurredAt: z.string(),
  quantity: z.number().int().positive(),
  pricePerShare: z.number().positive().optional(),
  fees: z.number().optional().default(0),
});

export const SplitSchema = z.object({
  occurredAt: z.string(),
  ratio: z.number().positive(), // 2.0 for 2:1, 0.5 for 1:2 reverse split
});

export const OpenOptionSchema = z.object({
  accountId: z.string(),
  symbol: z.string(),
  type: z.enum(["CALL", "PUT"]),
  contracts: z.number().int().positive(),
  strike: z.number().positive(),
  expiry: z.string(),
  pricePerContract: z.number(), // signed by action; OPEN is typically + for short
  fees: z.number().optional().default(0),
  openedAt: z.string(),
  allocations: z.array(z.object({ lotId: z.string(), proportion: z.number().min(0).max(1) })).min(1),
});

export type CreateLotInput = z.infer<typeof CreateLotSchema>;
export type SellFromLotInput = z.infer<typeof SellFromLotSchema>;
export type SplitInput = z.infer<typeof SplitSchema>;
export type OpenOptionInput = z.infer<typeof OpenOptionSchema>;

import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(80, "Reviews must be at least 80 characters long.")
});

export const flagReviewSchema = z.object({
  reason: z.string().trim().min(1, "Flag reason is required.")
});

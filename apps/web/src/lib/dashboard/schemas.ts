import { z } from "zod";
import { DATE_PRESETS } from "@/lib/dashboard/constants";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Invalid date" });

export const dashboardQuerySchema = z
  .object({
    preset: z.enum(DATE_PRESETS, { error: "Invalid date preset" }),
    from: dateOnly.optional(),
    to: dateOnly.optional(),
  })
  .refine(
    (data) =>
      data.preset !== "custom" || (!!data.from && !!data.to && data.from <= data.to),
    { error: "Custom range requires a valid from and to date", path: ["to"] },
  );

export type DashboardQuery = z.output<typeof dashboardQuerySchema>;

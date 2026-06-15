import { z } from "zod";

const originSchema = z
  .string()
  .url()
  .transform((value) => new URL(value).origin);

export const envSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    AUTH_SECRET: z.string().min(16),
    CONSOLE_ORIGIN: originSchema,
    SURVEY_ORIGIN: originSchema,
  })
  .refine((value) => value.CONSOLE_ORIGIN !== value.SURVEY_ORIGIN, {
    message: "CONSOLE_ORIGIN and SURVEY_ORIGIN must be different.",
    path: ["SURVEY_ORIGIN"],
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(input: Record<string, string | undefined>): Env {
  return envSchema.parse({
    DATABASE_URL: input.DATABASE_URL,
    AUTH_SECRET: input.AUTH_SECRET,
    CONSOLE_ORIGIN: input.CONSOLE_ORIGIN,
    SURVEY_ORIGIN: input.SURVEY_ORIGIN,
  });
}

export const env = parseEnv(process.env);

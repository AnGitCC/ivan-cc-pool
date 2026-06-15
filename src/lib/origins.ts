import { env } from "@/lib/env";

export function buildSurveyUrl(slug: string) {
  return `${env.SURVEY_ORIGIN}/s/${slug}`;
}

import { z } from "zod";

export const submissionAnswerSchema = z.union([
  z.string().trim().min(1),
  z.array(z.string().trim().min(1)).min(1),
  z.number().finite(),
]);

export const submissionSchema = z.object({
  answers: z.record(z.string(), submissionAnswerSchema),
});

export type SubmissionAnswer = z.infer<typeof submissionAnswerSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;

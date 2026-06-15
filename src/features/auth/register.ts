import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const registerLecturerSchema = z.object({
  name: z.string().trim().min(1, "请输入姓名。"),
  email: z.string().trim().email("请输入有效邮箱。"),
  password: z.string().min(8, "密码至少需要 8 位。"),
});

export type RegisterLecturerInput = z.infer<typeof registerLecturerSchema>;

export async function registerLecturer(input: RegisterLecturerInput) {
  const parsed = registerLecturerSchema.parse(input);
  const passwordHash = await bcrypt.hash(parsed.password, 10);

  return db.user.create({
    data: {
      name: parsed.name,
      email: parsed.email.toLowerCase(),
      passwordHash,
    },
  });
}

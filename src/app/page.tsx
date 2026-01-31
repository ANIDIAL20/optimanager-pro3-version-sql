import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  // 1. كنتحققو من السيسيون باستعمال Auth.js
  const session = await auth();

  // 2. إلا كان المستخدم موجود، ديه للداشبورد
  if (session?.user) {
    redirect("/dashboard");
  }

  // 3. إلا ماكانش، ديه لصفحة الدخول
  redirect("/login");
}

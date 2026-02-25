import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  // 1. Vérification de la session avec Auth.js
  const session = await auth();

  // 2. Si l'utilisateur est connecté, redirection vers le dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  // 3. Sinon, redirection vers la page de connexion
  redirect("/login");
}

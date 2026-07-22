import { isAuthenticated } from "@/lib/server-auth";
import { LoginForm } from "@/components/admin/login-form";
import { Dashboard } from "@/components/admin/dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAuthenticated();
  return authed ? <Dashboard /> : <LoginForm />;
}

import { getCurrentUser } from "../actions/auth";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Enforce server-side security redirection
  if (!user) {
    redirect("/login");
  }

  // Pass sanitized user session properties to client
  return <DashboardClient user={user} />;
}

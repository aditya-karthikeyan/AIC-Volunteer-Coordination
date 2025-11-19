import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import VolunteerDashboard from "@/components/VolunteerDashboard";
import { checkIsAdmin } from "@/lib/supabase/profile";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is admin and redirect to admin portal
  const isAdmin = await checkIsAdmin(user.id);
  if (isAdmin) {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <VolunteerDashboard userId={user.id} userEmail={user.email || ""} />
    </div>
  );
}

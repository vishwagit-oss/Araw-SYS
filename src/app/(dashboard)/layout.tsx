import { AuthGuard } from "@/components/AuthGuard";
import { DashboardNav } from "@/components/DashboardNav";

export default function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        <DashboardNav />
        <main className="pt-14 lg:pt-0 lg:ml-64 min-h-screen p-4 sm:p-6">{children}</main>
      </div>
    </AuthGuard>
  );
}

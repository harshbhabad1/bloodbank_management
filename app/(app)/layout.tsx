import { requireAdmin } from "@/lib/auth";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <main className="page-content animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

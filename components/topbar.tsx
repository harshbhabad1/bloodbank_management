import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function Topbar() {
  return (
    <header className="topbar">
      <span className="topbar-title">Blood Bank Management</span>
      <form action={logout}>
        <Button variant="ghost" size="sm" type="submit" className="text-slate-500 hover:text-slate-800">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </form>
    </header>
  );
}

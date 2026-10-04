"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Droplets,
  ClipboardList,
  Activity,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/donors", label: "Donors", icon: Users },
  { href: "/inventory", label: "Inventory", icon: Droplets },
  { href: "/requests", label: "Requests", icon: ClipboardList },
  { href: "/activity", label: "Activity Log", icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
            <path d="M12 2C12 2 4 9.5 4 14.5C4 18.64 7.58 22 12 22C16.42 22 20 18.64 20 14.5C20 9.5 12 2 12 2Z"/>
          </svg>
        </div>
        <div>
          <div className="sidebar-logo-text">BloodBank</div>
          <div className="sidebar-logo-sub">Management System</div>
        </div>
      </div>

      {/* Nav */}
      <div className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? "active" : ""}`}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #1e293b" }}>
        <div style={{ fontSize: "11px", color: "#475569", textAlign: "center" }}>
          v1.0 · Blood Bank Manager
        </div>
      </div>
    </nav>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "./login-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign In" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600 mb-4 shadow-lg shadow-red-900/30">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-white">
              <path d="M12 2C12 2 4 9.5 4 14.5C4 18.64 7.58 22 12 22C16.42 22 20 18.64 20 14.5C20 9.5 12 2 12 2ZM12 20C8.69 20 6 17.46 6 14.5C6 10.97 10.62 5.25 12 3.46C13.38 5.25 18 10.97 18 14.5C18 17.46 15.31 20 12 20Z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">BloodBank Manager</h1>
          <p className="text-slate-400 text-sm mt-1">Admin Portal — Sign in to continue</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <LoginForm />
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Secure single-admin access · Session expires in 7 days
        </p>
      </div>
    </div>
  );
}

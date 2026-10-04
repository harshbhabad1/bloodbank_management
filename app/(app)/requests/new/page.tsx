import RequestForm from "@/components/request-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Blood Request",
};

export default function NewRequestPage() {
  return (
    <div>
      <div className="mb-4">
        <Link
          href="/requests"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blood Requests
        </Link>
      </div>

      <div className="page-header">
        <div className="page-header-text">
          <h1>Create Blood Request</h1>
          <p>Register a new hospital requisition for patient transfusion or surgery</p>
        </div>
      </div>

      <RequestForm />
    </div>
  );
}

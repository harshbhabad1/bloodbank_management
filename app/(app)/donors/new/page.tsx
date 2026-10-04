import DonorForm from "@/components/donor-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add Donor" };

export default function NewDonorPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Add New Donor</h1>
          <p>Register a new blood donor in the system</p>
        </div>
      </div>
      <DonorForm />
    </div>
  );
}

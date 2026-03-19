import { redirect } from "next/navigation";

export default function CaseReceivingPage() {
  // Case receiving is removed in favor of Cargo Receiving/Discharge.
  redirect("/dashboard/cargo-receiving?mode=receiving");
}

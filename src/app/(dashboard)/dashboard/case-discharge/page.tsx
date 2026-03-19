import { redirect } from "next/navigation";

export default function CaseDischargePage() {
  // Case discharge is removed in favor of Cargo Receiving/Discharge.
  redirect("/dashboard/cargo-receiving?mode=discharge");
}

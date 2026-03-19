import { redirect } from "next/navigation";

export default function SalePage() {
  // Sale is removed in favor of Cargo Receiving/Discharge.
  redirect("/dashboard/cargo-receiving?mode=discharge");
}

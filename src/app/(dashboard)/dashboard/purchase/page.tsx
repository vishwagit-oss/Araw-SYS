import { redirect } from "next/navigation";

export default function PurchasePage() {
  // Purchase is removed in favor of Cargo Receiving/Discharge.
  redirect("/dashboard/cargo-receiving?mode=receiving");
}

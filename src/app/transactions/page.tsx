import { redirect } from "next/navigation";

export default function TransactionsPage() {
  // Feature disabled: redirect users to portfolio import for upload-based workflow
  redirect("/portfolio/import");
}

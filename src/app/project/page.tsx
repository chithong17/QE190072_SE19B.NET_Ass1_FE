import { redirect } from "next/navigation";

// Backward-compatible alias for a commonly typed singular URL.
export default function ProjectAliasPage() {
  redirect("/projects");
}

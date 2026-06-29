import { redirect } from "next/navigation";

// Landing page removed — questionnaire starts immediately at /audit
export default function Home() {
  redirect("/audit");
}

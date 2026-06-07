import { redirect } from "next/navigation";

export default function Home() {
  // The portal root sends people into the app; middleware/login handle gating.
  redirect("/portal");
}

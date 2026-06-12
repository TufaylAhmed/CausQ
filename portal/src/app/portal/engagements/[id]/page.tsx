import { redirect } from "next/navigation";

// Engagements were renamed to Projects. Preserve old links (including stored
// notification links) by redirecting to the project detail route.
export default async function EngagementRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/portal/projects/${id}`);
}

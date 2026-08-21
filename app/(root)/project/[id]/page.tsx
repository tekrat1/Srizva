import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/projects";
import { getCurrentUser } from "@/lib/actions/auth";
import { getUsageStatus } from "@/lib/actions/rate-limit";
import ProjectViewer from "@/components/ProjectViewer";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, user] = await Promise.all([getProject(id), getCurrentUser()]);

  if (!project) notFound();

  const usage = user ? await getUsageStatus(user.uid) : null;

  // `key` forces React to fully remount ProjectViewer when navigating from
  // one project to another instead of reusing the old instance's state.
  return (
    <ProjectViewer
      key={project.id}
      id={project.id}
      plan={project.plan}
      files={project.files}
      isPublic={project.isPublic}
      shareId={project.shareId}
      initialLocked={usage?.locked ?? false}
      initialResetsInMs={usage?.resetsInMs ?? null}
    />
  );
}

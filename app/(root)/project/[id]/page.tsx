import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/projects";
import ProjectViewer from "@/components/ProjectViewer";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) notFound();

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
    />
  );
}

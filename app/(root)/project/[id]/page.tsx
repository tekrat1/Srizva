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

  return <ProjectViewer plan={project.plan} files={project.files} />;
}

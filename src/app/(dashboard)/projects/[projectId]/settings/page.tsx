import { getProjectMembers } from "@/actions/project-members"
import { getBoardSections } from "@/actions/board-section"
import { ProjectSettingsView } from "@/components/projects/project-settings-view"

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  
  const [{ members }, { sections }] = await Promise.all([
    getProjectMembers(projectId),
    getBoardSections(projectId),
  ])

  return (
    <ProjectSettingsView
      projectId={projectId}
      initialMembers={(members ?? []) as any}
      initialSections={sections ?? []}
    />
  )
}

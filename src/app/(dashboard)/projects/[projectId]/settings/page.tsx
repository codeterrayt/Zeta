import { getProjectMembers } from "@/actions/project-members"
import { ProjectSettingsView } from "@/components/projects/project-settings-view"

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const { members } = await getProjectMembers(projectId)

  return (
    <ProjectSettingsView
      projectId={projectId}
      initialMembers={(members ?? []) as any}
    />
  )
}

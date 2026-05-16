import Link from "next/link"
import { Folder } from "lucide-react"
import { getProjects } from "@/actions/project"
import { CreateProjectModal } from "@/components/projects/create-project-modal"

export default async function ProjectsPage() {
  const { projects } = await getProjects()

  return (
    <div className="max-w-8xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage all your active and past projects.</p>
        </div>
        <CreateProjectModal />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects?.map((project: any) => (
          <Link key={project.id} href={`/projects/${project.id}`} className="block group">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:border-primary/50 transition-colors h-full flex flex-col">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4 group-hover:bg-primary/20 transition-colors">
                <Folder className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 flex-1">{project.description || "No description provided."}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-4 border-t border-border">
                <span>{project._count?.tasks ?? 0} tasks</span>
                <span>{project._count?.members ?? 0} members</span>
              </div>
            </div>
          </Link>
        ))}

        {(!projects || projects.length === 0) && (
          <div className="col-span-full bg-secondary/20 border border-dashed border-border rounded-xl p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-sm text-muted-foreground mb-6">Create your first project to get started.</p>
            <CreateProjectModal />
          </div>
        )}
      </div>
    </div>
  )
}

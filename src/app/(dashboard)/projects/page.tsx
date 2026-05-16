import Link from "next/link"
import { Folder, ListTodo, Users } from "lucide-react"
import { getProjects } from "@/actions/project"
import { CreateProjectModal } from "@/components/projects/create-project-modal"
import { EditProjectModal } from "@/components/projects/edit-project-modal"

export default async function ProjectsPage() {
  const { projects } = await getProjects()

  return (
    <div className="p-6 lg:p-10 space-y-12 h-full overflow-y-auto custom-scrollbar">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-2 font-medium text-lg">Manage all your active and past projects.</p>
        </div>
        <CreateProjectModal />
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {projects?.map((project: any) => {
          const isAdmin = project.members?.[0]?.role === "ADMIN"
          
          return (
            <Link key={project.id} href={`/projects/${project.id}`} className="block group">
              <div className="bg-card border border-border/60 rounded-[2.5rem] shadow-sm overflow-hidden transition-all hover:shadow-xl hover:border-primary/50 h-full flex flex-col relative group-hover:-translate-y-1 duration-300">
                <div className="p-8 border-b border-border/40 bg-secondary/10 flex items-center justify-between relative">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-inner pointer-events-none">
                    <Folder className="w-8 h-8" />
                  </div>
                  <div className="pointer-events-auto">
                    <EditProjectModal project={project} isAdmin={isAdmin} />
                  </div>
                </div>
              
              <div className="p-8 flex-1 flex flex-col bg-card">
                <h2 className="text-2xl font-black mb-3 text-foreground">{project.name}</h2>
                <p className="text-sm text-muted-foreground font-medium flex-1 line-clamp-3 leading-relaxed">
                  {project.description || "No description provided."}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-8 pt-6 border-t border-border/40 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-lg"><ListTodo className="w-4 h-4 text-primary"/> {project._count?.tasks ?? 0} TASKS</span>
                  <span className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-lg"><Users className="w-4 h-4 text-blue-500"/> {project._count?.members ?? 0} MEMBERS</span>
                </div>
              </div>
            </div>
          </Link>
          )
        })}

        {(!projects || projects.length === 0) && (
          <div className="col-span-full bg-card border-2 border-dashed border-border/60 rounded-[2.5rem] p-16 text-center flex flex-col items-center justify-center transition-all hover:bg-secondary/10 shadow-sm min-h-[400px]">
            <div className="w-24 h-24 bg-secondary/30 rounded-full flex items-center justify-center text-muted-foreground mb-8 ring-8 ring-secondary/10">
              <Folder className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-black mb-4">No projects found</h2>
            <p className="text-muted-foreground font-medium text-lg mb-8 max-w-md mx-auto">You haven't created any projects yet. Create your first project to organize your tasks.</p>
          </div>
        )}
      </section>
    </div>
  )
}

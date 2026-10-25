import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string; avatar: string }
  children: React.ReactNode
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" collapsible="icon" user={user} />
      <SidebarInset>
        <SiteHeader/>
          <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            {children}
          </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

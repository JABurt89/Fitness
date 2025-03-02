import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Dumbbell, Calendar, ClipboardList, Scale, LayoutDashboard, Calculator, Play, X } from "lucide-react";
import { 
  Sidebar as UISidebar, 
  SidebarTrigger, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { UserSection } from "./UserSection";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Begin Workout", href: "/begin-workout", icon: Play },
  { name: "Exercises", href: "/exercises", icon: Dumbbell },
  { name: "Workout Days", href: "/workout-days", icon: Calendar },
  { name: "Workout Log", href: "/workout-log", icon: ClipboardList },
  { name: "Weight Tracker", href: "/weight-tracker", icon: Scale },
  { name: "Future Workout", href: "/future-workout", icon: Calculator },
];

export default function Sidebar() {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const { openMobile, setOpenMobile } = useSidebar();

  return (
    <>
      {/* Top Navigation Bar for Mobile */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border bg-sidebar px-4 py-2">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-10 w-10" />
            <span className="font-medium text-sidebar-foreground">Retard Strength</span>
          </div>
        </div>
      )}

      {isMobile ? (
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent
            side="left"
            className="w-[280px] p-0 bg-sidebar border-r border-sidebar-border [&>button]:hidden"
          >
            <div className="flex h-full w-full flex-col bg-sidebar">
              <SheetHeader className="px-4 py-4">
                <SheetTitle className="text-xl font-bold text-sidebar-foreground">Navigation Menu</SheetTitle>
                <SheetDescription>Access all features of Retard Strength</SheetDescription>
              </SheetHeader>
              <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border bg-sidebar">
                <h1 className="text-xl font-bold text-sidebar-foreground truncate">Retard Strength</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpenMobile(false)}
                  className="h-10 w-10"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close Menu</span>
                </Button>
              </div>
              <SidebarContent className="flex-1 overflow-y-auto bg-sidebar p-4">
                <SidebarMenu>
                  {navigation.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <Link href={item.href} onClick={() => setOpenMobile(false)}>
                        <SidebarMenuButton
                          isActive={location === item.href}
                          tooltip={item.name}
                          className={cn(
                            "w-full",
                            location === item.href
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            "group-data-[collapsible=icon]:!p-2"
                          )}
                        >
                          <item.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                          <span className="truncate text-sm">{item.name}</span>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarContent>
              <UserSection />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <UISidebar 
          variant="floating"
          collapsible="icon"
          className={cn(
            "border-r border-sidebar-border bg-sidebar",
            "fixed left-0 top-0 bottom-0 md:sticky md:top-0",
            "z-40 flex h-screen",
            "w-[240px]",
            "transition-all duration-300 ease-in-out"
          )}
        >
          <SidebarHeader className="flex items-center h-16 px-4 border-b border-sidebar-border bg-sidebar">
            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
              <h1 className="text-xl font-bold text-sidebar-foreground truncate">Retard Strength</h1>
            </div>
            <SidebarTrigger className="ml-2 shrink-0" />
          </SidebarHeader>
          <SidebarContent className="flex-1 overflow-y-auto bg-sidebar p-4">
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <Link href={item.href}>
                    <SidebarMenuButton
                      isActive={location === item.href}
                      tooltip={item.name}
                      className={cn(
                        "w-full",
                        location === item.href
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        "group-data-[collapsible=icon]:!p-2"
                      )}
                    >
                      <item.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span className="truncate text-sm group-data-[collapsible=icon]:hidden">{item.name}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <UserSection />
        </UISidebar>
      )}
    </>
  );
}
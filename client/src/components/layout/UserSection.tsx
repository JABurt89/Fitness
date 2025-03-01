import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import {
  SidebarFooter,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export function UserSection() {
  const { user, logoutMutation } = useAuth();

  return (
    <SidebarFooter>
      <div className="flex flex-col gap-2 p-2">
        <div className="flex items-center gap-2 px-2">
          <User className="h-4 w-4" />
          <span className="text-sm font-medium">{user?.username}</span>
        </div>
        <SidebarMenuButton
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="justify-start"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </SidebarMenuButton>
      </div>
    </SidebarFooter>
  );
}

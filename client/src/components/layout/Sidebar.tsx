import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Dumbbell, Calendar, ClipboardList, Scale, LayoutDashboard, Calculator, Play } from "lucide-react";

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

  return (
    <div className="flex flex-col w-64 bg-sidebar border-r border-border">
      <div className="flex items-center h-16 px-6 border-b border-border">
        <h1 className="text-xl font-bold text-sidebar-foreground">Workout Tracker</h1>
      </div>
      <nav className="flex-1 px-3 py-4">
        {navigation.map((item) => (
          <Link key={item.name} href={item.href}>
            <div
              className={cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                location === item.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}
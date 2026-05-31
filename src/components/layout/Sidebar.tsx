import Link from "next/link";
import { LayoutDashboard, FileBarChart, PieChart, Database, Settings } from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "New Prediction", href: "/risk-analysis", icon: FileBarChart },
  { name: "Batch Analysis", href: "/batch-analysis", icon: Database },
  { name: "Model Insights", href: "/model-insights", icon: PieChart },
  { name: "Settings", href: "#", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-background/80 backdrop-blur-xl border-r border-white/10 flex flex-col h-full shrink-0 shadow-lg">
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">P</span>
          </div>
          <span className="font-semibold text-lg tracking-wide text-foreground">Perseptron AI</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">Menu</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-primary/20 hover:text-primary"
            >
              <Icon className="w-5 h-5 opacity-80" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-white/10">
        <div className="glass p-4 rounded-xl">
          <div className="text-sm font-medium mb-1 text-foreground">AI Models Status</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Online & Learning
          </div>
        </div>
      </div>
    </aside>
  );
}

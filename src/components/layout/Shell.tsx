import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { AIChatPanel } from "./AIChatPanel";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary/30">
      {/* Background ambient gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[40%] rounded-full bg-chart-4/10 blur-[120px]" />
      </div>

      <Sidebar />
      
      <div className="flex flex-col flex-1 min-w-0 z-10 relative">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      <AIChatPanel />
    </div>
  );
}

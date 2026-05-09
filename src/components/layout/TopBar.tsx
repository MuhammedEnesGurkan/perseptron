import { Search, Bell, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TopBar() {
  return (
    <header className="h-16 border-b border-white/10 bg-background/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search customer ID or name..." 
          className="pl-10 bg-black/20 border-white/10 focus-visible:ring-primary/50 rounded-xl"
        />
      </div>
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
          <div className="text-right hidden md:block">
            <div className="text-sm font-medium text-foreground">Risk Officer</div>
            <div className="text-xs text-muted-foreground">Level 4 Access</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>
    </header>
  );
}

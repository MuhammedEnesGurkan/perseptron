"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  Command,
  FileClock,
  Gauge,
  Menu,
  RadioTower,
  Radar,
  Search,
  Settings2,
  ShieldCheck,
  ScanLine,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button, Dot } from "@/components/ui";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Operasyon özeti", icon: Gauge },
  { href: "/eurosat-ml-2025", label: "EuroSAT ML 2025", icon: Radar },
  { href: "/yolo-integration", label: "YOLO entegrasyonu", icon: ScanLine },
  { href: "/missions", label: "Analiz kayıtları", icon: FileClock },
  { href: "/settings", label: "Model ayarları", icon: Settings2 },
];

function Navigation({ close }: { close?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("/").slice(0, 2).join("/"));
        return (
          <Link
            href={item.href}
            key={item.href}
            onClick={close}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active ? "bg-[#2a332f] text-ink" : "text-muted hover:bg-white/[.04] hover:text-ink",
            )}
          >
            <item.icon className={cn("h-4 w-4", active ? "text-accent" : "text-dim group-hover:text-muted")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ close }: { close?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[68px] items-center gap-3 border-b border-line px-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-[#241a14] shadow-[0_0_24px_rgba(223,137,83,.18)]"><RadioTower className="h-4 w-4" /></div>
        <div>
          <p className="text-sm font-semibold tracking-[-.02em]">Sentinel Scope</p>
          <p className="text-[10px] uppercase tracking-[.16em] text-dim">EuroSAT console</p>
        </div>
        {close && <button onClick={close} className="ml-auto text-muted"><X className="h-5 w-5" /></button>}
      </div>
      <div className="flex-1 px-3 py-5">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-dim">Kontrol merkezi</p>
        <Navigation close={close} />
        <p className="mb-2 mt-7 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-dim">Sistem durumu</p>
        <div className="space-y-2 rounded-xl border border-line bg-black/10 p-3">
          <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-muted"><Dot />Inference API</span><span className="text-success">Aktif</span></div>
          <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-muted"><Dot />YOLO worker</span><span className="text-success">Hazır</span></div>
        </div>
      </div>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#33413c] text-xs font-semibold text-[#d3ddd6]">MA</div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">Mission Analyst</p><p className="truncate text-[11px] text-dim">Operasyon birimi</p></div>
          <ChevronDown className="h-3.5 w-3.5 text-dim" />
        </div>
      </div>
    </div>
  );
}

function Notifications() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="focus-ring relative grid h-9 w-9 place-items-center rounded-xl border border-line bg-panel text-muted transition-colors hover:text-ink" aria-label="Bildirimler">
          <Bell className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={10} align="end" className="z-50 w-[330px] rounded-2xl border border-line bg-[#1b2422] p-2 shadow-2xl">
          <div className="px-2 py-2"><p className="text-sm font-semibold">Bildirimler</p></div>
          <div className="rounded-xl border border-line bg-black/10 px-3 py-5 text-center"><p className="text-xs font-medium text-ink">Yeni bildirim yok</p><p className="mt-1 text-[11px] leading-4 text-dim">Gerçek analiz olayları üretildiğinde burada gösterilecek.</p></div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <Tooltip.Provider delayDuration={250}>
      <div className="min-h-screen bg-background text-ink">
        <aside className="fixed inset-y-0 left-0 hidden w-[244px] border-r border-line bg-[#141c1a] lg:block"><SidebarContent /></aside>
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/65 lg:hidden" onClick={() => setMobileOpen(false)} />
              <motion.aside initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ type: "spring", stiffness: 360, damping: 34 }} className="fixed inset-y-0 left-0 z-50 w-[260px] border-r border-line bg-[#141c1a] lg:hidden"><SidebarContent close={() => setMobileOpen(false)} /></motion.aside>
            </>
          )}
        </AnimatePresence>
        <header className="fixed inset-x-0 top-0 z-30 flex h-[68px] items-center border-b border-line bg-[#111816]/95 px-4 backdrop-blur lg:left-[244px] lg:px-6">
          <Button size="icon" variant="ghost" className="mr-2 lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></Button>
          <div className="hidden items-center gap-2 text-xs text-muted sm:flex"><ShieldCheck className="h-4 w-4 text-success" /><span>Operasyon ağı</span><span className="text-dim">/</span><span className="text-ink">Gizli olmayan eğitim ortamı</span></div>
          <button className="ml-auto mr-2 hidden h-9 w-56 items-center gap-2 rounded-xl border border-line bg-panel px-3 text-xs text-dim transition-colors hover:border-[#455550] md:flex"><Search className="h-3.5 w-3.5" />Görev veya grid ara<span className="ml-auto flex items-center gap-0.5 rounded border border-line px-1 py-0.5 text-[9px]"><Command className="h-2.5 w-2.5" />K</span></button>
          <Tooltip.Root><Tooltip.Trigger asChild><button className="mr-2 grid h-9 w-9 place-items-center rounded-xl border border-line bg-panel text-muted transition-colors hover:text-ink"><CircleHelp className="h-4 w-4" /></button></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content sideOffset={8} className="rounded-lg border border-line bg-panel-raised px-2 py-1 text-[11px] text-ink">Yardım ve kısayollar</Tooltip.Content></Tooltip.Portal></Tooltip.Root>
          <Notifications />
        </header>
        <main className="min-h-screen pt-[68px] lg:pl-[244px]">
          <div className="mx-auto max-w-[1580px] p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </Tooltip.Provider>
  );
}

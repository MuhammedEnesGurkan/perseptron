"use client";

import { type ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, FileSearch, Filter, MoreHorizontal, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Dot, Panel } from "@/components/ui";
import type { Mission, MissionStatus } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

const statusMap: Record<MissionStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" | "accent" }> = {
  verified: { label: "Doğrulandı", tone: "success" },
  review: { label: "İncelenecek", tone: "warning" },
  queued: { label: "Kuyrukta", tone: "neutral" },
  processing: { label: "İşleniyor", tone: "accent" },
  failed: { label: "Hata", tone: "danger" },
};

export function MissionsTable({ data, compact = false }: { data: Mission[]; compact?: boolean }) {
  const [search, setSearch] = useState("");
  const columns = useMemo<ColumnDef<Mission>[]>(() => [
    { accessorKey: "id", header: "Görev", cell: ({ row }) => <Link href={`/analysis/${row.original.id}`} className="font-semibold text-ink transition-colors hover:text-accent">{row.original.id}</Link> },
    { accessorKey: "zone", header: "Grid konumu", cell: ({ row }) => <span className="text-muted">{row.original.zone}</span> },
    { accessorKey: "className", header: "Bağlam", cell: ({ row }) => <span className="flex items-center gap-2"><Dot tone={row.original.className === "Industrial" ? "warning" : "muted"} />{row.original.className}</span> },
    { accessorKey: "confidence", header: "Güven", cell: ({ row }) => <span className="font-mono text-[11px] text-muted">{formatPercent(row.original.confidence)}</span> },
    { accessorKey: "assetCount", header: "Varlık", cell: ({ row }) => <Badge tone={row.original.assetCount ? "warning" : "neutral"}>{row.original.assetCount}</Badge> },
    { accessorKey: "status", header: "Durum", cell: ({ row }) => <Badge tone={statusMap[row.original.status].tone}>{statusMap[row.original.status].label}</Badge> },
    { id: "action", cell: ({ row }) => <Link href={`/analysis/${row.original.id}`} className="grid h-7 w-7 place-items-center rounded-lg text-dim hover:bg-white/[.05] hover:text-ink" aria-label={`${row.original.id} detayını aç`}><MoreHorizontal className="h-4 w-4" /></Link> },
  ], []);
  const table = useReactTable({
    data, columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: compact ? 5 : 8 } },
  });

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-sm font-semibold">{compact ? "Son analizler" : "Analiz kayıtları"}</h2><p className="mt-1 text-[11px] text-dim">{compact ? "En son işlenen görüntüler ve doğrulama durumu." : "EuroSAT ve YOLO pipeline çıktılarında filtrelenebilir görev arşivi."}</p></div>
        <div className="flex items-center gap-2">
          <label className="flex h-8 min-w-0 items-center gap-2 rounded-lg border border-line bg-black/10 px-2 text-xs text-dim"><Search className="h-3.5 w-3.5" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Görev ara" className="w-28 bg-transparent text-ink outline-none placeholder:text-dim" /></label>
          <Button size="sm"><Filter className="h-3.5 w-3.5" />Filtre</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="border-b border-line bg-black/10 text-[10px] uppercase tracking-[.14em] text-dim">{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id} className="px-4 py-3 font-medium">{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead>
          <tbody>{table.getRowModel().rows.map((row) => <tr key={row.id} className="border-b border-line/80 transition-colors last:border-0 hover:bg-white/[.025]">{row.getVisibleCells().map((cell) => <td key={cell.id} className="whitespace-nowrap px-4 py-3.5">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {table.getRowModel().rows.length === 0 && <div className="flex flex-col items-center justify-center border-t border-line px-4 py-12 text-center"><FileSearch className="h-6 w-6 text-dim" /><p className="mt-3 text-xs font-medium text-ink">Analiz kaydı bulunamadı</p><p className="mt-1 max-w-sm text-[11px] leading-5 text-dim">Kalıcı arşiv bağlantısı henüz yapılandırılmadı. Bu listede örnek sonuç gösterilmiyor.</p></div>}
      {!compact && <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[11px] text-dim"><span>{table.getFilteredRowModel().rows.length} kayıttan {table.getRowModel().rows.length} gösteriliyor</span><div className="flex gap-1"><Button size="icon" variant="ghost" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon" variant="ghost" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}><ChevronRight className="h-4 w-4" /></Button></div></div>}
    </Panel>
  );
}

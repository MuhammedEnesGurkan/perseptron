"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AnalysisRecord = {
  id: string;
  type: "single" | "batch";
  created_at: string;
  risk_band?: string;
  default_probability?: number;
  decision?: string;
  loan_amount?: number;
  total_customers?: number;
  high_risk_customers?: number;
  average_default_probability?: number;
  source_file?: string;
};

function riskClass(risk?: string) {
  if (risk === "CRITICAL") return "text-red-500 border-red-500/50 bg-red-500/10";
  if (risk === "HIGH") return "text-orange-500 border-orange-500/50 bg-orange-500/10";
  if (risk === "MEDIUM") return "text-yellow-500 border-yellow-500/50 bg-yellow-500/10";
  return "text-green-500 border-green-500/50 bg-green-500/10";
}

export function RecentAnalyses({ refreshKey = 0 }: { refreshKey?: number }) {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);

  useEffect(() => {
    fetch("/api/analysis-history?limit=8", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setAnalyses(data.analyses ?? []))
      .catch((error) => console.error("Analiz geçmişi yüklenemedi", error));
  }, [refreshKey]);

  return (
    <Card className="glass-card border-none">
      <CardHeader>
        <CardTitle>Son Analizler</CardTitle>
        <CardDescription>Bu çalışma alanında kaydedilen son tahminler</CardDescription>
      </CardHeader>
      <CardContent>
        {analyses.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Henüz kayıtlı analiz yok. İlk kaydı oluşturmak için tahmin çalıştırın.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Zaman</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>Özet</TableHead>
                <TableHead className="text-right">Temerrüt Riski</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyses.map((analysis) => {
                const probability = analysis.type === "single"
                  ? analysis.default_probability
                  : analysis.average_default_probability;

                return (
                  <TableRow key={analysis.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(analysis.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{analysis.type === "single" ? "Tekil" : "Toplu"}</Badge>
                    </TableCell>
                    <TableCell>
                      {analysis.type === "single" ? (
                        <span>
                          <Badge variant="outline" className={riskClass(analysis.risk_band)}>{analysis.risk_band}</Badge>
                          <span className="ml-2 text-muted-foreground">
                            Kredi: ${Number(analysis.loan_amount ?? 0).toLocaleString()}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {analysis.source_file || "CSV veri seti"}: {analysis.total_customers?.toLocaleString()} müşteri,
                          {" "}{analysis.high_risk_customers?.toLocaleString()} yüksek risk
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {((probability ?? 0) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

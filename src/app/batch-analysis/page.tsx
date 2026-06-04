"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, FileSpreadsheet, Loader2, Download, Filter, ShieldAlert, CheckCircle2 } from "lucide-react";
import { RecentAnalyses } from "@/components/dashboard/RecentAnalyses";

type BatchRow = {
  customer_id: string | number;
  default_probability: number;
  paid_back_probability: number;
  risk_band: string;
  recommended_plan_label: string;
  expected_recovery_probability: number;
  expected_bank_value_index: number;
  dl_payment_probability: number;
};

type BatchResults = {
  total_customers: number;
  high_risk_customers: number;
  average_default_probability: number;
  average_expected_recovery_probability: number;
  average_bank_value_index: number;
  recommended_plans_distribution: Record<string, number>;
  results: BatchRow[];
};

type QualityReport = {
  rows: number;
  missingRequiredColumns: string[];
  warnings: string[];
};

const requiredColumns = [
  "annual_income",
  "debt_to_income_ratio",
  "credit_score",
  "loan_amount",
  "interest_rate",
  "gender",
  "marital_status",
  "education_level",
  "employment_status",
  "loan_purpose",
  "grade_subgrade",
];

export default function BatchAnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<BatchResults | null>(null);
  const [modelName, setModelName] = useState("combined");
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const parseCsv = (text: string) => {
    const [headerLine, ...lines] = text.trim().split(/\r?\n/);
    const headers = headerLine.split(",").map((header) => header.trim());
    const rows = lines
      .filter(Boolean)
      .map((line, index) => {
        const values = line.split(",").map((value) => value.trim());
        return headers.reduce<Record<string, string | number>>((row, header, valueIndex) => {
          const raw = values[valueIndex] ?? "";
          const numeric = Number(raw);
          row[header] = raw !== "" && Number.isFinite(numeric) ? numeric : raw;
          row.customer_id = row.customer_id || index + 1;
          return row;
        }, {});
      });
    setQualityReport(validateRows(rows, headers));
    return rows;
  };

  const validateRows = (rows: Array<Record<string, string | number>>, headers: string[]): QualityReport => {
    const warnings: string[] = [];
    const missingRequiredColumns = requiredColumns.filter((column) => !headers.includes(column));
    const sample = rows.slice(0, 1000);
    const invalidCreditScores = sample.filter((row) => {
      const value = Number(row.credit_score);
      return Number.isFinite(value) && (value < 300 || value > 850);
    }).length;
    const invalidDti = sample.filter((row) => {
      const value = Number(row.debt_to_income_ratio);
      return Number.isFinite(value) && (value < 0 || value > 1.5);
    }).length;
    const missingValues = sample.reduce((count, row) => count + requiredColumns.filter((column) => row[column] === "" || row[column] == null).length, 0);

    if (invalidCreditScores > 0) warnings.push(`${invalidCreditScores} örnek satırda credit_score 300-850 aralığının dışında.`);
    if (invalidDti > 0) warnings.push(`${invalidDti} örnek satırda debt_to_income_ratio olağan dışı görünüyor.`);
    if (missingValues > 0) warnings.push(`İlk ${sample.length} satırda ${missingValues} zorunlu değer eksik.`);
    if (rows.length > 100000) warnings.push("Büyük dosya algılandı; tablo ilk sonuçları gösterir, tam çıktı için dışa aktarımı kullanın.");

    return { rows: rows.length, missingRequiredColumns, warnings };
  };

  const exportResults = () => {
    if (!results) return;
    const headers = [
      "customer_id",
      "risk_band",
      "default_probability",
      "paid_back_probability",
      "recommended_plan_label",
      "expected_recovery_probability",
      "expected_bank_value_index",
    ];
    const body = results.results.map((row) =>
      headers
        .map((key) => {
          const value = row[key as keyof BatchRow];
          return typeof value === "string" ? `"${value.replace(/"/g, '""')}"` : String(value);
        })
        .join(",")
    );
    const blob = new Blob([[headers.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `batch-analysis-${modelName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const segmentCounts = results
    ? results.results.reduce<Record<string, number>>((counts, row) => {
        const segment =
          row.risk_band === "CRITICAL"
            ? "Yapılandırma Öncelikli"
            : row.risk_band === "HIGH"
              ? "Manuel Kurtarma İncelemesi"
              : row.risk_band === "MEDIUM"
                ? "Yakından İzle"
                : "Düşük Temas";
        counts[segment] = (counts[segment] ?? 0) + 1;
        return counts;
      }, {})
    : {};

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);

    try {
      const rows = parseCsv(await file.text());
      const response = await fetch("/api/batch-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, model_name: modelName, file_name: file.name }),
      });
      const data = await response.json();
      setResults(data);
      setHistoryRefreshKey((key) => key + 1);
      setAnalyzing(false);
    } catch (err) {
      console.error(err);
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Toplu Analiz</h1>
        <p className="text-muted-foreground mt-1">Binlerce başvuruyu aynı anda işlemek için CSV veri seti yükleyin.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-1 glass-card border-none">
          <CardHeader>
            <CardTitle>Veri Seti Yükle</CardTitle>
            <CardDescription>Yalnızca CSV formatı. En fazla 500.000 satır.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:bg-white/5 transition-colors cursor-pointer flex flex-col items-center justify-center group relative">
              <input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} />
              <UploadCloud className="w-10 h-10 text-muted-foreground mb-4 group-hover:text-primary transition-colors" />
              <div className="text-sm font-medium text-foreground">
                {file ? file.name : "Yüklemek için tıklayın veya sürükleyip bırakın"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">CSV (max 100MB)</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Tahmin Modeli Seç</label>
              <Select value={modelName} onValueChange={(value) => setModelName(value ?? "combined")}>
                <SelectTrigger className="w-full bg-black/20 border-white/10">
                  <SelectValue placeholder="Model seçiniz..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="combined">Birleşik Model (Varsayılan)</SelectItem>
                  <SelectItem value="lightgbm">LightGBM</SelectItem>
                  <SelectItem value="xgboost">XGBoost</SelectItem>
                  <SelectItem value="logistic_regression">Lojistik Regresyon</SelectItem>
                  <SelectItem value="random_forest">Random Forest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              className="w-full" 
              disabled={!file || analyzing} 
              onClick={handleAnalyze}
            >
              {analyzing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Veri işleniyor...</>
              ) : (
                <><FileSpreadsheet className="mr-2 h-4 w-4" /> Veri Setini Analiz Et</>
              )}
            </Button>

            {qualityReport && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
                <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                  {qualityReport.missingRequiredColumns.length === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-orange-500" />
                  )}
                  Veri Kalitesi Kontrolü
                </div>
                <p className="text-muted-foreground">{qualityReport.rows.toLocaleString()} satır okundu.</p>
                {qualityReport.missingRequiredColumns.length > 0 && (
                  <p className="mt-1 text-orange-500">Eksik kolonlar: {qualityReport.missingRequiredColumns.join(", ")}</p>
                )}
                {qualityReport.warnings.map((warning) => (
                  <p key={warning} className="mt-1 text-muted-foreground">{warning}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {results && (
          <div className="col-span-2 grid grid-cols-2 gap-4">
            <Card className="glass-card border-none bg-primary/5">
              <CardContent className="p-6 flex flex-col justify-center h-full">
                <span className="text-sm font-medium text-muted-foreground">İşlenen Toplam</span>
                <span className="text-4xl font-bold text-foreground mt-2">{results.total_customers.toLocaleString()}</span>
              </CardContent>
            </Card>
            <Card className="glass-card border-none bg-orange-500/5">
              <CardContent className="p-6 flex flex-col justify-center h-full">
                <span className="text-sm font-medium text-orange-500/80">Yüksek Riskli Kayıt</span>
                <span className="text-4xl font-bold text-orange-500 mt-2">{results.high_risk_customers.toLocaleString()}</span>
              </CardContent>
            </Card>
            <Card className="col-span-2 glass-card border-none">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-muted-foreground block">Beklenen Geri Kazanım</span>
                  <span className="text-2xl font-bold text-foreground mt-1 block">{(results.average_expected_recovery_probability * 100).toFixed(1)}%</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-muted-foreground block">Ort. Banka Değer Endeksi</span>
                  <span className="text-2xl font-bold text-purple-500 mt-1 block">{results.average_bank_value_index.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {results && (
        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(segmentCounts).map(([segment, count]) => (
            <Card key={segment} className="glass-card border-none">
              <CardContent className="p-4">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{segment}</div>
                <div className="mt-2 text-2xl font-bold text-foreground">{count.toLocaleString()}</div>
                <p className="mt-1 text-xs text-muted-foreground">Portföyün %{((count / results.total_customers) * 100).toFixed(1)} kadarı</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results && (
        <Card className="glass-card border-none animate-in fade-in duration-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Analiz Sonuçları</CardTitle>
              <CardDescription>Detaylı tahmin dökümü</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px] bg-black/20 border-white/10">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Risk filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Riskler</SelectItem>
                  <SelectItem value="high">Sadece Yüksek Risk</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportResults} variant="outline" className="border-white/10 bg-black/20 text-foreground hover:bg-white/10">
                <Download className="w-4 h-4 mr-2" /> Dışa Aktar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>Müşteri ID</TableHead>
                  <TableHead>Risk Bandı</TableHead>
                  <TableHead>Temerrüt Olasılığı</TableHead>
                  <TableHead>Önerilen Plan</TableHead>
                  <TableHead className="text-right">Geri Kazanım Olasılığı</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.results.slice(0, 500).map((item, i) => (
                  <TableRow key={i} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-medium">#{item.customer_id.toString().padStart(5, '0')}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`
                        ${item.risk_band === 'HIGH' ? 'text-orange-500 border-orange-500/50 bg-orange-500/10' : ''}
                        ${item.risk_band === 'LOW' ? 'text-green-500 border-green-500/50 bg-green-500/10' : ''}
                      `}>
                        {item.risk_band}
                      </Badge>
                    </TableCell>
                    <TableCell>{(item.default_probability * 100).toFixed(1)}%</TableCell>
                    <TableCell>
                      <span className="text-xs font-medium px-2 py-1 bg-white/5 rounded-md text-muted-foreground border border-white/5">
                        {item.recommended_plan_label.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {(item.expected_recovery_probability * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {results.results.length > 500 && (
              <p className="mt-4 text-xs text-muted-foreground">
                Tarayıcı performansı için ilk 500 satır gösteriliyor. Tüm sonuçlar için dışa aktarımı kullanın.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <RecentAnalyses refreshKey={historyRefreshKey} />
    </div>
  );
}

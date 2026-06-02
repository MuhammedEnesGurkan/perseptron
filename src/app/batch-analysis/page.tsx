"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, FileSpreadsheet, Loader2, Download, Filter } from "lucide-react";

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

export default function BatchAnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<BatchResults | null>(null);
  const [modelName, setModelName] = useState("lightgbm");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const parseCsv = (text: string) => {
    const [headerLine, ...lines] = text.trim().split(/\r?\n/);
    const headers = headerLine.split(",").map((header) => header.trim());
    return lines
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
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);

    try {
      const rows = parseCsv(await file.text());
      const response = await fetch("/api/batch-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, model_name: modelName }),
      });
      const data = await response.json();
      setResults(data);
      setAnalyzing(false);
    } catch (err) {
      console.error(err);
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Batch Analysis</h1>
        <p className="text-muted-foreground mt-1">Upload CSV datasets to process thousands of applications simultaneously.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-1 glass-card border-none">
          <CardHeader>
            <CardTitle>Upload Dataset</CardTitle>
            <CardDescription>CSV format only. Max 500,000 rows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:bg-white/5 transition-colors cursor-pointer flex flex-col items-center justify-center group relative">
              <input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} />
              <UploadCloud className="w-10 h-10 text-muted-foreground mb-4 group-hover:text-primary transition-colors" />
              <div className="text-sm font-medium text-foreground">
                {file ? file.name : "Click to upload or drag and drop"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">CSV (max 100MB)</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Select AI Model</label>
              <Select value={modelName} onValueChange={setModelName}>
                <SelectTrigger className="w-full bg-black/20 border-white/10">
                  <SelectValue placeholder="Select Model..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lightgbm">LightGBM (Default)</SelectItem>
                  <SelectItem value="xgboost">XGBoost</SelectItem>
                  <SelectItem value="logistic_regression">Logistic Regression</SelectItem>
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing Cluster...</>
              ) : (
                <><FileSpreadsheet className="mr-2 h-4 w-4" /> Analyze Dataset</>
              )}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <div className="col-span-2 grid grid-cols-2 gap-4">
            <Card className="glass-card border-none bg-primary/5">
              <CardContent className="p-6 flex flex-col justify-center h-full">
                <span className="text-sm font-medium text-muted-foreground">Total Processed</span>
                <span className="text-4xl font-bold text-foreground mt-2">{results.total_customers.toLocaleString()}</span>
              </CardContent>
            </Card>
            <Card className="glass-card border-none bg-orange-500/5">
              <CardContent className="p-6 flex flex-col justify-center h-full">
                <span className="text-sm font-medium text-orange-500/80">High Risk Identified</span>
                <span className="text-4xl font-bold text-orange-500 mt-2">{results.high_risk_customers.toLocaleString()}</span>
              </CardContent>
            </Card>
            <Card className="col-span-2 glass-card border-none">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-muted-foreground block">Expected Recovery Rate</span>
                  <span className="text-2xl font-bold text-foreground mt-1 block">{(results.average_expected_recovery_probability * 100).toFixed(1)}%</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-muted-foreground block">Avg Bank Value Index</span>
                  <span className="text-2xl font-bold text-purple-500 mt-1 block">{results.average_bank_value_index.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {results && (
        <Card className="glass-card border-none animate-in fade-in duration-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Analysis Results</CardTitle>
              <CardDescription>Detailed prediction breakdown</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px] bg-black/20 border-white/10">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter Risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risks</SelectItem>
                  <SelectItem value="high">High Risk Only</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="border-white/10 bg-black/20 text-foreground hover:bg-white/10">
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Risk Band</TableHead>
                  <TableHead>Default Prob.</TableHead>
                  <TableHead>Recommended Plan</TableHead>
                  <TableHead className="text-right">Recovery Prob.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.results.map((item, i) => (
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight, BrainCircuit, Loader2, SlidersHorizontal } from "lucide-react";
import { RecentAnalyses } from "@/components/dashboard/RecentAnalyses";

type PredictionResult = {
  paid_back_probability: number;
  default_probability: number;
  prediction: number;
  prediction_label: string;
  model_name: string;
  risk_band: string;
  ml_default_target: number;
  decision: string;
  confidence: number;
  input: Record<string, unknown>;
};

type WhatIfState = {
  credit_score: number;
  debt_to_income_ratio: number;
  loan_amount: number;
};

function numericInput(input: Record<string, unknown>, key: string, fallback = 0) {
  const value = Number(input[key]);
  return Number.isFinite(value) ? value : fallback;
}

function explainPrediction(result: PredictionResult) {
  const creditScore = numericInput(result.input, "credit_score", 600);
  const dti = numericInput(result.input, "debt_to_income_ratio", 0);
  const loanAmount = numericInput(result.input, "loan_amount", 0);
  const income = numericInput(result.input, "annual_income", 1);
  const interest = numericInput(result.input, "interest_rate", 0);
  const loanToIncome = income > 0 ? loanAmount / income : 0;
  const reasons = [];

  if (creditScore < 620) reasons.push("kredi skoru güvenli bandın altında");
  else if (creditScore < 680) reasons.push("kredi skoru orta risk bandında");
  else reasons.push("kredi skoru geri ödeme kapasitesini destekliyor");

  if (dti >= 0.45) reasons.push("borç/gelir oranı yüksek");
  else if (dti >= 0.3) reasons.push("borç/gelir oranı izlenmeli");
  else reasons.push("borç/gelir oranı kontrollü");

  if (loanToIncome >= 0.45) reasons.push("kredi tutarı yıllık gelire göre yüksek");
  if (interest >= 18) reasons.push("faiz yükü yüksek");

  return `${result.model_name} modeli temerrüt riskini %${(result.default_probability * 100).toFixed(1)} olarak tahmin etti. Ana etkenler: ${reasons.join(", ")}.`;
}

export default function RiskAnalysisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [whatIf, setWhatIf] = useState<WhatIfState | null>(null);
  const [whatIfResult, setWhatIfResult] = useState<PredictionResult | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setWhatIfResult(null);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/predict-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      setResult({ ...resData, input: data });
      setWhatIf({
        credit_score: Number(data.credit_score ?? 640),
        debt_to_income_ratio: Number(data.debt_to_income_ratio ?? 0.42),
        loan_amount: Number(data.loan_amount ?? 25000),
      });
      setHistoryRefreshKey((key) => key + 1);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const runWhatIf = async () => {
    if (!result || !whatIf) return;
    setWhatIfLoading(true);
    const scenario = {
      ...result.input,
      credit_score: String(whatIf.credit_score),
      debt_to_income_ratio: String(whatIf.debt_to_income_ratio),
      loan_amount: String(whatIf.loan_amount),
      model_name: String(result.input.model_name ?? result.model_name ?? "combined"),
      skip_history: true,
    };

    try {
      const response = await fetch("/api/predict-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scenario),
      });
      const data = await response.json();
      setWhatIfResult({ ...data, input: scenario });
    } catch (error) {
      console.error(error);
    } finally {
      setWhatIfLoading(false);
    }
  };

  const proceedToRecovery = () => {
    if (!result) return;
    sessionStorage.setItem("current_prediction", JSON.stringify(result));
    sessionStorage.setItem("current_applicant", JSON.stringify(result.input));
    router.push("/recovery-plan");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Müşteri Risk Analizi</h1>
        <p className="text-muted-foreground mt-1">Başvuru bilgilerini girerek ML modelleriyle temerrüt riskini tahmin edin.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-12 lg:grid-cols-12">
        <div className="col-span-12 lg:col-span-8">
          <Card className="glass-card border-none">
            <CardHeader>
              <CardTitle>Başvuru Bilgi Formu</CardTitle>
              <CardDescription>Finansal ve demografik bilgileri doldurun.</CardDescription>
            </CardHeader>
            <CardContent>
              <form id="risk-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="annual_income">Yıllık Gelir ($)</Label>
                    <Input id="annual_income" name="annual_income" type="number" defaultValue="85000" className="bg-black/20 border-white/10" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="debt_to_income_ratio">Borç/Gelir Oranı</Label>
                    <Input id="debt_to_income_ratio" name="debt_to_income_ratio" type="number" step="0.01" defaultValue="0.42" className="bg-black/20 border-white/10" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="credit_score">Kredi Skoru</Label>
                    <Input id="credit_score" name="credit_score" type="number" defaultValue="640" className="bg-black/20 border-white/10" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loan_amount">Kredi Tutarı ($)</Label>
                    <Input id="loan_amount" name="loan_amount" type="number" defaultValue="25000" className="bg-black/20 border-white/10" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interest_rate">Faiz Oranı (%)</Label>
                    <Input id="interest_rate" name="interest_rate" type="number" step="0.1" defaultValue="18.5" className="bg-black/20 border-white/10" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Cinsiyet</Label>
                    <Select name="gender" defaultValue="Male">
                      <SelectTrigger className="bg-black/20 border-white/10">
                        <SelectValue placeholder="Seçiniz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Erkek</SelectItem>
                        <SelectItem value="Female">Kadın</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="marital_status">Medeni Durum</Label>
                    <Select name="marital_status" defaultValue="Married">
                      <SelectTrigger className="bg-black/20 border-white/10">
                        <SelectValue placeholder="Seçiniz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Bekar</SelectItem>
                        <SelectItem value="Married">Evli</SelectItem>
                        <SelectItem value="Divorced">Boşanmış</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="education_level">Eğitim Seviyesi</Label>
                    <Select name="education_level" defaultValue="PhD">
                      <SelectTrigger className="bg-black/20 border-white/10">
                        <SelectValue placeholder="Seçiniz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High School">Lise</SelectItem>
                        <SelectItem value="Bachelor">Lisans</SelectItem>
                        <SelectItem value="Master">Yüksek Lisans</SelectItem>
                        <SelectItem value="PhD">Doktora</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grade_subgrade">Kredi Notu / Alt Sınıf</Label>
                    <Input id="grade_subgrade" name="grade_subgrade" defaultValue="C2" className="bg-black/20 border-white/10" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="employment_status">Çalışma Durumu</Label>
                    <Select name="employment_status" defaultValue="Employed">
                      <SelectTrigger className="bg-black/20 border-white/10">
                        <SelectValue placeholder="Seçiniz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Employed">Çalışan</SelectItem>
                        <SelectItem value="Self-Employed">Serbest Çalışan</SelectItem>
                        <SelectItem value="Unemployed">İşsiz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loan_purpose">Kredi Amacı</Label>
                    <Select name="loan_purpose" defaultValue="Debt consolidation">
                      <SelectTrigger className="bg-black/20 border-white/10">
                        <SelectValue placeholder="Seçiniz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Debt consolidation">Borç kapatma</SelectItem>
                        <SelectItem value="Home improvement">Ev yenileme</SelectItem>
                        <SelectItem value="Business">İşletme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model_name">Tahmin Modeli</Label>
                    <Select name="model_name" defaultValue="combined">
                      <SelectTrigger className="bg-black/20 border-white/10">
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
                </div>
              </form>
            </CardContent>
            <CardFooter className="border-t border-white/5 pt-6 justify-end">
              <Button type="submit" form="risk-form" disabled={loading} className="w-full sm:w-auto">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "ML Tahminini Çalıştır"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Card className="glass-card border-none h-full bg-gradient-to-br from-card/60 to-primary/5">
            <CardHeader>
              <CardTitle>Tahmin Sonuçları</CardTitle>
              <CardDescription>Model çıktısı</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {!result && !loading && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground opacity-50">
                  <AlertCircle className="w-12 h-12 mb-4" />
                  <p>Risk analizini görmek için tahmin çalıştırın</p>
                </div>
              )}
              
              {loading && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-primary">
                  <Loader2 className="w-12 h-12 mb-4 animate-spin" />
                  <p className="animate-pulse">Başvuru profili analiz ediliyor...</p>
                </div>
              )}

              {result && !loading && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Temerrüt Olasılığı ({result.model_name})</span>
                      <span className="font-bold text-foreground">{(result.default_probability * 100).toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={result.default_probability * 100} 
                      className="h-2"
                      indicatorClassName={result.risk_band === 'HIGH' ? 'bg-orange-500' : 'bg-primary'} 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass p-4 rounded-xl flex flex-col items-center justify-center text-center">
                      <span className="text-xs text-muted-foreground mb-1">Risk Bandı</span>
                      <Badge variant="outline" className="text-orange-500 border-orange-500/50 bg-orange-500/10 text-lg py-1">
                        {result.risk_band}
                      </Badge>
                    </div>
                    <div className="glass p-4 rounded-xl flex flex-col items-center justify-center text-center">
                      <span className="text-xs text-muted-foreground mb-1">Güven</span>
                      <span className="font-bold text-xl text-primary">{(result.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Model Kararı</span>
                    <p className="mt-2 text-sm font-medium text-foreground">{result.decision.replace(/_/g, ' ')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Geri ödeme olasılığı: {(result.paid_back_probability * 100).toFixed(1)}%</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <BrainCircuit className="h-4 w-4 text-primary" />
                      Model Açıklaması
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{explainPrediction(result)}</p>
                  </div>

                  {(result.risk_band === "HIGH" || result.risk_band === "CRITICAL") && (
                    <Button onClick={proceedToRecovery} className="w-full group bg-orange-500 hover:bg-orange-600 text-white">
                      Kurtarma Planı Oluştur
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {result && whatIf && (
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Gerçek What-if Analizi
            </CardTitle>
            <CardDescription>Değiştirilen değerlerle seçili model yeniden çalıştırılır; bu yaklaşık hesap değil, gerçek model tahminidir.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="whatif_credit">Kredi Skoru</Label>
              <Input
                id="whatif_credit"
                type="number"
                value={whatIf.credit_score}
                onChange={(event) => setWhatIf({ ...whatIf, credit_score: Number(event.target.value) })}
                className="bg-black/20 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatif_dti">Borç/Gelir Oranı</Label>
              <Input
                id="whatif_dti"
                type="number"
                step="0.01"
                value={whatIf.debt_to_income_ratio}
                onChange={(event) => setWhatIf({ ...whatIf, debt_to_income_ratio: Number(event.target.value) })}
                className="bg-black/20 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatif_loan">Kredi Tutarı ($)</Label>
              <Input
                id="whatif_loan"
                type="number"
                value={whatIf.loan_amount}
                onChange={(event) => setWhatIf({ ...whatIf, loan_amount: Number(event.target.value) })}
                className="bg-black/20 border-white/10"
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-primary/5 p-4">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Senaryo Temerrüt Riski</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <span className="text-3xl font-bold text-foreground">
                  {whatIfResult ? `${(whatIfResult.default_probability * 100).toFixed(1)}%` : "--"}
                </span>
                <Badge variant="outline" className="border-primary/50 bg-primary/10 text-primary">
                  {whatIfResult ? whatIfResult.risk_band : "MODELİ ÇALIŞTIR"}
                </Badge>
              </div>
              {whatIfResult && (
                <p className={`mt-2 text-xs ${whatIfResult.default_probability <= result.default_probability ? "text-green-500" : "text-orange-500"}`}>
                  {whatIfResult.default_probability <= result.default_probability ? "Risk azaldı" : "Risk arttı"}:{" "}
                  {Math.abs((whatIfResult.default_probability - result.default_probability) * 100).toFixed(1)} puan
                </p>
              )}
              <Button onClick={runWhatIf} disabled={whatIfLoading} className="mt-4 w-full">
                {whatIfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Senaryoyu Modelle Test Et"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <RecentAnalyses refreshKey={historyRefreshKey} />
    </div>
  );
}

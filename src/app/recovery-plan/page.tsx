"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldAlert, TrendingDown, DollarSign, CalendarClock, BrainCircuit, Landmark, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";

type RecoveryPlan = {
  recommended_plan_label: string;
  recommended_interest_rate: number;
  recommended_term_months: number;
  recommended_monthly_payment: number;
  payment_reduction_ratio: number;
  customer_affordability_score: number;
  expected_recovery_probability: number;
  expected_bank_value_index: number;
  plan_success_label: number;
  dl_payment_probability: number;
  ml_default_probability: number;
  ai_explanation: string;
};

export default function RecoveryPlanPage() {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<RecoveryPlan | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const applicant = JSON.parse(sessionStorage.getItem("current_applicant") || "{}");
        const response = await fetch("/api/recommend-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(applicant),
        });
        const data = await response.json();
        setPlan(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchPlan();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
          <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
        </div>
        <h2 className="mt-6 text-xl font-semibold text-foreground">Kurtarma Stratejisi Oluşturuluyor</h2>
        <p className="mt-2 text-muted-foreground max-w-md text-center">
          PyTorch MLP modeli ödeme olasılığını tahmin ediyor ve bu başvuru için en uygun geri kazanım seçeneğini seçiyor.
        </p>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Kurtarma Planı</h1>
            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/50">YÜKSEK RİSK AZALTMA</Badge>
          </div>
          <p className="text-muted-foreground mt-1">Yüksek riskli başvuruyu ödenebilir hale getirmek için önerilen yapılandırma.</p>
          <p className="text-xs text-muted-foreground mt-2">
            ML temerrüt olasılığı: {(plan.ml_default_probability * 100).toFixed(1)}% | DL ödeme olasılığı: {(plan.dl_payment_probability * 100).toFixed(1)}%
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          Yapılandırma Planını Onayla
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <div className="col-span-12 md:col-span-8 space-y-6">
          <Card className="glass-card border-none bg-gradient-to-br from-card/80 to-primary/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                Önerilen Aksiyon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5 mb-6">
                <span className="text-2xl font-bold text-foreground block tracking-tight">
                  {plan.recommended_plan_label.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 glass p-4 rounded-xl">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Percent className="w-3 h-3"/> Faiz Oranı</span>
                  <div className="text-xl font-bold text-foreground">{plan.recommended_interest_rate}%</div>
                </div>
                <div className="space-y-1 glass p-4 rounded-xl">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><CalendarClock className="w-3 h-3"/> Vade</span>
                  <div className="text-xl font-bold text-foreground">{plan.recommended_term_months} Ay</div>
                </div>
                <div className="space-y-1 glass p-4 rounded-xl">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3"/> Aylık Ödeme</span>
                  <div className="text-xl font-bold text-foreground">${plan.recommended_monthly_payment}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-none border-l-4 border-l-primary relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <BrainCircuit className="w-32 h-32" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BrainCircuit className="w-5 h-5 text-primary" />
                Model Açıklaması
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed">
                {plan.ai_explanation}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-4 space-y-6">
          <Card className="glass-card border-none">
            <CardHeader>
              <CardTitle>Etki Metrikleri</CardTitle>
              <CardDescription>Plan uygulanırsa beklenen sonuçlar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-green-500" /> Ödeme Azaltımı
                  </span>
                  <span className="font-bold text-green-500">-{(plan.payment_reduction_ratio * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Ödenebilirlik Skoru</span>
                  <span className="font-bold">{(plan.customer_affordability_score * 100).toFixed(0)} / 100</span>
                </div>
                <Progress value={plan.customer_affordability_score * 100} className="h-2" indicatorClassName="bg-green-500" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Beklenen Geri Kazanım</span>
                  <span className="font-bold">{(plan.expected_recovery_probability * 100).toFixed(0)}%</span>
                </div>
                <Progress value={plan.expected_recovery_probability * 100} className="h-2" indicatorClassName="bg-primary" />
              </div>

              <div className="pt-4 border-t border-white/10 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-purple-500" /> Banka Değer Endeksi
                  </span>
                  <span className="text-xl font-bold text-purple-500">{plan.expected_bank_value_index.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Temerrüt zararını azaltırken uzun vadeli portföy değerini korur.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

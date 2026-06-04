"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BarChart3, ShieldCheck, Target } from "lucide-react";

const performanceData = [
  { model: "LightGBM", accuracy: 0.901, rocAuc: 0.927, f1Default: 0.742 },
  { model: "XGBoost", accuracy: 0.9, rocAuc: 0.923, f1Default: 0.737 },
  { model: "Random Forest", accuracy: 0.9, rocAuc: 0.913, f1Default: 0.722 },
  { model: "Lojistik Reg.", accuracy: 0.894, rocAuc: 0.911, f1Default: 0.718 },
  { model: "FICO Temel Model", accuracy: 0.685, rocAuc: 0.671, f1Default: 0.394 },
];

const riskDistributionData = [
  { model: "LightGBM", low: 77.951, medium: 8.438, high: 2.794, critical: 10.815 },
  { model: "XGBoost", low: 77.903, medium: 8.677, high: 2.643, critical: 10.775 },
  { model: "Random Forest", low: 79.435, medium: 8.718, high: 1.823, critical: 10.023 },
  { model: "Lojistik Reg.", low: 78.923, medium: 6.858, high: 2.757, critical: 11.463 },
  { model: "FICO Temel Model", low: 29.659, medium: 66.372, high: 3.968, critical: 0.001 },
];

const featureData = [
  { name: "debt_to_income_ratio", value: 0.35 },
  { name: "credit_score", value: 0.28 },
  { name: "annual_income", value: 0.15 },
  { name: "loan_amount", value: 0.08 },
  { name: "interest_rate", value: 0.06 },
  { name: "grade_subgrade", value: 0.05 },
  { name: "employment_status", value: 0.03 },
];

const metricCards = [
  { label: "En İyi Model", value: "LightGBM", detail: "ROC AUC 0.927", icon: ShieldCheck },
  { label: "FICO ROC AUC Farkı", value: "+0.255", detail: "LightGBM ve temel model", icon: Target },
  { label: "Skorlanan Test Satırı", value: "254,569", detail: "kreditveriseti/test.csv", icon: Activity },
];

export default function ModelInsightsPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Model İçgörüleri</h1>
        <p className="text-muted-foreground mt-1">Model karşılaştırması, FICO kıyaslaması, risk dağılımı ve açıklanabilirlik özeti.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metricCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="glass-card border-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{item.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="glass-card border-none bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Yönetici Özeti</h2>
            </div>
            <p className="mt-2 max-w-4xl text-sm text-muted-foreground">
              LightGBM en güçlü üretim adayıdır. Sadece FICO/kredi skoru kullanan temel modele göre belirgin biçimde daha iyi performans
              gösterir ve başvuruları orta banda yığmak yerine aksiyon alınabilir LOW ve CRITICAL bantlarına daha net ayırır.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-primary/50 bg-primary/10 px-3 py-1 text-primary">
            Önerilen: LightGBM
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle>FICO Temel Modele Karşı Model Performansı</CardTitle>
            <CardDescription>Etiketli train.csv üzerinde ölçüldü; test.csv gerçek hedef etiketi içermez.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[390px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData} layout="vertical" margin={{ top: 10, right: 24, left: 28, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" domain={[0, 1]} stroke="rgba(255,255,255,0.55)" fontSize={12} />
                  <YAxis dataKey="model" type="category" width={96} stroke="rgba(255,255,255,0.75)" fontSize={12} />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    contentStyle={{ backgroundColor: "rgba(10,15,28,0.94)", borderColor: "rgba(255,255,255,0.12)", borderRadius: 8 }}
                    formatter={(value) => (typeof value === "number" ? value.toFixed(3) : value)}
                  />
                  <Legend />
                  <Bar dataKey="accuracy" name="Doğruluk" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="rocAuc" name="ROC AUC" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="f1Default" name="Default F1" fill="#64748b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle>test.csv Üzerinde Risk Bandı Dağılımı</CardTitle>
            <CardDescription>254.569 etiketsiz başvuru için yığılmış yüzde dağılımı.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[390px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskDistributionData} layout="vertical" stackOffset="expand" margin={{ top: 10, right: 24, left: 28, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} stroke="rgba(255,255,255,0.55)" fontSize={12} />
                  <YAxis dataKey="model" type="category" width={96} stroke="rgba(255,255,255,0.75)" fontSize={12} />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    contentStyle={{ backgroundColor: "rgba(10,15,28,0.94)", borderColor: "rgba(255,255,255,0.12)", borderRadius: 8 }}
                    formatter={(value) => (typeof value === "number" ? `${value.toFixed(2)}%` : value)}
                  />
                  <Legend />
                  <Bar dataKey="low" name="LOW" stackId="risk" fill="#22c55e" />
                  <Bar dataKey="medium" name="MEDIUM" stackId="risk" fill="#f59e0b" />
                  <Bar dataKey="high" name="HIGH" stackId="risk" fill="#f97316" />
                  <Bar dataKey="critical" name="CRITICAL" stackId="risk" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-none">
        <CardHeader>
          <CardTitle>Genel Özellik Önemi</CardTitle>
          <CardDescription>Başvuru seviyesindeki en güçlü sinyallerin operasyonel yorumu.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureData} layout="vertical" margin={{ top: 5, right: 30, left: 56, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" stroke="rgba(255,255,255,0.55)" fontSize={12} />
                <YAxis dataKey="name" type="category" width={150} stroke="rgba(255,255,255,0.75)" fontSize={12} />
                <RechartsTooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{ backgroundColor: "rgba(10,15,28,0.94)", borderColor: "rgba(255,255,255,0.12)", borderRadius: 8 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {featureData.map((_, index) => (
                    <Cell key={index} fill={index < 2 ? "#f97316" : "#2563eb"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

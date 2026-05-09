"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { LineChart, Line } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Target, Activity, Crosshair } from "lucide-react";

const featureData = [
  { name: "debt_to_income_ratio", value: 0.35 },
  { name: "credit_score", value: 0.28 },
  { name: "annual_income", value: 0.15 },
  { name: "loan_amount", value: 0.08 },
  { name: "interest_rate", value: 0.06 },
  { name: "grade_subgrade", value: 0.05 },
  { name: "employment_status", value: 0.03 },
];

const rocData = [
  { fpr: 0, tpr: 0 },
  { fpr: 0.1, tpr: 0.5 },
  { fpr: 0.2, tpr: 0.75 },
  { fpr: 0.3, tpr: 0.85 },
  { fpr: 0.4, tpr: 0.90 },
  { fpr: 0.6, tpr: 0.95 },
  { fpr: 0.8, tpr: 0.98 },
  { fpr: 1, tpr: 1 },
];

export default function ModelInsightsPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Model Insights</h1>
        <p className="text-muted-foreground mt-1">Deep dive into AI performance, feature importance, and model explainability.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card border-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ROC-AUC Score</CardTitle>
            <Target className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">0.924</div>
            <p className="text-xs mt-1 text-green-500">+0.012 from previous model</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">PR-AUC Score</CardTitle>
            <Activity className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">0.887</div>
            <p className="text-xs mt-1 text-green-500">+0.008 from previous model</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">F1 Score (Macro)</CardTitle>
            <Crosshair className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">0.865</div>
            <p className="text-xs mt-1 text-green-500">+0.015 from previous model</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle>Global Feature Importance</CardTitle>
            <CardDescription>SHAP value aggregated impact on predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.8)" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: 'rgba(10,15,28,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {featureData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index < 2 ? 'var(--color-orange-500)' : 'var(--color-primary)'} className={index < 2 ? "fill-orange-500" : "fill-primary"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle>ROC Curve</CardTitle>
            <CardDescription>Receiver Operating Characteristic</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rocData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="fpr" type="number" domain={[0, 1]} stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="number" domain={[0, 1]} stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(10,15,28,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="tpr" stroke="currentColor" className="text-primary" strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
                  {/* Baseline */}
                  <Line type="linear" dataKey="fpr" stroke="rgba(255,255,255,0.2)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle>Confusion Matrix</CardTitle>
            <CardDescription>Test Set (N=10,000)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1 flex flex-col justify-center items-end pr-4 text-sm font-medium text-muted-foreground">
                Actual True
              </div>
              <div className="col-span-1 bg-green-500/20 border border-green-500/50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-sm text-green-500/80 mb-1">True Positive</span>
                <span className="text-2xl font-bold text-green-500">2,450</span>
              </div>
              <div className="col-span-1 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-sm text-red-500/80 mb-1">False Negative</span>
                <span className="text-2xl font-bold text-red-500">150</span>
              </div>

              <div className="col-span-1 flex flex-col justify-center items-end pr-4 text-sm font-medium text-muted-foreground">
                Actual False
              </div>
              <div className="col-span-1 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-sm text-orange-500/80 mb-1">False Positive</span>
                <span className="text-2xl font-bold text-orange-500">320</span>
              </div>
              <div className="col-span-1 bg-primary/20 border border-primary/50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-sm text-primary/80 mb-1">True Negative</span>
                <span className="text-2xl font-bold text-primary">7,080</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="col-span-1"></div>
              <div className="col-span-1 text-center text-sm font-medium text-muted-foreground pt-2">Pred True</div>
              <div className="col-span-1 text-center text-sm font-medium text-muted-foreground pt-2">Pred False</div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none bg-gradient-to-br from-card/80 to-primary/5">
          <CardHeader>
            <CardTitle>Model Status</CardTitle>
            <CardDescription>System health and training info</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-sm text-muted-foreground">Active Model Version</span>
              <Badge variant="outline" className="border-primary/50 text-primary">v4.2.1-prod</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-sm text-muted-foreground">Last Trained</span>
              <span className="text-sm font-medium text-foreground">12 hours ago</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-sm text-muted-foreground">Training Data Size</span>
              <span className="text-sm font-medium text-foreground">2.4M records</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Concept Drift Status</span>
              <span className="text-sm font-medium text-green-500 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div> Stable
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

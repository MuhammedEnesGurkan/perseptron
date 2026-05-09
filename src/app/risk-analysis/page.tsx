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
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export default function RiskAnalysisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    // Mock API call to predict default
    try {
      const response = await fetch("/api/predict-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      
      // Simulate network delay for effect
      setTimeout(() => {
        setResult(resData);
        setLoading(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const proceedToRecovery = () => {
    // Store result in sessionStorage or just push
    sessionStorage.setItem("current_prediction", JSON.stringify(result));
    router.push("/recovery-plan");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Customer Risk Analysis</h1>
        <p className="text-muted-foreground mt-1">Enter applicant details to predict default risk using our ML models.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-12 lg:grid-cols-12">
        <div className="col-span-12 lg:col-span-8">
          <Card className="glass-card border-none">
            <CardHeader>
              <CardTitle>Applicant Data Form</CardTitle>
              <CardDescription>Fill in the financial and demographic details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form id="risk-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="annual_income">Annual Income ($)</Label>
                    <Input id="annual_income" name="annual_income" type="number" defaultValue="85000" className="bg-black/20 border-white/10" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="debt_to_income_ratio">Debt-to-Income Ratio</Label>
                    <Input id="debt_to_income_ratio" name="debt_to_income_ratio" type="number" step="0.01" defaultValue="0.42" className="bg-black/20 border-white/10" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="credit_score">Credit Score</Label>
                    <Input id="credit_score" name="credit_score" type="number" defaultValue="640" className="bg-black/20 border-white/10" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loan_amount">Loan Amount ($)</Label>
                    <Input id="loan_amount" name="loan_amount" type="number" defaultValue="25000" className="bg-black/20 border-white/10" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                    <Input id="interest_rate" name="interest_rate" type="number" step="0.1" defaultValue="18.5" className="bg-black/20 border-white/10" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grade_subgrade">Grade / Subgrade</Label>
                    <Input id="grade_subgrade" name="grade_subgrade" defaultValue="C2" className="bg-black/20 border-white/10" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="employment_status">Employment Status</Label>
                    <Select name="employment_status" defaultValue="Employed">
                      <SelectTrigger className="bg-black/20 border-white/10">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Employed">Employed</SelectItem>
                        <SelectItem value="Self-Employed">Self-Employed</SelectItem>
                        <SelectItem value="Unemployed">Unemployed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loan_purpose">Loan Purpose</Label>
                    <Select name="loan_purpose" defaultValue="Debt consolidation">
                      <SelectTrigger className="bg-black/20 border-white/10">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Debt consolidation">Debt consolidation</SelectItem>
                        <SelectItem value="Home improvement">Home improvement</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className="border-t border-white/5 pt-6 justify-end">
              <Button type="submit" form="risk-form" disabled={loading} className="w-full sm:w-auto">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Run ML Prediction"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Card className="glass-card border-none h-full bg-gradient-to-br from-card/60 to-primary/5">
            <CardHeader>
              <CardTitle>Prediction Results</CardTitle>
              <CardDescription>AI Model Output</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {!result && !loading && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground opacity-50">
                  <AlertCircle className="w-12 h-12 mb-4" />
                  <p>Run prediction to view risk analysis</p>
                </div>
              )}
              
              {loading && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-primary">
                  <Loader2 className="w-12 h-12 mb-4 animate-spin" />
                  <p className="animate-pulse">Analyzing neural net weights...</p>
                </div>
              )}

              {result && !loading && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Default Probability</span>
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
                      <span className="text-xs text-muted-foreground mb-1">Risk Band</span>
                      <Badge variant="outline" className="text-orange-500 border-orange-500/50 bg-orange-500/10 text-lg py-1">
                        {result.risk_band}
                      </Badge>
                    </div>
                    <div className="glass p-4 rounded-xl flex flex-col items-center justify-center text-center">
                      <span className="text-xs text-muted-foreground mb-1">Confidence</span>
                      <span className="font-bold text-xl text-primary">{(result.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">AI Decision</span>
                    <p className="mt-2 text-sm font-medium text-foreground">{result.decision.replace(/_/g, ' ')}</p>
                  </div>

                  {result.decision === "SEND_TO_AI_RECOVERY_PLANNING" && (
                    <Button onClick={proceedToRecovery} className="w-full group bg-orange-500 hover:bg-orange-600 text-white">
                      Generate Recovery Plan
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, CheckCircle2, AlertTriangle, TrendingUp, Activity, Landmark } from "lucide-react";
import { RiskDistributionChart } from "@/components/dashboard/RiskDistributionChart";

const metrics = [
  { title: "Total Applications", value: "593,994", icon: Users, trend: "+12.5%", color: "text-blue-500" },
  { title: "Approved Customers", value: "444,811", icon: CheckCircle2, trend: "+8.2%", color: "text-green-500" },
  { title: "High-Risk Customers", value: "149,183", icon: AlertTriangle, trend: "-2.4%", color: "text-red-500" },
  { title: "Expected Recovered", value: "101,450", icon: TrendingUp, trend: "+15.3%", color: "text-primary" },
  { title: "Avg Default Risk", value: "31.2%", icon: Activity, trend: "-1.1%", color: "text-orange-500" },
  { title: "Bank Value Index", value: "0.84", icon: Landmark, trend: "+0.05", color: "text-purple-500" },
];

const recentPredictions = [
  { id: "APP-001", amount: "$25,000", risk: "HIGH", prob: "71%", decision: "AI Recovery Plan", status: "pending" },
  { id: "APP-002", amount: "$12,000", risk: "LOW", prob: "12%", decision: "Auto-Approve", status: "approved" },
  { id: "APP-003", amount: "$50,000", risk: "CRITICAL", prob: "89%", decision: "Reject", status: "rejected" },
  { id: "APP-004", amount: "$8,500", risk: "MEDIUM", prob: "45%", decision: "Manual Review", status: "review" },
  { id: "APP-005", amount: "$35,000", risk: "HIGH", prob: "68%", decision: "AI Recovery Plan", status: "pending" },
];

export default function DashboardOverview() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">AI-powered credit risk and recovery analytics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="glass-card border-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <Icon className={`w-4 h-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                <p className={`text-xs mt-1 ${metric.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                  {metric.trend} from last month
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7">
        <Card className="col-span-4 glass-card border-none">
          <CardHeader>
            <CardTitle>Default Risk Distribution</CardTitle>
            <CardDescription>Probability distribution across all processed applications</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskDistributionChart />
          </CardContent>
        </Card>

        <Card className="col-span-3 glass-card border-none">
          <CardHeader>
            <CardTitle>Recent Predictions</CardTitle>
            <CardDescription>Latest loan applications processed by the AI</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>App ID</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPredictions.map((pred) => (
                  <TableRow key={pred.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-medium">{pred.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`
                        ${pred.risk === 'HIGH' ? 'text-orange-500 border-orange-500/50 bg-orange-500/10' : ''}
                        ${pred.risk === 'LOW' ? 'text-green-500 border-green-500/50 bg-green-500/10' : ''}
                        ${pred.risk === 'MEDIUM' ? 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10' : ''}
                        ${pred.risk === 'CRITICAL' ? 'text-red-500 border-red-500/50 bg-red-500/10' : ''}
                      `}>
                        {pred.risk} ({pred.prob})
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{pred.decision}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

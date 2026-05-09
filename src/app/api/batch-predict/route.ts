import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Mock response for batch prediction
    return NextResponse.json({
      total_customers: 593994,
      high_risk_customers: 149183,
      average_default_probability: 0.31,
      recommended_plans_distribution: {
        "STANDARD_APPROVAL": 320000,
        "EXTEND_TERM_LOWER_INSTALLMENT": 85000,
        "DEBT_CONSOLIDATION_RESTRUCTURE": 41000,
        "INTEREST_RATE_REDUCTION": 38000,
        "HYBRID_RESTRUCTURE": 22000
      },
      results: [
        {
          customer_id: 1,
          default_probability: 0.71,
          risk_band: "HIGH",
          recommended_plan_label: "EXTEND_TERM_LOWER_INSTALLMENT",
          expected_recovery_probability: 0.68,
          expected_bank_value_index: 0.81
        },
        {
          customer_id: 2,
          default_probability: 0.12,
          risk_band: "LOW",
          recommended_plan_label: "STANDARD_APPROVAL",
          expected_recovery_probability: 0.98,
          expected_bank_value_index: 0.95
        },
        {
          customer_id: 3,
          default_probability: 0.89,
          risk_band: "CRITICAL",
          recommended_plan_label: "HYBRID_RESTRUCTURE",
          expected_recovery_probability: 0.45,
          expected_bank_value_index: 0.60
        },
        {
          customer_id: 4,
          default_probability: 0.45,
          risk_band: "MEDIUM",
          recommended_plan_label: "INTEREST_RATE_REDUCTION",
          expected_recovery_probability: 0.82,
          expected_bank_value_index: 0.88
        },
        {
          customer_id: 5,
          default_probability: 0.68,
          risk_band: "HIGH",
          recommended_plan_label: "EXTEND_TERM_LOWER_INSTALLMENT",
          expected_recovery_probability: 0.70,
          expected_bank_value_index: 0.79
        }
      ]
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Mock response for recommending a plan
    return NextResponse.json({
      recommended_plan_label: "EXTEND_TERM_LOWER_INSTALLMENT",
      recommended_interest_rate: 15.9,
      recommended_term_months: 60,
      recommended_monthly_payment: 605.4,
      payment_reduction_ratio: 0.23,
      customer_affordability_score: 0.74,
      expected_recovery_probability: 0.68,
      expected_bank_value_index: 0.81,
      plan_success_label: 1,
      ai_explanation: "The customer has a high debt-to-income ratio and medium credit score. Extending the repayment term lowers monthly payment pressure and increases the probability of successful repayment while preserving long-term bank value."
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

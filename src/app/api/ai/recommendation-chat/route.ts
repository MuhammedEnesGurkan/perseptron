import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // In a real app, this would send `body.message` and context to an LLM
    // Here we just return the mock response from the prompt
    
    // Simulate simple LLM parsing
    let answer = "This customer is considered high risk mainly because the debt-to-income ratio is elevated and the credit score is below the safest range. Instead of rejecting the customer directly, the system recommends extending the loan term and reducing monthly installment pressure. This can improve affordability and increase recovery probability while keeping the customer inside the bank portfolio.";
    
    if (body.message && body.message.toLowerCase().includes("hello")) {
      answer = "Hello! I am your AI Risk Assistant. How can I help you today?";
    }

    return NextResponse.json({
      answer: answer
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Gerçek uygulamada `body.message` ve bağlam bir LLM'e gönderilebilir.
    
    let answer = "Bu müşteri, borç/gelir oranı yüksek ve kredi skoru güvenli bandın altında olduğu için yüksek riskli kabul edilir. Sistem doğrudan reddetmek yerine vadeyi uzatıp aylık taksit baskısını azaltan bir yapılandırma önerir. Bu yaklaşım ödenebilirliği artırabilir ve müşteriyi banka portföyünde tutarken geri kazanım olasılığını yükseltebilir.";
    
    if (body.message && body.message.toLowerCase().includes("hello")) {
      answer = "Merhaba, ben AI Risk Asistanı. Bugün size nasıl yardımcı olabilirim?";
    }

    return NextResponse.json({
      answer: answer
    });
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
}

// app/api/translate/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // 1) 解析前端请求
  const { text, target } = (await request.json()) as {
    text: string;
    target: string;
  };
  // 从 header 取 X-User-Id，没有就当 anon
  const userId = request.headers.get("x-user-id") || "anon";

  // 2) 直接转发给你已经写好限额逻辑的 CF-Worker
  const cfRes = await fetch(
    "https://cf-worker.planvaofficial.workers.dev/api/translate",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId,
      },
      body: JSON.stringify({ text, target }),
    }
  );

  // 3) 把 CF-Worker 的返回状态码和 body 原样发回给前端
  const body = await cfRes.text(); // 可能是 JSON 或 "quota exceeded"
  return new NextResponse(body, {
    status: cfRes.status,
    headers: { "Content-Type": "application/json" },
  });
}

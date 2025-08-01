import { Ai } from "@cloudflare/ai";

export interface Env {
  AI: never;          // 仅用于类型提示，真实 binding 来自 wrangler.toml
}

export default {
  async fetch(req: Request, env: Env) {
    // —— 1. 每日限额逻辑 —— 
    // 这里假设请求里有 userId，可根据实际情况替换
    const userId = req.headers.get("X-User-Id") || "anon";
    const dateKey = new Date().toISOString().slice(0, 10);       // e.g. "2025-07-31"
    const kvKey   = `free:${userId}:${dateKey}`;

    // 读取当前已用次数
    const raw = await env.FREE_KV.get(kvKey, "text");
    const used = raw ? parseInt(raw, 10) : 0;

    if (used >= 20) {
      return new Response("quota exceeded", { status: 429 });
    }

    // 增加一次，并设置当天过期（24h）
    await env.FREE_KV.put(
      kvKey,
      String(used + 1),
      { expirationTtl: 60 * 60 * 24 }
    );
    // —— 限额检查结束 —— 

      const { pathname } = new URL(req.url);

      // 只接受 POST /api/translate
      if (pathname !== "/api/translate" || req.method !== "POST")
        return new Response("Not found", { status: 404 });

      // ── 1. 解析 JSON，请求体必须形如 {"text":"…","target":"en"}
      let text = "", target = "";
      try {
        const body = await req.json() as { text?: string; target?: string };
        text   = (body.text   ?? "").trim();
        target = (body.target ?? "").trim();
      } catch {
        return new Response("Bad JSON", { status: 400 });
      }

      if (!text || !target) {
        return new Response("Both `text` and `target` are required.", { status: 400 });
      }

      // ── 2. 只保留 target 的前 2 个字符，转小写 → en-US => en
      const iso2 = target.slice(0, 2).toLowerCase();

      // ── 3. 调用 Workers AI
      try {
        const ai = new Ai(env.AI);
        const out = await ai.run("@cf/meta/m2m100-1.2b", {
          text,
          target_lang: iso2,   // iso2 = target.slice(0,2).toLowerCase()
        });
        return Response.json(out);
      } catch (err: any) {
        console.error("AI-detail:", err);           // ★ 打印真实信息
        return new Response(String(err), { status: 500 });
      }
    },
} satisfies ExportedHandler<Env>;

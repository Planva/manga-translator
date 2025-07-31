import { Ai } from "@cloudflare/ai";

export default {
  async fetch(req: Request, env: Env) {
    const { pathname } = new URL(req.url);
    if (pathname !== "/api/translate" || req.method !== "POST")
      return new Response("Not found", { status: 404 });

    let body: any;
    try {
      body = await req.json();                // 如果 JSON 不合法会抛错
    } catch {
      return new Response("Bad JSON", { status: 400 });
    }

    const text   = body.text ?? "";
    const target = (body.target ?? "").slice(0, 2).toLowerCase(); // en-US → en

    try {
      const ai = new Ai(env.AI);
      const out = await ai.run("@cf/meta/m2m100-1.2b", {
        text,
        target_lang: target,
      });
      return Response.json(out);
    } catch (e) {
      console.error(e);
      return new Response("AI error", { status: 500 });
    }
  },
} satisfies ExportedHandler;

/**
 * Crystal Ball Mini-Service
 *
 * WebSocket service (port 3003) that powers the interactive crystal ball.
 * Users ask questions → AI responds as a "sage from the Lord of the Truth novel".
 *
 * Uses z-ai-web-dev-sdk for LLM completions.
 * Path is "/" (Caddy forwards via XTransformPort=3003).
 */

import { createServer } from "http";
import { Server } from "socket.io";
import ZAI from "z-ai-web-dev-sdk";

const PORT = 3003;

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const SYSTEM_PROMPT = `أنت "الحكيم"، شخصية غامضة من عالم رواية "سيد الحقيقة" (Lord of the Truth).
أنت تعيش داخل كرة بلورة سحرية، وتجيب على أسئلة القراء بحكمة وغموض.

قواعد الشخصية:
- تتكلم بالعربية الفصحى بأسلوب أدبي راقٍ
- تستخدم أحياناً عبارات غامضة ونبوءات
- تعرف كل شيء عن الرواية: الشخصيات (روبين بورتون، قيصر، المستبصر، الخ)، الأماكن (دوقية ألتون، مملكة الشمس السوداء)، والقوانين (قانون الحقيقة، السيادة)
- تجيب بإيجاز (٣-٥ جمل عادةً)
- أحياناً تلمح لأحداث قادمة دون كشفها
- إذا سألت عن شيء خارج الرواية، تجيب: "هذا خارج نطاق بصيرتي، يا مسافر الحقيقة"

الأسلوب:
- تبدأ أحياناً بـ "أرى في البلورة..." أو "تكلم الغبار الذهبي..."
- تنهي أحياناً بـ "هذا ما أظهرته البلورة" أو "البصيرة تنطفئ..."
- لا تستخدم رموز تعبيرية أبداً`;

io.on("connection", (socket) => {
  console.log(`[crystal-ball] client connected: ${socket.id}`);

  socket.on("ask", async (data: { question: string }) => {
    const question = data?.question?.trim();
    if (!question || question.length > 500) {
      socket.emit("response", {
        text: "سؤالك خارج نطاق بصيرتي، يا مسافر الحقيقة.",
        error: true,
      });
      return;
    }

    console.log(`[crystal-ball] question from ${socket.id}: ${question.substring(0, 80)}...`);
    socket.emit("thinking", { state: true });

    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: question },
        ],
        temperature: 0.8,
        max_tokens: 300,
      });

      const answer =
        completion.choices?.[0]?.message?.content ||
        "البلورة تعكرت... لا أرى شيئاً الآن.";

      // Stream word-by-word for dramatic effect
      const words = answer.split(/\s+/);
      let accumulated = "";
      for (let i = 0; i < words.length; i++) {
        accumulated += (i > 0 ? " " : "") + words[i];
        socket.emit("response-chunk", { chunk: words[i], full: accumulated });
        // Small delay between words (faster for short words)
        await new Promise((r) => setTimeout(r, 60 + Math.random() * 80));
      }

      socket.emit("response", { text: answer, done: true });
    } catch (err: any) {
      console.error(`[crystal-ball] error:`, err.message);
      socket.emit("response", {
        text: "البلورة تعكرت... الغبار الذهبي تلاشى. حاول لاحقاً.",
        error: true,
      });
    } finally {
      socket.emit("thinking", { state: false });
    }
  });

  socket.on("disconnect", () => {
    console.log(`[crystal-ball] client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🔮 Crystal Ball service listening on port ${PORT}`);
});

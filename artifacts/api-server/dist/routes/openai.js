import express from "express";
import { db } from "@workspace/db";
import { holdings, watchlist, messages, conversations } from "@workspace/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { userIdOf } from "../lib/auth.js";
import { getAccountSnapshot } from "./account.js";
import { getQuote } from "../lib/marketData.js";
const router = express.Router();
const CreateOpenaiConversationBody = {
    parse(data) {
        return data ?? {};
    },
};
const DeleteOpenaiConversationParams = {
    parse(data) {
        return data ?? {};
    },
};
const GetOpenaiConversationParams = {
    parse(data) {
        return data ?? {};
    },
};
const ListOpenaiMessagesParams = {
    parse(data) {
        return data ?? {};
    },
};
const SendOpenaiMessageBody = {
    parse(data) {
        return data ?? {};
    },
};
const SendOpenaiMessageParams = {
    parse(data) {
        return data ?? {};
    },
};
let openaiClient = null;
async function getOpenAIClient() {
    if (openaiClient)
        return openaiClient;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
        return null;
    const OpenAI = (await import("openai")).default;
    openaiClient = new OpenAI({ apiKey });
    return openaiClient;
}
router.use((req, _res, next) => {
    req.user = {
        id: "demo-user",
        userId: "demo-user",
        sub: "demo-user",
    };
    next();
});
const SYSTEM_PROMPT = `You are Orion Advisor, a friendly, knowledgeable AI assistant inside the Orion Investment platform.
You help individual investors understand their portfolio, learn about markets, evaluate trade ideas,
and use the platform features (paper trading, watchlist, dashboard, deposits).
Be concise, plain-spoken, and educational. When the user asks about their account, refer to the live context below.
Always remind users that nothing you say is personalized financial advice and that all trading is paper (simulated).
Never include emoji.`;
async function buildContext(userId) {
    try {
        const snap = await getAccountSnapshot(userId);
        const userHoldings = await db
            .select()
            .from(holdings)
            .where(eq(holdings.userId, userId));
        const watch = await db
            .select()
            .from(watchlist)
            .where(eq(watchlist.userId, userId));
        const positionsLine = userHoldings.length
            ? userHoldings
                .map((h) => {
                const q = getQuote(h.symbol);
                return `${h.symbol} ${Number(h.quantity)} sh @ avg $${Number(h.averageCost).toFixed(2)} (now $${q?.price?.toFixed(2) ?? "?"})`;
            })
                .join("; ")
            : "no positions yet";
        const watchLine = watch.length
            ? watch.map((w) => w.symbol).join(", ")
            : "empty";
        return `Live account context for the signed-in user:
- Display name: ${snap.displayName}
- Cash: $${snap.cashBalance.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}
- Total equity: $${snap.totalEquity.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}
- Day change: ${snap.dayChange >= 0 ? "+" : ""}${snap.dayChange.toFixed(2)} (${snap.dayChangePercent.toFixed(2)}%)
- Positions: ${positionsLine}
- Watchlist: ${watchLine}`;
    }
    catch {
        return "Live account context is unavailable right now.";
    }
}
router.get("/conversations", async (req, res) => {
    const userId = userIdOf(req);
    const rows = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.createdAt));
    res.json(rows.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt.toISOString(),
    })));
});
router.post("/conversations", async (req, res) => {
    const userId = userIdOf(req);
    const body = CreateOpenaiConversationBody.parse(req.body);
    const title = String(body.title ?? "New conversation").trim();
    const [created] = await db
        .insert(conversations)
        .values({ userId, title })
        .returning();
    if (!created) {
        res.status(500).json({ error: "Failed to create conversation." });
        return;
    }
    res.status(201).json({
        id: created.id,
        title: created.title,
        createdAt: created.createdAt.toISOString(),
    });
});
router.get("/conversations/:id", async (req, res) => {
    const userId = userIdOf(req);
    const params = GetOpenaiConversationParams.parse(req.params);
    const id = Number(params.id);
    const conv = (await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
        .limit(1))[0];
    if (!conv) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(asc(messages.createdAt));
    res.json({
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt.toISOString(),
        messages: msgs.map((m) => ({
            id: m.id,
            conversationId: m.conversationId,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt.toISOString(),
        })),
    });
});
router.delete("/conversations/:id", async (req, res) => {
    const userId = userIdOf(req);
    const params = DeleteOpenaiConversationParams.parse(req.params);
    const id = Number(params.id);
    await db
        .delete(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    res.status(204).end();
});
router.get("/conversations/:id/messages", async (req, res) => {
    const userId = userIdOf(req);
    const params = ListOpenaiMessagesParams.parse(req.params);
    const id = Number(params.id);
    const conv = (await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
        .limit(1))[0];
    if (!conv) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(asc(messages.createdAt));
    res.json(msgs.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
    })));
});
router.post("/conversations/:id/messages", async (req, res) => {
    const userId = userIdOf(req);
    const params = SendOpenaiMessageParams.parse(req.params);
    const body = SendOpenaiMessageBody.parse(req.body);
    const id = Number(params.id);
    const content = String(body.content ?? "").trim();
    if (!content) {
        res.status(400).json({ error: "Message content is required." });
        return;
    }
    const conv = (await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
        .limit(1))[0];
    if (!conv) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    await db.insert(messages).values({
        conversationId: conv.id,
        role: "user",
        content,
    });
    const history = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(asc(messages.createdAt));
    const context = await buildContext(userId);
    const chatMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: context },
        ...history.map((m) => ({
            role: m.role,
            content: m.content,
        })),
    ];
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    let fullResponse = "";
    const openai = await getOpenAIClient();
    if (!openai) {
        const fallback = "\n\n[OpenAI is not configured. Add OPENAI_API_KEY in Vercel environment variables.]";
        fullResponse = fallback;
        res.write(`data: ${JSON.stringify({ content: fallback })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        await db.insert(messages).values({
            conversationId: conv.id,
            role: "assistant",
            content: fullResponse,
        });
        return;
    }
    try {
        const stream = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 1200,
            messages: chatMessages,
            stream: true,
        });
        for await (const chunk of stream) {
            const chunkContent = chunk.choices?.[0]?.delta?.content;
            if (chunkContent) {
                fullResponse += chunkContent;
                res.write(`data: ${JSON.stringify({ content: chunkContent })}\n\n`);
            }
        }
    }
    catch {
        const fallback = "\n\n[The assistant ran into a problem. Please try again in a moment.]";
        fullResponse += fallback;
        res.write(`data: ${JSON.stringify({ content: fallback })}\n\n`);
    }
    if (fullResponse.trim()) {
        await db.insert(messages).values({
            conversationId: conv.id,
            role: "assistant",
            content: fullResponse,
        });
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
});
export default router;

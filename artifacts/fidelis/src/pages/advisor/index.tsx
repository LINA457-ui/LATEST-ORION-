import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Plus,
  Trash2,
  BrainCircuit,
  User as UserIcon,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Wallet,
} from "lucide-react";

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: number;
  title: string;
  messages: LocalMessage[];
};

const starterMessages: LocalMessage[] = [
  {
    id: "welcome-1",
    role: "assistant",
    content:
      "Welcome to Orion Advisor. I can help you review your portfolio, explain market movement, compare stocks, and suggest smarter trading decisions using demo insights.",
  },
];

const quickPrompts = [
  {
    icon: TrendingUp,
    label: "Analyze my portfolio",
    prompt: "Analyze my portfolio performance and tell me what looks strong.",
  },
  {
    icon: Wallet,
    label: "Improve my cash strategy",
    prompt: "How should I manage my cash balance and buying power?",
  },
  {
    icon: ShieldCheck,
    label: "Reduce risk",
    prompt: "How can I reduce risk in my current holdings?",
  },
  {
    icon: Sparkles,
    label: "Best opportunities",
    prompt: "What are the best opportunities in this demo market today?",
  },
];

function generateAdvisorReply(message: string) {
  const text = message.toLowerCase();

  if (text.includes("portfolio")) {
    return `Your demo portfolio looks strong and growth-focused.

Key observations:
• Total equity is healthy and trending upward.
• Tech exposure is carrying most of the gains.
• NVDA and MSFT look like strong momentum holdings.
• TSLA adds upside, but also increases volatility.

Smart move:
Keep your winners, but avoid becoming too concentrated in one sector. A balanced portfolio should mix growth, cash, and defensive positions.`;
  }

  if (text.includes("cash") || text.includes("buying power")) {
    return `Your cash position gives you flexibility.

A smart cash strategy:
• Keep part of your cash for quick opportunities.
• Avoid using all buying power at once.
• Enter positions gradually instead of buying everything in one trade.
• Use cash as protection when the market becomes uncertain.

In simple terms: cash is not weakness — it is control.`;
  }

  if (text.includes("risk")) {
    return `To reduce risk, focus on balance.

Risk control ideas:
• Do not let one stock dominate your portfolio.
• Take partial profit from fast-moving stocks.
• Keep a watchlist before entering new trades.
• Use smaller position sizes on volatile names.
• Review your exposure to tech-heavy assets.

The goal is not just to make money. The goal is to stay in the game long enough to compound.`;
  }

  if (text.includes("opportunit") || text.includes("best")) {
    return `Based on this demo market setup, the strongest opportunities appear to be:

• NVDA — strong AI momentum and high market interest.
• MSFT — stable growth, cloud strength, and enterprise demand.
• AAPL — strong ecosystem and defensive brand power.
• AMZN — long-term cloud and commerce upside.

Best approach:
Do not chase everything. Pick 1–2 strong setups and build patiently.`;
  }

  return `Here is my advisor-style take:

Your question points to decision quality, not just market movement. The best traders think in systems.

What I would focus on:
• Understand why you are entering a position.
• Know your risk before thinking about profit.
• Avoid emotional buying after a big move.
• Keep enough cash for better opportunities.
• Review performance weekly, not every minute.

A strong portfolio is built with patience, discipline, and clean execution.`;
}

export default function AdvisorPage() {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 1,
      title: "Portfolio Strategy",
      messages: starterMessages,
    },
  ]);

  const [activeId, setActiveId] = useState(1);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) ||
    conversations[0];

  const localMessages = activeConversation?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages, isThinking]);

  const handleCreate = () => {
    const nextId = Date.now();

    const newConversation: Conversation = {
      id: nextId,
      title: "New Advisor Chat",
      messages: starterMessages,
    };

    setConversations((prev) => [newConversation, ...prev]);
    setActiveId(nextId);
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();

    setConversations((prev) => {
      const remaining = prev.filter((conversation) => conversation.id !== id);

      if (activeId === id && remaining.length > 0) {
        setActiveId(remaining[0].id);
      }

      if (remaining.length === 0) {
        const freshConversation = {
          id: Date.now(),
          title: "New Advisor Chat",
          messages: starterMessages,
        };

        setActiveId(freshConversation.id);
        return [freshConversation];
      }

      return remaining;
    });
  };

  const sendMessage = (message: string) => {
    if (!message.trim() || isThinking) return;

    const userMessage: LocalMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message.trim(),
    };

    setInput("");

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeId
          ? {
              ...conversation,
              title:
                conversation.title === "New Advisor Chat"
                  ? message.trim().slice(0, 32)
                  : conversation.title,
              messages: [...conversation.messages, userMessage],
            }
          : conversation
      )
    );

    setIsThinking(true);

    setTimeout(() => {
      const assistantMessage: LocalMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: generateAdvisorReply(message),
      };

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === activeId
            ? {
                ...conversation,
                messages: [...conversation.messages, assistantMessage],
              }
            : conversation
        )
      );

      setIsThinking(false);
    }, 700);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 pb-4">
      <Card className="w-72 flex-col shrink-0 hidden md:flex overflow-hidden border-muted">
        <div className="p-4 border-b bg-muted/20">
          <Button className="w-full" onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setActiveId(conversation.id)}
                className={`group flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer transition-colors ${
                  activeId === conversation.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <span className="truncate pr-2">{conversation.title}</span>

                <button
                  type="button"
                  onClick={(e) => handleDelete(e, conversation.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t p-4 text-xs text-muted-foreground bg-muted/20">
          Static demo advisor. No backend required.
        </div>
      </Card>

      <Card className="flex-1 flex flex-col overflow-hidden bg-muted/10 border-muted">
        <div className="border-b bg-background px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <BrainCircuit className="w-5 h-5" />
            </div>

            <div>
              <h1 className="font-bold leading-tight">Orion Advisor</h1>
              <p className="text-xs text-muted-foreground">
                Static AI-style portfolio assistant
              </p>
            </div>
          </div>

          <Button size="sm" variant="outline" onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
          {localMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <BrainCircuit className="w-5 h-5" />
                </div>
              )}

              <div
                className={`px-4 py-3 rounded-xl max-w-[82%] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-card border shadow-sm rounded-bl-none text-card-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <UserIcon className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <BrainCircuit className="w-5 h-5" />
              </div>

              <div className="px-4 py-3 rounded-xl bg-card border shadow-sm rounded-bl-none">
                <div className="flex gap-1 items-center h-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}

          {localMessages.length <= 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {quickPrompts.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    onClick={() => sendMessage(item.prompt)}
                    className="text-left rounded-xl border bg-background hover:bg-muted/60 transition-colors p-4"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-sm">
                        {item.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.prompt}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 bg-background border-t">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about portfolio strategy, risk, stocks, or buying power..."
              className="pr-12 py-6 text-base rounded-full bg-muted/50 border-muted focus-visible:ring-primary"
              disabled={isThinking}
            />

            <Button
              type="submit"
              size="icon"
              className="absolute right-1.5 rounded-full h-9 w-9"
              disabled={!input.trim() || isThinking}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground mt-2">
            Demo advisor responses are static and educational.
          </div>
        </div>
      </Card>
    </div>
  );
}
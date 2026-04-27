import { useState, useEffect, useRef } from "react";
import { 
  useListOpenaiConversations, 
  useCreateOpenaiConversation, 
  useGetOpenaiConversation, 
  useDeleteOpenaiConversation, 
  useListOpenaiMessages 
} from "@workspace/api-client-react";
import { streamAdvisorMessage } from "@/lib/openaiStream";
import { useAuth } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Plus, Trash2, BrainCircuit, User as UserIcon } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type LocalMessage = {
  id: string | number;
  role: "user" | "assistant" | "system";
  content: string;
};

export default function AdvisorPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  
  const { data: conversations, isLoading: loadingConvos } = useListOpenaiConversations();
  const createConvo = useCreateOpenaiConversation();
  const deleteConvo = useDeleteOpenaiConversation();

  const [activeId, setActiveId] = useState<number | null>(null);
  
  // Auto-select first or create new
  useEffect(() => {
    if (!loadingConvos && conversations) {
      if (conversations.length > 0 && !activeId) {
        setActiveId(conversations[0].id);
      } else if (conversations.length === 0 && !createConvo.isPending) {
        createConvo.mutate({ data: { title: "New Chat" } }, {
          onSuccess: (res) => {
            setActiveId(res.id);
            queryClient.invalidateQueries({ queryKey: ["/api/openai/conversations"] });
          }
        });
      }
    }
  }, [loadingConvos, conversations, activeId]);

  const { data: serverMessages, isLoading: loadingMsgs } = useListOpenaiMessages(activeId!, { 
    query: { enabled: !!activeId, queryKey: ["/api/openai/conversations", activeId, "messages"] } 
  });

  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync server messages to local state when not streaming
  useEffect(() => {
    if (serverMessages && !isStreaming) {
      setLocalMessages(
        (serverMessages as Array<{ id: string | number; role: string; content: string }>).map((m) => ({
          id: m.id,
          role: (m.role === "user" || m.role === "assistant" || m.role === "system" ? m.role : "assistant") as "user" | "assistant" | "system",
          content: m.content,
        }))
      );
    }
  }, [serverMessages, isStreaming, activeId]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages]);

  const handleCreate = async () => {
    try {
      const res = await createConvo.mutateAsync({ data: { title: "New Chat" } });
      setActiveId(res.id);
      queryClient.invalidateQueries({ queryKey: ["/api/openai/conversations"] });
    } catch (e) {
      toast({ title: "Failed to create conversation", variant: "destructive" });
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await deleteConvo.mutateAsync({ id });
      if (activeId === id) setActiveId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/openai/conversations"] });
    } catch (e) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    let convId = activeId;
    if (!convId) {
      try {
        const res = await createConvo.mutateAsync({ data: { title: "New Chat" } });
        convId = res.id;
        setActiveId(res.id);
        queryClient.invalidateQueries({ queryKey: ["/api/openai/conversations"] });
      } catch (err) {
        toast({ title: "Failed to start conversation", variant: "destructive" });
        return;
      }
    }

    const userMsg = input.trim();
    setInput("");
    
    // Optimistic UI
    const newUserMsg: LocalMessage = { id: Date.now(), role: "user", content: userMsg };
    const tempAssistantMsg: LocalMessage = { id: Date.now() + 1, role: "assistant", content: "" };
    
    setLocalMessages(prev => [...prev, newUserMsg, tempAssistantMsg]);
    setIsStreaming(true);

    await streamAdvisorMessage({
      conversationId: convId,
      content: userMsg,
      getToken,
      onDelta: (text) => {
        setLocalMessages(prev => {
          const last = prev[prev.length - 1];
          if (last.role === "assistant") {
            return [...prev.slice(0, -1), { ...last, content: last.content + text }];
          }
          return prev;
        });
      },
      onDone: () => {
        setIsStreaming(false);
        queryClient.invalidateQueries({ queryKey: ["/api/openai/conversations", activeId, "messages"] });
      },
      onError: (err) => {
        toast({ title: "Stream error", description: err.message, variant: "destructive" });
        setIsStreaming(false);
        setLocalMessages(prev => prev.slice(0, -1)); // Remove temp message
      }
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 pb-4">
      {/* Sidebar */}
      <Card className="w-64 flex flex-col shrink-0 hidden md:flex overflow-hidden">
        <div className="p-4 border-b">
          <Button className="w-full" onClick={handleCreate} disabled={createConvo.isPending}>
            <Plus className="w-4 h-4 mr-2" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loadingConvos ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : (
              conversations?.map(c => (
                <div 
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`group flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer transition-colors ${activeId === c.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}
                >
                  <span className="truncate pr-2">{c.title}</span>
                  <button 
                    onClick={(e) => handleDelete(e, c.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden bg-muted/10 border-muted">
        <>
            <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
              {localMessages.map((msg, i) => (
                <div key={msg.id || i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <BrainCircuit className="w-5 h-5" />
                    </div>
                  )}
                  <div className={`px-4 py-3 rounded-xl max-w-[80%] ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-br-none' 
                      : 'bg-card border shadow-sm rounded-bl-none text-card-foreground prose prose-sm dark:prose-invert max-w-none'
                  }`}>
                    {msg.role === 'assistant' ? (
                      msg.content ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        <div className="flex gap-1 items-center h-5">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                      <UserIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {localMessages.length === 0 && !loadingMsgs && (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
                  <BrainCircuit className="w-12 h-12 mb-4" />
                  <p className="text-base font-medium">Fidelis Advisor</p>
                  <p className="text-sm mt-1">How can I help you analyze the markets today?</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-background border-t">
              <form onSubmit={handleSubmit} className="relative flex items-center">
                <Input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about a symbol, portfolio strategy, or market news..."
                  className="pr-12 py-6 text-base rounded-full bg-muted/50 border-muted focus-visible:ring-primary"
                  disabled={isStreaming}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="absolute right-1.5 rounded-full h-9 w-9"
                  disabled={!input.trim() || isStreaming}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <div className="text-center text-xs text-muted-foreground mt-2">
                Fidelis Advisor can make mistakes. Consider verifying important information.
              </div>
            </div>
          </>
      </Card>
    </div>
  );
}

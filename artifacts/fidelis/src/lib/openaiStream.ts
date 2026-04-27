export async function streamAdvisorMessage({
  conversationId,
  content,
  getToken,
  onDelta,
  onDone,
  onError,
}: {
  conversationId: number;
  content: string;
  getToken: () => Promise<string | null>;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}) {
  try {
    const token = await getToken();
    const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
    const response = await fetch(`${apiBase}/api/openai/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        if (part.startsWith("data: ")) {
          const dataStr = part.slice(6).trim();
          if (dataStr === "[DONE]") {
            onDone();
            return;
          }
          try {
            const data = JSON.parse(dataStr);
            if (data.done) {
              onDone();
              return;
            } else if (data.content) {
              onDelta(data.content);
            }
          } catch (e) {
            console.error("Failed to parse SSE data", e);
          }
        }
      }
    }
    
    // Process any remaining buffer
    if (buffer.startsWith("data: ")) {
      try {
         const data = JSON.parse(buffer.slice(6).trim());
         if (data.done) onDone();
         else if (data.content) onDelta(data.content);
      } catch (e) { }
    }
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

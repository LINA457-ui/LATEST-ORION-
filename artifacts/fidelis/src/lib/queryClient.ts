import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

setBaseUrl(import.meta.env.BASE_URL.replace(/\/$/, ""));

setAuthTokenGetter(() => {
  // @ts-ignore
  return window.Clerk?.session?.getToken() ?? null;
});

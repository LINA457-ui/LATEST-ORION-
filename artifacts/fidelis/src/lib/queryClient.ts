import { QueryClient } from "@tanstack/react-query";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

setBaseUrl(API_URL.replace(/\/$/, ""));

setAuthTokenGetter(() => {
  // @ts-ignore
  return window.Clerk?.session?.getToken() ?? null;
});
import { QueryClient } from "@tanstack/react-query";

let _client: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!_client) {
    _client = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: 5 * 60_000,
          refetchOnWindowFocus: true,
          retry: 2,
        },
      },
    });
  }
  return _client;
}

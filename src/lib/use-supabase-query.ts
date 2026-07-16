import { useEffect, useState, useCallback } from "react";
import supabase from "./supabase";

export function useSupabaseQuery<T>(
  table: string,
  options?: {
    select?: string;
    filters?: Record<string, string>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
  },
  deps: unknown[] = []
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase.from(table).select(options?.select ?? "*");

    if (options?.filters) {
      for (const [k, v] of Object.entries(options.filters)) {
        query = query.eq(k, v);
      }
    }
    if (options?.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data: result, error: err } = await query;
    if (err) {
      setError(err.message);
      setData(null);
    } else {
      setData(result as T[]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, JSON.stringify(options?.filters), options?.order?.column, options?.order?.ascending, options?.limit, ...deps]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

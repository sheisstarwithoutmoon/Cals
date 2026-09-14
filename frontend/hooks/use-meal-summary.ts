"use client";

import { useCallback, useEffect, useState } from "react";

import * as mealsApi from "@/lib/api/meals";
import { ApiError } from "@/lib/api/client";
import { onDataChanged } from "@/lib/events";
import type { MealSummary, MealSummaryFilters } from "@/lib/types/api";

export function useMealSummary(filters: MealSummaryFilters) {
  const [summary, setSummary] = useState<MealSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const filterKey = JSON.stringify(filters);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mealsApi.getMealSummary(filters);
      setSummary(result.summary);
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldMessage = Object.values(err.fieldErrors)[0];
        setError(fieldMessage || err.message);
      } else {
        setError("Failed to load nutrition summary.");
      }
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, reloadToken]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => onDataChanged(fetchSummary), [fetchSummary]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  return { summary, isLoading, error, refetch };
}

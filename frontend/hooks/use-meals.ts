"use client";

import { useCallback, useEffect, useState } from "react";

import * as mealsApi from "@/lib/api/meals";
import { ApiError } from "@/lib/api/client";
import { MAX_PAGES } from "@/lib/constants";
import { onDataChanged } from "@/lib/events";
import type {
  MealEntry,
  MealListFilters,
  Pagination,
} from "@/lib/types/api";

const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export function useMeals(filters: MealListFilters) {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>(DEFAULT_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const filterKey = JSON.stringify(filters);

  const fetchMeals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mealsApi.listMeals(filters);
      const totalPages = Math.min(result.pagination.totalPages, MAX_PAGES);
      const page = Math.min(Math.max(1, result.pagination.page), MAX_PAGES);
      setMeals(result.meals);
      setPagination({
        ...result.pagination,
        page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldMessage = Object.values(err.fieldErrors)[0];
        setError(fieldMessage || err.message);
      } else {
        setError("Failed to load meals.");
      }
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, reloadToken]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  useEffect(() => onDataChanged(fetchMeals), [fetchMeals]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  return { meals, pagination, isLoading, error, refetch };
}

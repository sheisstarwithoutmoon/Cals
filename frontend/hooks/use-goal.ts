"use client";

import { useCallback, useEffect, useState } from "react";

import * as goalsApi from "@/lib/api/goals";
import { ApiError } from "@/lib/api/client";
import { onDataChanged } from "@/lib/events";
import type { Goal, GoalInput } from "@/lib/types/api";

export function useGoal() {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoal = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { goal } = await goalsApi.getGoal();
      setGoal(goal);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setGoal(null);
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : "Failed to load your goals."
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  useEffect(() => onDataChanged(fetchGoal), [fetchGoal]);

  const save = useCallback(async (input: GoalInput) => {
    const { goal } = await goalsApi.saveGoal(input);
    setGoal(goal);
    return goal;
  }, []);

  return { goal, isLoading, error, refetch: fetchGoal, save };
}

"use client";

import { useCallback, useEffect, useState } from "react";

import * as onboardingApi from "@/lib/api/onboarding";
import { ApiError } from "@/lib/api/client";
import type { OnboardingStatus } from "@/lib/types/api";

export function useOnboarding() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await onboardingApi.getOnboardingStatus();
      setStatus(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load your onboarding progress."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, isLoading, error, refetch: fetchStatus };
}

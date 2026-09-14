"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import * as mealsApi from "@/lib/api/meals";
import { ApiError } from "@/lib/api/client";
import { onDataChanged } from "@/lib/events";
import type { MealReport } from "@/lib/types/api";

export function useMealReport(range: { startDate: string; endDate: string }) {
  const [report, setReport] = useState<MealReport | null>(null);
  // The range `report` was fetched for, so callers can tell a stale report
  // (still showing the previous range while the new one loads) from a current one.
  const [reportRangeKey, setReportRangeKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const rangeKey = `${range.startDate}|${range.endDate}`;
  const latestRequest = useRef(0);

  const fetchReport = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await mealsApi.getMealReport(range);
      // A slower response for a range the user already left must not
      // overwrite the report for the range they're looking at now.
      if (requestId !== latestRequest.current) return;
      setReport(result.report);
      setReportRangeKey(rangeKey);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError(err instanceof ApiError ? err.message : "Failed to load reports.");
    } finally {
      if (requestId === latestRequest.current) setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey, reloadToken]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => onDataChanged(fetchReport), [fetchReport]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  return {
    report,
    /** True while `report` belongs to a different range than the one requested. */
    isStale: reportRangeKey !== rangeKey,
    isLoading,
    error,
    refetch,
  };
}

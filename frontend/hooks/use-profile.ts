"use client";

import { useCallback, useEffect, useState } from "react";

import * as profileApi from "@/lib/api/profile";
import { ApiError } from "@/lib/api/client";
import { onDataChanged } from "@/lib/events";
import type { ProfileUpdate, ProfileView } from "@/lib/types/api";

export function useProfile() {
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setProfile(await profileApi.getProfile());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load your profile.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => onDataChanged(fetchProfile), [fetchProfile]);

  /** Saves a partial update; resolves with any safety adjustments the server made. */
  const update = useCallback(async (patch: ProfileUpdate) => {
    const { adjustments, ...view } = await profileApi.updateProfile(patch);
    setProfile(view);
    return adjustments;
  }, []);

  return { profile, isLoading, error, refetch: fetchProfile, update };
}

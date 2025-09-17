import { useState, useEffect } from "react";

interface WeekConfig {
  currentWeek: number;
  lastUpdated: string;
  season: string;
}

export function useCurrentWeek() {
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentWeek = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/current-week");

        if (!response.ok) {
          throw new Error("Failed to fetch current week");
        }

        const config: WeekConfig = await response.json();
        setCurrentWeek(config.currentWeek);
        setError(null);
      } catch (err) {
        console.error("Error fetching current week:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        // Fallback to week 1 if API fails
        setCurrentWeek(1);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentWeek();
  }, []);

  return { currentWeek, loading, error };
}

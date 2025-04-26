"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  Tooltip,
  YAxis,
} from "recharts";
import { User, Search } from "lucide-react";
import supabase from "../supabaseClient";
import { useState, useEffect } from "react";

export default function PlayerStats() {
  const [playerName, setPlayerName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [stats, setStats] = useState([]);
  const [averages, setAverages] = useState({});
  const [position, setPosition] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedStat, setSelectedStat] = useState("rushing_yards");
  const [customValue, setCustomValue] = useState(null); // User-defined value for the chart
  const [searchPerformed, setSearchPerformed] = useState(false); // Tracks if search is performed
  
  // Add this state near the top
  const [weeklyLeaders, setWeeklyLeaders] = useState([]);

  // Fetch top 1 players per position (rank 1)
  useEffect(() => {
    const fetchWeeklyLeaders = async () => {
      const { data, error } = await supabase
        .from("weekly_leaders")
        .select("*")
        .eq("rank", 1); // Only rank 1 players

      if (error) {
        console.error("❌ Error fetching weekly leaders:", error.message);
        return;
      }

      setWeeklyLeaders(data);
    };

    fetchWeeklyLeaders();
  }, []);

  const normalizeString = (str) =>
    str
      .toLowerCase()
      .replace(/[-.`']/g, "")
      .trim();

  const fetchSuggestions = async (query) => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    try {
      const { data: players } = await supabase
        .from("player_list")
        .select("player_name");

      const normalizedQuery = normalizeString(query);
      const matchingPlayers = players.filter((player) =>
        normalizeString(player.player_name).includes(normalizedQuery)
      );

      setSuggestions(matchingPlayers.map((p) => p.player_name));
    } catch (err) {
      console.error("Error fetching suggestions:", err.message);
    }
  };

  const fetchPlayerAverages = async (normalizedPlayerName) => {
    try {
      console.log("Fetching averages for player:", normalizedPlayerName);

      const { data: playerAverages, error } = await supabase
        .from("player_averages")
        .select("*")
        .eq("normalized_name", normalizedPlayerName);

      if (error) {
        console.error("Error fetching player averages:", error.message);
        throw new Error("Failed to fetch player averages.");
      }

      if (!playerAverages || playerAverages.length === 0) {
        throw new Error("No average data available for the selected player.");
      }

      const averagesMap = {};
      playerAverages.forEach((stat) => {
        Object.keys(stat).forEach((key) => {
          if (typeof stat[key] === "number") {
            // Remove 'avg_' prefix
            const normalizedKey = key.replace(/^avg_/, "");
            averagesMap[normalizedKey] = stat[key];
          }
        });
      });

      console.log("Fetched averages (normalized):", averagesMap);
      return averagesMap;
    } catch (err) {
      console.error("Error in fetchPlayerAverages:", err.message);
      throw err;
    }
  };

  const fetchPlayerStats = async () => {
    setLoading(true);
    setError("");

    try {
      const normalizedPlayerName = normalizeString(playerName);
      console.log("Normalized Player Name:", normalizedPlayerName);

      // Fetch player averages
      const averagesMap = await fetchPlayerAverages(normalizedPlayerName);
      setAverages(averagesMap);

      // Fetch weekly stats
      const { data: weeklyStats, error: statsError } = await supabase
        .from("player_stats")
        .select("*")
        .eq("normalized_name", normalizedPlayerName);

      if (statsError) {
        console.error("Error fetching weekly stats:", statsError.message);
        throw new Error("Failed to fetch player stats.");
      }

      if (!weeklyStats || weeklyStats.length === 0) {
        throw new Error("No weekly stats available for the selected player.");
      }
      setSearchPerformed(true); // Indicate the search is performed

      console.log("Weekly stats:", weeklyStats);
      setStats(weeklyStats.sort((a, b) => a.week - b.week)); // Sort by week
      setPosition(weeklyStats[0]?.position_id || ""); // Set player position
    } catch (err) {
      console.error("Error in fetchPlayerStats:", err.message);
      setError(err.message || "Failed to fetch player stats.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchPlayerStats();
  };

  const getComparisonColor = (value, avgValue, key) => {
    console.log(`Key: ${key}, Value: ${value}, Avg: ${avgValue}`); // Debugging log

    if (typeof value !== "number" || typeof avgValue !== "number") {
      return "text-gray-500";
    }

    if (key === "passing_tds") {
      if (value >= 2) return "text-green-500";
      if (value === 1) return "text-yellow-500";
      return "text-red-500";
    }
    if (key === "rushing_tds" || key === "receiving_tds") {
      return value > 0 ? "text-green-500" : "text-red-500";
    }

    if (value > avgValue + 1.5) return "text-green-500";
    if (Math.abs(value - avgValue) <= 1.5) return "text-yellow-500";
    if (value < avgValue - 1.5) return "text-red-500";

    return "text-gray-500";
  };

  const getColumns = () => {
    if (position === "QB") {
      return [
        { label: "Passing Attempts", key: "passing_attempts" },
        { label: "Completions", key: "completions" },
        { label: "Passing Yards", key: "passing_yards" },
        { label: "Passing TDs", key: "passing_tds" },
        { label: "Interceptions", key: "interceptions" },
        { label: "Rushing Attempts", key: "rushing_attempts" },
        { label: "Rushing Yards", key: "rushing_yards" },
        { label: "Rushing TDs", key: "rushing_tds" },
      ];
    } else if (position === "WR" || position === "TE") {
      return [
        { label: "Targets", key: "targets" },
        { label: "Receptions", key: "receptions" },
        { label: "Receiving Yards", key: "receiving_yards" },
        { label: "Receiving TDs", key: "receiving_tds" },
        { label: "Rushing Attempts", key: "rushing_attempts" },
        { label: "Rushing Yards", key: "rushing_yards" },
        { label: "Rushing TDs", key: "rushing_tds" },
      ];
    } else if (position === "RB") {
      return [
        { label: "Rushing Attempts", key: "rushing_attempts" },
        { label: "Rushing Yards", key: "rushing_yards" },
        { label: "Rushing TDs", key: "rushing_tds" },
        { label: "Targets", key: "targets" },
        { label: "Receptions", key: "receptions" },
        { label: "Receiving Yards", key: "receiving_yards" },
        { label: "Receiving TDs", key: "receiving_tds" },
      ];
    }
    return [];
  };

  const calculatePercentageDiff = (last3Avg, overallAvg) => {
    if (overallAvg === 0) return 0; // Avoid division by zero
    return ((last3Avg - overallAvg) / overallAvg) * 100;
  };

  const formatPercentage = (value) => {
    const rounded = value.toFixed(1);
    return value > 0 ? `+${rounded}%` : `${rounded}%`; // Add "+" for positive values
  };

  const getPercentageColor = (value) => {
    if (value > 1) return "text-green-500"; // Green for positive percentage > 1
    if (value < -1) return "text-red-500"; // Red for negative percentage < -1
    return "text-yellow-500"; // Yellow for values between -1 and 1
  };

  return (
    <div className="flex-grow space-y-8">
      <div className="flex items-center justify-center space-x-2">
        <User className="w-8 h-8 text-blue-400" />
        <h1 className="text-4xl font-bold text-center text-blue-400">
          Player Stats
        </h1>
      </div>

      {/* Centering the search card */}
      <div className="flex justify-center">
        <Card className="bg-gray-800 border-blue-400 w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-blue-400 flex items-center space-x-2">
              <Search className="w-6 h-6" />
              <span>Find Player</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Player Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter player name"
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    fetchSuggestions(e.target.value);
                  }}
                  className="bg-gray-700 text-gray-100 border-gray-600 w-full"
                />
                {suggestions.length > 0 && (
                  <ul className="absolute z-10 bg-gray-700 border border-gray-600 w-full mt-1 rounded shadow-lg">
                    {suggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        onClick={() => {
                          setPlayerName(suggestion);
                          setSuggestions([]);
                        }}
                        className="px-4 py-2 text-gray-100 cursor-pointer hover:bg-gray-600"
                      >
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Search
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {!searchPerformed && weeklyLeaders.length > 0 && (
        <div className="w-full">
          <Card className="bg-gray-800 border-blue-500 w-full shadow-lg px-6 py-4 rounded-lg">
            <CardHeader>
              <CardTitle className="text-blue-400 text-xl font-bold flex items-center gap-2">
                🏆 Best Stats of Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {weeklyLeaders.map((player) => {
                  // Map stat type by position or add logic if needed
                  const statType =
                    player.position_id === "QB"
                      ? "Passing Yards"
                      : player.position_id === "RB"
                      ? "Rushing Yards"
                      : ["WR", "TE"].includes(player.position_id)
                      ? "Receiving Yards"
                      : "Stat";

                  return (
                    <div
                      key={player.id}
                      className="bg-gray-900 border border-blue-500 rounded-lg p-4 hover:bg-gray-700 transition-all cursor-pointer"
                      onClick={() => setPlayerName(player.player_name)}
                    >
                      <div className="text-lg font-bold text-white">
                        {player.player_name}
                        <span className="text-sm text-gray-400">
                          {" "}
                          ({player.position_id})
                        </span>
                      </div>
                      <div className="text-sm text-blue-300 mt-2 font-medium">
                        {statType}:{" "}
                        <span className="text-white font-bold">
                          {player.stat_value}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Matchup: {player.matchup}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Conditionally render sections */}
      {searchPerformed && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-gray-800 via-gray-900 to-black border border-blue-500 shadow-lg rounded-lg">
              <CardHeader>
                <CardTitle className="text-blue-400 text-2xl font-bold">
                  Performance Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 p-4">
                  {["RB", "WR", "TE"].includes(position) ? (
                    <>
                      {/* Common Stats for RB, WR, TE */}
                      {[
                        "rushing_attempts",
                        "rushing_yards",
                        "receptions",
                        "receiving_yards",
                      ].map((statKey) => {
                        const statLabelMap = {
                          rushing_attempts: "Rushing Attempts",
                          rushing_yards: "Rushing Yards",
                          receptions: "Receptions",
                          receiving_yards: "Receiving Yards",
                        };

                        return (
                          <div key={statKey}>
                            {/* Average Stat */}
                            <div className="flex justify-between items-center">
                              <span className="text-gray-300 font-semibold">
                                Average {statLabelMap[statKey]}
                              </span>
                              <span className="text-blue-400 text-xl font-bold">
                                {(averages[statKey] || 0).toFixed(1)}
                              </span>
                            </div>

                            {/* Last 3 Stat (% diff) */}
                            <div className="flex justify-between items-center">
                              <span className="text-gray-300 font-semibold">
                                Last 3 {statLabelMap[statKey]} (% diff)
                              </span>
                              <span
                                className={`text-xl font-bold ${
                                  stats.length >= 3
                                    ? getPercentageColor(
                                        calculatePercentageDiff(
                                          stats
                                            .slice(-3)
                                            .reduce(
                                              (sum, stat) =>
                                                sum + (stat[statKey] || 0),
                                              0
                                            ) / 3,
                                          averages[statKey] || 0
                                        )
                                      )
                                    : "text-gray-400"
                                }`}
                              >
                                {stats.length >= 3
                                  ? formatPercentage(
                                      calculatePercentageDiff(
                                        stats
                                          .slice(-3)
                                          .reduce(
                                            (sum, stat) =>
                                              sum + (stat[statKey] || 0),
                                            0
                                          ) / 3,
                                        averages[statKey] || 0
                                      )
                                    )
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : position === "QB" ? (
                    <>
                      {/* Common Stats for QB */}
                      {[
                        "passing_attempts",
                        "completions",
                        "passing_yards",
                        "rushing_yards",
                        "rushing_attempts",
                      ].map((statKey) => {
                        const statLabelMap = {
                          passing_attempts: "Passing Attempts",
                          completions: "Completions",
                          passing_yards: "Passing Yards",
                          rushing_yards: "Rushing Yards",
                          rushing_attempts: "Rushing Attempts",
                        };

                        return (
                          <div key={statKey}>
                            {/* Average Stat */}
                            <div className="flex justify-between items-center">
                              <span className="text-gray-300 font-semibold">
                                Average {statLabelMap[statKey]}
                              </span>
                              <span className="text-blue-400 text-xl font-bold">
                                {(averages[statKey] || 0).toFixed(1)}
                              </span>
                            </div>

                            {/* Last 3 Stat (% diff) */}
                            <div className="flex justify-between items-center">
                              <span className="text-gray-300 font-semibold">
                                Last 3 {statLabelMap[statKey]} (% diff)
                              </span>
                              <span
                                className={`text-xl font-bold ${
                                  stats.length >= 3
                                    ? getPercentageColor(
                                        calculatePercentageDiff(
                                          stats
                                            .slice(-3)
                                            .reduce(
                                              (sum, stat) =>
                                                sum + (stat[statKey] || 0),
                                              0
                                            ) / 3,
                                          averages[statKey] || 0
                                        )
                                      )
                                    : "text-gray-400"
                                }`}
                              >
                                {stats.length >= 3
                                  ? formatPercentage(
                                      calculatePercentageDiff(
                                        stats
                                          .slice(-3)
                                          .reduce(
                                            (sum, stat) =>
                                              sum + (stat[statKey] || 0),
                                            0
                                          ) / 3,
                                        averages[statKey] || 0
                                      )
                                    )
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <p className="text-gray-400 text-center">
                      Select a valid position (RB, WR, TE, QB) to see stats.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-bl from-gray-800 via-gray-900 to-black border border-blue-500 shadow-lg rounded-lg">
              <CardHeader>
                <CardTitle className="text-blue-400 text-2xl font-bold flex items-center">
                  Season Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Dropdown for selecting the stat */}
                <div className="mb-4">
                  <label className="text-gray-400">Select Stat:</label>
                  <select
                    className="w-full bg-gray-700 text-gray-100 border-gray-600 rounded px-4 py-2"
                    value={selectedStat}
                    onChange={(e) => setSelectedStat(e.target.value)}
                  >
                    <option value="receiving_yards">Receiving Yards</option>
                    <option value="rushing_yards">Rushing Yards</option>
                    <option value="receptions">Receptions</option>
                    <option value="rushing_attempts">Rushing Attempts</option>
                    <option value="passing_yards">Passing Yards</option>
                    <option value="passing_attempts">Passing Attempts</option>
                    <option value="completions">Completions</option>
                  </select>
                </div>

                {/* Input for user-defined line */}
                <div className="mb-4">
                  <label className="text-gray-400">Select a Line:</label>
                  <input
                    type="number"
                    className="w-full bg-gray-700 text-gray-100 border-gray-600 rounded px-4 py-2"
                    value={customValue ?? ""} // Fallback to empty string if null
                    onChange={(e) =>
                      setCustomValue(Number(e.target.value) || 0)
                    }
                    placeholder="Enter a value"
                  />
                </div>

                {/* Line Chart */}
                <LineChart
                  width={300}
                  height={200}
                  data={stats.map((row) => ({
                    week: `Week ${row.week}`,
                    weeklyValue: row[selectedStat] || 0, // Weekly value for selected stat
                    averageValue: averages[selectedStat]
                      ? Math.round(averages[selectedStat] * 10) / 10 // Rounded to 1 decimal
                      : 0,
                    customValue: customValue || null, // User-defined value
                  }))}
                  className="mx-auto"
                  margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" stroke="#8884d8" />
                  <YAxis stroke="#8884d8" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="weeklyValue"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    dot
                    name="Weekly Value"
                  />
                  <Line
                    type="monotone"
                    dataKey="averageValue"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={false}
                    name="Average Value"
                  />
                  {customValue && (
                    <Line
                      type="monotone"
                      dataKey="customValue"
                      stroke="#ff7300"
                      strokeWidth={2}
                      dot={false}
                      name="Custom Value"
                    />
                  )}
                </LineChart>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-br from-gray-800 via-gray-900 to-black border border-blue-500 shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="text-blue-400 text-2xl font-bold flex items-center">
                Player Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading && <p className="text-gray-400">Loading stats...</p>}
              {error && <p className="text-red-500">{error}</p>}
              {stats.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                      <tr>
                        <th className="px-6 py-3">Week</th>
                        {getColumns().map((col) => (
                          <th key={col.key} className="px-6 py-3">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((row, index) => (
                        <tr
                          key={index}
                          className="border-b bg-gray-800 border-gray-700"
                        >
                          <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                            {row.week}
                          </td>
                          {getColumns().map((col) => (
                            <td
                              key={col.key}
                              className={`px-6 py-4 ${getComparisonColor(
                                row[col.key],
                                averages[col.key],
                                col.key
                              )}`}
                            >
                              {row[col.key] !== undefined
                                ? row[col.key]
                                : "N/A"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

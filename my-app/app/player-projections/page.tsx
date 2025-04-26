"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Papa from "papaparse";
import supabase from "../supabaseClient";


// Import chart components from recharts
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function PlayerProjections() {
  const [playerName, setPlayerName] = useState("");
  const [position, setPosition] = useState("");
  const [projections, setProjections] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [playerLines, setPlayerLines] = useState({});
  const [selectedStat, setSelectedStat] = useState("rushing_yards"); // Default stat
  const [customValue, setCustomValue] = useState(null); // User-defined line value
  const [weeklyStats, setWeeklyStats] = useState([]); // Weekly stats for the player
  const [fetchTriggered, setFetchTriggered] = useState(false); // Tracks whether projections should be fetched
   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null); // Error state
  const [topPicks, setTopPicks] = useState([]);

    
  // Utility function to normalize strings
  const normalizeString = (str) =>
    str
      .toLowerCase()
      .replace(/[-.`'’]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  
  const normalizedPlayerName = normalizeString(playerName);

  const relevantStats = {
    QB: [
      { label: "Passing Attempts", key: "passing_attempts" },
      { label: "Completions", key: "completions" },
      { label: "Passing Yards", key: "passing_yards" },
      { label: "Passing TDs", key: "passing_tds" },
      { label: "Interceptions", key: "interceptions" },
      { label: "Rushing Attempts", key: "rushing_attempts" },
      { label: "Rushing Yards", key: "rushing_yards" },
      { label: "Rushing TDs", key: "rushing_tds" },
    ],
    RB: [
      { label: "Rushing Attempts", key: "rushing_attempts" },
      { label: "Rushing Yards", key: "rushing_yards" },
      { label: "Rushing TDs", key: "rushing_tds" },
      { label: "Targets", key: "targets" },
      { label: "Receptions", key: "receptions" },
      { label: "Receiving Yards", key: "receiving_yards" },
      { label: "Receiving TDs", key: "receiving_tds" },
    ],
    WR: [
      { label: "Targets", key: "targets" },
      { label: "Receptions", key: "receptions" },
      { label: "Receiving Yards", key: "receiving_yards" },
      { label: "Receiving TDs", key: "receiving_tds" },
      { label: "Rushing Attempts", key: "rushing_attempts" },
      { label: "Rushing Yards", key: "rushing_yards" },
      { label: "Rushing TDs", key: "rushing_tds" },
    ],
    TE: [
      { label: "Targets", key: "targets" },
      { label: "Receptions", key: "receptions" },
      { label: "Receiving Yards", key: "receiving_yards" },
      { label: "Receiving TDs", key: "receiving_tds" },
      { label: "Rushing Attempts", key: "rushing_attempts" },
      { label: "Rushing Yards", key: "rushing_yards" },
      { label: "Rushing TDs", key: "rushing_tds" },
    ],
  };
  
interface Player {
  id: number;
  player_name: string;
  position: string;
  normalized_name: string;
  opponent: string;
  stat_to_display: string;
  last_3_avg: number;
  season_avg: number;
  matchup_type: string;
  performance_type: string;
}

interface EnrichedPlayer extends Player {
  performance_gap: number;
}

useEffect(() => {
  const fetchTopPicks = async () => {
    const normalizeStringFrontend = (str: string) =>
      str
        .toLowerCase()
        .replace(/[-.`'’]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const { data, error } = await supabase.from("players_to_watch").select("*");

    if (error) {
      console.error("❌ Error fetching top picks:", error.message);
      return;
    }

    if (data) {
      console.log("✅ players_to_watch:", data);

      // Step 1: Compute performance gap
      const enrichedData = data.map((player) => ({
        ...player,
        performance_gap: Math.abs(
          (player.last_3_avg || 0) - (player.season_avg || 0)
        ),
      }));

      // Step 2: Group players by position
      const groupedByPosition: Record<string, EnrichedPlayer[]> = {};
  



      enrichedData.forEach((player) => {
        if (!groupedByPosition[player.position]) {
          groupedByPosition[player.position] = [];
        }
        groupedByPosition[player.position].push(player);
      });

      // Step 3: Sort within each position and pick top 2
      const topPlayers: EnrichedPlayer[] = [];
      ["QB", "RB", "WR", "TE"].forEach((position) => {
        const players = groupedByPosition[position] || [];
        const topTwo = players
          .sort((a, b) => b.performance_gap - a.performance_gap)
          .slice(0, 2);
        topPlayers.push(...topTwo);
      });

      console.log(
        "✅ Top players by position:",
        topPlayers.map((p) => p.player_name)
      );

      // Step 4: Fetch projections
      const projectionQuery = await supabase
        .from("player_projections")
        .select("normalized_name, opponent, stat_key, projection");

      if (projectionQuery.error) {
        console.error(
          "❌ Error fetching projections:",
          projectionQuery.error.message
        );
        return;
      }

      const projectionsMap: Record<string, Record<string, number>> = {};
      projectionQuery.data.forEach((row) => {
        const key = `${normalizeStringFrontend(
          row.normalized_name
        )}_${row.opponent.toLowerCase()}`;
        if (!projectionsMap[key]) {
          projectionsMap[key] = {};
        }
        projectionsMap[key][row.stat_key] = row.projection;
      });

      // Step 5: Map stat display label to database key
      const mapStatToProjection = (label: string) => {
        const mapping = {
          "Passing Attempts": "passing_attempts",
          Completions: "completions",
          "Passing Yards": "passing_yards",
          "Passing TDs": "passing_tds",
          Interceptions: "interceptions",
          "Rushing Attempts": "rushing_attempts",
          "Rushing Yards": "rushing_yards",
          "Rushing TDs": "rushing_tds",
          Targets: "targets",
          Receptions: "receptions",
          "Receiving Yards": "receiving_yards",
          "Receiving TDs": "receiving_tds",
        };
        return mapping[label.trim()] || label.toLowerCase();
      };

      // Step 6: Enrich players with projections
      const enriched = topPlayers.map((player) => {
        const statKey = mapStatToProjection(player.stat_to_display);
        const normName = normalizeStringFrontend(player.normalized_name);
        const opponent = player.opponent
          ? player.opponent.toLowerCase().trim()
          : "";

        const composedKey = `${normName}_${opponent}`;
        let playerProjections = projectionsMap[composedKey];

        if (!playerProjections) {
          console.warn(
            `❌ No projections found for ${normName} vs ${opponent}`
          );
          const fallbackKey = Object.keys(projectionsMap).find((k) =>
            k.startsWith(normName)
          );
          if (fallbackKey) {
            playerProjections = projectionsMap[fallbackKey];
          }
        }

        const projectionValue = playerProjections?.[statKey];

        return {
          ...player,
          projection: projectionValue ?? "N/A",
        };
      });

      console.log("✅ Final enriched top picks:", enriched);

      setTopPicks(enriched);
    }
  };

  fetchTopPicks();
}, []);


  useEffect(() => {
    if (fetchTriggered && playerName.trim()) {
      const fetchWeeklyStats = async () => {
        try {
          const normalizedName = normalizeString(playerName);

          const { data, error } = await supabase
            .from("player_stats")
            .select(
              "week, rushing_yards, receiving_yards, rushing_tds, receiving_tds, passing_yards, passing_attempts, completions, passing_tds, interceptions, rushing_attempts, receptions"
            )
            .eq("normalized_name", normalizedName);

          if (error) {
            console.error("Error fetching weekly stats:", error.message);
            setWeeklyStats([]);
            return;
          }

          if (data && data.length > 0) {
            setWeeklyStats(data.sort((a, b) => a.week - b.week));
          } else {
            setWeeklyStats([]);
          }
        } catch (err) {
          console.error("Error in fetchWeeklyStats:", err.message);
          setWeeklyStats([]);
        }
      };

      fetchWeeklyStats();
    }
  }, [fetchTriggered, playerName]);


  // Fetch player name suggestions
  const fetchSuggestions = async (query) => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    try {
      const { data: players, error } = await supabase
        .from("player_list") // Replace with your table name
        .select("player_name");

      if (error) {
        console.error("Error fetching player suggestions:", error.message);
        return;
      }

      if (players) {
        const normalizedQuery = normalizeString(query);
        const matchingPlayers = players.filter((player) =>
          normalizeString(player.player_name).includes(normalizedQuery)
        );

        setSuggestions(matchingPlayers.map((p) => p.player_name));
      }
    } catch (err) {
      console.error("Error fetching player suggestions:", err.message);
    }
  };

  // Fetch sportsbook data from PlayerProps.csv
  useEffect(() => {
    const fetchPlayerLines = async () => {
      try {
        const response = await fetch("/PlayerProps.csv");
        const csvText = await response.text();
  
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            const lines = {};
  
            result.data.forEach((row) => {
              const originalPlayerName = row.description;
              const normalizedPlayerName = normalizeString(originalPlayerName); // Normalize name
              const statKey = row.market.trim();
              const lineValue = row.point || "N/A";
  
              // Debugging output
              console.log(`Original: "${originalPlayerName}" -> Normalized: "${normalizedPlayerName}"`);
  
              // Store values in normalized structure
              if (!lines[normalizedPlayerName]) lines[normalizedPlayerName] = {};
              lines[normalizedPlayerName][statKey] = lineValue;
            });
  
            console.log("Parsed Lines with Normalized Keys:", Object.keys(lines));
            setPlayerLines(lines);
          },
        });
      } catch (error) {
        console.error("Error fetching player lines:", error.message);
      }
    };
  
    fetchPlayerLines();
  }, []);
  
  const fetchWeeklyStats = async () => {
    if (!playerName.trim()) {
      console.warn("Player name is not set or invalid.");
      return;
    }

    try {
      const normalizedName = normalizeString(playerName);

      console.log(
        "Fetching weekly stats for:",
        playerName,
        "Normalized:",
        normalizedName
      );

      const { data, error } = await supabase
        .from("player_stats") // Adjust this to your table name
        .select(
          "week, rushing_yards, receiving_yards, rushing_tds, receiving_tds, passing_yards, passing_attempts, completions, passing_tds, interceptions, rushing_attempts, receptions"
        )
        .eq("normalized_name", normalizedPlayerName);

      if (error) {
        console.error("Error fetching weekly stats:", error.message);
        setWeeklyStats([]);
        return;
      }

      if (data && data.length > 0) {
        console.log("Fetched weekly stats:", data);
        setWeeklyStats(data.sort((a, b) => a.week - b.week)); // Sort by week for proper chart rendering
      } else {
        console.warn("No stats found for player:", playerName);
        setWeeklyStats([]);
      }
    } catch (err) {
      console.error("Error in fetchWeeklyStats:", err.message);
      setWeeklyStats([]);
    }
  };

  // Debugging useEffect
  useEffect(() => {
    console.log("Weekly Stats:", weeklyStats);
    console.log("Selected Stat:", selectedStat);
  }, [weeklyStats, selectedStat]);

  const fetchProjections = async () => {
    setError(null); // Clear previous errors
    if (!playerName) {
      setError("Please provide a player name.");
      return;
    }

    try {
      const normalizedName = normalizeString(playerName);

      // Fetch player info to get position
      const { data: playerInfo, error: playerInfoError } = await supabase
        .from("player_stats")
        .select("position_id")
        .eq("normalized_name", normalizedName)
        .limit(1)
        .single();

      if (playerInfoError || !playerInfo) {
        console.error("Error fetching player info:", playerInfoError?.message);
        return;
      }

      setPosition(playerInfo.position_id); // Set player's position for stat mappings

      // ✅ Now fetch projections directly
      const { data: projectionRows, error: projectionError } = await supabase
        .from("player_projections")
        .select("stat_key, projection")
        .eq("normalized_name", normalizedName);

      if (projectionError) {
        console.error("Error fetching projections:", projectionError.message);
        return;
      }

      if (!projectionRows || projectionRows.length === 0) {
        console.warn("No projections found for:", playerName);
        return;
      }

      // Build projections object: { passing_yards: 275.5, rushing_yards: 20.2, etc. }
      const projection: Record<string, number> = {};

      projectionRows.forEach((row) => {
        if (row.stat_key && row.projection !== undefined) {
          projection[row.stat_key] = row.projection;
        }
      });

      console.log("✅ Projections loaded from database:", projection);

      setProjections(projection);
    } catch (error) {
      console.error("Error during fetchProjections:", error.message);
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    if (!playerName) {
      setError("Player name is required."); // Set error
      return;
    }
    setFetchTriggered(true); // Enable fetching and rendering
    fetchProjections();
    fetchWeeklyStats(); // Fetch weekly stats here
  };

  const getColor = (trend) => {
    const [num, total] = trend.split("/").map(Number);

    if (num === total) return "text-green-400 font-bold"; // Perfect match (e.g., 3/3, 5/5)
    if ((total === 3 && num >= 2) || (total === 5 && num >= 4)) {
      return "text-green-400 font-bold"; // Near-perfect (e.g., 2/3, 4/5)
    }
    if ((total === 3 && num === 1) || (total === 5 && num === 3)) {
      return "text-yellow-400 font-bold"; // Middle ground (e.g., 1/3, 3/5)
    }
    return "text-red-400 font-bold"; // Poor performance (e.g., 0/3, 0/5, 1/5, 2/5)
  };

  const calculateTrends = (statKey) => {
    const totalGames = weeklyStats.length;
    if (totalGames === 0) return { average: "N/A", last3: "N/A", last5: "N/A" };

    // Calculate average
    const average =
      weeklyStats.reduce((sum, game) => sum + (game[statKey] || 0), 0) /
      totalGames;

    // Get last 3 and last 5 games
    const last3Games = weeklyStats.slice(-3);
    const last5Games = weeklyStats.slice(-5);

    // Count games with values higher than the average
    const countAboveAverage = (games) =>
      games.filter((game) => (game[statKey] || 0) > average).length;

    const last3 = `${countAboveAverage(last3Games)}/${last3Games.length}`;
    const last5 = `${countAboveAverage(last5Games)}/${last5Games.length}`;

    return { average: average.toFixed(2), last3, last5 };
  };

  const mapStatToMarket = (label) => {
    const mapping = {
      "Passing Attempts": "player_pass_attempts",
      Completions: "player_pass_completions",
      "Passing Yards": "player_pass_yds",
      "Passing TDs": "player_pass_tds",
      Interceptions: "player_interceptions",
      "Rushing Attempts": "player_rush_attempts",
      "Rushing Yards": "player_rush_yds",
      "Rushing TDs": "player_rush_tds",
      Receptions: "player_receptions",
      "Receiving Yards": "player_reception_yds",
      "Receiving TDs": "player_receiving_tds",
    };
    return mapping[label.trim()] || label.toLowerCase();
  };

  const placeholderData = [
    { week: "Week 1", value: 0 },
    { week: "Week 2", value: 0 },
    { week: "Week 3", value: 0 },
    { week: "Week 4", value: 0 },
  ];

  const chartData =
    weeklyStats.length > 0
      ? weeklyStats.map((row) => ({
          week: `Week ${row.week}`,
          weeklyValue: row[selectedStat] || 0, // Weekly stat value
          playerLine:
            parseFloat(playerLines[normalizedPlayerName]?.[selectedStat]) ||
            null,
          customValue: customValue || null,
          playerProjection: projections[selectedStat]
            ? parseFloat(projections[selectedStat].toFixed(1)) // Round to 1 decimal
            : null,
        }))
      : placeholderData;

  return (
    <div className="flex-grow">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-center space-x-2">
          <BarChart3 className="w-8 h-8 text-blue-400" />
          <h1 className="text-4xl font-bold text-center text-blue-400">
            Player Projections
          </h1>
        </div>

        {/* Search Card */}
        <div className="flex justify-center">
          <Card className="bg-gray-800 border-blue-400 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-blue-400 flex items-center space-x-2">
                <BarChart3 className="w-6 h-6" />
                <span>Find Player</span>
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Player Name Input */}
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

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Generate Projection
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {!fetchTriggered && topPicks.length > 0 && (
          <div className="w-full">
            <Card className="bg-gray-800 border-blue-400 w-full shadow-lg px-6 py-4">
              <CardHeader>
                <CardTitle className="text-blue-400 text-xl font-bold">
                  🔥 Our Top Picks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:grid md:grid-cols-2 gap-y-4 gap-x-6">
                  {topPicks.map((player) => {
                    const isOver = player.last_3_avg > player.season_avg;
                    const perfColor = isOver
                      ? "text-green-400"
                      : "text-red-400";
                    const perfLabel = isOver ? "Over" : "Under";

                    const statKey = player.stat_to_display;

                    return (
                      <div
                        key={player.id}
                        className="bg-gray-900 rounded-lg p-4 hover:bg-gray-700 transition-all cursor-pointer"
                        onClick={() => setPlayerName(player.player_name)}
                      >
                        <div className="text-lg font-semibold text-gray-100">
                          {player.player_name}{" "}
                          <span className="text-sm text-gray-400">
                            ({player.position})
                          </span>
                        </div>

                        <div className="text-sm text-gray-300 mt-1">
                          <span className="font-medium text-blue-300">
                            {statKey}:
                          </span>{" "}
                          Last 3 Avg: {player.last_3_avg?.toFixed(1)} • Season
                          Avg: {player.season_avg?.toFixed(1)}
                        </div>

                        <div className="text-sm mt-1">
                          <span className={`${perfColor} font-semibold`}>
                            {perfLabel}
                          </span>{" "}
                          •{" "}
                          <span className="text-gray-300">
                            vs {player.opponent}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {fetchTriggered && (
          <div className="flex space-x-4">
            {/* Performance Trends */}
            <Card className="flex-1 bg-gradient-to-br from-gray-800 via-gray-900 to-black border border-blue-500 shadow-lg rounded-lg">
              <CardHeader>
                <CardTitle className="text-blue-400 text-2xl font-bold">
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-6 p-4">
                  {/* Header Row */}
                  <div className="text-blue-300 font-semibold text-left text-lg">
                    Stat
                  </div>
                  <div className="text-blue-300 font-semibold text-center text-lg">
                    Average
                  </div>
                  <div className="text-blue-300 font-semibold text-center text-lg">
                    Last 3
                  </div>
                  <div className="text-blue-300 font-semibold text-center text-lg">
                    Last 5
                  </div>

                  {/* Map each stat */}
                  {relevantStats[position]?.map((stat) => {
                    const { average, last3, last5 } = calculateTrends(stat.key);

                    return (
                      <>
                        {/* Stat Name */}
                        <div className="text-gray-200 text-left text-lg font-medium">
                          {stat.label}
                        </div>

                        {/* Average */}
                        <div className="text-white text-center text-lg font-medium">
                          {average}
                        </div>

                        {/* Last 3 */}
                        <div
                          className={`text-center text-lg font-medium ${getColor(
                            last3
                          )}`}
                        >
                          {last3}
                        </div>

                        {/* Last 5 */}
                        <div
                          className={`text-center text-lg font-medium ${getColor(
                            last5
                          )}`}
                        >
                          {last5}
                        </div>
                      </>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Line Comparison */}
            <Card className="flex-1 bg-gradient-to-bl from-gray-800 via-gray-900 to-black border border-blue-500 shadow-lg rounded-lg">
              <CardHeader>
                <CardTitle className="text-blue-400 text-2xl font-bold">
                  Line Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 p-4">
                  {/* Dropdown for selecting the stat */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">
                      Select Stat:
                    </label>
                    <select
                      className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                      value={selectedStat}
                      onChange={(e) => setSelectedStat(e.target.value)}
                    >
                      {relevantStats[position]?.map((stat) => (
                        <option key={stat.key} value={stat.key}>
                          {stat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Input for user-defined line */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">
                      Custom Line:
                    </label>
                    <input
                      type="number"
                      className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                      value={customValue ?? ""}
                      onChange={(e) =>
                        setCustomValue(Number(e.target.value) || 0)
                      }
                      placeholder="Enter a value"
                    />
                  </div>

                  {/* Line Chart */}
                  {chartData.length > 0 ? (
                    <LineChart
                      width={500}
                      height={300}
                      data={chartData}
                      className="mx-auto"
                      margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255, 255, 255, 0.2)"
                      />
                      <XAxis dataKey="week" stroke="#60A5FA" />
                      <YAxis stroke="#60A5FA" />
                      <Tooltip
                        labelStyle={{ color: "#4a4a4a", fontWeight: "bold" }}
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "none",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                      />
                      {/* Line for Weekly Values */}
                      <Line
                        type="monotone"
                        dataKey="weeklyValue"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        dot
                        name="Weekly Value"
                      />
                      {/* Line for Player Line */}
                      <Line
                        type="monotone"
                        dataKey="playerLine"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={false}
                        name="Player Line"
                      />
                      {/* Line for Custom Line */}
                      {customValue && (
                        <Line
                          type="monotone"
                          dataKey="customValue"
                          stroke="#ff7300"
                          strokeWidth={2}
                          dot={false}
                          name="Custom Line"
                        />
                      )}
                      {/* Line for Player Projection */}
                      <Line
                        type="monotone"
                        dataKey="playerProjection"
                        stroke="#f54242"
                        strokeWidth={2}
                        dot={false}
                        name="Player Projection"
                      />
                    </LineChart>
                  ) : (
                    <div className="text-center">
                      <p className="text-gray-400">
                        No weekly data available for this stat.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Projection Table */}
        {Object.keys(projections).length > 0 && position && (
          <Card className="bg-gradient-to-b from-gray-800 via-gray-900 to-black border border-blue-500 shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="text-blue-400 text-2xl font-bold">
                Projected Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-gray-100">
                <thead className="bg-gray-700 rounded-t-lg">
                  <tr>
                    <th className="text-left py-3 px-6 text-blue-300 font-semibold text-lg">
                      Stat
                    </th>
                    <th className="text-left py-3 px-6 text-blue-300 font-semibold text-lg">
                      Projection
                    </th>
                    <th className="text-left py-3 px-6 text-blue-300 font-semibold text-lg">
                      Player Line
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {relevantStats[position]?.map((stat) => {
                    const normalizedPlayerName = normalizeString(playerName);
                    const mappedStatKey = mapStatToMarket(stat.label);

                    let playerLine =
                      playerLines[normalizedPlayerName]?.[mappedStatKey] ||
                      "N/A";

                    if (
                      stat.label === "Receiving TDs" ||
                      stat.label === "Rushing TDs"
                    ) {
                      playerLine = "0.5";
                    } else if (stat.label === "Passing TDs") {
                      playerLine = "1.5";
                    } else if (stat.label === "Interceptions") {
                      playerLine = "0.5";
                    }

                    const playerLineValue = parseFloat(playerLine) || 0;
                    const projectedValue = projections[stat.key];

                    let projectionDisplay = "N/A";
                    if (projectedValue !== undefined) {
                      projectionDisplay = projectedValue.toFixed(2);
                    }

                    let projectionColor = "text-gray-100";
                    if (projectedValue !== undefined) {
                      const projectedFloat = projectedValue;
                      if (projectedFloat > playerLineValue + 1.5) {
                        projectionColor = "text-green-500 font-bold";
                      } else if (
                        Math.abs(projectedFloat - playerLineValue) <= 1.5
                      ) {
                        projectionColor = "text-yellow-400 font-bold";
                      } else if (projectedFloat < playerLineValue - 1.5) {
                        projectionColor = "text-red-500 font-bold";
                      }
                    }

                    return (
                      <tr
                        key={stat.key}
                        className="border-t border-gray-600 hover:bg-gray-700 transition-colors duration-150"
                      >
                        <td className="py-3 px-6 text-gray-200 text-lg font-medium">
                          {stat.label}
                        </td>
                        <td
                          className={`py-3 px-6 text-lg font-medium ${projectionColor}`}
                        >
                          {projectionDisplay}
                        </td>
                        <td className="py-3 px-6 text-red-500 text-lg font-medium">
                          {playerLine}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

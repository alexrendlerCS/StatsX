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
import {
  Target,
  Search,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react";
import supabase from "../supabaseClient";
import { useState } from "react";
import { useCurrentWeek } from "../../hooks/useCurrentWeek";

export default function MatchupAnalysis() {
  const [playerName, setPlayerName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Matchup data states
  const [matchupData, setMatchupData] = useState(null);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [upcomingWeekOpponent, setUpcomingWeekOpponent] = useState("");
  const [historicalMatchups, setHistoricalMatchups] = useState([]);
  const [recentPerformance, setRecentPerformance] = useState([]);
  const [selectedStat, setSelectedStat] = useState("fpts");
  const [selectedRecentStat, setSelectedRecentStat] = useState("fpts");

  const { currentWeek } = useCurrentWeek(); // Get current week from API

  // Get position-specific stats for dropdown
  const getPositionStats = (position) => {
    const baseStats = [{ value: "fpts", label: "Fantasy Points" }];

    if (position === "QB") {
      return [
        ...baseStats,
        { value: "passingYards", label: "Pass Yds" },
        { value: "passingTDs", label: "Pass TDs" },
        { value: "rushingYards", label: "Rush Yds" },
        { value: "rushingTDs", label: "Rush TDs" },
      ];
    } else if (position === "RB") {
      return [
        ...baseStats,
        { value: "rushingYards", label: "Rush Yds" },
        { value: "rushingTDs", label: "Rush TDs" },
        { value: "receivingYards", label: "Rec Yds" },
        { value: "receptions", label: "Receptions" },
      ];
    } else if (position === "WR" || position === "TE") {
      return [
        ...baseStats,
        { value: "receivingYards", label: "Rec Yds" },
        { value: "receptions", label: "Receptions" },
        { value: "receivingTDs", label: "Rec TDs" },
        { value: "targets", label: "Targets" },
      ];
    }

    return baseStats;
  };

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

  const getPlayerUpcomingWeekOpponent = async (teamId) => {
    try {
      // Get the schedule for upcoming week (current week + 1)
      const upcomingWeek = currentWeek + 1;
      const { data: schedule } = await supabase
        .from("team_schedule")
        .select("opponent_id")
        .eq("team_id", teamId)
        .eq("week", upcomingWeek);

      if (!schedule || schedule.length === 0) {
        throw new Error(`Schedule not found for week ${upcomingWeek}`);
      }

      return schedule[0].opponent_id;
    } catch (err) {
      console.error("Error getting opponent:", err.message);
      return null;
    }
  };

  const fetchMatchupData = async () => {
    if (!playerName.trim()) {
      setError("Please enter a player name");
      return;
    }

    setLoading(true);
    setError("");
    setSearchPerformed(true);

    try {
      // Get player info
      const { data: playerStats } = await supabase
        .from("player_stats")
        .select("player_name, position_id, team_id")
        .eq("player_name", playerName)
        .limit(1);

      if (!playerStats || playerStats.length === 0) {
        setError("Player not found");
        setLoading(false);
        return;
      }

      const player = playerStats[0];
      setPlayerInfo(player);

      // Get upcoming week opponent
      const opponent = await getPlayerUpcomingWeekOpponent(player.team_id);
      if (!opponent) {
        setError(`Could not find week ${currentWeek + 1} opponent`);
        setLoading(false);
        return;
      }

      // Clean opponent name (remove @ symbol)
      const cleanOpponent = opponent.replace("@", "");
      setUpcomingWeekOpponent(cleanOpponent);

      // Get historical matchups against this opponent (regardless of team)
      // Search for both home and away games (@CLE and CLE)
      const { data: historicalDataHome } = await supabase
        .from("nfl_historical_stats")
        .select("*")
        .eq("player_name", playerName)
        .eq("opponent", cleanOpponent)
        .eq("data_type", "weekly");

      const { data: historicalDataAway } = await supabase
        .from("nfl_historical_stats")
        .select("*")
        .eq("player_name", playerName)
        .eq("opponent", "@" + cleanOpponent)
        .eq("data_type", "weekly");

      // Combine and sort the results
      const allHistoricalData = (historicalDataHome || []).concat(
        historicalDataAway || []
      );
      const sortedData = allHistoricalData.sort((a, b) => {
        if (a.season !== b.season) return a.season - b.season;
        return a.week - b.week;
      });

      // Filter out games where player didn't play (all stats are 0)
      const filteredHistoricalData = sortedData.filter((game) => {
        // Check if all key stats are 0 (indicating player didn't play)
        const totalStats =
          (game.fpts || 0) +
          (game.passing_yards || 0) +
          (game.passing_tds || 0) +
          (game.rushing_yards || 0) +
          (game.rushing_tds || 0) +
          (game.receiving_yards || 0) +
          (game.receiving_tds || 0) +
          (game.total_touches || 0) +
          (game.targets || 0);

        // Only include games where the player actually played (total stats > 0)
        return totalStats > 0;
      });

      setHistoricalMatchups(filteredHistoricalData || []);

      // Get recent performance (last 4 weeks)
      const { data: recentData } = await supabase
        .from("player_stats")
        .select("*")
        .eq("player_name", playerName)
        .order("week", { ascending: false })
        .limit(4);

      setRecentPerformance(recentData || []);

      // Calculate matchup summary using filtered data
      if (filteredHistoricalData && filteredHistoricalData.length > 0) {
        const avgFpts =
          filteredHistoricalData.reduce(
            (sum, game) => sum + (game.fpts || 0),
            0
          ) / filteredHistoricalData.length;
        const avgRushingYards =
          filteredHistoricalData.reduce(
            (sum, game) => sum + (game.rushing_yards || 0),
            0
          ) / filteredHistoricalData.length;
        const avgReceivingYards =
          filteredHistoricalData.reduce(
            (sum, game) => sum + (game.receiving_yards || 0),
            0
          ) / filteredHistoricalData.length;
        const avgReceptions =
          filteredHistoricalData.reduce(
            (sum, game) => sum + (game.total_touches || 0),
            0
          ) / filteredHistoricalData.length;

        setMatchupData({
          gamesPlayed: filteredHistoricalData.length,
          avgFpts: avgFpts.toFixed(1),
          avgRushingYards: avgRushingYards.toFixed(1),
          avgReceivingYards: avgReceivingYards.toFixed(1),
          avgReceptions: avgReceptions.toFixed(1),
          bestGame: Math.max(
            ...filteredHistoricalData.map((game) => game.fpts || 0)
          ),
          worstGame: Math.min(
            ...filteredHistoricalData.map((game) => game.fpts || 0)
          ),
        });
      } else {
        // No historical matchup data available
        setMatchupData({
          gamesPlayed: 0,
          avgFpts: "No Data",
          avgRushingYards: "No Data",
          avgReceivingYards: "No Data",
          avgReceptions: "No Data",
          bestGame: "No Data",
          worstGame: "No Data",
        });
      }
    } catch (err) {
      console.error("Error fetching matchup data:", err.message);
      setError("Error fetching matchup data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = () => {
    if (!historicalMatchups.length || !playerInfo) {
      console.log("formatChartData: No data", {
        historicalMatchups: historicalMatchups.length,
        playerInfo,
      });
      return [];
    }

    console.log("formatChartData: Processing data", {
      historicalMatchups: historicalMatchups.length,
      playerInfo,
    });
    const chartData = historicalMatchups.map((game, index) => {
      const baseData = {
        game: `Game ${index + 1}`,
        fpts: game.fpts || 0,
        season: `${game.season} W${game.week}`,
      };

      // Add position-specific stats
      if (playerInfo.position_id === "QB") {
        return {
          ...baseData,
          passingYards: game.passing_yards || 0,
          passingTDs: game.passing_tds || 0,
          rushingYards: game.rushing_yards || 0,
          rushingTDs: game.rushing_tds || 0,
        };
      } else if (playerInfo.position_id === "RB") {
        return {
          ...baseData,
          rushingYards: game.rushing_yards || 0,
          rushingTDs: game.rushing_tds || 0,
          receivingYards: game.receiving_yards || 0,
          receptions: game.total_touches || 0,
        };
      } else if (
        playerInfo.position_id === "WR" ||
        playerInfo.position_id === "TE"
      ) {
        return {
          ...baseData,
          receivingYards: game.receiving_yards || 0,
          receptions: game.total_touches || 0,
          receivingTDs: game.receiving_tds || 0,
          targets: game.targets || 0,
        };
      }

      return baseData;
    });

    console.log("formatChartData: Final chart data", chartData);
    return chartData;
  };

  const formatRecentData = () => {
    if (!recentPerformance.length || !playerInfo) return [];

    return recentPerformance.map((game) => {
      const baseData = {
        week: `Week ${game.week}`,
        fpts: game.fpts || 0,
      };

      // Add position-specific stats using the same keys as getPositionStats
      if (playerInfo.position_id === "QB") {
        return {
          ...baseData,
          passingYards: game.passing_yards || 0,
          passingTDs: game.passing_tds || 0,
          rushingYards: game.rushing_yards || 0,
          rushingTDs: game.rushing_tds || 0,
        };
      } else if (playerInfo.position_id === "RB") {
        return {
          ...baseData,
          rushingYards: game.rushing_yards || 0,
          rushingTDs: game.rushing_tds || 0,
          receivingYards: game.receiving_yards || 0,
          receptions: game.total_touches || 0,
        };
      } else if (
        playerInfo.position_id === "WR" ||
        playerInfo.position_id === "TE"
      ) {
        return {
          ...baseData,
          receivingYards: game.receiving_yards || 0,
          receptions: game.total_touches || 0,
          receivingTDs: game.receiving_tds || 0,
          targets: game.targets || 0,
        };
      }

      return baseData;
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-blue-400 mb-2 flex items-center justify-center">
            <Target className="w-10 h-10 mr-3" />
            Matchup Analysis
          </h1>
          <p className="text-gray-400 text-lg">
            Analyze player performance against their Week {currentWeek + 1}{" "}
            opponent
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Historical data available: 2021-2025 seasons
          </p>
        </div>

        {/* Search Section */}
        <div className="flex justify-center mb-8">
          <Card className="w-full max-w-lg bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl text-blue-400 flex items-center">
                <Search className="w-6 h-6 mr-2" />
                Player Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="Enter player name..."
                    value={playerName}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                      fetchSuggestions(e.target.value);
                    }}
                    className="bg-gray-700 border-gray-600 text-gray-100"
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 left-0 right-0 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {suggestions.slice(0, 5).map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-gray-600 cursor-pointer text-gray-100"
                          onClick={() => {
                            setPlayerName(suggestion);
                            setSuggestions([]);
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  onClick={fetchMatchupData}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? "Analyzing..." : "Search"}
                </Button>
                {error && <p className="text-red-400 text-sm">{error}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {searchPerformed && playerInfo && (
          <div className="space-y-6">
            {/* Player Info Header */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl text-blue-400 flex items-center">
                  <Calendar className="w-6 h-6 mr-2" />
                  {playerName} vs {upcomingWeekOpponent} - Week{" "}
                  {currentWeek + 1}
                </CardTitle>
                <p className="text-gray-400">
                  {playerInfo.position_id} • {playerInfo.team_id}
                </p>
              </CardHeader>
            </Card>

            {/* Historical Performance and Quick Stats Container */}
            {matchupData && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl text-blue-400 flex items-center">
                    <TrendingUp className="w-6 h-6 mr-2" />
                    Historical Performance vs {upcomingWeekOpponent}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Historical Matchups Chart */}
                    <div className="flex-1">
                      {(() => {
                        console.log("Chart render check:", {
                          historicalMatchups: historicalMatchups.length,
                          playerInfo: !!playerInfo,
                          shouldRender:
                            historicalMatchups.length > 0 && playerInfo,
                        });
                        return historicalMatchups.length > 0 && playerInfo;
                      })() && (
                        <div className="h-96">
                          {(() => {
                            const data = formatChartData();
                            console.log(
                              "Chart component rendering with data:",
                              data
                            );
                            return (
                              <div>
                                <div className="h-96 bg-gray-800 rounded-lg p-6 border border-gray-700 flex items-center">
                                  <div className="w-fit">
                                    <LineChart
                                      width={650}
                                      height={360}
                                      data={data}
                                    >
                                      <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#374151"
                                      />
                                      <XAxis
                                        dataKey="season"
                                        stroke="#9CA3AF"
                                        fontSize={12}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                      />
                                      <YAxis
                                        stroke="#9CA3AF"
                                        fontSize={12}
                                        label={{
                                          value: "Fantasy Points",
                                          angle: -90,
                                          position: "insideLeft",
                                          style: {
                                            textAnchor: "middle",
                                            fill: "#9CA3AF",
                                          },
                                        }}
                                      />
                                      <Tooltip
                                        contentStyle={{
                                          backgroundColor: "#1F2937",
                                          border: "1px solid #374151",
                                          borderRadius: "8px",
                                          color: "#F9FAFB",
                                          boxShadow:
                                            "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                        }}
                                        formatter={(value) => [
                                          `${value}${
                                            selectedStat === "fpts"
                                              ? " FPts"
                                              : ""
                                          }`,
                                          getPositionStats(
                                            playerInfo?.position_id
                                          )?.find(
                                            (stat) =>
                                              stat.value === selectedStat
                                          )?.label || "Value",
                                        ]}
                                        labelFormatter={(label) =>
                                          `Week: ${label}`
                                        }
                                      />
                                      <Line
                                        type="monotone"
                                        dataKey={selectedStat}
                                        stroke="#3B82F6"
                                        strokeWidth={3}
                                        dot={{
                                          fill: "#3B82F6",
                                          strokeWidth: 2,
                                          r: 6,
                                        }}
                                        activeDot={{
                                          r: 8,
                                          stroke: "#3B82F6",
                                          strokeWidth: 2,
                                        }}
                                      />
                                    </LineChart>
                                  </div>
                                  <div className="ml-6 mr-8 flex flex-col justify-center items-center text-center w-48">
                                    <div className="mb-2">
                                      <select
                                        value={selectedStat}
                                        onChange={(e) =>
                                          setSelectedStat(e.target.value)
                                        }
                                        className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      >
                                        {playerInfo &&
                                          getPositionStats(
                                            playerInfo.position_id
                                          ).map((stat) => (
                                            <option
                                              key={stat.value}
                                              value={stat.value}
                                              className="bg-gray-700"
                                            >
                                              {stat.label}
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                    <h4 className="text-lg font-semibold text-blue-400 mb-3">
                                      {getPositionStats(
                                        playerInfo?.position_id
                                      )?.find(
                                        (stat) => stat.value === selectedStat
                                      )?.label || "Fantasy Points"}{" "}
                                      Over Time
                                    </h4>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                      {data.length} games vs{" "}
                                      {upcomingWeekOpponent} (2021-2025)
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Quick Stats Column */}
                    <div className="lg:w-80 flex flex-col gap-4">
                      <Card className="bg-gray-700 border-gray-600">
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">
                              {matchupData.gamesPlayed}
                            </div>
                            <div className="text-gray-400 text-sm">
                              Games vs {upcomingWeekOpponent}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gray-700 border-gray-600">
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div
                              className={`text-2xl font-bold ${
                                matchupData.avgFpts === "No Data"
                                  ? "text-gray-500"
                                  : "text-green-400"
                              }`}
                            >
                              {matchupData.avgFpts}
                            </div>
                            <div className="text-gray-400 text-sm">
                              Avg Fantasy Points
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gray-700 border-gray-600">
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div
                              className={`text-2xl font-bold ${
                                matchupData.bestGame === "No Data"
                                  ? "text-gray-500"
                                  : "text-yellow-400"
                              }`}
                            >
                              {matchupData.bestGame}
                            </div>
                            <div className="text-gray-400 text-sm">
                              Best Game (FPts)
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gray-700 border-gray-600">
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div
                              className={`text-2xl font-bold ${
                                matchupData.worstGame === "No Data"
                                  ? "text-gray-500"
                                  : "text-red-400"
                              }`}
                            >
                              {matchupData.worstGame}
                            </div>
                            <div className="text-gray-400 text-sm">
                              Worst Game (FPts)
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Performance */}
            {recentPerformance.length > 0 && playerInfo && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl text-blue-400 flex items-center">
                    <TrendingDown className="w-6 h-6 mr-2" />
                    Recent Performance (Last 4 Weeks)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <div className="h-96 bg-gray-800 rounded-lg p-6 border border-gray-700 flex items-center">
                      <div className="w-fit">
                        <LineChart
                          width={650}
                          height={360}
                          data={formatRecentData()}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#374151"
                          />
                          <XAxis
                            dataKey="week"
                            stroke="#9CA3AF"
                            fontSize={12}
                          />
                          <YAxis
                            stroke="#9CA3AF"
                            fontSize={12}
                            label={{
                              value:
                                getPositionStats(playerInfo?.position_id)?.find(
                                  (stat) => stat.value === selectedRecentStat
                                )?.label || "Fantasy Points",
                              angle: -90,
                              position: "insideLeft",
                              style: {
                                textAnchor: "middle",
                                fill: "#9CA3AF",
                              },
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1F2937",
                              border: "1px solid #374151",
                              borderRadius: "8px",
                              color: "#F9FAFB",
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            }}
                            formatter={(value) => [
                              `${value}${
                                selectedRecentStat === "fpts" ? " FPts" : ""
                              }`,
                              getPositionStats(playerInfo?.position_id)?.find(
                                (stat) => stat.value === selectedRecentStat
                              )?.label || "Value",
                            ]}
                            labelFormatter={(label) => `Week: ${label}`}
                          />
                          <Line
                            type="monotone"
                            dataKey={selectedRecentStat}
                            stroke="#3B82F6"
                            strokeWidth={3}
                            dot={{
                              fill: "#3B82F6",
                              strokeWidth: 2,
                              r: 6,
                            }}
                            activeDot={{
                              r: 8,
                              stroke: "#3B82F6",
                              strokeWidth: 2,
                            }}
                          />
                        </LineChart>
                      </div>
                      <div className="ml-6 mr-8 flex flex-col justify-center items-center text-center w-48">
                        <div className="mb-2">
                          <select
                            value={selectedRecentStat}
                            onChange={(e) =>
                              setSelectedRecentStat(e.target.value)
                            }
                            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {playerInfo &&
                              getPositionStats(playerInfo.position_id).map(
                                (stat) => (
                                  <option
                                    key={stat.value}
                                    value={stat.value}
                                    className="bg-gray-700"
                                  >
                                    {stat.label}
                                  </option>
                                )
                              )}
                          </select>
                        </div>
                        <h4 className="text-lg font-semibold text-blue-400 mb-3">
                          {getPositionStats(playerInfo?.position_id)?.find(
                            (stat) => stat.value === selectedRecentStat
                          )?.label || "Fantasy Points"}{" "}
                          Trend
                        </h4>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          Last 4 weeks performance
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Historical Matchups Table */}
            {historicalMatchups.length > 0 && playerInfo && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl text-blue-400">
                    Historical Matchup Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-2 text-gray-400">
                            Season
                          </th>
                          <th className="text-left py-2 text-gray-400">Week</th>
                          <th className="text-left py-2 text-gray-400">FPts</th>
                          {playerInfo.position_id === "QB" && (
                            <>
                              <th className="text-left py-2 text-gray-400">
                                Pass Yds
                              </th>
                              <th className="text-left py-2 text-gray-400">
                                Pass TDs
                              </th>
                              <th className="text-left py-2 text-gray-400">
                                Rush Yds
                              </th>
                              <th className="text-left py-2 text-gray-400">
                                Rush TDs
                              </th>
                            </>
                          )}
                          {playerInfo.position_id === "RB" && (
                            <>
                              <th className="text-left py-2 text-gray-400">
                                Rush Yds
                              </th>
                              <th className="text-left py-2 text-gray-400">
                                Rush TDs
                              </th>
                              <th className="text-left py-2 text-gray-400">
                                Rec Yds
                              </th>
                              <th className="text-left py-2 text-gray-400">
                                Receptions
                              </th>
                            </>
                          )}
                          {(playerInfo.position_id === "WR" ||
                            playerInfo.position_id === "TE") && (
                            <>
                              <th className="text-left py-2 text-gray-400">
                                Targets
                              </th>
                              <th className="text-left py-2 text-gray-400">
                                Receptions
                              </th>
                              <th className="text-left py-2 text-gray-400">
                                Rec Yds
                              </th>
                              <th className="text-left py-2 text-gray-400">
                                Rec TDs
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {historicalMatchups.map((game, index) => (
                          <tr key={index} className="border-b border-gray-700">
                            <td className="py-2 text-gray-300">
                              {game.season}
                            </td>
                            <td className="py-2 text-gray-300">{game.week}</td>
                            <td className="py-2 text-blue-400 font-semibold">
                              {game.fpts || 0}
                            </td>
                            {playerInfo.position_id === "QB" && (
                              <>
                                <td className="py-2 text-green-400">
                                  {game.passing_yards || 0}
                                </td>
                                <td className="py-2 text-yellow-400">
                                  {game.passing_tds || 0}
                                </td>
                                <td className="py-2 text-red-400">
                                  {game.rushing_yards || 0}
                                </td>
                                <td className="py-2 text-purple-400">
                                  {game.rushing_tds || 0}
                                </td>
                              </>
                            )}
                            {playerInfo.position_id === "RB" && (
                              <>
                                <td className="py-2 text-green-400">
                                  {game.rushing_yards || 0}
                                </td>
                                <td className="py-2 text-yellow-400">
                                  {game.rushing_tds || 0}
                                </td>
                                <td className="py-2 text-red-400">
                                  {game.receiving_yards || 0}
                                </td>
                                <td className="py-2 text-purple-400">
                                  {game.total_touches || 0}
                                </td>
                              </>
                            )}
                            {(playerInfo.position_id === "WR" ||
                              playerInfo.position_id === "TE") && (
                              <>
                                <td className="py-2 text-green-400">
                                  {game.targets || 0}
                                </td>
                                <td className="py-2 text-yellow-400">
                                  {game.total_touches || 0}
                                </td>
                                <td className="py-2 text-red-400">
                                  {game.receiving_yards || 0}
                                </td>
                                <td className="py-2 text-purple-400">
                                  {game.receiving_tds || 0}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Historical Data Message */}
            {historicalMatchups.length === 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center">
                  <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    No Historical Matchup Data
                  </h3>
                  <p className="text-gray-500 mb-4">
                    No previous games found between {playerName} and{" "}
                    {upcomingWeekOpponent} in our historical records
                    (2021-2025). This could be their first matchup in recent
                    seasons, or the data is not available.
                  </p>
                  <div className="bg-gray-700 rounded-lg p-4 text-left">
                    <h4 className="text-blue-400 font-semibold mb-2">
                      💡 Analysis Tips:
                    </h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>
                        • Check their recent performance (last 4 weeks) below
                      </li>
                      <li>
                        • Consider {upcomingWeekOpponent}&apos;s defensive stats
                      </li>
                      <li>• Look at {playerName}&apos;s season averages</li>
                      <li>• Review weather conditions and game script</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

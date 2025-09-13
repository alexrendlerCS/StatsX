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
  BarChart,
  Bar,
} from "recharts";
import {
  Target,
  Search,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react";
import supabase from "../supabaseClient";
import { useState, useEffect } from "react";

export default function MatchupAnalysis() {
  const [playerName, setPlayerName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Matchup data states
  const [matchupData, setMatchupData] = useState(null);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [currentWeekOpponent, setCurrentWeekOpponent] = useState("");
  const [historicalMatchups, setHistoricalMatchups] = useState([]);
  const [recentPerformance, setRecentPerformance] = useState([]);

  const currentWeek = 2; // Set to week 2 as requested

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

  const getPlayerWeek2Opponent = async (playerName) => {
    try {
      // First get the player's team
      const { data: playerStats } = await supabase
        .from("player_stats")
        .select("team_id")
        .eq("player_name", playerName)
        .limit(1);

      if (!playerStats || playerStats.length === 0) {
        throw new Error("Player not found");
      }

      const teamId = playerStats[0].team_id;

      // Get the schedule for week 2
      const { data: schedule } = await supabase
        .from("team_schedule")
        .select("opponent_id")
        .eq("team_id", teamId)
        .eq("week", currentWeek);

      if (!schedule || schedule.length === 0) {
        throw new Error("Schedule not found for week 2");
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

      // Get week 2 opponent
      const opponent = await getPlayerWeek2Opponent(playerName);
      if (!opponent) {
        setError("Could not find week 2 opponent");
        setLoading(false);
        return;
      }

      // Clean opponent name (remove @ symbol)
      const cleanOpponent = opponent.replace("@", "");
      setCurrentWeekOpponent(cleanOpponent);

      // Get historical matchups against this opponent
      const { data: historicalData } = await supabase
        .from("nfl_historical_stats")
        .select("*")
        .eq("player_name", playerName)
        .eq("opponent", cleanOpponent)
        .eq("data_type", "weekly")
        .order("season", { ascending: false })
        .order("week", { ascending: false });

      setHistoricalMatchups(historicalData || []);

      // Get recent performance (last 4 weeks)
      const { data: recentData } = await supabase
        .from("player_stats")
        .select("*")
        .eq("player_name", playerName)
        .order("week", { ascending: false })
        .limit(4);

      setRecentPerformance(recentData || []);

      // Calculate matchup summary
      if (historicalData && historicalData.length > 0) {
        const avgFpts =
          historicalData.reduce((sum, game) => sum + (game.fpts || 0), 0) /
          historicalData.length;
        const avgRushingYards =
          historicalData.reduce(
            (sum, game) => sum + (game.rushing_yards || 0),
            0
          ) / historicalData.length;
        const avgReceivingYards =
          historicalData.reduce(
            (sum, game) => sum + (game.receiving_yards || 0),
            0
          ) / historicalData.length;
        const avgReceptions =
          historicalData.reduce(
            (sum, game) => sum + (game.receptions || 0),
            0
          ) / historicalData.length;

        setMatchupData({
          gamesPlayed: historicalData.length,
          avgFpts: avgFpts.toFixed(1),
          avgRushingYards: avgRushingYards.toFixed(1),
          avgReceivingYards: avgReceivingYards.toFixed(1),
          avgReceptions: avgReceptions.toFixed(1),
          bestGame: Math.max(...historicalData.map((game) => game.fpts || 0)),
          worstGame: Math.min(...historicalData.map((game) => game.fpts || 0)),
        });
      } else {
        setMatchupData({
          gamesPlayed: 0,
          avgFpts: "N/A",
          avgRushingYards: "N/A",
          avgReceivingYards: "N/A",
          avgReceptions: "N/A",
          bestGame: "N/A",
          worstGame: "N/A",
        });
      }
    } catch (err) {
      console.error("Error fetching matchup data:", err.message);
      setError("Error fetching matchup data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getColumns = () => {
    if (!playerInfo) return [];

    if (playerInfo.position_id === "QB") {
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
    } else if (
      playerInfo.position_id === "WR" ||
      playerInfo.position_id === "TE"
    ) {
      return [
        { label: "Targets", key: "targets" },
        { label: "Receptions", key: "receptions" },
        { label: "Receiving Yards", key: "receiving_yards" },
        { label: "Receiving TDs", key: "receiving_tds" },
        { label: "Rushing Attempts", key: "rushing_attempts" },
        { label: "Rushing Yards", key: "rushing_yards" },
        { label: "Rushing TDs", key: "rushing_tds" },
      ];
    } else if (playerInfo.position_id === "RB") {
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

  const formatChartData = () => {
    if (!historicalMatchups.length) return [];

    return historicalMatchups.map((game, index) => ({
      game: `Game ${index + 1}`,
      fpts: game.fpts || 0,
      rushingYards: game.rushing_yards || 0,
      receivingYards: game.receiving_yards || 0,
      receptions: game.receptions || 0,
      season: `${game.season} W${game.week}`,
    }));
  };

  const formatRecentData = () => {
    if (!recentPerformance.length) return [];

    return recentPerformance.map((game) => ({
      week: `Week ${game.week}`,
      fpts: game.fpts || 0,
      rushingYards: game.rushing_yards || 0,
      receivingYards: game.receiving_yards || 0,
      receptions: game.receptions || 0,
    }));
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
            Analyze player performance against their Week {currentWeek} opponent
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
                  {playerName} vs {currentWeekOpponent} - Week {currentWeek}
                </CardTitle>
                <p className="text-gray-400">
                  {playerInfo.position_id} • {playerInfo.team_id}
                </p>
              </CardHeader>
            </Card>

            {/* Matchup Summary */}
            {matchupData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        {matchupData.gamesPlayed}
                      </div>
                      <div className="text-gray-400 text-sm">
                        Games vs {currentWeekOpponent}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {matchupData.avgFpts}
                      </div>
                      <div className="text-gray-400 text-sm">
                        Avg Fantasy Points
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">
                        {matchupData.bestGame}
                      </div>
                      <div className="text-gray-400 text-sm">
                        Best Game (FPts)
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">
                        {matchupData.worstGame}
                      </div>
                      <div className="text-gray-400 text-sm">
                        Worst Game (FPts)
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Historical Matchups Chart */}
            {historicalMatchups.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl text-blue-400 flex items-center">
                    <TrendingUp className="w-6 h-6 mr-2" />
                    Historical Performance vs {currentWeekOpponent}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <LineChart
                      width="100%"
                      height="100%"
                      data={formatChartData()}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="season" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1F2937",
                          border: "1px solid #374151",
                          borderRadius: "6px",
                          color: "#F9FAFB",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="fpts"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        name="Fantasy Points"
                      />
                      <Line
                        type="monotone"
                        dataKey="rushingYards"
                        stroke="#10B981"
                        strokeWidth={2}
                        name="Rushing Yards"
                      />
                      <Line
                        type="monotone"
                        dataKey="receivingYards"
                        stroke="#F59E0B"
                        strokeWidth={2}
                        name="Receiving Yards"
                      />
                    </LineChart>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Performance */}
            {recentPerformance.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl text-blue-400 flex items-center">
                    <TrendingDown className="w-6 h-6 mr-2" />
                    Recent Performance (Last 4 Weeks)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <BarChart
                      width="100%"
                      height="100%"
                      data={formatRecentData()}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="week" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1F2937",
                          border: "1px solid #374151",
                          borderRadius: "6px",
                          color: "#F9FAFB",
                        }}
                      />
                      <Bar
                        dataKey="fpts"
                        fill="#3B82F6"
                        name="Fantasy Points"
                      />
                      <Bar
                        dataKey="rushingYards"
                        fill="#10B981"
                        name="Rushing Yards"
                      />
                      <Bar
                        dataKey="receivingYards"
                        fill="#F59E0B"
                        name="Receiving Yards"
                      />
                    </BarChart>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Historical Matchups Table */}
            {historicalMatchups.length > 0 && (
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
                          <th className="text-left py-2 text-gray-400">
                            Rush Yds
                          </th>
                          <th className="text-left py-2 text-gray-400">
                            Rec Yds
                          </th>
                          <th className="text-left py-2 text-gray-400">
                            Receptions
                          </th>
                          <th className="text-left py-2 text-gray-400">
                            Rush TDs
                          </th>
                          <th className="text-left py-2 text-gray-400">
                            Rec TDs
                          </th>
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
                            <td className="py-2 text-green-400">
                              {game.rushing_yards || 0}
                            </td>
                            <td className="py-2 text-yellow-400">
                              {game.receiving_yards || 0}
                            </td>
                            <td className="py-2 text-gray-300">
                              {game.receptions || 0}
                            </td>
                            <td className="py-2 text-gray-300">
                              {game.rushing_tds || 0}
                            </td>
                            <td className="py-2 text-gray-300">
                              {game.receiving_tds || 0}
                            </td>
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
                  <p className="text-gray-500">
                    No previous games found between {playerName} and{" "}
                    {currentWeekOpponent}. This could be their first matchup or
                    the data is not available.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

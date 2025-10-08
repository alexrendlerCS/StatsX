"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { BarChart3, TrendingUp, Users, Shield, Send } from "lucide-react";
import { useState, useEffect } from "react";
import supabase from "./supabaseClient";
import { useCurrentWeek } from "../hooks/useCurrentWeek";

export default function Home() {
  const [feedback, setFeedback] = useState(""); // For feedback input
  const [email, setEmail] = useState(""); // For feedback email
  const [feedbackSuccess, setFeedbackSuccess] = useState(""); // For feedback success message
  const [feedbackError, setFeedbackError] = useState(""); // For feedback error message
  const [name, setName] = useState(""); // For user name
  const [playerName, setPlayerName] = useState(""); // For player name dropdown
  const [stat, setStat] = useState(""); // For stats dropdown
  const [reason, setReason] = useState(""); // For user comments input
  const [picksList, setPicksList] = useState([]); // Submitted picks
  const [value, setValue] = useState(""); // User-entered stat value
  const [picksSuccess, setPicksSuccess] = useState(""); // For picks success message
  const [picksError, setPicksError] = useState(""); // For picks error message
  const [overUnder, setOverUnder] = useState(""); // Over/Under selection
  const [suggestions, setSuggestions] = useState([]); // Player name suggestions

  const { currentWeek, loading: weekLoading } = useCurrentWeek(); // Get current week from API
  const [allPlayersToWatch, setAllPlayersToWatch] = useState([]);

  const [performanceFilter, setPerformanceFilter] = useState<
    "All" | "Overperforming" | "Underperforming"
  >("All");

  const [selectedPosition, setSelectedPosition] = useState<
    "QB" | "RB" | "WR" | "TE"
  >("QB");

  const [matchupRankings, setMatchupRankings] = useState({
    QB: { defenses: [], leagueAvg: 0 },
    RB: { defenses: [], leagueAvg: 0 },
    WR: { defenses: [], leagueAvg: 0 },
    TE: { defenses: [], leagueAvg: 0 },
  });
  const [playersToWatch, setPlayersToWatch] = useState([]);
  const [teamNames, setTeamNames] = useState({});
  // Fetch team names from the database
  const fetchTeamNames = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("team_id, team_name");
      if (error) throw error;

      // Map team_id to team_name for quick lookup
      const teamNameMap = data.reduce((acc, team) => {
        acc[team.team_id] = team.team_name;
        return acc;
      }, {});

      setTeamNames(teamNameMap);
    } catch (error) {
      console.error("Error fetching team names:", error.message);
    }
  };
  const [weeklyLeaders, setWeeklyLeaders] = useState({
    QB: [],
    RB: [],
    WR: [],
    TE: [],
  });

  useEffect(() => {
    // Don't fetch if currentWeek is not loaded yet
    if (weekLoading || !currentWeek) return;
    
    const fetchWeeklyLeaders = async () => {
      try {
        const { data, error } = await supabase
          .from("weekly_leaders")
          .select("week, player_name, position_id, stat_value, matchup, rank")
          .eq("week", currentWeek - 1);

        if (error) throw error;

        const grouped = {
          QB: [],
          RB: [],
          WR: [],
          TE: [],
        };

        // Create a map to deduplicate by player_name and position
        const seenPlayers = new Set();

        data.forEach((row) => {
          const playerKey = `${row.player_name}-${row.position_id}`;
          if (grouped[row.position_id] && !seenPlayers.has(playerKey)) {
            grouped[row.position_id].push(row);
            seenPlayers.add(playerKey);
          }
        });

        Object.keys(grouped).forEach((pos) => {
          grouped[pos] = grouped[pos].sort((a, b) => a.rank - b.rank);
        });

        setWeeklyLeaders(grouped);
      } catch (err) {
        console.error("Error fetching weekly leaders:", err.message);
      }
    };

    fetchWeeklyLeaders();
  }, [currentWeek, weekLoading]);

  const [hotPlayers, setHotPlayers] = useState([]);
  const [coldPlayers, setColdPlayers] = useState([]);

  const fetchHotAndColdPlayers = async () => {
    try {
      const [{ data: hot, error: hotError }, { data: cold, error: coldError }] =
        await Promise.all([
          supabase
            .from("hot_players")
            .select(
              "player_name, position, stat, recent_average, season_average, percentage_change"
            ),
          supabase
            .from("cold_players")
            .select(
              "player_name, position, stat, recent_average, season_average, percentage_change"
            ),
        ]);

      if (hotError) throw hotError;
      if (coldError) throw coldError;

      setHotPlayers(
        hot
          .sort((a, b) => b.percentage_change - a.percentage_change)
          .slice(0, 5)
      );
      setColdPlayers(
        cold
          .sort((a, b) => a.percentage_change - b.percentage_change)
          .slice(0, 5)
      );
    } catch (err) {
      console.error("Error fetching hot/cold players:", err.message);
    }
  };

  useEffect(() => {
    fetchHotAndColdPlayers();
  }, []);

  const fetchPlayersToWatch = async () => {
    try {
      const { data, error } = await supabase
        .from("players_to_watch")
        .select(
          "player_name, position, stat_to_display, last_3_avg, season_avg, opponent, matchup_type, performance_type"
        );

      if (error) throw error;

      console.log("Players to Watch Data:", data);
      setAllPlayersToWatch(data); // Store full list once
    } catch (error) {
      console.error("Error fetching players to watch:", error.message);
    }
  };

  // Run only once to fetch everything
  useEffect(() => {
    fetchTeamNames();
    fetchPlayersToWatch();
  }, []);

  // Filter the players based on performanceFilter
  useEffect(() => {
    if (!allPlayersToWatch || allPlayersToWatch.length === 0) return;

    const grouped = {
      QB: [],
      RB: [],
      WR: [],
      TE: [],
    };

    allPlayersToWatch.forEach((player) => {
      const posKey = player.position.toUpperCase();

      if (
        grouped[posKey] &&
        (performanceFilter === "All" ||
          player.performance_type === performanceFilter)
      ) {
        grouped[posKey].push(player);
      }
    });

    Object.keys(grouped).forEach((position) => {
      grouped[position] = grouped[position].sort(
        (a, b) => b.last_3_avg - a.last_3_avg
      );
    });

    setPlayersToWatch(Object.values(grouped).flat());
  }, [performanceFilter, allPlayersToWatch]);

  // Fetch Matchup Rankings from Supabase
  const fetchMatchupRankings = async () => {
    try {
      const { data, error } = await supabase
        .from("defensive_matchup_rankings")
        .select("position, team_id, avg_stat, yards_above_avg, rank")
        .order("rank", { ascending: true });

      if (error) {
        console.error("Error fetching matchup rankings:", error.message);
        return;
      }

      // Fetch league-wide averages for RB, WR, TE
      const { data: leagueAvgData, error: leagueAvgError } = await supabase
        .from("all_defense_averages")
        .select("position_id, avg_rushing_yards, avg_receiving_yards");

      if (leagueAvgError) {
        console.error(
          "Error fetching league-wide averages:",
          leagueAvgError.message
        );
        return;
      }

      // Fetch QB league-wide averages
      const { data: qbLeagueAvgData, error: qbLeagueAvgError } = await supabase
        .from("all_defense_averages_qb")
        .select("avg_passing_yards")
        .single();

      if (qbLeagueAvgError) {
        console.error(
          "Error fetching QB league-wide averages:",
          qbLeagueAvgError.message
        );
        return;
      }

      // Convert league-wide averages into a lookup
      const leagueAvgMap = leagueAvgData.reduce(
        (acc, stat) => {
          if (stat.position_id === "RB") acc["RB"] = stat.avg_rushing_yards;
          if (stat.position_id === "WR" || stat.position_id === "TE")
            acc[stat.position_id] = stat.avg_receiving_yards;
          return acc;
        },
        { QB: qbLeagueAvgData?.avg_passing_yards || 0, RB: 0, WR: 0, TE: 0 }
      );

      // Group rankings by position
      const formattedRankings = {
        QB: { defenses: [], leagueAvg: 0 },
        RB: { defenses: [], leagueAvg: 0 },
        WR: { defenses: [], leagueAvg: 0 },
        TE: { defenses: [], leagueAvg: 0 },
      };

      data.forEach((defense) => {
        if (formattedRankings[defense.position]) {
          formattedRankings[defense.position].defenses.push(defense);
        }
      });

      // Attach league-wide averages
      Object.keys(leagueAvgMap).forEach((position) => {
        formattedRankings[position].leagueAvg = leagueAvgMap[position] || 0;
      });

      setMatchupRankings(formattedRankings);
    } catch (error) {
      console.error("Error fetching matchup rankings:", error.message);
    }
  };

  useEffect(() => {
    fetchTeamNames();
    fetchMatchupRankings();
  }, []);

  const relevantStats = [
    "Rushing Attempts",
    "Rushing Yards",
    "Rushing TDs",
    "Receptions",
    "Receiving Yards",
    "Receiving TDs",
    "Passing Attempts",
    "Completions",
    "Passing Yards",
    "Passing TDs",
    "Interceptions",
  ];

  const normalizeString = (str) =>
    str
      .toLowerCase()
      .replace(/[-.`']/g, "")
      .trim();

  // Fetch player suggestions
  const fetchSuggestions = async (query) => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("player_list")
        .select("player_name");
      if (error) throw error;

      console.log("Supabase Data:", data); // Debugging

      const matchingPlayers = data.filter((player) =>
        normalizeString(player.player_name).includes(normalizeString(query))
      );

      console.log("Matching Players:", matchingPlayers); // Debugging

      setSuggestions(matchingPlayers.map((p) => p.player_name));
    } catch (err) {
      console.error("Error fetching player suggestions:", err.message);
    }
  };

  // Submit feedback to Supabase
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSuccess("");
    setFeedbackError("");

    // Validate feedback input
    if (!feedback.trim()) {
      setFeedbackError("Feedback cannot be empty.");
      return;
    }

    // Validate email if provided
    if (email.trim() && !email.includes("@")) {
      setFeedbackError("Please enter a valid email address.");
      return;
    }

    try {
      // Save feedback to Supabase
      const { error } = await supabase
        .from("feedback")
        .insert([{ content: feedback, email: email.trim() || null }]);

      if (error) {
        throw new Error(error.message);
      }

      setFeedbackSuccess("Thank you for your feedback!");
      setFeedback("");
      setEmail("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedbackError(err.message || "Failed to submit feedback.");
      } else {
        setFeedbackError("Failed to submit feedback due to an unknown error.");
      }
    }
  };

  const handleSubmitPick = async (e) => {
    e.preventDefault();
    setPicksSuccess("");
    setPicksError("");

    if (!name || !playerName || !stat || !value || !overUnder || !reason) {
      setPicksError("All fields are required.");
      return;
    }

    try {
      const { error } = await supabase.from("picks").insert([
        {
          name: name.trim(),
          player_name: playerName.trim(),
          stat: stat.trim(),
          value: parseFloat(value).toFixed(1),
          over_under: overUnder,
          reason: reason.trim(),
          created_at: new Date(),
        },
      ]);

      if (error) throw error;

      setPicksSuccess("Your pick has been submitted successfully!");
      setName("");
      setPlayerName("");
      setStat("");
      setValue("");
      setOverUnder("");
      setReason("");
      fetchPicks();
    } catch (err) {
      setPicksError(`Failed to submit pick: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchPicks();
  }, []);

  // Fetch submitted picks
  const fetchPicks = async () => {
    try {
      const { data, error } = await supabase
        .from("picks")
        .select(
          "id, name, player_name, stat, value, over_under, reason, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPicksList(data);
    } catch (err) {
      console.error("Error fetching picks:", err.message);
    }
  };
  return (
    <div className="space-y-12">
      <section className="text-center space-y-4">
        <h1 className="text-5xl font-bold text-blue-400">Welcome to StatsX</h1>
        <p className="text-xl text-gray-300">
          Your ultimate NFL statistics analysis platform
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gray-800 border-blue-400 hover:border-blue-300 transition-colors">
          <CardHeader className="flex flex-row items-center space-x-2">
            <Shield className="w-8 h-8 text-blue-400" />
            <CardTitle className="text-blue-400">Defense Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Dive deep into team defensive strategies and performance metrics.
            </p>
            <Link href="/defense-analysis">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Explore Defense Stats
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-blue-400 hover:border-blue-300 transition-colors">
          <CardHeader className="flex flex-row items-center space-x-2">
            <Users className="w-8 h-8 text-blue-400" />
            <CardTitle className="text-blue-400">Player Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Access comprehensive player statistics and performance insights.
            </p>
            <Link href="/player-stats">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Check Player Stats
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-blue-400 hover:border-blue-300 transition-colors">
          <CardHeader className="flex flex-row items-center space-x-2">
            <TrendingUp className="w-8 h-8 text-blue-400" />
            <CardTitle className="text-blue-400">Player Projections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Get data-driven predictions on player performance and potential.
            </p>
            <Link href="/player-projections">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                See Projections
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-center text-blue-400">
          Latest NFL Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gray-800 border-blue-400">
            <CardHeader>
              <CardTitle className="text-blue-400 text-center">
                Leaders for Week {currentWeek ? currentWeek - 1 : 1}
              </CardTitle>
              {/* Position Tabs */}
              <div className="flex justify-center space-x-1 mt-4">
                {(["QB", "RB", "WR", "TE"] as const).map((position) => (
                  <button
                    key={position}
                    onClick={() => setSelectedPosition(position)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      selectedPosition === position
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {position}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(() => {
                  const topPlayers = weeklyLeaders[selectedPosition] || [];
                  return (
                    <div className="space-y-2">
                      {/* Position Title */}
                      <h3 className="text-lg font-bold text-gray-200 text-center border-b border-gray-600 pb-1">
                        {selectedPosition} Leaders
                      </h3>
                      {topPlayers.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-gray-400 border-b border-gray-600">
                                <th className="text-left py-2 px-2">Rank</th>
                                <th className="text-left py-2 px-2">Player</th>
                                <th className="text-right py-2 px-2">
                                  {selectedPosition === "QB"
                                    ? "Pass Yards"
                                    : selectedPosition === "RB"
                                    ? "Rush Yards"
                                    : "Rec Yards"}
                                </th>
                                <th className="text-left py-2 px-2">Matchup</th>
                              </tr>
                            </thead>
                            <tbody>
                              {topPlayers.slice(0, 5).map((player, index) => (
                                <tr
                                  key={index}
                                  className={`border-b transition-colors ${
                                    index === 0
                                      ? "bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border-yellow-500/50 hover:from-yellow-900/40 hover:to-yellow-800/30"
                                      : "border-gray-700 hover:bg-gray-700"
                                  }`}
                                >
                                  <td className="py-2 px-2">
                                    <span
                                      className={`inline-flex items-center justify-center rounded-full font-bold ${
                                        index === 0
                                          ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-black w-8 h-8 text-sm shadow-lg ring-2 ring-yellow-300"
                                          : index === 1
                                          ? "bg-gray-300 text-black w-6 h-6 text-xs"
                                          : index === 2
                                          ? "bg-orange-500 text-white w-6 h-6 text-xs"
                                          : "bg-gray-600 text-white w-6 h-6 text-xs"
                                      }`}
                                    >
                                      {index === 0 ? "👑" : index + 1}
                                    </span>
                                  </td>
                                  <td
                                    className={`py-2 px-2 font-medium ${
                                      index === 0
                                        ? "text-yellow-200 text-lg font-bold"
                                        : "text-white"
                                    }`}
                                  >
                                    {player.player_name}
                                  </td>
                                  <td
                                    className={`py-2 px-2 text-right font-bold ${
                                      index === 0
                                        ? "text-yellow-300 text-lg"
                                        : "text-blue-400"
                                    }`}
                                  >
                                    {player.stat_value.toLocaleString()}
                                  </td>
                                  <td
                                    className={`py-2 px-2 text-sm ${
                                      index === 0
                                        ? "text-yellow-100"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {player.matchup}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-400 text-center py-4">
                          No data available for {selectedPosition}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-blue-400 shadow-lg">
            <CardHeader>
              <CardTitle className="text-blue-400 text-center">
                Best Defensive Matchups
              </CardTitle>
              {/* Position Tabs */}
              <div className="flex justify-center space-x-1 mt-4">
                {(["QB", "RB", "WR", "TE"] as const).map((position) => (
                  <button
                    key={position}
                    onClick={() => setSelectedPosition(position)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      selectedPosition === position
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {position}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-2">
                {(() => {
                  const topDefenses =
                    matchupRankings?.[selectedPosition]?.defenses.slice(0, 5) ||
                    [];
                  const leagueAvg =
                    matchupRankings?.[selectedPosition]?.leagueAvg || 0;

                  return (
                    <div className="space-y-2">
                      {/* Position Title */}
                      <h3 className="text-lg font-bold text-gray-200 text-center border-b border-gray-600 pb-1">
                        {selectedPosition} Matchups
                      </h3>

                      {topDefenses.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-gray-400 border-b border-gray-600">
                                <th className="text-left py-2 px-2">Rank</th>
                                <th className="text-left py-2 px-2">Team</th>
                                <th className="text-right py-2 px-2">
                                  Avg Allowed
                                </th>
                                <th className="text-right py-2 px-2">
                                  vs League Avg
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {topDefenses.map((defense, index) => (
                                <tr
                                  key={index}
                                  className={`border-b transition-colors ${
                                    index === 0
                                      ? "bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border-yellow-500/50 hover:from-yellow-900/40 hover:to-yellow-800/30"
                                      : "border-gray-700 hover:bg-gray-700"
                                  }`}
                                >
                                  <td className="py-2 px-2">
                                    <span
                                      className={`inline-flex items-center justify-center rounded-full font-bold ${
                                        index === 0
                                          ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-black w-8 h-8 text-sm shadow-lg ring-2 ring-yellow-300"
                                          : index === 1
                                          ? "bg-gray-300 text-black w-6 h-6 text-xs"
                                          : index === 2
                                          ? "bg-orange-500 text-white w-6 h-6 text-xs"
                                          : "bg-gray-600 text-white w-6 h-6 text-xs"
                                      }`}
                                    >
                                      {index === 0 ? "👑" : index + 1}
                                    </span>
                                  </td>
                                  <td
                                    className={`py-2 px-2 font-medium ${
                                      index === 0
                                        ? "text-yellow-200 text-lg font-bold"
                                        : "text-white"
                                    }`}
                                  >
                                    {teamNames[defense.team_id] ||
                                      defense.team_id}
                                  </td>
                                  <td
                                    className={`py-2 px-2 text-right font-bold ${
                                      index === 0
                                        ? "text-yellow-300 text-lg"
                                        : "text-green-400"
                                    }`}
                                  >
                                    {parseFloat(defense.avg_stat).toFixed(1)}
                                  </td>
                                  <td className="py-2 px-2 text-right">
                                    <span
                                      className={`font-medium ${
                                        index === 0 ? "text-base" : "text-sm"
                                      } ${
                                        parseFloat(defense.yards_above_avg) >=
                                        10
                                          ? index === 0
                                            ? "text-yellow-200"
                                            : "text-green-400"
                                          : parseFloat(
                                              defense.yards_above_avg
                                            ) <= -10
                                          ? index === 0
                                            ? "text-yellow-200"
                                            : "text-red-400"
                                          : index === 0
                                          ? "text-yellow-200"
                                          : "text-yellow-400"
                                      }`}
                                    >
                                      {parseFloat(defense.yards_above_avg) >= 0
                                        ? "+"
                                        : ""}
                                      {parseFloat(
                                        defense.yards_above_avg
                                      ).toFixed(1)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-400 text-center py-4">
                          No data available for {selectedPosition}
                        </p>
                      )}

                      {/* League-Wide Average */}
                      <div className="text-gray-400 text-xs text-center mt-2 bg-gray-700 rounded px-2 py-1">
                        League Avg:{" "}
                        <span className="text-green-400 font-bold">
                          {leagueAvg.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-blue-400">
            <CardHeader>
              <CardTitle className="text-blue-400 text-center">
                Recent Trends: Hot 🔥 & Cold ❄️
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* Hot Players */}
                <div>
                  <h3 className="text-green-400 text-lg font-bold mb-4 text-center">
                    🔥 Whos Hot
                  </h3>
                  <ul className="space-y-4">
                    {hotPlayers.length > 0 ? (
                      hotPlayers.map((player, index) => (
                        <li
                          key={index}
                          className="bg-gray-700 rounded-lg p-4 shadow-lg hover:bg-gray-600 transition"
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <span className="text-xl font-bold text-blue-500">
                              {player.player_name} ({player.position})
                            </span>
                            <div className="text-center text-gray-300">
                              <p>
                                <span className="font-bold">Season Avg:</span>{" "}
                                <span className="text-green-400 font-bold">
                                  {player.season_average.toFixed(1)}
                                </span>
                              </p>
                              <p>
                                <span className="font-bold">Last 3 Avg:</span>{" "}
                                <span className="text-green-400 font-bold">
                                  {player.recent_average.toFixed(1)}
                                </span>
                              </p>
                              <p>
                                <span className="text-green-400 font-bold">
                                  +{player.percentage_change.toFixed(1)}%
                                </span>{" "}
                                in {player.stat}
                              </p>
                            </div>
                            <div className="bg-green-500 text-white text-sm px-3 py-1 rounded-full">
                              {player.recent_average.toFixed(1)} {player.stat}
                            </div>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-400 text-center">
                        No hot players this week
                      </li>
                    )}
                  </ul>
                </div>

                {/* Cold Players */}
                <div>
                  <h3 className="text-red-400 text-lg font-bold mb-4 text-center">
                    ❄️ Whos Not
                  </h3>
                  <ul className="space-y-4">
                    {coldPlayers.length > 0 ? (
                      coldPlayers.map((player, index) => (
                        <li
                          key={index}
                          className="bg-gray-700 rounded-lg p-4 shadow-lg hover:bg-gray-600 transition"
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <span className="text-xl font-bold text-blue-500">
                              {player.player_name} ({player.position})
                            </span>
                            <div className="text-center text-gray-300">
                              <p>
                                <span className="font-bold">Season Avg:</span>{" "}
                                <span className="text-red-400 font-bold">
                                  {player.season_average.toFixed(1)}
                                </span>
                              </p>
                              <p>
                                <span className="font-bold">Last 3 Avg:</span>{" "}
                                <span className="text-red-400 font-bold">
                                  {player.recent_average.toFixed(1)}
                                </span>
                              </p>
                              <p>
                                <span className="text-red-400 font-bold">
                                  {player.percentage_change.toFixed(1)}%
                                </span>{" "}
                                in {player.stat}
                              </p>
                            </div>
                            <div className="bg-red-500 text-white text-sm px-3 py-1 rounded-full">
                              {player.recent_average.toFixed(1)} {player.stat}
                            </div>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-400 text-center">
                        No cold players this week
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-blue-400 flex flex-col h-[1100px]">
            <CardHeader>
              <CardTitle className="text-blue-400 text-center mb-4">
                Players to Watch
              </CardTitle>
              <div className="flex justify-center space-x-2">
                {["All", "Overperforming", "Underperforming"].map((filter) => (
                  <Button
                    key={filter}
                    variant={
                      performanceFilter === filter ? "default" : "outline"
                    }
                    className={`px-3 py-1 text-sm ${
                      performanceFilter === filter
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                    onClick={() =>
                      setPerformanceFilter(
                        filter as "All" | "Overperforming" | "Underperforming"
                      )
                    }
                  >
                    {filter}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 px-2 custom-scrollbar">
              <ul className="space-y-4 pr-2">
                {playersToWatch.map((player, index) => (
                  <li
                    key={index}
                    className="bg-gray-800 p-4 rounded-lg shadow-md flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-xl font-bold text-blue-400">
                        {player.player_name[0]}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-blue-400">
                          {player.player_name}
                        </p>
                        <p className="text-sm text-gray-400">
                          {player.position}
                        </p>
                        <p className="text-sm text-gray-300">
                          Opponent: {player.opponent}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-300">
                        <span className="font-bold text-green-400">
                          Last 3 Avg:
                        </span>{" "}
                        <span className="font-semibold text-white">
                          {player.last_3_avg.toFixed(1)}
                        </span>{" "}
                        {player.stat_to_display}
                      </p>
                      <p className="text-sm text-gray-300">
                        <span className="font-bold text-yellow-400">
                          Season Avg:
                        </span>{" "}
                        <span className="font-semibold text-white">
                          {player.season_avg.toFixed(1)}
                        </span>{" "}
                        {player.stat_to_display}
                      </p>
                      <p
                        className={`inline-block px-2 py-1 text-sm font-bold rounded-full text-white ${
                          player.matchup_type.includes("Great Matchup")
                            ? "bg-green-800"
                            : player.matchup_type.includes("Good Matchup")
                            ? "bg-green-600"
                            : "bg-red-500"
                        }`}
                      >
                        {player.matchup_type}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
      {/* Share Picks Section */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-center text-blue-400">
          Share Your Picks
        </h2>
        <Card className="bg-gray-800 border-blue-400">
          <CardContent className="p-6 space-y-4">
            <form onSubmit={handleSubmitPick} className="space-y-4">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="bg-gray-700 text-gray-100 border-gray-600"
              />
              <div className="relative">
                <Input
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    fetchSuggestions(e.target.value);
                  }}
                  placeholder="Player Name"
                  className="bg-gray-700 text-gray-100 border-gray-600"
                />
                {suggestions.length > 0 && (
                  <ul className="absolute z-10 bg-gray-700 w-full mt-1 rounded-lg shadow-lg">
                    {suggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        onClick={() => {
                          setPlayerName(suggestion);
                          setSuggestions([]); // Clear suggestions
                        }}
                        className="px-4 py-2 text-gray-100 cursor-pointer hover:bg-gray-600"
                      >
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <select
                value={stat}
                onChange={(e) => setStat(e.target.value)}
                className="w-full bg-gray-700 text-gray-100 border-gray-600 rounded-lg px-4 py-2"
              >
                <option value="" disabled>
                  Select Stat
                </option>
                {relevantStats.map((statOption, index) => (
                  <option key={index} value={statOption}>
                    {statOption}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                step="0.1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter stat value"
                className="bg-gray-700 text-gray-100 border-gray-600"
              />
              <select
                value={overUnder}
                onChange={(e) => setOverUnder(e.target.value)}
                className="w-full bg-gray-700 text-gray-100 border-gray-600 rounded-lg px-4 py-2"
              >
                <option value="" disabled>
                  Select Over/Under
                </option>
                <option value="Over">Over</option>
                <option value="Under">Under</option>
              </select>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why do you like this pick?"
                className="w-full bg-gray-700 text-gray-100 border-gray-600"
              />
              <Button type="submit" className="w-full bg-green-600">
                Share Pick
              </Button>
            </form>
            {picksSuccess && <p className="text-green-400">{picksSuccess}</p>}
            {picksError && <p className="text-red-400">{picksError}</p>}
          </CardContent>
        </Card>
      </section>

      {/* Submitted Picks Section */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-center text-blue-400">
          User Picks
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {picksList.length > 0 ? (
            picksList.map((item) => (
              <Card
                key={item.id}
                className="bg-gray-800 border-gray-700 hover:border-blue-400 transition shadow-md"
              >
                <CardHeader className="pb-2">
                  {/* Player Name - Blue and Prominent */}
                  <p className="text-2xl font-bold text-blue-400">
                    {item.player_name}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2 relative">
                  {/* Over/Under with Value and Stat */}
                  <p className="text-2xl font-semibold">
                    <span
                      className={
                        item.over_under === "Over"
                          ? "text-green-400 font-bold"
                          : "text-red-400 font-bold"
                      }
                    >
                      {item.over_under}
                    </span>{" "}
                    <span className="text-white">
                      {item.value} {item.stat}
                    </span>
                  </p>
                  {/* Reason */}
                  <p className="text-gray-400 italic mt-2">{item.reason}</p>
                  {/* User Name at Bottom Right */}
                  <p className="text-white absolute bottom-2 right-4">
                    - {item.name}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-gray-400 text-center">No picks shared yet.</p>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-center text-blue-400">
          Featured Analysis
        </h2>
        <Card className="bg-gray-800 border-blue-400">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-blue-400">
                  Alternate Lines
                </h3>
                <p className="text-gray-300">
                  Our latest addition allows you to compare players season long
                  performance to an alternate line that you can choose. You can
                  select your desired stat from the dropdown and compare it to
                  an alt lines of your choosing to see how the player compares.
                  Check out the graph in the player projections to test this
                  out.
                </p>
              </div>
              <div className="flex items-center justify-center bg-gray-700 rounded-lg">
                <BarChart3 className="w-32 h-32 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Feedback Form */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-center text-blue-400">
          Help Us Improve
        </h2>
        <Card className="bg-gray-800 border-blue-400">
          <CardContent className="p-6">
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div>
                <label
                  htmlFor="feedback"
                  className="block text-sm font-medium text-gray-400 mb-1"
                >
                  Your Feedback
                </label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your suggestions or report issues..."
                  className="w-full bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-400 mb-1"
                >
                  Your Email (optional)
                </label>
                <Input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Submit Feedback
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </form>

            {feedbackSuccess && (
              <p className="text-green-400 mt-4">{feedbackSuccess}</p>
            )}
            {feedbackError && (
              <p className="text-red-400 mt-4">{feedbackError}</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

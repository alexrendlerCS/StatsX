"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { BarChart3, TrendingUp, Users, Shield, Send } from "lucide-react";
import { useState, useEffect } from "react";
import supabase from "./supabaseClient";

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
  const [weeklyLeaders, setWeeklyLeaders] = useState({});
  const [hotPlayers, setHotPlayers] = useState([]);
  const [coldPlayers, setColdPlayers] = useState([]);
  const [matchupRankings, setMatchupRankings] = useState({
    QB: { defenses: [] },
    RB: { defenses: [] },
    WR: { defenses: [] },
    TE: { defenses: [] },
  });

  const fetchMatchupRankings = async () => {
    try {
      const rankings = {
        QB: { defenses: [], leagueAvg: 0 },
        RB: { defenses: [], leagueAvg: 0 },
        WR: { defenses: [], leagueAvg: 0 },
        TE: { defenses: [], leagueAvg: 0 },
      };
  
      // Fetch League-Wide Average for QB
      const { data: leagueAvgQB, error: leagueAvgQBError } = await supabase
        .from("all_defense_averages_qb")
        .select("avg_passing_yards");
      if (leagueAvgQBError) throw leagueAvgQBError;
      rankings.QB.leagueAvg = leagueAvgQB[0]?.avg_passing_yards || 0;
  
      // Fetch Top 3 Teams for QB Passing Yards
      const { data: qbData, error: qbError } = await supabase
        .from("defense_averages_qb")
        .select("team_id, avg_passing_yards")
        .order("avg_passing_yards", { ascending: false })
        .limit(3);
      if (qbError) throw qbError;
      rankings.QB.defenses = qbData.map((item) => ({
        team_id: item.team_id,
        avg_stat: parseFloat(item.avg_passing_yards).toFixed(1),
        yards_above_avg: (
          parseFloat(item.avg_passing_yards) - rankings.QB.leagueAvg
        ).toFixed(1),
      }));
  
      // Fetch League-Wide Average for RB
      const { data: leagueAvgRB, error: leagueAvgRBError } = await supabase
        .from("all_defense_averages")
        .select("avg_rushing_yards");
      if (leagueAvgRBError) throw leagueAvgRBError;
      rankings.RB.leagueAvg = leagueAvgRB[0]?.avg_rushing_yards || 0;
  
      // Fetch Top 3 Teams for RB Rushing Yards
      const { data: rbData, error: rbError } = await supabase
        .from("defense_averages")
        .select("team_id, avg_rushing_yards")
        .order("avg_rushing_yards", { ascending: false })
        .limit(3);
      if (rbError) throw rbError;
      rankings.RB.defenses = rbData.map((item) => ({
        team_id: item.team_id,
        avg_stat: parseFloat(item.avg_rushing_yards).toFixed(1),
        yards_above_avg: (
          parseFloat(item.avg_rushing_yards) - rankings.RB.leagueAvg
        ).toFixed(1),
      }));
  
      // Fetch League-Wide Average for WR
      const { data: leagueAvgWR, error: leagueAvgWRError } = await supabase
        .from("all_defense_averages")
        .select("avg_receiving_yards")
        .eq("position_id", "WR");
      if (leagueAvgWRError) throw leagueAvgWRError;
      rankings.WR.leagueAvg = leagueAvgWR[0]?.avg_receiving_yards || 0;
  
      // Fetch Top 3 Teams for WR Receiving Yards
      const { data: wrData, error: wrError } = await supabase
        .from("defense_averages")
        .select("team_id, avg_receiving_yards")
        .eq("position_id", "WR")
        .order("avg_receiving_yards", { ascending: false })
        .limit(3);
      if (wrError) throw wrError;
      rankings.WR.defenses = wrData.map((item) => ({
        team_id: item.team_id,
        avg_stat: parseFloat(item.avg_receiving_yards).toFixed(1),
        yards_above_avg: (
          parseFloat(item.avg_receiving_yards) - rankings.WR.leagueAvg
        ).toFixed(1),
      }));
  
      // Fetch League-Wide Average for TE
      const { data: leagueAvgTE, error: leagueAvgTEError } = await supabase
        .from("all_defense_averages")
        .select("avg_receiving_yards")
        .eq("position_id", "TE");
      if (leagueAvgTEError) throw leagueAvgTEError;
      rankings.TE.leagueAvg = leagueAvgTE[0]?.avg_receiving_yards || 0;
  
      // Fetch Top 3 Teams for TE Receiving Yards
      const { data: teData, error: teError } = await supabase
        .from("defense_averages")
        .select("team_id, avg_receiving_yards")
        .eq("position_id", "TE")
        .order("avg_receiving_yards", { ascending: false })
        .limit(3);
      if (teError) throw teError;
      rankings.TE.defenses = teData.map((item) => ({
        team_id: item.team_id,
        avg_stat: parseFloat(item.avg_receiving_yards).toFixed(1),
        yards_above_avg: (
          parseFloat(item.avg_receiving_yards) - rankings.TE.leagueAvg
        ).toFixed(1),
      }));
  
      // Update state
      setMatchupRankings(rankings);
    } catch (error) {
      console.error("Error fetching matchup rankings:", error.message);
    }
  };
  
  useEffect(() => {
    fetchMatchupRankings();
  }, []);

  useEffect(() => {
    console.log("Updated Matchup Rankings State:", matchupRankings);
  }, [matchupRankings]);

  const teamColors = {
    BAL: "rgb(26, 25, 95)", // Baltimore Ravens
    CIN: "rgb(251, 79, 20)", // Cincinnati Bengals
    CLE: "rgb(49, 29, 0)", // Cleveland Browns
    PIT: "rgb(255, 182, 18)", // Pittsburgh Steelers
    BUF: "rgb(0, 51, 141)", // Buffalo Bills
    MIA: "rgb(0, 142, 151)", // Miami Dolphins
    NE: "rgb(0, 34, 68)", // New England Patriots
    NYJ: "rgb(18, 87, 64)", // New York Jets
    HOU: "rgb(3, 32, 47)", // Houston Texans
    IND: "rgb(0, 44, 95)", // Indianapolis Colts
    JAC: "rgb(16, 24, 32)", // Jacksonville Jaguars
    TEN: "rgb(12, 35, 64)", // Tennessee Titans
    DEN: "rgb(251, 79, 20)", // Denver Broncos
    KC: "rgb(227, 24, 55)", // Kansas City Chiefs
    LV: "rgb(0, 0, 0)", // Las Vegas Raiders
    LAC: "rgb(0, 128, 198)", // Los Angeles Chargers
    CHI: "rgb(11, 22, 42)", // Chicago Bears
    DET: "rgb(0, 118, 182)", // Detroit Lions
    GB: "rgb(24, 48, 40)", // Green Bay Packers
    MIN: "rgb(79, 38, 131)", // Minnesota Vikings
    DAL: "rgb(0, 53, 148)", // Dallas Cowboys
    NYG: "rgb(1, 35, 82)", // New York Giants
    PHI: "rgb(0, 76, 84)", // Philadelphia Eagles
    WAS: "rgb(90, 20, 20)", // Washington Commanders
    ATL: "rgb(167, 25, 48)", // Atlanta Falcons
    CAR: "rgb(0, 133, 202)", // Carolina Panthers
    NO: "rgb(211, 188, 141)", // New Orleans Saints
    TB: "rgb(213, 10, 10)", // Tampa Bay Buccaneers
    ARI: "rgb(151, 35, 63)", // Arizona Cardinals
    LAR: "rgb(0, 53, 148)", // Los Angeles Rams
    SF: "rgb(170, 0, 0)", // San Francisco 49ers
    SEA: "rgb(0, 34, 68)", // Seattle Seahawks
  };
  

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

  useEffect(() => {
    fetchHotAndColdPlayers();
  }, []);

  const fetchHotAndColdPlayers = async () => {
    try {
      const { data: recentStats, error: recentError } = await supabase
        .from("recent_player_stats")
        .select(
          "player_name, position_id, passing_yards, rushing_yards, receiving_yards, games_played"
        );

      const { data: playerAverages, error: avgError } = await supabase
        .from("player_averages")
        .select(
          "player_name, position_id, avg_passing_yards, avg_rushing_yards, avg_receiving_yards, games_played"
        );

      if (recentError) throw recentError;
      if (avgError) throw avgError;

      console.log("Recent Stats:", recentStats);
      console.log("Player Averages:", playerAverages);

      const playersWithComparison = recentStats
        .map((recent) => {
          const average = playerAverages.find(
            (avg) =>
              avg.player_name === recent.player_name &&
              avg.position_id === recent.position_id
          );

          if (!average) return null;

          const calculatePercentageChange = (recentValue, avgValue) => {
            if (avgValue === 0) return 0; // Avoid division by zero
            return ((recentValue - avgValue) / avgValue) * 100;
          };

          // Calculate percentage changes for each stat
          const passingChange = calculatePercentageChange(
            recent.passing_yards || 0,
            average.avg_passing_yards || 0
          );
          const rushingChange = calculatePercentageChange(
            recent.rushing_yards || 0,
            average.avg_rushing_yards || 0
          );
          const receivingChange = calculatePercentageChange(
            recent.receiving_yards || 0,
            average.avg_receiving_yards || 0
          );

          // Determine the stat with the largest absolute percentage change
          const statChanges = [
            { stat: "Passing Yds", change: passingChange },
            { stat: "Rushing Yds", change: rushingChange },
            { stat: "Receiving Yds", change: receivingChange },
          ];

          const relevantStat = statChanges.reduce((prev, curr) =>
            Math.abs(curr.change) > Math.abs(prev.change) ? curr : prev
          );

          // Assign the statValue and ensure it is not null or undefined
          const statValue =
            relevantStat.stat === "Passing Yds"
              ? recent.passing_yards
              : relevantStat.stat === "Rushing Yds"
              ? recent.rushing_yards
              : recent.receiving_yards;

          // Exclude players with statValue below 15
          if (statValue < 15) return null;

          return {
            player_name: recent.player_name,
            position: recent.position_id,
            stat: relevantStat.stat,
            percentage_change: relevantStat.change,
            statValue: statValue || 0, // Default to 0 if null or undefined
            games_played: recent.games_played || 0,
          };
        })
        .filter(Boolean);

      console.log("Players With Comparison:", playersWithComparison);

      // Filter Hot Players
      const hot = playersWithComparison.filter((p) => p.percentage_change > 0);

      // Filter Cold Players
      const cold = playersWithComparison.filter((p) => p.percentage_change < 0);

      // Sort Hot and Cold Players
      const sortedHot = hot.sort(
        (a, b) => b.percentage_change - a.percentage_change
      ); // Sort by largest positive change
      const sortedCold = cold.sort(
        (a, b) => a.percentage_change - b.percentage_change
      ); // Sort by largest negative change

      console.log("Hot Players:", sortedHot);
      console.log("Cold Players:", sortedCold);

      setHotPlayers(sortedHot.slice(0, 5)); // Top 5 hot players
      setColdPlayers(sortedCold.slice(0, 5)); // Top 5 cold players
    } catch (err) {
      console.error("Error fetching hot and cold players:", err.message);
    }
  };

  useEffect(() => {
    fetchWeeklyLeaders();
  }, []);

  const fetchWeeklyLeaders = async () => {
    const WEEK = 15; // Current Week

    try {
      const { data: stats, error } = await supabase
        .from("player_stats")
        .select(
          "player_name, position_id, passing_yards, rushing_yards, receiving_yards, matchup, week"
        )
        .eq("week", WEEK); // Fetch for Week 15 only

      if (error) throw error;

      const leaders = getTopThreePlayers(stats);
      setWeeklyLeaders(leaders);
    } catch (err) {
      console.error("Error fetching weekly leaders:", err.message);
    }
  };

  const getTopThreePlayers = (stats) => {
    const positions = {
      QB: { metric: "passing_yards", players: [] },
      RB: { metric: "rushing_yards", players: [] },
      WR: { metric: "receiving_yards", players: [] },
      TE: { metric: "receiving_yards", players: [] },
    };

    stats.forEach((player) => {
      const position = positions[player.position_id];
      if (position) {
        const statValue = player[position.metric] || 0;
        position.players.push({
          ...player,
          statValue,
          matchup: player.matchup || "Unknown", // Include matchup value
        });
      }
    });

    // Sort each position's players by stat value and keep top 3
    Object.keys(positions).forEach((key) => {
      positions[key].players.sort((a, b) => b.statValue - a.statValue);
      positions[key].players = positions[key].players.slice(0, 3);
    });

    return positions;
  };

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
              <CardTitle className="text-blue-400">
                Leaders for Week 15
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {["QB", "RB", "WR", "TE"].map((position) => {
                  const topPlayers = weeklyLeaders[position]?.players || [];
                  return (
                    <div key={position} className="space-y-2">
                      {/* Position Title */}
                      <h3 className="text-lg font-bold text-gray-300 text-center">
                        {position}
                      </h3>
                      {topPlayers.length > 0 ? (
                        <div className="flex flex-col items-center">
                          {topPlayers.map((player, index) => (
                            <div
                              key={index}
                              className={`text-center ${
                                index === 0
                                  ? "text-xl font-bold text-blue-400"
                                  : index === 1
                                  ? "text-lg font-semibold text-blue-300"
                                  : "text-md font-medium text-blue-200"
                              }`}
                            >
                              {/* Player Name and Stat */}
                              <div>
                                {index + 1}. {player.player_name} -{" "}
                                {player.statValue.toLocaleString()}{" "}
                                {position === "QB"
                                  ? "Passing Yds"
                                  : position === "RB"
                                  ? "Rushing Yds"
                                  : "Receiving Yds"}
                              </div>
                              {/* Matchup */}
                              <div className="text-sm text-gray-400 italic">
                                Matchup: {player.matchup}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-center">
                          No data available
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
            w
          </Card>
          <Card className="bg-gray-800 border-blue-400">
            <CardHeader>
              <CardTitle className="text-blue-400 text-center">
                Weekly Trends: Hot 🔥 & Cold ❄️
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
                            <span className="text-xl font-bold text-green-400">
                              {player.player_name} ({player.position})
                            </span>
                            <div className="text-center">
                              <span className="text-gray-300">
                                <span className="text-green-400 font-bold">
                                  +{player.percentage_change.toFixed(1)}%
                                </span>{" "}
                                increase in {player.stat}
                              </span>
                            </div>
                            <div className="bg-green-500 text-white text-sm px-3 py-1 rounded-full">
                              {player.statValue
                                ? player.statValue.toLocaleString()
                                : "N/A"}{" "}
                              {player.stat}
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
                            <span className="text-xl font-bold text-red-400">
                              {player.player_name} ({player.position})
                            </span>
                            <span className="text-gray-300">
                              <span className="text-red-400 font-bold">
                                {player.percentage_change.toFixed(1)}%
                              </span>{" "}
                              decrease in {player.stat}
                            </span>
                            <div className="bg-red-500 text-white text-sm px-3 py-1 rounded-full">
                              {player.statValue
                                ? player.statValue.toLocaleString()
                                : "N/A"}{" "}
                              {player.stat}
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
          <Card className="bg-gray-800 border-blue-400 shadow-lg">
  <CardHeader>
    <CardTitle className="text-blue-400 text-center text-2xl">
      Best Defensive Matchups
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-6">
      {["QB", "RB", "WR", "TE"].map((position) => {
        const topDefenses = matchupRankings?.[position]?.defenses || [];
        const leagueAvg = matchupRankings?.[position]?.leagueAvg || 0;

        // Determine the stat description based on the position
        const statDescription =
          position === "QB"
            ? "Average Passing Yards"
            : position === "RB"
            ? "Average Rushing Yards"
            : "Average Receiving Yards";

        return (
          <div key={position} className="space-y-4">
            <h3 className="text-lg font-bold text-gray-300 text-center">
              {position}
            </h3>
            {topDefenses.length > 0 ? (
              <div className="space-y-2">
                {topDefenses.map((defense, index) => (
                  <div key={index} className="text-center">
                    <div className="text-gray-100 font-bold text-lg">
                      {index + 1}.{" "}
                      <span
                        style={{
                          color: teamColors[defense.team_id],
                          textShadow: "0px 0px 3px rgba(0, 0, 0, 0.8), 1px 1px 0px rgba(0, 0, 0, 0.9)", // Adds contrast
                          padding: "2px 4px",
                          borderRadius: "4px", // Rounded corners
                          backgroundColor: "rgba(146, 146, 146, 0.9)", // Slightly darker background
                        }}
                        className="font-bold"
                      >
                        {defense.team_id}
                      </span>{" "}
                      -{" "}
                      <span className="text-gray-300">
                        {statDescription}:{" "}
                        <span className="text-green-400">{defense.avg_stat}</span>
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      (+{defense.yards_above_avg} over league average)
                    </div>
                  </div>
                ))}
                <div className="text-gray-400 text-sm text-center mt-4">
                  League-Wide Average:{" "}
                  <span className="text-green-400">{leagueAvg.toFixed(1)}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-center">
                No data available for {position}
              </p>
            )}
          </div>
        );
      })}
    </div>
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

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

  const fetchPlayersToWatch = async () => {
    try {
      const WEEK = 16;
  
      const abbreviationMap = {
        JAX: "JAC",
      };
  
      const [
        recentStats,
        playerAverages,
        teamSchedules,
        qbDefenseAverages,
        otherDefenseAverages,
        qbLeagueAvg,
        leagueWideAverages,
      ] = await Promise.all([
        supabase.from("recent_player_stats").select("player_name, position_id, team_id, passing_yards, rushing_yards, receiving_yards, week"),
        supabase.from("player_averages").select("player_name, avg_passing_yards, avg_rushing_yards, avg_receiving_yards"),
        supabase.from("team_schedule").select("team_id, opponent_id, week").eq("week", WEEK),
        supabase.from("defense_averages_qb").select("team_id, avg_passing_yards"),
        supabase.from("defense_averages").select("team_id, avg_rushing_yards, avg_receiving_yards"),
        supabase.from("all_defense_averages_qb").select("avg_passing_yards"),
        supabase.from("all_defense_averages").select("avg_rushing_yards, avg_receiving_yards"),
      ]);
  
      const leagueAvg = {
        avg_passing_yards: qbLeagueAvg.data[0]?.avg_passing_yards || 0,
        avg_rushing_yards: leagueWideAverages.data[0]?.avg_rushing_yards || 0,
        avg_receiving_yards: leagueWideAverages.data[0]?.avg_receiving_yards || 0,
      };
  
      const defenseMap = {};
      qbDefenseAverages.data.forEach((team) => {
        defenseMap[team.team_id] = {
          passing: team.avg_passing_yards || 0,
        };
      });
      otherDefenseAverages.data.forEach((team) => {
        if (!defenseMap[team.team_id]) {
          defenseMap[team.team_id] = {};
        }
        defenseMap[team.team_id].rushing = team.avg_rushing_yards || 0;
        defenseMap[team.team_id].receiving = team.avg_receiving_yards || 0;
      });
  
      const recentStatsGrouped = recentStats.data.reduce((acc, stat) => {
        if (!acc[stat.player_name]) {
          acc[stat.player_name] = {
            player_name: stat.player_name,
            position_id: stat.position_id,
            team_id: stat.team_id,
            passing_yards: [],
            rushing_yards: [],
            receiving_yards: [],
          };
        }
        acc[stat.player_name].passing_yards.push(stat.passing_yards || 0);
        if (stat.position_id !== "WR") {
          acc[stat.player_name].rushing_yards.push(stat.rushing_yards || 0);
        }
        acc[stat.player_name].receiving_yards.push(stat.receiving_yards || 0);
        return acc;
      }, {});
  
      const playersWithAverages = Object.values(recentStatsGrouped as Record<string, PlayerStats>).map((player) => ({
        player_name: player.player_name,
        position_id: player.position_id,
        team_id: player.team_id,
        avg_passing_yards:
          player.passing_yards.reduce((sum: number, val: number) => sum + val, 0) /
          player.passing_yards.length,
        avg_rushing_yards:
          player.rushing_yards.reduce((sum: number, val: number) => sum + val, 0) /
          player.rushing_yards.length,
        avg_receiving_yards:
          player.receiving_yards.reduce((sum: number, val: number) => sum + val, 0) /
          player.receiving_yards.length,
      }));      
      
  
      const hotPlayers = playersWithAverages.map((player) => {
        const matchup = teamSchedules.data.find((schedule) => schedule.team_id === player.team_id);
        if (!matchup) return null;
  
        let opponentId = matchup.opponent_id.replace("@", "");
        opponentId = abbreviationMap[opponentId] || opponentId;
  
        const opponentDefense = defenseMap[opponentId];
  
        let statToDisplay = "";
        let last3Avg = 0;
        let seasonAvg = 0;
        let matchupType = "Bad Matchup";
  
        if (player.avg_passing_yards > 0) {
          statToDisplay = "Passing Yards";
          last3Avg = player.avg_passing_yards;
          seasonAvg =
            playerAverages.data.find((p) => p.player_name === player.player_name)
              ?.avg_passing_yards || 0;
  
          const defenseStat = opponentDefense?.passing || 0;
          const matchupScore = defenseStat - leagueAvg.avg_passing_yards;
  
          if (matchupScore > 20) {
            matchupType = "Great Matchup";
          } else if (matchupScore > 0) {
            matchupType = "Good Matchup";
          }
        } else if (player.avg_rushing_yards > 0) {
          statToDisplay = "Rushing Yards";
          last3Avg = player.avg_rushing_yards;
          seasonAvg =
            playerAverages.data.find((p) => p.player_name === player.player_name)
              ?.avg_rushing_yards || 0;
  
          const defenseStat = opponentDefense?.rushing || 0;
          const matchupScore = defenseStat - leagueAvg.avg_rushing_yards;
  
          if (matchupScore > 20) {
            matchupType = "Great Matchup";
          } else if (matchupScore > 0) {
            matchupType = "Good Matchup";
          }
        } else if (player.avg_receiving_yards > 0) {
          statToDisplay = "Receiving Yards";
          last3Avg = player.avg_receiving_yards;
          seasonAvg =
            playerAverages.data.find((p) => p.player_name === player.player_name)
              ?.avg_receiving_yards || 0;
  
          const defenseStat = opponentDefense?.receiving || 0;
          const matchupScore = defenseStat - leagueAvg.avg_receiving_yards;
  
          if (matchupScore > 20) {
            matchupType = "Great Matchup";
          } else if (matchupScore > 0) {
            matchupType = "Good Matchup";
          }
        }
  
        return {
          player_name: player.player_name,
          position: player.position_id,
          statToDisplay,
          last_3_avg: last3Avg,
          season_avg: seasonAvg,
          matchupType,
          opponent: opponentId,
        };
      });
  
      const playersByPosition = ["QB", "RB", "WR", "TE"].reduce((acc, position) => {
        acc[position] = hotPlayers
          .filter(
            (player) =>
              player &&
              player.position === position &&
              player.last_3_avg > player.season_avg &&
              (player.matchupType === "Good Matchup" || player.matchupType === "Great Matchup")
          )
          .sort((a, b) => b.last_3_avg - a.last_3_avg)
          .slice(0, 2); // Top 2 players per position
        return acc;
      }, {});
  
      const rankedPlayers = Object.values(playersByPosition).flat();
  
      setPlayersToWatch(rankedPlayers);
    } catch (error) {
      console.error("Error fetching players to watch:", error.message);
    }
  };
  
  useEffect(() => {
    fetchTeamNames();
    fetchPlayersToWatch();
  }, []);

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
    fetchTeamNames();
    fetchMatchupRankings();
  }, []);

  useEffect(() => {
    console.log("Updated Matchup Rankings State:", matchupRankings);
  }, [matchupRankings]);

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

  type PlayerStats = {
    player_name: string;
    position_id: string;
    team_id: string;
    passing_yards: number[];
    rushing_yards: number[];
    receiving_yards: number[];
    week_count: number; // Add this field
  };
  
  const fetchHotAndColdPlayers = async () => {
    try {
      // Fetch stats for the last 3 weeks
      const { data: recentStats, error: recentError } = await supabase
        .from("recent_player_stats")
        .select(
          "player_name, position_id, team_id, passing_yards, rushing_yards, receiving_yards, week"
        );

      // Fetch season averages for comparison
      const { data: playerAverages, error: avgError } = await supabase
        .from("player_averages")
        .select(
          "player_name, position_id, avg_passing_yards, avg_rushing_yards, avg_receiving_yards"
        );

      if (recentError) throw recentError;
      if (avgError) throw avgError;
      
      
      const recentStatsGrouped: Record<string, PlayerStats> = recentStats.reduce((acc, stat) => {
        if (!acc[stat.player_name]) {
          acc[stat.player_name] = {
            player_name: stat.player_name,
            position_id: stat.position_id,
            team_id: stat.team_id || "Unknown", // Add team_id with a default value
            passing_yards: [],
            rushing_yards: [],
            receiving_yards: [],
            week_count: 0, // Track the number of games
          };
        }
        acc[stat.player_name].passing_yards.push(stat.passing_yards || 0);
        acc[stat.player_name].rushing_yards.push(stat.rushing_yards || 0);
        acc[stat.player_name].receiving_yards.push(stat.receiving_yards || 0);
        acc[stat.player_name].week_count += 1; // Increment game count
        return acc;
      }, {} as Record<string, PlayerStats>);
      
      

      // Filter out players with fewer than 3 games
      const validPlayers = Object.values(recentStatsGrouped).filter(
        (player) => player.week_count === 3
      );

      // Calculate averages for the last 3 weeks
      const recentAverages = validPlayers.map((player) => ({
        player_name: player.player_name,
        position_id: player.position_id,
        avg_passing_yards:
          player.passing_yards.reduce((sum, val) => sum + val, 0) /
          player.passing_yards.length,
        avg_rushing_yards:
          player.rushing_yards.reduce((sum, val) => sum + val, 0) /
          player.rushing_yards.length,
        avg_receiving_yards:
          player.receiving_yards.reduce((sum, val) => sum + val, 0) /
          player.receiving_yards.length,
      }));

      // Compare with season averages
      const playersWithComparison = recentAverages
        .map((recent) => {
          const average = playerAverages.find(
            (avg) =>
              avg.player_name === recent.player_name &&
              avg.position_id === recent.position_id
          );

          if (!average) return null;

          // Apply minimum season average thresholds
          const meetsThreshold =
            (average.avg_passing_yards || 0) >= 100 ||
            (average.avg_rushing_yards || 0) >= 15 ||
            (average.avg_receiving_yards || 0) >= 20;

          if (!meetsThreshold) return null;

          const calculatePercentageChange = (recentValue, avgValue) => {
            if (avgValue === 0) return 0; // Avoid division by zero
            return ((recentValue - avgValue) / avgValue) * 100;
          };

          // Calculate percentage changes for each stat
          const passingChange = calculatePercentageChange(
            recent.avg_passing_yards || 0,
            average.avg_passing_yards || 0
          );
          const rushingChange = calculatePercentageChange(
            recent.avg_rushing_yards || 0,
            average.avg_rushing_yards || 0
          );
          const receivingChange = calculatePercentageChange(
            recent.avg_receiving_yards || 0,
            average.avg_receiving_yards || 0
          );

          const statChanges = [
            { stat: "Passing Yds", change: passingChange },
            { stat: "Rushing Yds", change: rushingChange },
            { stat: "Receiving Yds", change: receivingChange },
          ];

          const relevantStat = statChanges.reduce((prev, curr) =>
            Math.abs(curr.change) > Math.abs(prev.change) ? curr : prev
          );

          const statValue =
            relevantStat.stat === "Passing Yds"
              ? recent.avg_passing_yards
              : relevantStat.stat === "Rushing Yds"
              ? recent.avg_rushing_yards
              : recent.avg_receiving_yards;

          if (statValue < 15) return null;

          return {
            player_name: recent.player_name,
            position: recent.position_id,
            stat: relevantStat.stat,
            percentage_change: relevantStat.change,
            statValue: statValue || 0,
            season_average:
              relevantStat.stat === "Passing Yds"
                ? average.avg_passing_yards
                : relevantStat.stat === "Rushing Yds"
                ? average.avg_rushing_yards
                : average.avg_receiving_yards,
            recent_average: statValue, // Now correctly calculated as the 3-week average
          };
        })
        .filter(Boolean);

      // Filter Hot and Cold Players
      const hot = playersWithComparison.filter((p) => p.percentage_change > 0);
      const cold = playersWithComparison.filter((p) => p.percentage_change < 0);

      // Sort Hot and Cold Players
      const sortedHot = hot.sort(
        (a, b) => b.percentage_change - a.percentage_change
      );
      const sortedCold = cold.sort(
        (a, b) => a.percentage_change - b.percentage_change
      );

      // Update state
      setHotPlayers(sortedHot.slice(0, 5));
      setColdPlayers(sortedCold.slice(0, 5));
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
              <CardTitle className="text-blue-400 text-center">
                Leaders for Week 15
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {["QB", "RB", "WR", "TE"].map((position) => {
                  const topPlayers = weeklyLeaders[position]?.players || [];
                  return (
                    <div key={position} className="space-y-6">
                      {/* Position Title */}
                      <h3 className="text-xl font-bold text-gray-200 text-center">
                        {position} Leaders
                      </h3>
                      {topPlayers.length > 0 ? (
                        <div className="grid grid-cols-3 gap-4">
                          {topPlayers.map((player, index) => {
                            const rankStyles = [
                              {
                                font: "text-3xl font-extrabold",
                                icon: "w-8 h-8",
                                shadow: "text-shadow-lg",
                                border: "border-4 border-yellow-400",
                              },
                              {
                                font: "text-2xl font-bold",
                                icon: "w-6 h-6",
                                shadow: "text-shadow-md",
                                border: "border-2 border-gray-300",
                              },
                              {
                                font: "text-xl font-semibold",
                                icon: "w-5 h-5",
                                shadow: "text-shadow-sm",
                                border: "border border-orange-400",
                              },
                            ][index] || {
                              font: "text-lg font-medium",
                              icon: "w-4 h-4",
                              shadow: "",
                              border: "",
                            };

                            return (
                              <div
                                key={index}
                                className={`rounded-lg p-4 shadow-md hover:scale-105 transition transform bg-gradient-to-r ${rankStyles.border}`}
                              >
                                <div
                                  className={`flex justify-between items-center ${rankStyles.font}`}
                                >
                                  {/* Rank Badge */}
                                  <span className={`${rankStyles.shadow}`}>
                                    {index === 0
                                      ? "⭐ 1st"
                                      : index === 1
                                      ? "🥈 2nd"
                                      : "🥉 3rd"}
                                  </span>
                                </div>
                                <div className="text-center">
                                  {/* Player Name */}
                                  <p
                                    className={`${rankStyles.font} text-white`}
                                  >
                                    {player.player_name}
                                  </p>
                                  {/* Stat Value */}
                                  <p className="text-gray-300 mt-2">
                                    {player.statValue.toLocaleString()}{" "}
                                    {position === "QB"
                                      ? "Passing Yards"
                                      : position === "RB"
                                      ? "Rushing Yards"
                                      : "Receiving Yards"}
                                  </p>
                                  {/* Matchup */}
                                  <p className="text-sm text-gray-400 italic mt-1">
                                    Matchup: {player.matchup}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
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
          <Card className="bg-gray-800 border-blue-400 shadow-lg">
            <CardHeader>
              <CardTitle className="text-blue-400 text-center">
                Best Defensive Matchups
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-8">
                {["QB", "RB", "WR", "TE"].map((position) => {
                  const topDefenses =
                    matchupRankings?.[position]?.defenses || [];
                  const leagueAvg = matchupRankings?.[position]?.leagueAvg || 0;

                  return (
                    <div key={position} className="space-y-6">
                      {/* Position Title */}
                      <h3 className="text-xl font-bold text-gray-200 text-center">
                        {position} Matchups
                      </h3>
                      {topDefenses.length > 0 ? (
                        <div className="grid grid-cols-3 gap-4">
                          {topDefenses.map((defense, index) => {
                            const rankStyles = [
                              {
                                font: "text-3xl font-extrabold",
                                outline: "border-4 border-yellow-400",
                                shadow: "shadow-lg",
                              },
                              {
                                font: "text-2xl font-bold",
                                outline: "border-4 border-gray-300",
                                shadow: "shadow-md",
                              },
                              {
                                font: "text-xl font-semibold",
                                outline: "border-4 border-orange-400",
                                shadow: "shadow-sm",
                              },
                            ][index] || {
                              font: "text-lg font-medium",
                              outline: "",
                              shadow: "",
                            };

                            return (
                              <div
                                key={index}
                                className={`rounded-lg p-4 shadow-md hover:scale-105 transition-transform bg-gray-800 ${rankStyles.outline}`}
                              >
                                {/* Rank */}
                                <div
                                  className={`flex justify-between items-center ${rankStyles.font}`}
                                >
                                  <span className={`${rankStyles.shadow}`}>
                                    {index === 0
                                      ? "⭐ 1st"
                                      : index === 1
                                      ? "🥈 2nd"
                                      : "🥉 3rd"}
                                  </span>
                                </div>
                                {/* Team */}
                                <div className="text-center">
                                  <p
                                    className={`${rankStyles.font} text-gray-100 mt-2`}
                                  >
                                    {teamNames[defense.team_id] ||
                                      defense.team_id}
                                  </p>
                                  {/* Stat Value */}
                                  <p className="text-gray-300 mt-2">
                                    <span className="font-bold">
                                      Avg Allowed:
                                    </span>{" "}
                                    <span className="text-green-400">
                                      {defense.avg_stat}
                                    </span>
                                  </p>
                                  {/* Above League Average */}
                                  <p className="text-sm text-gray-400 italic">
                                    (+{defense.yards_above_avg} over league avg)
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-center">
                          No data available for {position}
                        </p>
                      )}
                      {/* League-Wide Average */}
                      <div className="text-gray-400 text-sm text-center mt-4">
                        League-Wide Average:{" "}
                        <span className="text-green-400">
                          {leagueAvg.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
                              {player.statValue.toFixed(1)} {player.stat}
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
                              {player.statValue.toFixed(1)} {player.stat}
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
          <Card className="bg-gray-800 border-blue-400">
      <CardHeader>
        <CardTitle className="text-blue-400 text-center">Players to Watch</CardTitle>
      </CardHeader>
      <CardContent>
  <ul className="space-y-4">
    {playersToWatch.map((player, index) => (
      <li key={index} className="bg-gray-800 p-4 rounded-lg shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Player Avatar Placeholder */}
          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-xl font-bold text-blue-400">
            {player.player_name[0]} {/* First letter of player's name */}
          </div>
          {/* Player Info */}
          <div>
            <p className="text-lg font-semibold text-blue-400">{player.player_name}</p>
            <p className="text-sm text-gray-400">{player.position}</p>
            <p className="text-sm text-gray-300">Opponent: {player.opponent}</p>
          </div>
        </div>
        <div className="text-right">
          {/* Last 3 Avg */}
          <p className="text-sm text-gray-300">
            <span className="font-bold text-green-400">Last 3 Avg:</span>{" "}
            <span className="font-semibold text-white">{player.last_3_avg.toFixed(1)}</span>{" "}
            {player.statToDisplay}
          </p>
          {/* Season Avg */}
          <p className="text-sm text-gray-300">
            <span className="font-bold text-yellow-400">Season Avg:</span>{" "}
            <span className="font-semibold text-white">{player.season_avg.toFixed(1)}</span>{" "}
            {player.statToDisplay}
          </p>
          {/* Matchup Type */}
          <p
            className={`inline-block px-2 py-1 text-sm font-bold rounded-full text-white ${
              player.matchupType === "Great Matchup"
                ? "bg-green-900"
                : player.matchupType === "Good Matchup"
                ? "bg-green-600"
                : "bg-red-400"
            }`}
          >
            {player.matchupType}
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

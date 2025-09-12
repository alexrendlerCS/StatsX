"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart3, Shield } from "lucide-react";
import supabase from "../supabaseClient";
import { useState, useEffect, useCallback } from "react"; // ✅ Keep this single import

export default function DefenseAnalysis() {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("RB");
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);
  const [tableRows, setTableRows] = useState([]);
  const [loading, setLoading] = useState(false); // New state for loading spinner
  const [fetchPerformed, setFetchPerformed] = useState(false); // To track if stats have been fetched
  const [rankings, setRankings] = useState([]);
  const [leagueAvg, setLeagueAvg] = useState(0);
  const [teamNames, setTeamNames] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const teamsPerPage = 10;

  // Paginate Data
  const indexOfLastTeam = currentPage * teamsPerPage;
  const indexOfFirstTeam = indexOfLastTeam - teamsPerPage;
  const currentTeams = rankings.slice(indexOfFirstTeam, indexOfLastTeam);

  const nextPage = () => {
    if (currentPage < Math.ceil(rankings.length / teamsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const teams = [
    { name: "49ers", value: "SF" },
    { name: "Bears", value: "CHI" },
    { name: "Bengals", value: "CIN" },
    { name: "Bills", value: "BUF" },
    { name: "Broncos", value: "DEN" },
    { name: "Browns", value: "CLE" },
    { name: "Buccaneers", value: "TB" },
    { name: "Cardinals", value: "ARI" },
    { name: "Chargers", value: "LAC" },
    { name: "Chiefs", value: "KC" },
    { name: "Colts", value: "IND" },
    { name: "Commanders", value: "WAS" },
    { name: "Cowboys", value: "DAL" },
    { name: "Dolphins", value: "MIA" },
    { name: "Eagles", value: "PHI" },
    { name: "Falcons", value: "ATL" },
    { name: "Giants", value: "NYG" },
    { name: "Jaguars", value: "JAC" },
    { name: "Jets", value: "NYJ" },
    { name: "Lions", value: "DET" },
    { name: "Packers", value: "GB" },
    { name: "Panthers", value: "CAR" },
    { name: "Patriots", value: "NE" },
    { name: "Raiders", value: "LV" },
    { name: "Rams", value: "LAR" },
    { name: "Ravens", value: "BAL" },
    { name: "Saints", value: "NO" },
    { name: "Seahawks", value: "SEA" },
    { name: "Steelers", value: "PIT" },
    { name: "Texans", value: "HOU" },
    { name: "Titans", value: "TEN" },
    { name: "Vikings", value: "MIN" },
  ];

  const positions = [
    { name: "Running Back", value: "RB" },
    { name: "Wide Receiver", value: "WR" },
    { name: "Tight End", value: "TE" },
    { name: "Quarterback", value: "QB" },
  ];

  const fetchDefenseData = async () => {
    if (!selectedTeam || !selectedPosition) {
      alert("Please select both a team and a position.");
      return;
    }

    // Show loading spinner and reset state
    setLoading(true);
    setFetchPerformed(true); // Display results card with spinner initially
    setTableRows([]); // Reset table rows while loading

    try {
      // Set table headers based on position
      const headers =
        selectedPosition === "QB"
          ? [
              "Week",
              "Matchup",
              "Passing Attempts",
              "Completions",
              "Passing Yards",
              "Passing TDs",
              "Interceptions",
              "Rate",
              "Rushing Attempts",
              "Rushing Yards",
              "Rushing TDs",
            ]
          : [
              "Week",
              "Matchup",
              "Rushing Attempts",
              "Total Rushing Yards",
              "Avg Yards per Carry",
              "Rushing TDs",
              "Targets",
              "Receptions",
              "Total Receiving Yards",
              "Avg Yards per Catch",
              "Receiving TDs",
            ];
      setTableHeaders(headers);

      // Database mappings
      const headerToDbKeyTeam = {
        "Passing Attempts": "passing_attempts",
        Completions: "completions",
        "Passing Yards": "passing_yards",
        "Passing TDs": "passing_tds",
        Interceptions: "interceptions",
        Rate: "rate",
        "Rushing Attempts": "rushing_attempts",
        "Rushing Yards": "total_rushing_yards", // QB-specific adjusted below
        "Avg Rushing Yards": "avg_yards_per_carry", // QB-specific adjusted below
        "Rushing TDs": "rushing_tds",
        Targets: "targets",
        Receptions: "receptions",
        "Total Rushing Yards": "total_rushing_yards",
        "Avg Yards per Carry": "avg_yards_per_carry",
        "Total Receiving Yards": "total_receiving_yards",
        "Avg Yards per Catch": "avg_yards_per_catch",
        "Receiving TDs": "receiving_tds",
      };

      const headerToDbKeyPlayer = {
        ...headerToDbKeyTeam,
        "Rushing Yards": "rushing_yards", // QB-specific handled below
        "Avg Rushing Yards": "avg_rushing_yards", // QB-specific handled below
        "Total Rushing Yards": "rushing_yards",
        "Total Receiving Yards": "receiving_yards",
      };

      // Determine database tables based on position
      const teamTable =
        selectedPosition === "QB"
          ? "qb_defensive_stats"
          : "general_defensive_stats";
      const leagueTable =
        selectedPosition === "QB"
          ? "all_defense_averages_qb"
          : "all_defense_averages";

      // Fetch team stats
      let query = supabase
        .from(teamTable)
        .select("*")
        .eq("team_id", selectedTeam);
      if (selectedPosition !== "QB") {
        query = query.eq("position_id", selectedPosition);
      }

      const { data: teamStats, error: teamError } = await query;
      if (teamError || !teamStats) {
        console.error("Error fetching team stats:", teamError);
        alert("Failed to fetch team data.");
        return;
      }

      // Fetch league averages
      const { data: leagueAverages, error: leagueError } =
        selectedPosition === "QB"
          ? await supabase.from(leagueTable).select("*").single()
          : await supabase
              .from(leagueTable)
              .select("*")
              .eq("position_id", selectedPosition)
              .single();

      if (leagueError || !leagueAverages) {
        console.error("Error fetching league averages:", leagueError);
        alert("Failed to fetch league averages.");
        return;
      }

      // Function to get comparison color
      const getComparisonColor = (header, value, avgValue) => {
        if (avgValue === 0) return "#d32f2f"; // Red for missing averages

        const difference = value - avgValue;
        const absDifference = Math.abs(difference);

        // TOUCHDOWNS - Special handling
        if (header === "Passing TDs") {
          if (value >= 2) return "#00c853"; // Green - 2+ TDs
          if (value === 1) return "#ffea00"; // Yellow - 1 TD
          return "#d32f2f"; // Red - 0 TDs
        }

        if (header === "Rushing TDs" || header === "Receiving TDs") {
          if (value >= 1) return "#00c853"; // Green - 1+ TDs
          return "#d32f2f"; // Red - 0 TDs
        }

        // INTERCEPTIONS - Special handling (lower is better)
        if (header === "Interceptions") {
          if (value === 0) return "#d32f2f"; // Red - 0 INTs (good for defense)
          if (value === 1) return "#ffea00"; // Yellow - 1 INT
          return "#00c853"; // Green - 2+ INTs (bad for offense, good for defense)
        }

        // YARDS - 10-20 range for yellow
        if (
          header === "Passing Yards" ||
          header === "Rushing Yards" ||
          header === "Total Receiving Yards" ||
          header === "Total Rushing Yards"
        ) {
          if (absDifference <= 10) return "#ffea00"; // Yellow - within 10
          if (absDifference <= 20) return "#ffea00"; // Yellow - within 20
          if (difference > 20) return "#00c853"; // Green - above 20
          return "#d32f2f"; // Red - below 20
        }

        // RATE - 10-20 range for yellow
        if (header === "Rate") {
          if (absDifference <= 10) return "#ffea00"; // Yellow - within 10
          if (absDifference <= 20) return "#ffea00"; // Yellow - within 20
          if (difference > 20) return "#00c853"; // Green - above 20
          return "#d32f2f"; // Red - below 20
        }

        // ATTEMPTS/COMPLETIONS/TARGETS/RECEPTIONS - 1-2 range for yellow
        if (
          header === "Passing Attempts" ||
          header === "Completions" ||
          header === "Rushing Attempts" ||
          header === "Targets" ||
          header === "Receptions"
        ) {
          if (absDifference <= 1) return "#ffea00"; // Yellow - within 1
          if (absDifference <= 2) return "#ffea00"; // Yellow - within 2
          if (difference > 2) return "#00c853"; // Green - above 2
          return "#d32f2f"; // Red - below 2
        }

        // AVERAGE YARDS - 1-2 range for yellow
        if (
          header === "Avg Yards per Carry" ||
          header === "Avg Yards per Catch"
        ) {
          if (absDifference <= 1) return "#ffea00"; // Yellow - within 1
          if (absDifference <= 2) return "#ffea00"; // Yellow - within 2
          if (difference > 2) return "#00c853"; // Green - above 2
          return "#d32f2f"; // Red - below 2
        }

        // Default fallback
        if (difference > 1.5) return "#00c853"; // Green for above average
        if (absDifference <= 1.5) return "#ffea00"; // Yellow
        return "#d32f2f"; // Red for below average
      };

      const rows = [];
      const valuesForAverages = {};

      // Process stats week by week
      for (let week = 1; week <= 17; week++) {
        const weekStats = teamStats.filter((row) => row.week === week);

        if (weekStats.length > 0) {
          const parentRow = {
            Week: week,
            Matchup: `${weekStats[0].matchup || "Unknown Opponent"} ▼`,
            rowType: "parent",
            isHidden: false,
          };

          headers.slice(2).forEach((header) => {
            let dbKey = headerToDbKeyTeam[header];
            if (!dbKey) {
              console.error(
                `Header "${header}" is not mapped to a database key.`
              );
              parentRow[header] = "N/A";
              return;
            }

            if (selectedPosition === "QB" && dbKey === "total_rushing_yards") {
              dbKey = "rushing_yards";
            } else if (
              selectedPosition === "QB" &&
              dbKey === "rushing_attempts"
            ) {
              dbKey = "rushing_attempts"; // QB uses same field name for team stats
            } else if (
              selectedPosition === "QB" &&
              dbKey === "avg_yards_per_carry"
            ) {
              dbKey = "avg_rushing_yards"; // QB uses same field name for team stats
            }

            const value = weekStats[0][dbKey] ?? "N/A";

            // For QB, use QB-specific field names for league averages
            let avgFieldName;
            if (
              selectedPosition === "QB" &&
              (dbKey === "rushing_attempts" ||
                dbKey === "rushing_yards" ||
                dbKey === "avg_rushing_yards")
            ) {
              avgFieldName = `avg_qb_${dbKey}`;
            } else if (dbKey === "total_rushing_yards") {
              avgFieldName = "avg_rushing_yards"; // Database has avg_rushing_yards, not avg_total_rushing_yards
            } else if (dbKey === "total_receiving_yards") {
              avgFieldName = "avg_receiving_yards"; // Database has avg_receiving_yards, not avg_total_receiving_yards
            } else {
              avgFieldName = `avg_${dbKey}`;
            }

            const avgValue = leagueAverages[avgFieldName] ?? 0;

            if (!valuesForAverages[header]) valuesForAverages[header] = [];
            if (value !== "N/A") valuesForAverages[header].push(Number(value));

            parentRow[header] =
              value === "N/A" ? (
                value
              ) : (
                <span
                  style={{
                    color: getComparisonColor(header, value, avgValue),
                    fontWeight: "bold",
                  }}
                >
                  {value}
                </span>
              );
          });

          rows.push(parentRow);
          // Fetch player stats
          const { data: playerStats, error: playerStatsError } = await supabase
            .from("player_stats")
            .select("*")
            .eq("opponent", selectedTeam)
            .eq("position_id", selectedPosition)
            .eq("week", week);

          if (playerStatsError) {
            console.error(
              `Error fetching player stats for week ${week}:`,
              playerStatsError.message
            );
            continue;
          }

          const playerAveragesMap = {};
          for (const player of playerStats) {
            const { data: playerAverage, error: avgError } = await supabase
              .from("player_averages")
              .select("*")
              .eq("player_name", player.player_name)
              .single();

            if (avgError) {
              console.error(
                `Error fetching averages for ${player.player_name}:`,
                avgError.message
              );
              continue;
            }
            playerAveragesMap[player.player_name] = playerAverage;
          }

          playerStats.forEach((player) => {
            const childRow = {
              Week: "",
              Matchup: player.player_name,
              rowType: "child",
              isHidden: true,
            };

            headers.slice(2).forEach((header) => {
              let playerStatKey = headerToDbKeyPlayer[header];

              if (
                selectedPosition === "QB" &&
                (header === "Rushing Yards" || header === "Avg Rushing Yards")
              ) {
                playerStatKey =
                  header === "Rushing Yards"
                    ? "rushing_yards"
                    : "avg_rushing_yards"; // Fixed: was avg_qb_avg_rushing_yards
              }

              const playerValue = player[playerStatKey] ?? "N/A";
              const playerAvgValue =
                playerAveragesMap[player.player_name]?.[
                  `avg_${playerStatKey}`
                ] ?? 0;

              childRow[header] =
                playerValue === "N/A" ? (
                  playerValue
                ) : (
                  <span
                    style={{
                      color: getComparisonColor(
                        header,
                        playerValue,
                        playerAvgValue
                      ), // Pass header here
                      fontWeight: "bold",
                    }}
                  >
                    {playerValue}
                  </span>
                );
            });

            rows.push(childRow);
          });
        }
      }
      // Add L3 Average and Overall Average rows
      const addAverageRows = (values, label) => {
        const averageRow = { Week: "", Matchup: label, rowType: "average" };
        headers.slice(2).forEach((header) => {
          if (!values[header] || values[header].length === 0) {
            averageRow[header] = "N/A";
            return;
          }

          const sum = values[header].reduce((a, b) => a + b, 0);
          const average =
            label === "L3 Average"
              ? sum / Math.min(values[header].length, 3)
              : sum / values[header].length;

          // Get the league average for comparison
          let dbKey = headerToDbKeyTeam[header];
          if (!dbKey) {
            averageRow[header] = "N/A";
            return;
          }

          if (selectedPosition === "QB" && dbKey === "total_rushing_yards") {
            dbKey = "rushing_yards";
          } else if (
            selectedPosition === "QB" &&
            dbKey === "rushing_attempts"
          ) {
            dbKey = "rushing_attempts";
          } else if (
            selectedPosition === "QB" &&
            dbKey === "avg_yards_per_carry"
          ) {
            dbKey = "avg_rushing_yards";
          }

          // For QB, use QB-specific field names for league averages
          let avgFieldName;
          if (
            selectedPosition === "QB" &&
            (dbKey === "rushing_attempts" ||
              dbKey === "rushing_yards" ||
              dbKey === "avg_rushing_yards")
          ) {
            avgFieldName = `avg_qb_${dbKey}`;
          } else if (dbKey === "total_rushing_yards") {
            avgFieldName = "avg_rushing_yards"; // League averages table has avg_rushing_yards, not avg_total_rushing_yards
          } else if (dbKey === "total_receiving_yards") {
            avgFieldName = "avg_receiving_yards"; // League averages table has avg_receiving_yards, not avg_total_receiving_yards
          } else {
            avgFieldName = `avg_${dbKey}`;
          }

          const leagueAvgValue = leagueAverages[avgFieldName] ?? 0;

          averageRow[header] = (
            <span
              style={{
                color: getComparisonColor(header, average, leagueAvgValue),
                fontWeight: "bold",
              }}
            >
              {average.toFixed(2)}
            </span>
          );
        });
        rows.push(averageRow);
      };

      addAverageRows(valuesForAverages, "L3 Average");
      addAverageRows(valuesForAverages, "Overall Average");

      // Add League Average row
      const addLeagueAverageRow = () => {
        const leagueAverageRow = {
          Week: "",
          Matchup: "League Average",
          rowType: "leagueAverage",
        };

        headers.slice(2).forEach((header) => {
          let dbKey = headerToDbKeyTeam[header];
          if (!dbKey) {
            leagueAverageRow[header] = "N/A";
            return;
          }

          if (selectedPosition === "QB" && dbKey === "total_rushing_yards") {
            dbKey = "rushing_yards";
          } else if (
            selectedPosition === "QB" &&
            dbKey === "rushing_attempts"
          ) {
            dbKey = "qb_rushing_attempts"; // QB-specific field name
          } else if (
            selectedPosition === "QB" &&
            dbKey === "avg_yards_per_carry"
          ) {
            dbKey = "qb_avg_rushing_yards"; // QB-specific field name
          }

          // For QB, use QB-specific field names for league averages
          let avgFieldName;
          if (
            selectedPosition === "QB" &&
            (dbKey === "qb_rushing_attempts" ||
              dbKey === "rushing_yards" ||
              dbKey === "qb_avg_rushing_yards")
          ) {
            avgFieldName = `avg_${dbKey}`;
          } else if (dbKey === "total_rushing_yards") {
            avgFieldName = "avg_rushing_yards"; // League averages table has avg_rushing_yards, not avg_total_rushing_yards
          } else if (dbKey === "total_receiving_yards") {
            avgFieldName = "avg_receiving_yards"; // League averages table has avg_receiving_yards, not avg_total_receiving_yards
          } else {
            avgFieldName = `avg_${dbKey}`;
          }

          const avgValue = leagueAverages[avgFieldName] ?? 0;

          // Set Avg Yards per Carry and Avg Yards per Catch to N/A for league average
          if (
            header === "Avg Yards per Carry" ||
            header === "Avg Yards per Catch"
          ) {
            leagueAverageRow[header] = (
              <span
                style={{
                  fontWeight: "bold",
                  color: "#60a5fa", // Blue color for league average
                  backgroundColor: "#1e3a8a", // Dark blue background
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                N/A
              </span>
            );
          } else {
            leagueAverageRow[header] = (
              <span
                style={{
                  fontWeight: "bold",
                  color: "#60a5fa", // Blue color for league average
                  backgroundColor: "#1e3a8a", // Dark blue background
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                {avgValue.toFixed(2)}
              </span>
            );
          }
        });
        rows.push(leagueAverageRow);
      };

      addLeagueAverageRow();

      setTableRows(rows); // Update table rows with processed data
    } catch (error) {
      console.error("Error fetching data:", error.message);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false); // Stop loading spinner
    }
  };

  // **Handle Row Click**
  const handleRowClick = (rowIndex) => {
    const updatedRows = [...tableRows];
    const parentRow = updatedRows[rowIndex];

    if (parentRow.rowType !== "parent") return;

    let i = rowIndex + 1;
    while (i < updatedRows.length && updatedRows[i].rowType === "child") {
      updatedRows[i].isHidden = !updatedRows[i].isHidden;
      i++;
    }

    parentRow.Matchup = parentRow.Matchup.includes("▼")
      ? parentRow.Matchup.replace("▼", "▲")
      : parentRow.Matchup.replace("▲", "▼");

    setTableRows(updatedRows);
  };
  // Fetch Team Names
  const fetchTeamNames = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("team_id, team_name");
    if (error) {
      console.error("Error fetching team names:", error.message);
      return;
    }
    const teamMap = data.reduce((acc, team) => {
      acc[team.team_id] = team.team_name;
      return acc;
    }, {});
    setTeamNames(teamMap);
  };

  // Fetch Defensive Rankings for Selected Position
  const fetchRankings = useCallback(async () => {
    try {
      setRankings([]); // ✅ Clear old rankings before fetching new ones

      const leagueTable =
        selectedPosition === "QB"
          ? "all_defense_averages_qb"
          : "all_defense_averages";

      // Fetch team-specific defensive rankings
      const { data, error } = await supabase
        .from("defensive_matchup_rankings")
        .select("team_id, avg_stat, yards_above_avg, rank")
        .eq("position", selectedPosition)
        .order("rank", { ascending: true });

      if (error) {
        console.error("Error fetching rankings:", error.message);
        return;
      }

      // Fetch league-wide average
      let leagueAvgStat = 0;

      if (selectedPosition === "QB") {
        // ✅ Fetch QB-specific league-wide passing yards allowed
        const { data: leagueData, error: leagueError } = await supabase
          .from(leagueTable)
          .select("avg_passing_yards")
          .single();

        if (leagueError) {
          console.error(
            "Error fetching league-wide QB average:",
            leagueError.message
          );
          return;
        }

        leagueAvgStat = leagueData?.avg_passing_yards || 0;
      } else {
        // ✅ Fetch league-wide averages for RB, WR, TE
        const { data: leagueData, error: leagueError } = await supabase
          .from(leagueTable)
          .select("avg_rushing_yards, avg_receiving_yards")
          .eq("position_id", selectedPosition)
          .single();

        if (leagueError) {
          console.error(
            "Error fetching league-wide average:",
            leagueError.message
          );
          return;
        }

        leagueAvgStat =
          selectedPosition === "RB"
            ? leagueData?.avg_rushing_yards
            : leagueData?.avg_receiving_yards;
      }

      setLeagueAvg(leagueAvgStat || 0);
      setRankings(data);
    } catch (error) {
      console.error("Error fetching rankings:", error.message);
    }
  }, [selectedPosition]);

  useEffect(() => {
    fetchTeamNames();
    fetchRankings();
  }, [selectedPosition, fetchRankings]);

  return (
    <div className="flex-grow">
      <div className="space-y-8">
        <div className="flex items-center justify-center space-x-2">
          <Shield className="w-8 h-8 text-blue-400" />
          <h1 className="text-4xl font-bold text-center text-blue-400">
            Defense Analysis
          </h1>
        </div>
        <Card className="bg-gray-800 border-blue-400 shadow-lg">
          <CardHeader>
            <CardTitle className="text-blue-400 text-center text-2xl">
              Defensive Rankings by Position
            </CardTitle>
          </CardHeader>

          <CardContent>
            {/* Position Selector */}
            <div className="flex justify-center mb-4">
              <Select onValueChange={setSelectedPosition} defaultValue="RB">
                <SelectTrigger className="bg-gray-700 text-gray-100 border border-gray-600 w-64 rounded px-4 py-2 shadow-lg">
                  <SelectValue placeholder="Select Position" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border border-gray-600 rounded shadow-lg">
                  {positions.map((pos) => (
                    <SelectItem
                      key={pos.value}
                      value={pos.value}
                      className="px-4 py-2 text-gray-100 cursor-pointer hover:bg-gray-600"
                    >
                      {pos.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rankings Table */}
            {/* Rankings Table */}
            <div>
              <table className="w-full text-sm text-gray-300">
                <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Rank</th>
                    <th className="px-6 py-3">Team</th>
                    <th className="px-6 py-3">Avg Allowed</th>
                    <th className="px-6 py-3">Above/Below Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {/* League Average Row */}
                  <tr className="bg-blue-900 border-b-2 border-blue-400">
                    <td className="px-6 py-4 font-bold text-blue-200">—</td>
                    <td className="px-6 py-4 font-bold text-blue-200">
                      League Average
                    </td>
                    <td className="px-6 py-4 font-bold text-blue-200">
                      {leagueAvg.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-sm italic text-blue-200">
                      ±0.0
                    </td>
                  </tr>

                  {currentTeams.map((defense, index) => {
                    // Determine color for "Avg Allowed"
                    const avgAllowedColor =
                      defense.avg_stat >= leagueAvg + 20
                        ? "text-green-400" // 🟢 High Yards Allowed (Weak Defense)
                        : defense.avg_stat < leagueAvg - 10
                        ? "text-red-400" // 🔴 Low Yards Allowed (Strong Defense)
                        : "text-yellow-400"; // 🟡 Around League Avg

                    // Determine color for "Above/Below Avg"
                    const aboveBelowColor =
                      defense.yards_above_avg >= 10
                        ? "text-green-300" // 🟢 Above League Avg by 10+
                        : defense.yards_above_avg <= -10
                        ? "text-red-400" // 🔴 Below League Avg by 10+
                        : "text-yellow-300"; // 🟡 Within ±10 yards of league avg

                    return (
                      <tr
                        key={index}
                        className="bg-gray-800 border-b border-gray-700"
                      >
                        {/* Rank */}
                        <td className="px-6 py-4 font-bold">{defense.rank}</td>

                        {/* Team */}
                        <td className="px-6 py-4">
                          {teamNames[defense.team_id] || defense.team_id}
                        </td>

                        {/* Avg Allowed - Colorized Based on Performance */}
                        <td
                          className={`px-6 py-4 font-bold ${avgAllowedColor}`}
                        >
                          {parseFloat(defense.avg_stat).toFixed(1)}
                        </td>

                        {/* Above/Below Avg - Colorized Based on Comparison */}
                        <td
                          className={`px-6 py-4 text-sm italic ${aboveBelowColor}`}
                        >
                          {defense.yards_above_avg >= 0
                            ? `+${parseFloat(defense.yards_above_avg).toFixed(
                                1
                              )}`
                            : parseFloat(defense.yards_above_avg).toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Controls */}
              <div className="flex justify-center mt-4">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-gray-600 rounded-l"
                >
                  ◀ Prev
                </button>
                <span className="px-4 py-2 bg-gray-700 text-gray-200">
                  Page {currentPage} of{" "}
                  {Math.ceil(rankings.length / teamsPerPage)}
                </span>
                <button
                  onClick={nextPage}
                  disabled={
                    currentPage === Math.ceil(rankings.length / teamsPerPage)
                  }
                  className="px-3 py-2 bg-gray-600 rounded-r"
                >
                  Next ▶
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-blue-400">
          <CardHeader>
            <CardTitle className="text-blue-400 flex items-center space-x-2">
              <BarChart3 className="w-6 h-6" />
              <span>Compare Defenses</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Dropdowns and "vs." text */}
              <div className="flex items-center justify-between space-x-4">
                {/* Team Dropdown */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Team
                  </label>
                  <Select onValueChange={setSelectedTeam}>
                    <SelectTrigger className="bg-gray-700 text-gray-100 border border-gray-600 w-full rounded px-4 py-2 shadow-lg">
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border border-gray-600 rounded shadow-lg">
                      {teams.map((team) => (
                        <SelectItem
                          key={team.value}
                          value={team.value}
                          className="px-4 py-2 text-gray-100 cursor-pointer hover:bg-gray-600"
                        >
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* "vs." text */}
                <div
                  className="relative text-gray-400 font-bold text-lg"
                  style={{ top: "6px" }}
                >
                  vs.
                </div>

                {/* Position Dropdown */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Position
                  </label>
                  <Select onValueChange={setSelectedPosition}>
                    <SelectTrigger className="bg-gray-700 text-gray-100 border border-gray-600 w-full rounded px-4 py-2 shadow-lg">
                      <SelectValue placeholder="Select a position" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border border-gray-600 rounded shadow-lg">
                      {positions.map((position) => (
                        <SelectItem
                          key={position.value}
                          value={position.value}
                          className="px-4 py-2 text-gray-100 cursor-pointer hover:bg-gray-600"
                        >
                          {position.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fetch Stats Button */}
              <Button
                onClick={fetchDefenseData}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Fetch Stats
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Defense Comparison Results */}
        {fetchPerformed && (
          <Card className="bg-gradient-to-b from-gray-800 via-gray-900 to-black border border-blue-500 shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="text-blue-400 text-2xl font-bold flex items-center">
                Defense Comparison Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-400 border-solid"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                      <tr>
                        {tableHeaders.map((header) => (
                          <th key={header} scope="col" className="px-6 py-3">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row, index) => (
                        <tr
                          key={index}
                          className={`border-b ${
                            row.rowType === "child" && row.isHidden
                              ? "hidden"
                              : ""
                          } ${
                            row.rowType === "child"
                              ? "bg-gray-900"
                              : row.rowType === "leagueAverage"
                              ? "bg-blue-900 border-b-2 border-blue-400"
                              : "bg-gray-800"
                          } border-gray-700`}
                          onClick={() =>
                            row.rowType === "parent" && handleRowClick(index)
                          }
                          style={{
                            cursor:
                              row.rowType === "parent" ? "pointer" : "default",
                          }}
                        >
                          {tableHeaders.map((header) => (
                            <td
                              key={header}
                              className={`px-6 py-4 ${
                                row.rowType === "child" ? "pl-12 text-left" : ""
                              } ${
                                row.rowType === "leagueAverage"
                                  ? "text-blue-200 font-bold"
                                  : ""
                              }`}
                            >
                              {row[header] !== undefined ? row[header] : "N/A"}
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
        )}
      </div>
    </div>
  );
}

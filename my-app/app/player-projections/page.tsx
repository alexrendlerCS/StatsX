"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BarChart3 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [defenseTeam, setDefenseTeam] = useState("");
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
  
  const normalizedPlayerName = playerName
    .trim()
    .toLowerCase()
    .replace(/[-.`']/g, "");

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

  const normalizeString = (str) =>
    str
      .toLowerCase()
      .replace(/[-.`']/g, "") // Removes problematic characters
      .trim();

  useEffect(() => {
    if (fetchTriggered && playerName.trim()) {
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
              const player = row.description
                .trim()
                .toLowerCase()
                .replace(/[-.`']/g, "");
              const stat = row.market.trim();
              const line = row.point || "N/A";

              if (!lines[player]) lines[player] = {};
              if (!lines[player][stat]) {
                lines[player][stat] = line;
              }
            });
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
        .ilike("player_name", `%${normalizedName}%`); // Case-insensitive match for player name

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
    if (!playerName || !defenseTeam) {
      setError("Please provide both a player name and defense team.");
      return;
    }

    try {
      // Fetch player stats
      // Compare normalized names in the database:
      const { data: playerStats, error: playerStatsError } = await supabase
        .from("player_stats")
        .select("*")
        .eq("normalized_name", normalizedPlayerName);
      if (playerStatsError) {
        console.error("Error fetching player stats:", playerStatsError.message);
        return;
      }
      if (!playerStats || playerStats.length === 0) {
        console.warn("No player stats found for:", playerName);
        return;
      }

      const positionId = playerStats[0].position_id;
      setPosition(positionId);

      // Fetch defense stats
      const defenseTable =
        positionId === "QB" ? "defense_averages_qb" : "defense_averages";
      let defenseQuery = supabase
        .from(defenseTable)
        .select("*")
        .eq("team_id", defenseTeam);

      if (positionId !== "QB") {
        defenseQuery = defenseQuery.eq("position_id", positionId);
      }

      const { data: defenseStats, error: defenseStatsError } =
        await defenseQuery;

      if (defenseStatsError) {
        console.error(
          "Error fetching defense stats:",
          defenseStatsError.message
        );
        return;
      }
      if (!defenseStats || defenseStats.length === 0) {
        console.warn("No defense stats found for team:", defenseTeam);
        return;
      }

      // Fetch league stats
      const leagueTable =
        positionId === "QB"
          ? "all_defense_averages_qb"
          : "all_defense_averages";
      let leagueQuery = supabase.from(leagueTable).select("*");

      if (positionId === "QB") {
        leagueQuery = supabase
          .from(leagueTable)
          .select(
            "avg_qb_rushing_attempts, avg_qb_rushing_yards, avg_qb_rushing_tds, avg_passing_attempts, avg_completions, avg_passing_yards, avg_passing_tds, avg_interceptions"
          );
      } else {
        leagueQuery = leagueQuery.eq("position_id", positionId);
      }

      const { data: leagueStats, error: leagueStatsError } = await leagueQuery;

      if (leagueStatsError) {
        console.error("Error fetching league stats:", leagueStatsError.message);
        return;
      }
      if (!leagueStats || leagueStats.length === 0) {
        console.warn("No league stats found for position:", positionId);
        return;
      }

      const leagueStat = leagueStats[0]; // Declare only once
      console.log("League Stats Data:", leagueStat);

      // Calculate projections
      const playerWeight = 0.7;
      const defenseWeight = 0.3;
      const projection = {};

      for (const stat of relevantStats[positionId] || []) {
        const defenseKey =
          positionId === "QB" && stat.key.startsWith("rushing")
            ? `avg_qb_${stat.key}` // Special case for QB rushing stats
            : `avg_${stat.key}`;
        const leagueKey =
          positionId === "QB" && stat.key.startsWith("rushing")
            ? `avg_qb_${stat.key}` // Special case for QB rushing stats
            : `avg_${stat.key}`;

        const playerAvg =
          playerStats.reduce(
            (sum, statEntry) => sum + (statEntry[stat.key] || 0),
            0
          ) / playerStats.length;

        const defenseAvg = defenseStats[0]?.[defenseKey];
        const leagueAvg = leagueStat?.[leagueKey];

        console.log(`Fetching projections for stat: ${stat.key}`);
        console.log("Defense Key:", defenseKey);
        console.log("League Key:", leagueKey);
        console.log(
          `Player Avg: ${playerAvg}, Defense Avg: ${defenseAvg}, League Avg: ${leagueAvg}`
        );

        if (playerAvg && defenseAvg && leagueAvg) {
          const defenseImpact = playerAvg * (defenseAvg / leagueAvg);
          projection[stat.key] =
            playerAvg * playerWeight + defenseImpact * defenseWeight;
        } else {
          projection[stat.key] = 0; // Default to 0 if data is missing
        }
      }

      console.log("Projections:", JSON.stringify(projection, null, 2));

      setProjections(projection);
    } catch (error) {
      console.error("Error during fetchProjections:", error.message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    if (!playerName || !defenseTeam) {
      setError("Player name and defense team are required."); // Set error
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

  const nflTeams = [
    { id: "SF", name: "49ers" },
    { id: "ARI", name: "Cardinals" },
    { id: "ATL", name: "Falcons" },
    { id: "BAL", name: "Ravens" },
    { id: "BUF", name: "Bills" },
    { id: "CAR", name: "Panthers" },
    { id: "CHI", name: "Bears" },
    { id: "CIN", name: "Bengals" },
    { id: "CLE", name: "Browns" },
    { id: "DAL", name: "Cowboys" },
    { id: "DEN", name: "Broncos" },
    { id: "DET", name: "Lions" },
    { id: "GB", name: "Packers" },
    { id: "HOU", name: "Texans" },
    { id: "IND", name: "Colts" },
    { id: "JAC", name: "Jaguars" },
    { id: "KC", name: "Chiefs" },
    { id: "LAC", name: "Chargers" },
    { id: "LAR", name: "Rams" },
    { id: "LV", name: "Raiders" },
    { id: "MIA", name: "Dolphins" },
    { id: "MIN", name: "Vikings" },
    { id: "NE", name: "Patriots" },
    { id: "NO", name: "Saints" },
    { id: "NYG", name: "Giants" },
    { id: "NYJ", name: "Jets" },
    { id: "PHI", name: "Eagles" },
    { id: "PIT", name: "Steelers" },
    { id: "SEA", name: "Seahawks" },
    { id: "TB", name: "Buccaneers" },
    { id: "TEN", name: "Titans" },
    { id: "WAS", name: "Commanders" },
  ];

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
        {/* Player Projections Form */}
        <Card className="bg-gray-800 border-blue-400">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-blue-400" />
              <CardTitle className="text-blue-400">
                Player Projections
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Centering the form fields */}
              <div className="flex flex-col md:flex-row justify-center items-end gap-6">
                {/* Player Name Input with Suggestions */}
                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Player Name
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Enter player name"
                      value={playerName}
                      onChange={(e) => {
                        setPlayerName(e.target.value);
                        fetchSuggestions(e.target.value);
                      }}
                      className="bg-gray-700 text-gray-100 border-gray-600 rounded-lg w-full"
                    />
                    {suggestions.length > 0 && (
                      <ul className="absolute z-10 bg-gray-700 border border-gray-600 w-full mt-1 rounded-lg shadow-lg">
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
                </div>

                {/* Team Dropdown */}
                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Team
                  </label>
                  <Select onValueChange={setDefenseTeam}>
                    <SelectTrigger className="w-full bg-gray-700 text-gray-100 border-gray-600 rounded-lg px-4 py-2">
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {nflTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Submit Button */}
              <div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  Generate Projection
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
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
                    const normalizedPlayerName = playerName
                      .trim()
                      .toLowerCase();
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
                    const projectedValue =
                      projections[stat.key]?.toFixed(2) || "N/A";

                    let projectionColor = "text-gray-100";
                    if (projectedValue !== "N/A") {
                      const projectedFloat = parseFloat(projectedValue);
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
                          {projectedValue}
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

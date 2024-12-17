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
              <CardTitle className="text-blue-400">
                Top Performers This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {["QB", "RB", "WR", "TE", "DEF"].map((position) => (
                  <div
                    key={position}
                    className="flex justify-between items-center"
                  >
                    <span>{position}</span>
                    <span className="text-blue-400">Player Name</span>
                    <span>XX.X pts</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-blue-400">
            <CardHeader>
              <CardTitle className="text-blue-400">League Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  "Passing Yards",
                  "Rushing Yards",
                  "Receptions",
                  "Sacks",
                  "Interceptions",
                ].map((stat) => (
                  <div key={stat} className="flex justify-between items-center">
                    <span>{stat}</span>
                    <span className="text-blue-400">XXX.X</span>
                    <span className="text-green-400">↑ X.X%</span>
                  </div>
                ))}
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
  <h2 className="text-3xl font-bold text-center text-blue-400">User Picks</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {picksList.length > 0 ? (
      picksList.map((item) => (
        <Card
          key={item.id}
          className="bg-gray-800 border-gray-700 hover:border-blue-400 transition shadow-md"
        >
          <CardHeader className="pb-2">
            {/* Player Name - Blue and Prominent */}
            <p className="text-2xl font-bold text-blue-400">{item.player_name}</p>
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

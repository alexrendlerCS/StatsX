"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { BarChart3, TrendingUp, Users, Shield, Send } from "lucide-react";
import { useState, useEffect } from "react";
import supabase from "./supabaseClient";
import { ThumbsUp, ThumbsDown } from "lucide-react";


export default function Home() {
  const [feedback, setFeedback] = useState(""); // Feedback content
  const [email, setEmail] = useState(""); // Feedback email
  const [picks, setPicks] = useState(""); // Picks content
  const [name, setName] = useState(""); // Name for sharing picks

  // Success/Error messages for Feedback Form
  const [feedbackSuccess, setFeedbackSuccess] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  // Success/Error messages for Share Picks Form
  const [picksSuccess, setPicksSuccess] = useState("");
  const [picksError, setPicksError] = useState("");

  const [picksList, setPicksList] = useState([]); // Display submitted picks
  

  const handleVote = async (pickId, type) => {
    try {
      const userId = "user-unique-id"; // Replace this with a real unique identifier for the user (e.g., Supabase Auth user.id)
  
      // Check if the user has already voted
      const { data: existingVote, error: checkError } = await supabase
        .from("picks_votes")
        .select("id, vote_type")
        .eq("pick_id", pickId)
        .eq("user_id", userId)
        .single();
  
      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking vote:", checkError.message);
        return;
      }
  
      // Start the voting logic
      if (!existingVote) {
        // User hasn't voted yet
        await supabase.from("picks_votes").insert([{ pick_id: pickId, user_id: userId, vote_type: type }]);
  
        // Increment the correct column
        const columnToIncrement = type === "upvote" ? "upvotes" : "downvotes";
        await supabase.rpc("increment_vote", { id: pickId, column: columnToIncrement });
      } else if (existingVote.vote_type !== type) {
        // User switches votes
        await supabase.from("picks_votes").update({ vote_type: type }).eq("id", existingVote.id);
  
        // Adjust upvotes and downvotes
        await supabase.rpc("adjust_votes", { id: pickId, new_vote: type, old_vote: existingVote.vote_type });
      }
  
      fetchPicks(); // Refresh the picks list
    } catch (error) {
      console.error("Error handling vote:", error.message);
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
      const { error } = await supabase.from("feedback").insert([
        { content: feedback, email: email.trim() || null },
      ]);

      if (error) {
        throw new Error(error.message);
      }

      setFeedbackSuccess("Thank you for your feedback!");
      setFeedback("");
      setEmail("");
    } catch (err: any) {
      setFeedbackError(err.message || "Failed to submit feedback.");
    }
  };

  // Submit picks to Supabase
  const handleSubmitPicks = async (e: React.FormEvent) => {
    e.preventDefault();
    setPicksSuccess("");
    setPicksError("");

    // Validate picks input
    if (!picks.trim() || !name.trim()) {
      setPicksError("Please enter your name and picks.");
      return;
    }

    try {
      // Save picks to Supabase
      const { error } = await supabase.from("picks").insert([
        { name: name.trim(), content: picks.trim() },
      ]);

      if (error) {
        throw new Error(error.message);
      }

      setPicksSuccess("Your picks have been shared!");
      setPicks("");
      setName("");
      fetchPicks();
    } catch (err: any) {
      setPicksError(err.message || "Failed to share picks.");
    }
  };

  const fetchPicks = async () => {
    try {
      const { data, error } = await supabase
        .from("picks")
        .select("id, name, content, upvotes, downvotes, created_at")
        .order("created_at", { ascending: false });
  
      if (error) {
        console.error("Error fetching picks:", error.message);
        return;
      }
  
      setPicksList(data || []); // Update state
    } catch (err) {
      console.error("Error in fetchPicks:", err.message);
    }
  };
  
  
  useEffect(() => {
    fetchPicks();
  }, []);

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
                <label htmlFor="feedback" className="block text-sm font-medium text-gray-400 mb-1">
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
                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
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
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Submit Feedback
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </form>
            {feedbackSuccess && <p className="text-green-400 mt-4">{feedbackSuccess}</p>}
            {feedbackError && <p className="text-red-400 mt-4">{feedbackError}</p>}
          </CardContent>
        </Card>
      </section>

      {/* Share Your Picks Form */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-center text-blue-400">
          Share Your Picks
        </h2>
        <Card className="bg-gray-800 border-blue-400">
          <CardContent className="p-6">
            <form onSubmit={handleSubmitPicks} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">
                  Your Name
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <div>
                <label htmlFor="picks" className="block text-sm font-medium text-gray-400 mb-1">
                  Your Picks
                </label>
                <Textarea
                  id="picks"
                  value={picks}
                  onChange={(e) => setPicks(e.target.value)}
                  placeholder="Share your weekly picks..."
                  className="w-full bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white">
                Share Picks
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </form>
            {picksSuccess && <p className="text-green-400 mt-4">{picksSuccess}</p>}
            {picksError && <p className="text-red-400 mt-4">{picksError}</p>}
          </CardContent>
        </Card>
      </section>

      {/* Display Shared Picks */}
      <section className="space-y-6">
    <h2 className="text-3xl font-bold text-center text-blue-400">
      Submitted Picks
    </h2>
    <Card className="bg-gray-800 border-blue-400">
      <CardContent className="p-6 space-y-4">
        {picksList.length > 0 ? (
          picksList.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b border-gray-700 pb-2 mb-2"
            >
              {/* Left side: User Name and Content */}
              <div>
                <p className="text-blue-400 font-bold">{item.name}</p>
                <p className="text-gray-300">{item.content}</p>
                <p className="text-gray-500 text-sm">
                  <strong>Shared at:</strong>{" "}
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </div>

              {/* Right side: Thumbs Up/Down and Vote Counts */}
              <div className="flex items-center space-x-4">
                {/* Upvote */}
                <button
                  onClick={() => handleVote(item.id, "upvote")}
                  className="flex items-center space-x-1 text-green-400 hover:text-green-300"
                >
                  <ThumbsUp className="w-5 h-5" />
                  <span className="text-white">{item.upvotes || 0}</span>
                </button>

                {/* Downvote */}
                <button
                  onClick={() => handleVote(item.id, "downvote")}
                  className="flex items-center space-x-1 text-red-400 hover:text-red-300"
                >
                  <ThumbsDown className="w-5 h-5" />
                  <span className="text-white">{item.downvotes || 0}</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400">No picks shared yet.</p>
        )}
      </CardContent>
    </Card>
  </section>
    </div>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Users,
  Shield,
  ArrowRight,
  Send,
} from "lucide-react";

export default function Home() {
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

      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-center text-blue-400">
          Help Us Improve
        </h2>
        <Card className="bg-gray-800 border-blue-400">
          <CardContent className="p-6">
            <form className="space-y-4">
              <div>
                <label
                  htmlFor="feedback"
                  className="block text-sm font-medium text-gray-400 mb-1"
                >
                  Your Feedback
                </label>
                <Textarea
                  id="feedback"
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
                  placeholder="Enter your email"
                  className="w-full bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Submit Feedback
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

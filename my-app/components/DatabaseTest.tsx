"use client";

import { useState, useEffect } from "react";
import supabase from "../app/supabaseClient";

export default function DatabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState("Testing...");
  const [testResults, setTestResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runDatabaseTests = async () => {
    setConnectionStatus("Running tests...");
    setTestResults([]);
    setError(null);

    const tests = [
      {
        name: "Environment Variables Test",
        test: async () => {
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          
          if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
          if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
          if (!url.startsWith("https://")) throw new Error("Supabase URL must start with https://");
          if (!url.includes("supabase.co")) throw new Error("Supabase URL must contain 'supabase.co'");
          
          return { 
            success: true, 
            message: "Environment variables are properly configured", 
            data: { url: url.substring(0, 30) + "...", keyLength: key.length }
          };
        },
      },
      {
        name: "Supabase Client Test",
        test: async () => {
          // Test if the supabase client is properly initialized
          if (!supabase) throw new Error("Supabase client is not initialized");
          
          // Try a simple ping to the Supabase API
          const { data, error } = await supabase
            .from("teams")
            .select("count")
            .limit(1);
          
          if (error) throw error;
          return { success: true, message: "Supabase client connection successful", data };
        },
      },
      {
        name: "Basic Connection Test",
        test: async () => {
          const { data, error } = await supabase
            .from("teams")
            .select("count")
            .limit(1);
          if (error) throw error;
          return { success: true, message: "Connection successful", data };
        },
      },
      {
        name: "Teams Table Test",
        test: async () => {
          const { data, error } = await supabase
            .from("teams")
            .select("*")
            .limit(5);
          if (error) throw error;
          return {
            success: true,
            message: `Found ${data?.length || 0} teams`,
            data,
          };
        },
      },
      {
        name: "Weekly Leaders Test",
        test: async () => {
          const { data, error } = await supabase
            .from("weekly_leaders")
            .select("*")
            .limit(5);
          if (error) throw error;
          return {
            success: true,
            message: `Found ${data?.length || 0} weekly leaders`,
            data,
          };
        },
      },
      {
        name: "Hot Players Test",
        test: async () => {
          const { data, error } = await supabase
            .from("hot_players")
            .select("*")
            .limit(5);
          if (error) throw error;
          return {
            success: true,
            message: `Found ${data?.length || 0} hot players`,
            data,
          };
        },
      },
      {
        name: "Cold Players Test",
        test: async () => {
          const { data, error } = await supabase
            .from("cold_players")
            .select("*")
            .limit(5);
          if (error) throw error;
          return {
            success: true,
            message: `Found ${data?.length || 0} cold players`,
            data,
          };
        },
      },
      {
        name: "Players to Watch Test",
        test: async () => {
          const { data, error } = await supabase
            .from("players_to_watch")
            .select("*")
            .limit(5);
          if (error) throw error;
          return {
            success: true,
            message: `Found ${data?.length || 0} players to watch`,
            data,
          };
        },
      },
      {
        name: "Defensive Matchup Rankings Test",
        test: async () => {
          const { data, error } = await supabase
            .from("defensive_matchup_rankings")
            .select("*")
            .limit(5);
          if (error) throw error;
          return {
            success: true,
            message: `Found ${data?.length || 0} defensive rankings`,
            data,
          };
        },
      },
      {
        name: "All Defense Averages Test",
        test: async () => {
          const { data, error } = await supabase
            .from("all_defense_averages")
            .select("*")
            .limit(5);
          if (error) throw error;
          return {
            success: true,
            message: `Found ${data?.length || 0} defense averages`,
            data,
          };
        },
      },
      {
        name: "Player List Test",
        test: async () => {
          const { data, error } = await supabase
            .from("player_list")
            .select("*")
            .limit(5);
          if (error) throw error;
          return {
            success: true,
            message: `Found ${data?.length || 0} players in list`,
            data,
          };
        },
      },
      {
        name: "Feedback Table Test",
        test: async () => {
          const { data, error } = await supabase
            .from("feedback")
            .select("*")
            .limit(5);
          if (error) throw error;
          return {
            success: true,
            message: `Found ${data?.length || 0} feedback entries`,
            data,
          };
        },
      },
      {
        name: "Picks Table Test",
        test: async () => {
          const { data, error } = await supabase
            .from("picks")
            .select("*")
            .limit(5);
          if (error) throw error;
          return {
            success: true,
            message: `Found ${data?.length || 0} picks`,
            data,
          };
        },
      },
    ];

    const results = [];

    for (const test of tests) {
      try {
        console.log(`Running test: ${test.name}`);
        const result = await test.test();
        results.push({
          name: test.name,
          success: true,
          message: result.message,
          data: result.data,
          timestamp: new Date().toLocaleTimeString(),
        });
        console.log(`✅ ${test.name}: ${result.message}`);
      } catch (err: any) {
        console.error(`❌ ${test.name}:`, err);
        results.push({
          name: test.name,
          success: false,
          message: err.message || "Unknown error",
          error: err,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    }

    setTestResults(results);
    setConnectionStatus("Tests completed");
  };

  useEffect(() => {
    runDatabaseTests();
  }, []);

  const getStatusColor = (success: boolean) => {
    return success ? "text-green-400" : "text-red-400";
  };

  const getStatusIcon = (success: boolean) => {
    return success ? "✅" : "❌";
  };

  return (
    <div className="bg-gray-800 border border-blue-400 rounded-lg p-6 space-y-4">
      <h2 className="text-2xl font-bold text-blue-400">
        Database Connection Test
      </h2>

      <div className="flex items-center space-x-2">
        <span className="text-gray-300">Status:</span>
        <span className="text-blue-400 font-semibold">{connectionStatus}</span>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-400 rounded p-4">
          <h3 className="text-red-400 font-bold">Connection Error:</h3>
          <p className="text-red-300">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-300">Test Results:</h3>
        {testResults.map((result, index) => (
          <div key={index} className="bg-gray-700 rounded p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>{getStatusIcon(result.success)}</span>
                <span className="font-medium text-gray-200">{result.name}</span>
              </div>
              <span className="text-sm text-gray-400">{result.timestamp}</span>
            </div>
            <p className={`mt-1 ${getStatusColor(result.success)}`}>
              {result.message}
            </p>
            {result.data && result.data.length > 0 && (
              <details className="mt-2">
                <summary className="text-sm text-blue-400 cursor-pointer">
                  View Sample Data ({result.data.length} items)
                </summary>
                <pre className="mt-2 text-xs bg-gray-800 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            )}
            {result.error && (
              <details className="mt-2">
                <summary className="text-sm text-red-400 cursor-pointer">
                  View Error Details
                </summary>
                <pre className="mt-2 text-xs bg-red-900 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(result.error, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={runDatabaseTests}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
      >
        Run Tests Again
      </button>

      <div className="bg-gray-700 rounded p-4">
        <h3 className="text-lg font-semibold text-gray-300 mb-2">
          Environment Check:
        </h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Supabase URL:</span>
            <span className="text-gray-200">
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Supabase Anon Key:</span>
            <span className="text-gray-200">
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                ? "✅ Set"
                : "❌ Missing"}
            </span>
          </div>
          <div className="mt-2 p-2 bg-gray-800 rounded">
            <div className="text-xs text-gray-400">URL Value:</div>
            <div className="text-xs text-gray-300 break-all">
              {process.env.NEXT_PUBLIC_SUPABASE_URL || "Not set"}
            </div>
          </div>
          <div className="mt-2 p-2 bg-gray-800 rounded">
            <div className="text-xs text-gray-400">
              Key Value (first 20 chars):
            </div>
            <div className="text-xs text-gray-300">
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(
                    0,
                    20
                  )}...`
                : "Not set"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

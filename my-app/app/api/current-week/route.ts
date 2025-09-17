import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const configPath = path.join(process.cwd(), "config", "current-week.json");

    if (!fs.existsSync(configPath)) {
      return NextResponse.json({ currentWeek: 1 }, { status: 200 });
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return NextResponse.json(config);
  } catch (error) {
    console.error("Error reading current week config:", error);
    return NextResponse.json({ currentWeek: 1 }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const { currentWeek } = await request.json();

    if (!currentWeek || currentWeek < 1 || currentWeek > 18) {
      return NextResponse.json(
        { error: "Invalid week number. Must be between 1 and 18." },
        { status: 400 }
      );
    }

    const config = {
      currentWeek,
      lastUpdated: new Date().toISOString(),
      season: "2025",
    };

    // Use the same path resolution logic as GET
    const possiblePaths = [
      path.join(process.cwd(), "config", "current-week.json"),
      path.join(process.cwd(), "my-app", "config", "current-week.json"),
      path.join(__dirname, "..", "..", "..", "config", "current-week.json"),
      path.join(__dirname, "..", "..", "config", "current-week.json"),
    ];

    let configPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        configPath = testPath;
        break;
      }
    }

    // If no existing config found, use the first possible path
    if (!configPath) {
      configPath = possiblePaths[0];
    }

    const configDir = path.dirname(configPath);

    // Ensure config directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error updating current week config:", error);
    return NextResponse.json(
      { error: "Failed to update current week" },
      { status: 500 }
    );
  }
}

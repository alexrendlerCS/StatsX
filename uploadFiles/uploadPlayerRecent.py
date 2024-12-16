import psycopg2
from psycopg2.extras import execute_values

# Database connection details
SUPABASE_HOST = "aws-0-us-west-1.pooler.supabase.com"
SUPABASE_PORT = 6543
SUPABASE_DB = "postgres"
SUPABASE_USER = "postgres.xrstrludepuahpovxpzb"
SUPABASE_PASSWORD = "AZ1d3Tab7my1TubG"

def connect_db():
    """Establish connection to the database."""
    try:
        return psycopg2.connect(
            host=SUPABASE_HOST,
            port=SUPABASE_PORT,
            dbname=SUPABASE_DB,
            user=SUPABASE_USER,
            password=SUPABASE_PASSWORD,
            sslmode="require"
        )
    except Exception as e:
        print(f"Error connecting to database: {e}")
        raise

def clear_recent_stats():
    """Clear all data from the recent_player_stats table."""
    query = "DELETE FROM recent_player_stats;"
    conn = connect_db()
    cursor = conn.cursor()
    try:
        cursor.execute(query)
        conn.commit()
        print("Cleared all data from recent_player_stats.")
    except Exception as e:
        print(f"Error clearing recent_player_stats: {e}")
    finally:
        cursor.close()
        conn.close()

def fetch_recent_stats(current_week):
    """
    Fetch stats for the given week and the two weeks prior.
    
    Args:
        current_week (int): The current NFL week.
    
    Returns:
        list: List of tuples containing recent stats data.
    """
    query = """
        SELECT
            player_name,
            position_id,
            week,
            team_id,
            passing_attempts,
            completions,
            passing_yards,
            passing_tds,
            interceptions,
            rushing_attempts,
            rushing_yards,
            rushing_tds,
            receptions,
            receiving_yards,
            receiving_tds,
            targets
        FROM player_stats
        WHERE week IN (%s, %s, %s);
    """
    weeks = (current_week, current_week - 1, current_week - 2)
    conn = connect_db()
    cursor = conn.cursor()
    try:
        cursor.execute(query, weeks)
        results = cursor.fetchall()
        print(f"Fetched {len(results)} rows of recent stats.")
        return results
    except Exception as e:
        print(f"Error fetching recent stats: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

def upload_recent_stats(recent_stats):
    """
    Upload recent stats data to the recent_player_stats table.
    
    Args:
        recent_stats (list): List of tuples containing recent stats data.
    """
    if not recent_stats:
        print("No data to upload.")
        return

    query = """
        INSERT INTO recent_player_stats (
            player_name,
            position_id,
            week,
            team_id,
            passing_attempts,
            completions,
            passing_yards,
            passing_tds,
            interceptions,
            rushing_attempts,
            rushing_yards,
            rushing_tds,
            receptions,
            receiving_yards,
            receiving_tds,
            targets
        ) VALUES %s;
    """
    conn = connect_db()
    cursor = conn.cursor()
    try:
        execute_values(cursor, query, recent_stats)
        conn.commit()
        print(f"Uploaded {len(recent_stats)} rows to recent_player_stats.")
    except Exception as e:
        print(f"Error uploading recent stats: {e}")
    finally:
        cursor.close()
        conn.close()

def main():
    """Main function to clear, fetch, and upload recent player stats."""
    current_week = int(input("Enter the current NFL week (e.g., 5): "))
    if current_week < 3:
        print("Invalid week. Must be 3 or greater to fetch 3 weeks of data.")
        return

    # Step 1: Clear the table
    clear_recent_stats()

    # Step 2: Fetch recent stats
    recent_stats = fetch_recent_stats(current_week)

    # Step 3: Upload the new recent stats
    upload_recent_stats(recent_stats)

if __name__ == "__main__":
    main()

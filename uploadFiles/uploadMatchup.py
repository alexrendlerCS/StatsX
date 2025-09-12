import csv
import psycopg2
from psycopg2.extras import execute_values
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('../my-app/.env')

# Supabase credentials from env
SUPABASE_HOST = os.getenv("SUPABASE_HOST")
SUPABASE_PORT = os.getenv("SUPABASE_PORT")
SUPABASE_DB = os.getenv("SUPABASE_DB")
SUPABASE_USER = os.getenv("SUPABASE_USER")
SUPABASE_PASSWORD = os.getenv("SUPABASE_PASSWORD")

# Connect to Supabase database
def connect_db():
    try:
        print("Connecting to the database...")
        conn = psycopg2.connect(
            host=SUPABASE_HOST,
            port=SUPABASE_PORT,
            dbname=SUPABASE_DB,
            user=SUPABASE_USER,
            password=SUPABASE_PASSWORD,
            sslmode="require"
        )
        print("Database connection successful.")
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        raise

# Read the schedule grid from a CSV file
# Read the schedule grid from a CSV file
def read_schedule_csv(file_path):
    print(f"Reading schedule from CSV file: {file_path}...")
    schedule_data = []

    try:
        with open(file_path, mode="r") as csv_file:
            reader = csv.reader(csv_file)
            headers = next(reader)  # Skip the first row (column names)

            for row in reader:
                team_id = row[0]  # Use the first column directly as team_id

                # Loop through the remaining columns (weeks)
                for week, opponent in enumerate(row[1:], start=1):
                    schedule_data.append((team_id, week, opponent.strip()))

        print(f"Successfully read {len(schedule_data)} records from the CSV file.")
        return schedule_data
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        raise


# Upload schedule data to the database
def upload_schedule_to_db(schedule_data):
    query = """
        INSERT INTO team_schedule (team_id, week, opponent_id)
        VALUES %s
        ON CONFLICT (team_id, week) DO UPDATE SET opponent_id = EXCLUDED.opponent_id;
    """
    try:
        print("Uploading schedule data to the database...")
        conn = connect_db()
        cursor = conn.cursor()
        print(f"Inserting {len(schedule_data)} records into the database...")
        execute_values(cursor, query, schedule_data)
        conn.commit()
        cursor.close()
        conn.close()
        print("Schedule data uploaded successfully.")
    except Exception as e:
        print(f"Error uploading schedule data: {e}")

# Main function
def main():
    csv_file_path = "nfl_schedule.csv"  # Path to the CSV file

    print("Script execution started.")
    try:
        print("Starting the process...")
        print("Reading schedule from the CSV file...")
        schedule_data = read_schedule_csv(csv_file_path)
        print(f"Read {len(schedule_data)} records from the CSV file.")

        print("Uploading schedule to the database...")
        upload_schedule_to_db(schedule_data)
        print("Process completed successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()

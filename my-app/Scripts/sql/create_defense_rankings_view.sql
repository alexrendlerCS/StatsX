-- Materialized view: defense_rankings
-- Computes defensive rankings integrating QB and non-QB sources.
-- For non-QB positions, metrics come from `defense_averages`.
-- For QB, metrics come from `defense_averages_qb`.
CREATE MATERIALIZED VIEW IF NOT EXISTS defense_rankings AS
WITH base AS (
  -- non-QB positions
  SELECT
    team_id,
    position_id,
    NULL::numeric AS avg_passing_yards,
    avg_rushing_yards,
    avg_receiving_yards
  FROM defense_averages
  UNION ALL
  -- QB-specific averages
  SELECT
    team_id,
    'QB'::varchar AS position_id,
    avg_passing_yards,
    NULL::numeric AS avg_rushing_yards,
    NULL::numeric AS avg_receiving_yards
  FROM defense_averages_qb
),
pass_ranks AS (
  SELECT team_id, position_id, avg_passing_yards,
    RANK() OVER (PARTITION BY position_id ORDER BY avg_passing_yards ASC NULLS LAST) AS pass_rank
  FROM base
  WHERE avg_passing_yards IS NOT NULL
),
rush_ranks AS (
  SELECT team_id, position_id, avg_rushing_yards,
    RANK() OVER (PARTITION BY position_id ORDER BY avg_rushing_yards ASC NULLS LAST) AS rush_rank
  FROM base
  WHERE avg_rushing_yards IS NOT NULL
),
receive_ranks AS (
  SELECT team_id, position_id, avg_receiving_yards,
    RANK() OVER (PARTITION BY position_id ORDER BY avg_receiving_yards ASC NULLS LAST) AS receive_rank
  FROM base
  WHERE avg_receiving_yards IS NOT NULL
)
SELECT
  b.team_id,
  b.position_id,
  b.avg_passing_yards,
  b.avg_rushing_yards,
  b.avg_receiving_yards,
  pr.pass_rank,
  rr.rush_rank,
  er.receive_rank,
  -- composite: average of available ranks (ignore NULLs)
  (
    (CASE WHEN pr.pass_rank IS NOT NULL THEN pr.pass_rank::numeric ELSE 0 END)
    + (CASE WHEN rr.rush_rank IS NOT NULL THEN rr.rush_rank::numeric ELSE 0 END)
    + (CASE WHEN er.receive_rank IS NOT NULL THEN er.receive_rank::numeric ELSE 0 END)
  ) / GREATEST(
    (CASE WHEN pr.pass_rank IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN rr.rush_rank IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN er.receive_rank IS NOT NULL THEN 1 ELSE 0 END), 1
  ) AS composite_rank
FROM base b
LEFT JOIN pass_ranks pr ON pr.team_id = b.team_id AND pr.position_id = b.position_id
LEFT JOIN rush_ranks rr ON rr.team_id = b.team_id AND rr.position_id = b.position_id
LEFT JOIN receive_ranks er ON er.team_id = b.team_id AND er.position_id = b.position_id;

-- Optional: grant select to anon role or specific DB roles
-- GRANT SELECT ON defense_rankings TO anon;

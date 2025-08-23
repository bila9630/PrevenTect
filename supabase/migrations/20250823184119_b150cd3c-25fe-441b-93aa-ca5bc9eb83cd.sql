-- Add GWR_EGID column to claims table
ALTER TABLE public.claims
ADD COLUMN IF NOT EXISTS gwr_egid text;

-- Index to speed up lookups by EGID
CREATE INDEX IF NOT EXISTS idx_claims_gwr_egid ON public.claims (gwr_egid);

-- Documentation
COMMENT ON COLUMN public.claims.gwr_egid IS 'Swiss building ID (EGID) from GWR; stored as text to preserve leading zeros.';
-- Migration: add protocol/mindshare models for UAW

CREATE TABLE IF NOT EXISTS protocols (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  chain_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS protocol_contracts (
  id SERIAL PRIMARY KEY,
  protocol_id INTEGER NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  chain_id INTEGER NOT NULL,
  address TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (protocol_id, chain_id, address)
);

CREATE INDEX IF NOT EXISTS protocol_contracts_chain_address_idx ON protocol_contracts (chain_id, address);

CREATE TABLE IF NOT EXISTS protocol_event_maps (
  id SERIAL PRIMARY KEY,
  protocol_id INTEGER NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  event_sig TEXT NOT NULL,
  user_field_paths_json JSONB NOT NULL,
  is_meaningful BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS protocol_event_maps_chain_address_idx ON protocol_event_maps (chain_id, contract_address);

CREATE TABLE IF NOT EXISTS raw_interactions (
  id SERIAL PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  protocol_id INTEGER NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  wallet TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  block_time TIMESTAMP WITH TIME ZONE NOT NULL,
  day DATE NOT NULL,
  source TEXT NOT NULL,
  action_count INTEGER DEFAULT 1,
  wallet_type TEXT,
  raw_json JSONB,
  UNIQUE (chain_id, protocol_id, wallet, tx_hash)
);

CREATE INDEX IF NOT EXISTS raw_interactions_protocol_day_idx ON raw_interactions (protocol_id, day);

CREATE TABLE IF NOT EXISTS protocol_metrics (
  id SERIAL PRIMARY KEY,
  protocol_id INTEGER NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  chain_id INTEGER NOT NULL,
  "window" TEXT NOT NULL,
  as_of TIMESTAMP WITH TIME ZONE NOT NULL,
  uaw_direct INTEGER NOT NULL DEFAULT 0,
  uaw_event INTEGER NOT NULL DEFAULT 0,
  uaw_attributed INTEGER NOT NULL DEFAULT 0,
  eoa_uaw INTEGER NOT NULL DEFAULT 0,
  sw_uaw INTEGER NOT NULL DEFAULT 0,
  repeat_rate NUMERIC NOT NULL DEFAULT 0,
  median_actions_per_wallet NUMERIC NOT NULL DEFAULT 0,
  value_moved_usd NUMERIC,
  score NUMERIC
);

CREATE INDEX IF NOT EXISTS protocol_metrics_protocol_asof_idx ON protocol_metrics (protocol_id, as_of);

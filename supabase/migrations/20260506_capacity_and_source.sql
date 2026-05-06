-- Da Mesa migration: capacity limits + booking source tracking
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. Restaurant slot capacity (max total people per 30-min slot)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS max_capacity integer DEFAULT 20;

-- 2. Booking source: 'platform' = came via damesa.pt, 'direct' = restaurant's own link (?src=direct)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source varchar(20) DEFAULT 'platform';

-- Set existing bookings to 'platform' (retroactive)
UPDATE bookings SET source = 'platform' WHERE source IS NULL;

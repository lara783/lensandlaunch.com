-- Add shoot booking toggle and URL fields to proposals
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS shoot_booking_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS shoot_booking_url TEXT DEFAULT 'https://meetings-ap1.hubspot.com/lara-lawson/shoot-scheduler-';

ALTER TABLE "rental_requests" ADD COLUMN IF NOT EXISTS "pickup_availability" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "rental_requests" ADD COLUMN IF NOT EXISTS "return_availability" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "pickup_availability" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "return_availability" jsonb DEFAULT '[]'::jsonb;

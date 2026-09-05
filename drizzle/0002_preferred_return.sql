ALTER TABLE "rental_requests" ADD COLUMN IF NOT EXISTS "preferred_pickup_at" timestamp;
ALTER TABLE "rental_requests" ADD COLUMN IF NOT EXISTS "preferred_return_at" timestamp;
ALTER TABLE "rental_requests" ADD COLUMN IF NOT EXISTS "requested_days" integer DEFAULT 7 NOT NULL;
ALTER TABLE "rental_requests" ADD COLUMN IF NOT EXISTS "renter_notes" text;
ALTER TABLE "rental_requests" ADD COLUMN IF NOT EXISTS "needs_training" boolean DEFAULT false NOT NULL;

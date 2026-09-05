ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "scheduled_pickup_at" timestamp;
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "scheduled_return_at" timestamp;

UPDATE rentals r
SET
  scheduled_pickup_at = COALESCE(r.scheduled_pickup_at, rr.preferred_pickup_at),
  scheduled_return_at = COALESCE(r.scheduled_return_at, rr.preferred_return_at)
FROM rental_requests rr
WHERE r.request_id = rr.id;

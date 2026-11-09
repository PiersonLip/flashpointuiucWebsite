CREATE TABLE IF NOT EXISTS "board_members" (
  "id" text PRIMARY KEY NOT NULL,
  "role" text NOT NULL,
  "name" text NOT NULL,
  "image_url" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "gallery_photos" (
  "id" text PRIMARY KEY NOT NULL,
  "src" text NOT NULL,
  "alt" text DEFAULT '' NOT NULL,
  "photographer" text,
  "caption" text,
  "event" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

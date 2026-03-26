CREATE TABLE "post_media" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"public_id" text NOT NULL,
	"resource_type" text NOT NULL,
	"format" text,
	"secure_url" text NOT NULL,
	"width" integer,
	"height" integer,
	"bytes" integer,
	"original_filename" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_media_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_media_postId_idx" ON "post_media" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "post_media_resourceType_idx" ON "post_media" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "posts_userId_idx" ON "posts" USING btree ("user_id");
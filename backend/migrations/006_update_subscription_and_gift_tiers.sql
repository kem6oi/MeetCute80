-- Migration script to update subscription and gift tier related tables

BEGIN;

-- 1. Modify 'subscription_packages' table
-- Add UNIQUE constraint to tier_level to allow FK references
ALTER TABLE public.subscription_packages
ADD CONSTRAINT subscription_packages_tier_level_unique UNIQUE (tier_level);

-- 2. Modify 'subscription_features' table
-- Remove package_id column and its related objects
ALTER TABLE public.subscription_features
DROP CONSTRAINT IF EXISTS subscription_features_package_id_fkey;

DROP INDEX IF EXISTS public.idx_subscription_features_package;

ALTER TABLE public.subscription_features
DROP COLUMN IF EXISTS package_id;

-- Remove old columns (premium_only, elite_only)
ALTER TABLE public.subscription_features
DROP COLUMN IF EXISTS premium_only,
DROP COLUMN IF EXISTS elite_only;

-- Add new tier_level column if it doesn't exist
ALTER TABLE public.subscription_features
ADD COLUMN IF NOT EXISTS tier_level VARCHAR(20);

-- Add foreign key constraint for tier_level (using schema-consistent name)
-- Drop potentially conflicting old FK name first
ALTER TABLE public.subscription_features
DROP CONSTRAINT IF EXISTS fk_subscription_features_tier_level;

-- Drop constraint with the correct name if it already exists, to ensure idempotency
ALTER TABLE public.subscription_features
DROP CONSTRAINT IF EXISTS subscription_features_tier_level_fkey;

ALTER TABLE public.subscription_features
ADD CONSTRAINT subscription_features_tier_level_fkey
FOREIGN KEY (tier_level) REFERENCES public.subscription_packages(tier_level) ON DELETE SET NULL; -- Or ON DELETE CASCADE depending on desired behavior, SET NULL if tier_level can be NULL

-- Add index for tier_level
CREATE INDEX IF NOT EXISTS idx_subscription_features_tier_level ON public.subscription_features(tier_level);

-- 3. Modify 'feature_permissions' table
-- Change default for elite_access
ALTER TABLE public.feature_permissions
ALTER COLUMN elite_access SET DEFAULT false;

-- 4. Modify 'gift_items' table
-- Remove the existing foreign key constraint for tier_id (if it exists)
-- The name 'gift_items_tier_id_fkey' is based on the provided schema dump
ALTER TABLE public.gift_items
DROP CONSTRAINT IF EXISTS gift_items_tier_id_fkey;

-- Remove the old tier_id column
ALTER TABLE public.gift_items
DROP COLUMN IF EXISTS tier_id;

-- Add new required_tier_level column
ALTER TABLE public.gift_items
ADD COLUMN required_tier_level VARCHAR(20);

-- Add foreign key constraint for required_tier_level
ALTER TABLE public.gift_items
ADD CONSTRAINT fk_gift_items_required_tier_level
FOREIGN KEY (required_tier_level) REFERENCES public.subscription_packages(tier_level);

-- 5. Drop 'gift_tiers' table
-- This will also remove associated sequences, indexes, and constraints for gift_tiers
DROP TABLE IF EXISTS public.gift_tiers;

COMMIT;

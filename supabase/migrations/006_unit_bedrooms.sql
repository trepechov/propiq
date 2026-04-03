-- Migration: 006_unit_bedrooms.sql
-- Adds nullable bedrooms column to units table.
-- Meaningful for apartment/studio types; null for garage/parking/storage.
ALTER TABLE units ADD COLUMN bedrooms integer;

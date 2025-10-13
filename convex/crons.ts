/**
 * Convex Cron Jobs Configuration
 *
 * This file defines all scheduled jobs for the KeeperAI application.
 * Cron jobs run automatically at specified intervals on the Convex backend.
 *
 * Current Jobs:
 * 1. Book of the Day Selection - Runs daily at midnight UTC
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Daily Book of the Day Selection
 *
 * Runs every day at midnight UTC (00:00)
 * Automatically picks a new book from the curated pool
 * Maintains rolling 300-day window to avoid recent duplicates
 *
 * Schedule: Daily at 00:00 UTC
 * Function: internal.bookOfTheDay.pickBookOfTheDay
 * Idempotent: Safe to run multiple times per day
 */
crons.daily(
  "pick book of the day",
  { hourUTC: 0, minuteUTC: 0 }, // Midnight UTC
  internal.bookOfTheDay.pickBookOfTheDay,
  {} // No arguments
);

export default crons;

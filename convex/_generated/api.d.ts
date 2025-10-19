/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as analytics from "../analytics.js";
import type * as bookOfTheDay from "../bookOfTheDay.js";
import type * as books from "../books.js";
import type * as crons from "../crons.js";
import type * as favorites from "../favorites.js";
import type * as http from "../http.js";
import type * as readList from "../readList.js";
import type * as savedSummaries from "../savedSummaries.js";
import type * as seeding from "../seeding.js";
import type * as seedingHelpers from "../seedingHelpers.js";
import type * as summaries from "../summaries.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  bookOfTheDay: typeof bookOfTheDay;
  books: typeof books;
  crons: typeof crons;
  favorites: typeof favorites;
  http: typeof http;
  readList: typeof readList;
  savedSummaries: typeof savedSummaries;
  seeding: typeof seeding;
  seedingHelpers: typeof seedingHelpers;
  summaries: typeof summaries;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

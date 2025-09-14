import { internalMutation, query, QueryCtx } from "./_generated/server";
import { UserJSON } from "@clerk/backend";
import { v, Validator } from "convex/values";

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
  async handler(ctx, { data }) {
    const userAttributes = {
      name: `${data.first_name} ${data.last_name}`,
      email: data.email_addresses[0].email_address,
      externalId: data.id,
      preferences: [] as string[], // Initialize empty preferences array
      createdAt: Date.now(),
    };

    const user = await userByExternalId(ctx, data.id);
    if (user === null) {
      await ctx.db.insert("users", userAttributes);
    } else {
      await ctx.db.patch(user._id, userAttributes);
    }
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await userByExternalId(ctx, clerkUserId);

    if (user !== null) {
      await ctx.db.delete(user._id);
    } else {
      console.warn(
        `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`
      );
    }
  },
});

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("Can't get current user");
  return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userByExternalId(ctx, identity.subject);
}

async function userByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
    .unique();
}

export const getUser = async (ctx: QueryCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Called getUser without authentication present");
  }
  const user = await userByExternalId(ctx, identity.subject);
  if (!user) {
    throw new Error("Called getUser without authentication present");
  }
  return user;
};

export const updatePreferences = internalMutation({
  args: {
    userId: v.id("users"),
    newPreference: v.string(),
    maxPreferences: v.optional(v.number()),
  },
  async handler(ctx, { userId, newPreference, maxPreferences = 20 }) {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedPreferences = [
      newPreference,
      ...user.preferences.filter((p) => p !== newPreference),
    ].slice(0, maxPreferences);

    await ctx.db.patch(userId, {
      preferences: updatedPreferences,
    });
  },
});

export const getPreferences = query({
  args: {},
  returns: v.array(v.string()),
  async handler(ctx) {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }
    return user.preferences;
  },
});

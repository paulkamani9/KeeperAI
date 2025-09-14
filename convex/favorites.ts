import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";

export const addFavorite = mutation({
  args: {
    bookId: v.string(),
    bookTitle: v.string(),
    bookAuthor: v.string(),
    genre: v.optional(v.string()),
  },
  returns: v.id("favorites"),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Check if already favorited
    const existingFavorite = await ctx.db
      .query("favorites")
      .withIndex("byUserAndBook", (q) =>
        q.eq("userId", user._id).eq("bookId", args.bookId)
      )
      .first();

    if (existingFavorite) {
      throw new Error("Book is already in favorites");
    }

    return await ctx.db.insert("favorites", {
      userId: user._id,
      bookId: args.bookId,
      bookTitle: args.bookTitle,
      bookAuthor: args.bookAuthor,
      genre: args.genre,
      addedAt: Date.now(),
    });
  },
});

export const removeFavorite = mutation({
  args: {
    bookId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const favorite = await ctx.db
      .query("favorites")
      .withIndex("byUserAndBook", (q) =>
        q.eq("userId", user._id).eq("bookId", args.bookId)
      )
      .first();

    if (!favorite) {
      throw new Error("Book is not in favorites");
    }

    await ctx.db.delete(favorite._id);
    return null;
  },
});

export const getFavorites = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("favorites"),
      _creationTime: v.number(),
      bookId: v.string(),
      bookTitle: v.string(),
      bookAuthor: v.string(),
      genre: v.optional(v.string()),
      addedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    return await ctx.db
      .query("favorites")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const isFavorite = query({
  args: {
    bookId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const favorite = await ctx.db
      .query("favorites")
      .withIndex("byUserAndBook", (q) =>
        q.eq("userId", user._id).eq("bookId", args.bookId)
      )
      .first();

    return !!favorite;
  },
});

import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSavedSummaries } from "../useSavedSummaries";
import type { Id } from "../../../convex/_generated/dataModel";

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(),
}));

// Mock Convex
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

// Import mocked modules
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";

describe("useSavedSummaries", () => {
  const mockUser = { id: "user_123" };
  const mockSummaryId = "summary_123" as Id<"summaries">;
  const mockBookId = "google-books:abc123";

  const mockSaveMutation = vi.fn();
  const mockRemoveMutation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useMutation as any).mockImplementation((apiFunc: any) => {
      if (apiFunc.toString().includes("saveSummary")) {
        return mockSaveMutation;
      }
      return mockRemoveMutation;
    });
  });

  describe("Authentication State", () => {
    it("should return not authenticated when user is null", () => {
      (useUser as any).mockReturnValue({ user: null });
      (useQuery as any).mockReturnValue(undefined);

      const { result } = renderHook(() => useSavedSummaries(mockSummaryId));

      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should return authenticated when user exists", () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useQuery as any).mockReturnValue(false);

      const { result } = renderHook(() => useSavedSummaries(mockSummaryId));

      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe("Query State", () => {
    it("should skip query when user is not loaded", () => {
      (useUser as any).mockReturnValue({ user: null });
      const mockQueryFn = vi.fn();
      (useQuery as any).mockImplementation(mockQueryFn);

      renderHook(() => useSavedSummaries(mockSummaryId));

      expect(mockQueryFn).toHaveBeenCalledWith(expect.anything(), "skip");
    });

    it("should query when user and summaryId are present", () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      const mockQueryFn = vi.fn().mockReturnValue(false);
      (useQuery as any).mockImplementation(mockQueryFn);

      renderHook(() => useSavedSummaries(mockSummaryId));

      expect(mockQueryFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: mockUser.id,
          summaryId: mockSummaryId,
        })
      );
    });

    it("should return isSaved as false when query returns false", () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useQuery as any).mockReturnValue(false);

      const { result } = renderHook(() => useSavedSummaries(mockSummaryId));

      expect(result.current.isSaved).toBe(false);
    });

    it("should return isSaved as true when query returns true", () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useQuery as any).mockReturnValue(true);

      const { result } = renderHook(() => useSavedSummaries(mockSummaryId));

      expect(result.current.isSaved).toBe(true);
    });

    it("should return isLoading as true when query is undefined", () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useQuery as any).mockReturnValue(undefined);

      const { result } = renderHook(() => useSavedSummaries(mockSummaryId));

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("toggleSave Function", () => {
    it("should throw error when user is not authenticated", async () => {
      (useUser as any).mockReturnValue({ user: null });
      (useQuery as any).mockReturnValue(false);

      const { result } = renderHook(() => useSavedSummaries(mockSummaryId));

      await expect(result.current.toggleSave(mockBookId)).rejects.toThrow(
        "Must be authenticated to save summaries"
      );
    });

    it("should throw error when summaryId is not provided", async () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useQuery as any).mockReturnValue(false);

      const { result } = renderHook(() => useSavedSummaries(undefined));

      await expect(result.current.toggleSave(mockBookId)).rejects.toThrow(
        "Summary ID is required"
      );
    });

    it("should call saveSummary when not currently saved", async () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useQuery as any).mockReturnValue(false); // Not saved
      mockSaveMutation.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSavedSummaries(mockSummaryId));

      await result.current.toggleSave(mockBookId);

      await waitFor(() => {
        expect(mockSaveMutation).toHaveBeenCalledWith({
          userId: mockUser.id,
          bookId: mockBookId,
          summaryId: mockSummaryId,
        });
      });
    });

    it("should call removeSavedSummary when currently saved", async () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useQuery as any).mockReturnValue(true); // Already saved
      mockRemoveMutation.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSavedSummaries(mockSummaryId));

      await result.current.toggleSave(mockBookId);

      await waitFor(() => {
        expect(mockRemoveMutation).toHaveBeenCalledWith({
          userId: mockUser.id,
          summaryId: mockSummaryId,
        });
      });
    });

    it("should not call mutations when summaryId is undefined", async () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useQuery as any).mockReturnValue(false);

      const { result } = renderHook(() => useSavedSummaries(undefined));

      await expect(result.current.toggleSave(mockBookId)).rejects.toThrow();

      expect(mockSaveMutation).not.toHaveBeenCalled();
      expect(mockRemoveMutation).not.toHaveBeenCalled();
    });
  });

  describe("Type Casting", () => {
    it("should accept string summaryId and cast to Convex ID", () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      const mockQueryFn = vi.fn().mockReturnValue(false);
      (useQuery as any).mockImplementation(mockQueryFn);

      const stringSummaryId = "summary_456";
      renderHook(() => useSavedSummaries(stringSummaryId));

      // Should not throw type error and should query
      expect(mockQueryFn).toHaveBeenCalled();
    });

    it("should accept Convex ID summaryId", () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      const mockQueryFn = vi.fn().mockReturnValue(false);
      (useQuery as any).mockImplementation(mockQueryFn);

      const convexId = mockSummaryId as Id<"summaries">;
      renderHook(() => useSavedSummaries(convexId));

      // Should not throw type error and should query
      expect(mockQueryFn).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined summaryId gracefully", () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useQuery as any).mockReturnValue(undefined);

      const { result } = renderHook(() => useSavedSummaries(undefined));

      expect(result.current.isSaved).toBe(false);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("should handle mutation errors gracefully", async () => {
      (useUser as any).mockReturnValue({ user: mockUser });
      (useQuery as any).mockReturnValue(false);
      const mockError = new Error("Network error");
      mockSaveMutation.mockRejectedValue(mockError);

      const { result } = renderHook(() => useSavedSummaries(mockSummaryId));

      await expect(result.current.toggleSave(mockBookId)).rejects.toThrow(
        "Network error"
      );
    });
  });
});

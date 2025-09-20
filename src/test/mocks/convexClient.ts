/**
 * Mock Convex client for testing
 *
 * Provides a simple mock implementation of Convex client methods
 * for testing summary persistence flows without requiring real Convex backend.
 */

import { vi } from "vitest";

interface MockConvexClient {
  query: ReturnType<typeof vi.fn>;
  mutation: ReturnType<typeof vi.fn>;
  action: ReturnType<typeof vi.fn>;
  queries: ReturnType<typeof vi.fn>;
  mutations: ReturnType<typeof vi.fn>;
  actions: ReturnType<typeof vi.fn>;
  reset: () => void;
  mockQuery: (name: string, result: any) => void;
  mockMutation: (name: string, result: any) => void;
  mockAction: (name: string, result: any) => void;
}

export function createMockConvexClient(): MockConvexClient {
  const queryMocks = new Map<string, any>();
  const mutationMocks = new Map<string, any>();
  const actionMocks = new Map<string, any>();

  const query = vi.fn((name: string, args?: any) => {
    const result = queryMocks.get(name);
    if (result === undefined) {
      throw new Error(`Mock not configured for query: ${name}`);
    }
    return Promise.resolve(result);
  });

  const mutation = vi.fn((name: string, args?: any) => {
    const result = mutationMocks.get(name);
    if (result === undefined) {
      throw new Error(`Mock not configured for mutation: ${name}`);
    }
    return Promise.resolve(result);
  });

  const action = vi.fn((name: string, args?: any) => {
    const result = actionMocks.get(name);
    if (result === undefined) {
      throw new Error(`Mock not configured for action: ${name}`);
    }
    return Promise.resolve(result);
  });

  return {
    query,
    mutation,
    action,
    queries: query,
    mutations: mutation,
    actions: action,
    reset: () => {
      queryMocks.clear();
      mutationMocks.clear();
      actionMocks.clear();
      vi.clearAllMocks();
    },
    mockQuery: (name: string, result: any) => {
      queryMocks.set(name, result);
    },
    mockMutation: (name: string, result: any) => {
      mutationMocks.set(name, result);
    },
    mockAction: (name: string, result: any) => {
      actionMocks.set(name, result);
    },
  };
}

/**
 * Mock Convex React hooks for component testing
 */
export function createMockConvexHooks() {
  const mockClient = createMockConvexClient();

  return {
    useConvex: vi.fn(() => mockClient),
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useAction: vi.fn(),
    client: mockClient,
  };
}

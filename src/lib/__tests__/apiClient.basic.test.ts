import { describe, it, expect, beforeEach } from "vitest";
import { ApiClient, createApiClient, apiClient } from "../apiClient";

describe("ApiClient", () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient({
      timeout: 5000,
      retryAttempts: 2,
      retryDelay: 500,
    });
  });

  describe("Constructor and Configuration", () => {
    it("should create client with default configuration", () => {
      const defaultClient = new ApiClient();
      expect(defaultClient).toBeInstanceOf(ApiClient);
    });

    it("should create client with custom configuration", () => {
      const customClient = new ApiClient({
        baseURL: "https://api.example.com",
        timeout: 5000,
        retryAttempts: 5,
        retryDelay: 2000,
      });

      expect(customClient).toBeInstanceOf(ApiClient);
    });
  });

  describe("Factory Functions", () => {
    it("should export default apiClient instance", () => {
      expect(apiClient).toBeInstanceOf(ApiClient);
    });

    it("should create new client with createApiClient", () => {
      const customConfig = { timeout: 5000 };
      const newClient = createApiClient(customConfig);

      expect(newClient).toBeInstanceOf(ApiClient);
    });

    it("should create independent client instances", () => {
      const client1 = createApiClient({ timeout: 1000 });
      const client2 = createApiClient({ timeout: 2000 });

      expect(client1).toBeInstanceOf(ApiClient);
      expect(client2).toBeInstanceOf(ApiClient);
      expect(client1).not.toBe(client2);
    });
  });

  describe("Axios Instance Access", () => {
    it("should provide access to underlying Axios instance", () => {
      const axiosInstance = client.getAxiosInstance();
      expect(axiosInstance).toBeDefined();
      expect(typeof axiosInstance.get).toBe("function");
      expect(typeof axiosInstance.post).toBe("function");
      expect(typeof axiosInstance.put).toBe("function");
      expect(typeof axiosInstance.delete).toBe("function");
    });
  });

  describe("HTTP Methods", () => {
    it("should have all standard HTTP methods", () => {
      expect(typeof client.get).toBe("function");
      expect(typeof client.post).toBe("function");
      expect(typeof client.put).toBe("function");
      expect(typeof client.delete).toBe("function");
    });
  });

  describe("Configuration Handling", () => {
    it("should handle partial configuration override", () => {
      const partialClient = new ApiClient({ timeout: 15000 });
      expect(partialClient).toBeInstanceOf(ApiClient);
    });

    it("should handle empty configuration", () => {
      const emptyClient = new ApiClient({});
      expect(emptyClient).toBeInstanceOf(ApiClient);
    });

    it("should handle undefined configuration", () => {
      const undefinedClient = new ApiClient(undefined);
      expect(undefinedClient).toBeInstanceOf(ApiClient);
    });
  });

  describe("Type Safety", () => {
    it("should support generic type parameters", () => {
      // This test verifies TypeScript compilation with generic types
      // The actual network request will be tested in integration tests
      expect(typeof client.get<{ id: number }>).toBe("function");
      expect(typeof client.post<{ success: boolean }>).toBe("function");
      expect(typeof client.put<{ updated: boolean }>).toBe("function");
      expect(typeof client.delete<{ deleted: boolean }>).toBe("function");
    });
  });
});

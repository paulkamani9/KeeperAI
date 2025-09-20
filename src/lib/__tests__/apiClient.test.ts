import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiClient, createApiClient, apiClient } from "../apiClient";

// Mock axios module
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  request: vi.fn(),
  interceptors: {
    request: {
      use: vi.fn(),
    },
    response: {
      use: vi.fn(),
    },
  },
};

const mockAxiosCreate = vi.fn().mockReturnValue(mockAxiosInstance);

vi.mock("axios", () => ({
  default: {
    create: mockAxiosCreate,
    isAxiosError: vi.fn(),
  },
  isAxiosError: vi.fn(),
}));

describe("ApiClient", () => {
  let client: ApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ApiClient();
  });

  describe("Constructor and Configuration", () => {
    it("should create client with default configuration", () => {
      expect(mockAxiosCreate).toHaveBeenCalledWith({
        baseURL: "",
        timeout: 10000,
      });
    });

    it("should create client with custom configuration", () => {
       new ApiClient({
        baseURL: "https://api.example.com",
        timeout: 5000,
        retryAttempts: 5,
        retryDelay: 2000,
      });

      expect(mockAxiosCreate).toHaveBeenLastCalledWith({
        baseURL: "https://api.example.com",
        timeout: 5000,
      });
    });

    it("should setup request and response interceptors", () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe("HTTP Methods", () => {
    const mockResponseData = { id: 1, title: "Test Book" };
    const mockResponse = { data: mockResponseData };

    beforeEach(() => {
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      mockAxiosInstance.put.mockResolvedValue(mockResponse);
      mockAxiosInstance.delete.mockResolvedValue(mockResponse);
    });

    it("should make GET request and return data", async () => {
      const result = await client.get("/books/1");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/books/1", undefined);
      expect(result).toEqual(mockResponseData);
    });

    it("should make POST request with data", async () => {
      const postData = { title: "New Book" };
      const result = await client.post("/books", postData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/books",
        postData,
        undefined
      );
      expect(result).toEqual(mockResponseData);
    });

    it("should make PUT request with data", async () => {
      const putData = { title: "Updated Book" };
      const result = await client.put("/books/1", putData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        "/books/1",
        putData,
        undefined
      );
      expect(result).toEqual(mockResponseData);
    });

    it("should make DELETE request", async () => {
      const result = await client.delete("/books/1");

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        "/books/1",
        undefined
      );
      expect(result).toEqual(mockResponseData);
    });

    it("should pass additional config to HTTP methods", async () => {
      const config = { headers: { "Custom-Header": "value" } };

      await client.get("/test", config);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/test", config);
    });
  });

  describe("Error Handling", () => {
    it("should handle and propagate errors from HTTP methods", async () => {
      const error = new Error("Request failed");
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.get("/test")).rejects.toThrow("Request failed");
    });

    it("should handle POST errors", async () => {
      const error = new Error("POST failed");
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(client.post("/test", {})).rejects.toThrow("POST failed");
    });

    it("should handle PUT errors", async () => {
      const error = new Error("PUT failed");
      mockAxiosInstance.put.mockRejectedValue(error);

      await expect(client.put("/test", {})).rejects.toThrow("PUT failed");
    });

    it("should handle DELETE errors", async () => {
      const error = new Error("DELETE failed");
      mockAxiosInstance.delete.mockRejectedValue(error);

      await expect(client.delete("/test")).rejects.toThrow("DELETE failed");
    });
  });

  describe("Interceptor Setup", () => {
    it("should call request interceptor setup function", () => {
      // Verify interceptors were set up
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalledTimes(
        1
      );
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalledTimes(
        1
      );
    });

    it("should setup interceptors with success and error handlers", () => {
      const requestCall =
        mockAxiosInstance.interceptors.request.use.mock.calls[0];
      const responseCall =
        mockAxiosInstance.interceptors.response.use.mock.calls[0];

      // Both should have success and error handlers
      expect(requestCall).toHaveLength(2);
      expect(responseCall).toHaveLength(2);

      // Handlers should be functions
      expect(typeof requestCall[0]).toBe("function");
      expect(typeof requestCall[1]).toBe("function");
      expect(typeof responseCall[0]).toBe("function");
      expect(typeof responseCall[1]).toBe("function");
    });
  });

  describe("Request Interceptor Logic", () => {
    it("should add metadata with start time to request config", () => {
      const requestInterceptor =
        mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const config = { method: "GET", url: "/test" };

      const result = requestInterceptor(config);

      expect(result).toHaveProperty("metadata");
      expect(result.metadata).toHaveProperty("startTime");
      expect(typeof result.metadata.startTime).toBe("number");
    });

    it("should preserve existing config properties", () => {
      const requestInterceptor =
        mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const config = {
        method: "POST",
        url: "/api/test",
        data: { test: true },
        headers: { "Content-Type": "application/json" },
      };

      const result = requestInterceptor(config);

      expect(result.method).toBe("POST");
      expect(result.url).toBe("/api/test");
      expect(result.data).toEqual({ test: true });
      expect(result.headers).toEqual({ "Content-Type": "application/json" });
    });
  });

  describe("Response Interceptor Logic", () => {
    it("should pass through successful responses unchanged", () => {
      const responseInterceptor =
        mockAxiosInstance.interceptors.response.use.mock.calls[0][0];
      const response = {
        status: 200,
        data: { success: true },
        config: { url: "/test" },
      };

      const result = responseInterceptor(response);

      expect(result).toBe(response);
    });

    it("should handle response with metadata for timing", () => {
      const responseInterceptor =
        mockAxiosInstance.interceptors.response.use.mock.calls[0][0];
      const response = {
        status: 200,
        data: { success: true },
        config: {
          url: "/test",
          metadata: { startTime: Date.now() - 100 },
        },
      };

      const result = responseInterceptor(response);

      expect(result).toBe(response);
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
      expect(mockAxiosCreate).toHaveBeenCalledWith({
        baseURL: "",
        timeout: 5000,
      });
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
      expect(axiosInstance).toBe(mockAxiosInstance);
    });
  });

  describe("Configuration Handling", () => {
    it("should handle partial configuration override", () => {
      const partialConfig = { timeout: 15000 };
      new ApiClient(partialConfig);

      expect(mockAxiosCreate).toHaveBeenLastCalledWith({
        baseURL: "",
        timeout: 15000,
      });
    });

    it("should handle empty configuration", () => {
      new ApiClient({});

      expect(mockAxiosCreate).toHaveBeenLastCalledWith({
        baseURL: "",
        timeout: 10000,
      });
    });

    it("should handle undefined configuration", () => {
      new ApiClient(undefined);

      expect(mockAxiosCreate).toHaveBeenLastCalledWith({
        baseURL: "",
        timeout: 10000,
      });
    });
  });

  describe("Type Safety", () => {
    it("should return properly typed responses", async () => {
      interface Book {
        id: number;
        title: string;
      }

      const mockBook: Book = { id: 1, title: "Test Book" };
      mockAxiosInstance.get.mockResolvedValue({ data: mockBook });

      const result = await client.get<Book>("/books/1");

      expect(result).toEqual(mockBook);
      // TypeScript should infer the correct type
      expect(typeof result.id).toBe("number");
      expect(typeof result.title).toBe("string");
    });

    it("should handle generic type parameters for all methods", async () => {
      interface CreateBookRequest {
        title: string;
      }

      interface Book {
        id: number;
        title: string;
      }

      const request: CreateBookRequest = { title: "New Book" };
      const response: Book = { id: 1, title: "New Book" };

      mockAxiosInstance.post.mockResolvedValue({ data: response });

      const result = await client.post<Book>("/books", request);

      expect(result).toEqual(response);
    });
  });

  describe("Integration Points", () => {
    it("should be compatible with axios request config", async () => {
      const config = {
        params: { page: 1, limit: 10 },
        headers: { Accept: "application/json" },
        timeout: 5000,
      };

      await client.get("/books", config);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/books", config);
    });

    it("should support all standard HTTP methods", () => {
      expect(typeof client.get).toBe("function");
      expect(typeof client.post).toBe("function");
      expect(typeof client.put).toBe("function");
      expect(typeof client.delete).toBe("function");
    });
  });

  describe("Axios Instance Access", () => {
    it("should provide access to underlying Axios instance", () => {
      const axiosInstance = client.getAxiosInstance();
      expect(axiosInstance).toBe(mockAxiosInstance);
    });
  });
});

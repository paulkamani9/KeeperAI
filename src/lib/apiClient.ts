import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";

/**
 * API Client configuration and error types
 */
export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  isNetworkError: boolean;
  isTimeout: boolean;
  isRetryable: boolean;
}

/**
 * Default configuration for API client
 *
 * Why these values:
 * - 10s timeout: reasonable for book search APIs
 * - 3 retries: balance between reliability and speed
 * - 1s retry delay: exponential backoff starting point
 */
const DEFAULT_CONFIG: Required<ApiClientConfig> = {
  baseURL: "",
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
};

/**
 * Enhanced HTTP client with error handling and retry logic
 *
 * Features:
 * - Automatic retries for network failures and 5xx errors
 * - Exponential backoff retry strategy
 * - Comprehensive error classification
 * - Request/response interceptors for logging and debugging
 * - Timeout handling with clear error messages
 */
class ApiClient {
  private client: AxiosInstance;
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
    });

    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors
   *
   * Why interceptors:
   * - Centralized error handling across all requests
   * - Consistent logging for debugging
   * - Automatic retry logic without duplicating code
   */
  private setupInterceptors(): void {
    // Request interceptor - adds timing and logging
    this.client.interceptors.request.use(
      (config) => {
        // Add timestamp for request timing
        config.metadata = { startTime: Date.now() };

        if (process.env.NODE_ENV === "development") {
          console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
      },
      (error) => {
        return Promise.reject(this.normalizeError(error));
      }
    );

    // Response interceptor - handles errors and retries
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response time in development
        if (
          process.env.NODE_ENV === "development" &&
          response.config.metadata
        ) {
          const duration = Date.now() - response.config.metadata.startTime;
          console.log(
            `[API] ${response.status} ${response.config.url} (${duration}ms)`
          );
        }

        return response;
      },
      async (error: AxiosError) => {
        const normalizedError = this.normalizeError(error);

        // Retry logic for retryable errors
        if (normalizedError.isRetryable && this.shouldRetry(error.config)) {
          return this.retryRequest(error.config);
        }

        return Promise.reject(normalizedError);
      }
    );
  }

  /**
   * Normalize different types of errors into a consistent format
   *
   * Why normalize:
   * - Consistent error handling across the app
   * - Clear distinction between different error types
   * - Helps with retry logic and user messaging
   */
  private normalizeError(error: AxiosError | Error): ApiError {
    if (axios.isAxiosError(error)) {
      const isNetworkError = !error.response;
      const isTimeout = error.code === "ECONNABORTED";
      const status = error.response?.status;

      // Determine if error is retryable
      const isRetryable =
        isNetworkError || isTimeout || (status !== undefined && status >= 500);

      return {
        message: this.getErrorMessage(error),
        status,
        code: error.code,
        isNetworkError,
        isTimeout,
        isRetryable,
      };
    }

    // Handle non-Axios errors
    return {
      message: error.message || "An unexpected error occurred",
      isNetworkError: false,
      isTimeout: false,
      isRetryable: false,
    };
  }

  /**
   * Get user-friendly error message based on error type
   */
  private getErrorMessage(error: AxiosError): string {
    if (error.code === "ECONNABORTED") {
      return "Request timed out. Please try again.";
    }

    if (!error.response) {
      return "Network error. Please check your connection and try again.";
    }

    const status = error.response.status;

    switch (status) {
      case 400:
        return "Invalid request. Please check your search terms.";
      case 401:
        return "Authentication failed. Please check API configuration.";
      case 403:
        return "Access denied. API key may be invalid or expired.";
      case 404:
        return "Service not found.";
      case 429:
        return "Rate limit exceeded. Please wait and try again.";
      case 500:
        return "Server error. Please try again later.";
      case 503:
        return "Service temporarily unavailable. Please try again later.";
      default:
        return `Request failed with status ${status}`;
    }
  }

  /**
   * Check if request should be retried based on attempt count
   */
  private shouldRetry(config: any): boolean {
    const currentAttempt = (config.__retryCount || 0) + 1;
    return currentAttempt <= this.config.retryAttempts;
  }

  /**
   * Retry failed request with exponential backoff
   */
  private async retryRequest(config: any): Promise<AxiosResponse> {
    const currentAttempt = config.__retryCount || 0;
    config.__retryCount = currentAttempt + 1;

    // Exponential backoff: 1s, 2s, 4s, etc.
    const delay = this.config.retryDelay * Math.pow(2, currentAttempt);

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[API] Retrying request (attempt ${config.__retryCount}/${this.config.retryAttempts}) after ${delay}ms`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, delay));

    return this.client.request(config);
  }

  /**
   * Public methods for making HTTP requests
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  /**
   * Get the underlying Axios instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}

/**
 * Default API client instance
 * Pre-configured with standard settings for book search APIs
 */
export const apiClient = new ApiClient();

/**
 * Create a new API client with custom configuration
 * Useful for different services with different requirements
 */
export const createApiClient = (config: ApiClientConfig): ApiClient => {
  return new ApiClient(config);
};

export { ApiClient };
export type { AxiosRequestConfig, AxiosResponse };

// Extend AxiosRequestConfig to include metadata for timing
declare module "axios" {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
    __retryCount?: number;
  }
}

/**
 * Monitoring & Metrics Service
 *
 * Comprehensive monitoring system for KeeperAI backend:
 * - API usage tracking (Google Books, Open Library, GPT calls)
 * - Cache hit/miss rates with Redis performance
 * - GPT response times and reliability metrics
 * - Structured logging for queryable performance data
 * - Cost optimization insights and recommendations
 */

import { getRedisService } from "./redis";

export interface MetricEvent {
  id: string;
  timestamp: number;
  type:
    | "api_call"
    | "cache_operation"
    | "gpt_request"
    | "search_operation"
    | "error";
  service: string;
  operation: string;
  duration?: number;
  success: boolean;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

export interface APIUsageMetrics {
  service: "google_books" | "open_library" | "openai_gpt";
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  totalCost?: number; // For paid APIs
  rateLimitHits: number;
  lastUpdated: number;
}

export interface CacheMetrics {
  operations: number;
  hits: number;
  misses: number;
  hitRate: number;
  averageGetTime: number;
  averageSetTime: number;
  totalData: number; // bytes stored
  lastUpdated: number;
}

export interface GPTMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  averageTokensUsed: number;
  totalCost: number;
  requestTypes: Record<string, number>;
  lastUpdated: number;
}

export interface SystemMetrics {
  searchOperations: number;
  userSessions: number;
  errorRate: number;
  averageRequestTime: number;
  peakUsage: {
    hour: number;
    day: string;
    requests: number;
  };
  lastUpdated: number;
}

export interface MetricsSummary {
  timeRange: {
    start: number;
    end: number;
    duration: string;
  };
  api: {
    googleBooks: APIUsageMetrics;
    openLibrary: APIUsageMetrics;
    openaiGPT: APIUsageMetrics;
  };
  cache: CacheMetrics;
  gpt: GPTMetrics;
  system: SystemMetrics;
  recommendations: {
    costOptimization: string[];
    performanceImprovements: string[];
    scalingConsiderations: string[];
  };
}

export class MonitoringService {
  private redis = getRedisService();
  private metricsBuffer: MetricEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 30000; // 30 seconds

  constructor() {
    this.startMetricsBuffering();
  }

  /**
   * Record a metric event
   */
  async recordEvent(
    event: Omit<MetricEvent, "id" | "timestamp">
  ): Promise<void> {
    const metricEvent: MetricEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      ...event,
    };

    // Add to buffer
    this.metricsBuffer.push(metricEvent);

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      await this.flushMetrics();
    }

    // Log critical events immediately
    if (
      event.type === "error" ||
      (!event.success && event.service === "openai_gpt")
    ) {
      console.error("Critical metric event:", metricEvent);
    }
  }

  /**
   * Record API usage
   */
  async recordAPICall(
    service: "google_books" | "open_library" | "openai_gpt",
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.recordEvent({
      type: "api_call",
      service,
      operation,
      duration,
      success,
      metadata,
    });

    // Update aggregated metrics
    await this.updateAPIMetrics(service, duration, success, metadata);
  }

  /**
   * Record cache operations
   */
  async recordCacheOperation(
    operation: "get" | "set" | "delete" | "exists",
    duration: number,
    hit: boolean = false,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.recordEvent({
      type: "cache_operation",
      service: "redis",
      operation,
      duration,
      success: true,
      metadata: { ...metadata, hit },
    });

    // Update cache metrics
    await this.updateCacheMetrics(operation, duration, hit);
  }

  /**
   * Record GPT requests with detailed tracking
   */
  async recordGPTRequest(
    requestType: "search" | "recommendations" | "summary" | "analysis",
    duration: number,
    success: boolean,
    tokensUsed: number = 0,
    cost: number = 0,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.recordEvent({
      type: "gpt_request",
      service: "openai_gpt",
      operation: requestType,
      duration,
      success,
      metadata: { ...metadata, tokensUsed, cost },
    });

    // Update GPT metrics
    await this.updateGPTMetrics(
      requestType,
      duration,
      success,
      tokensUsed,
      cost
    );
  }

  /**
   * Record search operations
   */
  async recordSearchOperation(
    mode: "searchMode" | "promptMode",
    duration: number,
    resultCount: number,
    cached: boolean,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    await this.recordEvent({
      type: "search_operation",
      service: "search_orchestrator",
      operation: mode,
      duration,
      success: resultCount > 0,
      metadata: { resultCount, cached },
      userId,
      sessionId,
    });

    // Update system metrics
    await this.updateSystemMetrics(duration, resultCount > 0);
  }

  /**
   * Record error events
   */
  async recordError(
    service: string,
    operation: string,
    error: Error | string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    await this.recordEvent({
      type: "error",
      service,
      operation,
      success: false,
      metadata: {
        ...metadata,
        error: errorMessage,
        stack,
      },
    });

    console.error(`Error in ${service}.${operation}:`, errorMessage);
  }

  /**
   * Get comprehensive metrics summary
   */
  async getMetricsSummary(
    timeRangeHours: number = 24
  ): Promise<MetricsSummary> {
    const endTime = Date.now();
    const startTime = endTime - timeRangeHours * 60 * 60 * 1000;

    const [apiMetrics, cacheMetrics, gptMetrics, systemMetrics] =
      await Promise.all([
        this.getAggregatedAPIMetrics(),
        this.getAggregatedCacheMetrics(),
        this.getAggregatedGPTMetrics(),
        this.getAggregatedSystemMetrics(),
      ]);

    const summary: MetricsSummary = {
      timeRange: {
        start: startTime,
        end: endTime,
        duration: `${timeRangeHours}h`,
      },
      api: {
        googleBooks: apiMetrics.google_books || this.getEmptyAPIMetrics(),
        openLibrary: apiMetrics.open_library || this.getEmptyAPIMetrics(),
        openaiGPT: apiMetrics.openai_gpt || this.getEmptyAPIMetrics(),
      },
      cache: cacheMetrics || this.getEmptyCacheMetrics(),
      gpt: gptMetrics || this.getEmptyGPTMetrics(),
      system: systemMetrics || this.getEmptySystemMetrics(),
      recommendations: this.generateRecommendations(
        apiMetrics,
        cacheMetrics,
        gptMetrics,
        systemMetrics
      ),
    };

    return summary;
  }

  /**
   * Get real-time performance metrics
   */
  async getRealTimeMetrics(): Promise<{
    activeRequests: number;
    cacheHitRate: number;
    averageResponseTime: number;
    errorRate: number;
    gptCostToday: number;
  }> {
    const recentEvents = await this.getRecentEvents(15); // Last 15 minutes

    const totalRequests = recentEvents.length;
    const successfulRequests = recentEvents.filter((e) => e.success).length;
    const cacheHits = recentEvents.filter(
      (e) => e.type === "cache_operation" && e.metadata?.hit === true
    ).length;
    const cacheOperations = recentEvents.filter(
      (e) => e.type === "cache_operation"
    ).length;

    const avgResponseTime =
      totalRequests > 0
        ? recentEvents
            .filter((e) => e.duration)
            .reduce((sum, e) => sum + (e.duration || 0), 0) / totalRequests
        : 0;

    const errorRate =
      totalRequests > 0
        ? (totalRequests - successfulRequests) / totalRequests
        : 0;

    // Get today's GPT cost from aggregated metrics
    const gptMetrics = await this.getAggregatedGPTMetrics();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const gptCostToday = gptMetrics?.totalCost || 0;

    return {
      activeRequests: totalRequests,
      cacheHitRate: cacheOperations > 0 ? cacheHits / cacheOperations : 0,
      averageResponseTime: avgResponseTime,
      errorRate,
      gptCostToday,
    };
  }

  /**
   * Update API usage metrics
   */
  private async updateAPIMetrics(
    service: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    const key = `metrics:api:${service}`;
    const existing =
      (await this.redis.get<APIUsageMetrics>(key)) || this.getEmptyAPIMetrics();

    const updated: APIUsageMetrics = {
      ...existing,
      totalCalls: existing.totalCalls + 1,
      successfulCalls: success
        ? existing.successfulCalls + 1
        : existing.successfulCalls,
      failedCalls: success ? existing.failedCalls : existing.failedCalls + 1,
      averageResponseTime: this.updateAverage(
        existing.averageResponseTime,
        existing.totalCalls - 1,
        duration
      ),
      totalCost: existing.totalCost + (metadata?.cost || 0),
      rateLimitHits: metadata?.rateLimited
        ? existing.rateLimitHits + 1
        : existing.rateLimitHits,
      lastUpdated: Date.now(),
    };

    await this.redis.set(key, updated, { ttl: 86400 * 7 }); // 7 days
  }

  /**
   * Update cache metrics
   */
  private async updateCacheMetrics(
    operation: string,
    duration: number,
    hit: boolean
  ): Promise<void> {
    const key = "metrics:cache";
    const existing =
      (await this.redis.get<CacheMetrics>(key)) || this.getEmptyCacheMetrics();

    const updated: CacheMetrics = {
      ...existing,
      operations: existing.operations + 1,
      hits: hit ? existing.hits + 1 : existing.hits,
      misses: hit ? existing.misses : existing.misses + 1,
      hitRate: (existing.hits + (hit ? 1 : 0)) / (existing.operations + 1),
      averageGetTime:
        operation === "get"
          ? this.updateAverage(
              existing.averageGetTime,
              existing.operations - 1,
              duration
            )
          : existing.averageGetTime,
      averageSetTime:
        operation === "set"
          ? this.updateAverage(
              existing.averageSetTime,
              existing.operations - 1,
              duration
            )
          : existing.averageSetTime,
      lastUpdated: Date.now(),
    };

    await this.redis.set(key, updated, { ttl: 86400 * 7 });
  }

  /**
   * Update GPT metrics
   */
  private async updateGPTMetrics(
    requestType: string,
    duration: number,
    success: boolean,
    tokensUsed: number,
    cost: number
  ): Promise<void> {
    const key = "metrics:gpt";
    const existing =
      (await this.redis.get<GPTMetrics>(key)) || this.getEmptyGPTMetrics();

    const updated: GPTMetrics = {
      ...existing,
      totalRequests: existing.totalRequests + 1,
      successfulRequests: success
        ? existing.successfulRequests + 1
        : existing.successfulRequests,
      failedRequests: success
        ? existing.failedRequests
        : existing.failedRequests + 1,
      averageResponseTime: this.updateAverage(
        existing.averageResponseTime,
        existing.totalRequests - 1,
        duration
      ),
      averageTokensUsed: this.updateAverage(
        existing.averageTokensUsed,
        existing.totalRequests - 1,
        tokensUsed
      ),
      totalCost: existing.totalCost + cost,
      requestTypes: {
        ...existing.requestTypes,
        [requestType]: (existing.requestTypes[requestType] || 0) + 1,
      },
      lastUpdated: Date.now(),
    };

    await this.redis.set(key, updated, { ttl: 86400 * 7 });
  }

  /**
   * Update system metrics
   */
  private async updateSystemMetrics(
    duration: number,
    success: boolean
  ): Promise<void> {
    const key = "metrics:system";
    const existing =
      (await this.redis.get<SystemMetrics>(key)) ||
      this.getEmptySystemMetrics();

    const updated: SystemMetrics = {
      ...existing,
      searchOperations: existing.searchOperations + 1,
      averageRequestTime: this.updateAverage(
        existing.averageRequestTime,
        existing.searchOperations - 1,
        duration
      ),
      errorRate: success ? existing.errorRate : existing.errorRate + 0.01, // Simplified error rate tracking
      lastUpdated: Date.now(),
    };

    await this.redis.set(key, updated, { ttl: 86400 * 7 });
  }

  /**
   * Start metrics buffering and periodic flushing
   */
  private startMetricsBuffering(): void {
    this.flushInterval = setInterval(async () => {
      if (this.metricsBuffer.length > 0) {
        await this.flushMetrics();
      }
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Flush metrics buffer to storage
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const eventsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Store events in Redis with time-based keys for querying
      const todayKey = `events:${new Date().toISOString().split("T")[0]}`;
      const existingEvents =
        (await this.redis.get<MetricEvent[]>(todayKey)) || [];

      await this.redis.set(todayKey, [...existingEvents, ...eventsToFlush], {
        ttl: 86400 * 30,
      }); // 30 days

      console.log(`Flushed ${eventsToFlush.length} metric events`);
    } catch (error) {
      console.error("Failed to flush metrics:", error);
      // Add events back to buffer to retry
      this.metricsBuffer.unshift(...eventsToFlush);
    }
  }

  /**
   * Get recent events for real-time metrics
   */
  private async getRecentEvents(minutes: number): Promise<MetricEvent[]> {
    const cutoffTime = Date.now() - minutes * 60 * 1000;
    const todayKey = `events:${new Date().toISOString().split("T")[0]}`;

    const todayEvents = (await this.redis.get<MetricEvent[]>(todayKey)) || [];
    return todayEvents.filter((event) => event.timestamp >= cutoffTime);
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    apiMetrics: Record<string, APIUsageMetrics>,
    cacheMetrics: CacheMetrics | null,
    gptMetrics: GPTMetrics | null,
    systemMetrics: SystemMetrics | null
  ): {
    costOptimization: string[];
    performanceImprovements: string[];
    scalingConsiderations: string[];
  } {
    const recommendations = {
      costOptimization: [] as string[],
      performanceImprovements: [] as string[],
      scalingConsiderations: [] as string[],
    };

    // GPT cost optimization
    if (gptMetrics && gptMetrics.totalCost > 100) {
      recommendations.costOptimization.push(
        "Consider implementing more aggressive GPT caching to reduce API costs"
      );
    }
    if (gptMetrics && gptMetrics.averageTokensUsed > 2000) {
      recommendations.costOptimization.push(
        "Optimize GPT prompts to reduce token usage"
      );
    }

    // Performance improvements
    if (cacheMetrics && cacheMetrics.hitRate < 0.7) {
      recommendations.performanceImprovements.push(
        "Cache hit rate is below optimal. Review caching strategy"
      );
    }
    if (systemMetrics && systemMetrics.averageRequestTime > 2000) {
      recommendations.performanceImprovements.push(
        "Average request time is high. Consider optimizing API calls"
      );
    }

    // API reliability
    Object.entries(apiMetrics).forEach(([service, metrics]) => {
      if (metrics.failedCalls / metrics.totalCalls > 0.1) {
        recommendations.performanceImprovements.push(
          `${service} has high failure rate (${((metrics.failedCalls / metrics.totalCalls) * 100).toFixed(1)}%)`
        );
      }
    });

    // Scaling considerations
    if (systemMetrics && systemMetrics.searchOperations > 1000) {
      recommendations.scalingConsiderations.push(
        "High search volume. Consider implementing distributed caching"
      );
    }
    if (gptMetrics && gptMetrics.totalRequests > 500) {
      recommendations.scalingConsiderations.push(
        "High GPT usage. Consider request queuing and batch processing"
      );
    }

    return recommendations;
  }

  // Helper methods for creating empty metrics
  private getEmptyAPIMetrics(): APIUsageMetrics {
    return {
      service: "google_books",
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageResponseTime: 0,
      totalCost: 0,
      rateLimitHits: 0,
      lastUpdated: Date.now(),
    };
  }

  private getEmptyCacheMetrics(): CacheMetrics {
    return {
      operations: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      averageGetTime: 0,
      averageSetTime: 0,
      totalData: 0,
      lastUpdated: Date.now(),
    };
  }

  private getEmptyGPTMetrics(): GPTMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      averageTokensUsed: 0,
      totalCost: 0,
      requestTypes: {},
      lastUpdated: Date.now(),
    };
  }

  private getEmptySystemMetrics(): SystemMetrics {
    return {
      searchOperations: 0,
      userSessions: 0,
      errorRate: 0,
      averageRequestTime: 0,
      peakUsage: {
        hour: 0,
        day: new Date().toISOString().split("T")[0],
        requests: 0,
      },
      lastUpdated: Date.now(),
    };
  }

  // Helper methods
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateAverage(
    currentAvg: number,
    count: number,
    newValue: number
  ): number {
    if (count === 0) return newValue;
    return (currentAvg * count + newValue) / (count + 1);
  }

  private async getAggregatedAPIMetrics(): Promise<
    Record<string, APIUsageMetrics>
  > {
    const services = ["google_books", "open_library", "openai_gpt"];
    const metrics: Record<string, APIUsageMetrics> = {};

    await Promise.all(
      services.map(async (service) => {
        const key = `metrics:api:${service}`;
        const data = await this.redis.get<APIUsageMetrics>(key);
        if (data) {
          metrics[service] = data;
        }
      })
    );

    return metrics;
  }

  private async getAggregatedCacheMetrics(): Promise<CacheMetrics | null> {
    return await this.redis.get<CacheMetrics>("metrics:cache");
  }

  private async getAggregatedGPTMetrics(): Promise<GPTMetrics | null> {
    return await this.redis.get<GPTMetrics>("metrics:gpt");
  }

  private async getAggregatedSystemMetrics(): Promise<SystemMetrics | null> {
    return await this.redis.get<SystemMetrics>("metrics:system");
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Flush any remaining metrics
    await this.flushMetrics();
  }
}

// Singleton instance
let monitoringInstance: MonitoringService | null = null;

export function getMonitoringService(): MonitoringService {
  if (!monitoringInstance) {
    monitoringInstance = new MonitoringService();
  }
  return monitoringInstance;
}

// Convenience functions for common monitoring operations
export const monitoring = {
  recordAPICall: (
    service: "google_books" | "open_library" | "openai_gpt",
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ) =>
    getMonitoringService().recordAPICall(
      service,
      operation,
      duration,
      success,
      metadata
    ),

  recordCacheOperation: (
    operation: "get" | "set" | "delete" | "exists",
    duration: number,
    hit?: boolean,
    metadata?: Record<string, any>
  ) =>
    getMonitoringService().recordCacheOperation(
      operation,
      duration,
      hit,
      metadata
    ),

  recordGPTRequest: (
    requestType: "search" | "recommendations" | "summary" | "analysis",
    duration: number,
    success: boolean,
    tokensUsed?: number,
    cost?: number,
    metadata?: Record<string, any>
  ) =>
    getMonitoringService().recordGPTRequest(
      requestType,
      duration,
      success,
      tokensUsed,
      cost,
      metadata
    ),

  recordSearchOperation: (
    mode: "searchMode" | "promptMode",
    duration: number,
    resultCount: number,
    cached: boolean,
    userId?: string,
    sessionId?: string
  ) =>
    getMonitoringService().recordSearchOperation(
      mode,
      duration,
      resultCount,
      cached,
      userId,
      sessionId
    ),

  recordError: (
    service: string,
    operation: string,
    error: Error | string,
    metadata?: Record<string, any>
  ) => getMonitoringService().recordError(service, operation, error, metadata),

  getMetricsSummary: (timeRangeHours?: number) =>
    getMonitoringService().getMetricsSummary(timeRangeHours),

  getRealTimeMetrics: () => getMonitoringService().getRealTimeMetrics(),
};

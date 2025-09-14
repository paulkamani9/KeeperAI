/**
 * Monitoring API Route Handler
 *
 * Provides access to system metrics and performance data:
 * - GET: Retrieve metrics summary and real-time data
 * - Supports different time ranges and metric types
 * - Requires admin authentication (or internal access)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getMonitoringService,
  MetricsSummary,
} from "../../../services/monitoring";

interface MonitoringAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  timestamp?: number;
}

/**
 * GET handler - Retrieve monitoring metrics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Authentication check (optional - can be configured for admin-only access)
    const { userId } = await auth();

    // For now, allow unauthenticated access for internal monitoring
    // In production, you might want to restrict this to admin users or internal services

    // Parse query parameters
    const url = new URL(request.url);
    const timeRange = parseInt(url.searchParams.get("timeRange") || "24"); // hours
    const metricType = url.searchParams.get("type") || "summary"; // summary, realtime, api, cache, gpt
    const format = url.searchParams.get("format") || "json"; // json, prometheus (future)

    // Validate parameters
    if (timeRange < 1 || timeRange > 168) {
      // Max 1 week
      return NextResponse.json(
        {
          success: false,
          error: "Invalid time range",
          message: "Time range must be between 1 and 168 hours",
        } satisfies MonitoringAPIResponse,
        { status: 400 }
      );
    }

    if (
      !["summary", "realtime", "api", "cache", "gpt", "system"].includes(
        metricType
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid metric type",
          message:
            "Metric type must be one of: summary, realtime, api, cache, gpt, system",
        } satisfies MonitoringAPIResponse,
        { status: 400 }
      );
    }

    const monitoringService = getMonitoringService();
    let data: any;

    switch (metricType) {
      case "realtime":
        data = await monitoringService.getRealTimeMetrics();
        break;

      case "summary":
        data = await monitoringService.getMetricsSummary(timeRange);
        break;

      case "api":
        const fullSummary =
          await monitoringService.getMetricsSummary(timeRange);
        data = fullSummary.api;
        break;

      case "cache":
        const cacheSummary =
          await monitoringService.getMetricsSummary(timeRange);
        data = cacheSummary.cache;
        break;

      case "gpt":
        const gptSummary = await monitoringService.getMetricsSummary(timeRange);
        data = gptSummary.gpt;
        break;

      case "system":
        const systemSummary =
          await monitoringService.getMetricsSummary(timeRange);
        data = systemSummary.system;
        break;

      default:
        data = await monitoringService.getMetricsSummary(timeRange);
    }

    // Add metadata about the request
    const response: MonitoringAPIResponse = {
      success: true,
      data: {
        metrics: data,
        meta: {
          timeRange: timeRange,
          metricType,
          generatedAt: Date.now(),
          processingTime: Date.now() - startTime,
          requestedBy: userId || "anonymous",
        },
      },
      timestamp: Date.now(),
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=60", // Cache for 1 minute
        "X-Metrics-Generated-At": new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Monitoring API error:", error);

    const response: MonitoringAPIResponse = {
      success: false,
      error: "Internal server error",
      message: "An unexpected error occurred while retrieving metrics",
      timestamp: Date.now(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST handler - Record custom metric events (for internal services)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // This endpoint is for internal service communication only
    // You might want to add IP whitelisting or API key authentication

    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON",
          message: "Request body must be valid JSON",
        } satisfies MonitoringAPIResponse,
        { status: 400 }
      );
    }

    const {
      type,
      service,
      operation,
      duration,
      success,
      metadata,
      userId,
      sessionId,
    } = body;

    if (!type || !service || !operation || success === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "type, service, operation, and success fields are required",
        } satisfies MonitoringAPIResponse,
        { status: 400 }
      );
    }

    const monitoringService = getMonitoringService();
    await monitoringService.recordEvent({
      type,
      service,
      operation,
      duration,
      success,
      metadata,
      userId,
      sessionId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Metric event recorded successfully",
        timestamp: Date.now(),
      } satisfies MonitoringAPIResponse,
      { status: 201 }
    );
  } catch (error) {
    console.error("Monitoring POST API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "Failed to record metric event",
        timestamp: Date.now(),
      } satisfies MonitoringAPIResponse,
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed",
      message: "This endpoint only supports GET and POST requests",
    },
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return PUT();
}

export async function PATCH(): Promise<NextResponse> {
  return PUT();
}

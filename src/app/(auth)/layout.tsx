import { AuthHero } from "@/components/auth/AuthHero";
import React from "react";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="grid flex-1 lg:grid-cols-2 relative overflow-hidden min-h-screen">
      {/* Base background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-950 dark:to-gray-900" />

      {/* Book spine pattern - vertical lines of varying widths */}
      <div className="absolute inset-0 flex justify-between opacity-[0.07] dark:opacity-[0.1]">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              width: `${Math.floor(Math.random() * 15) + 5}px`,
              opacity: Math.random() * 0.5 + 0.5,
            }}
            className="h-full bg-slate-300 dark:bg-slate-700"
          ></div>
        ))}
      </div>

      {/* Abstract knowledge connections - dotted pattern with lines */}
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08] overflow-hidden">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="dots"
              width="30"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="10"
                cy="10"
                r="1.5"
                fill="currentColor"
                className="text-slate-800 dark:text-slate-200"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />

          {/* Abstract connection lines */}
          <g
            className="stroke-slate-400 dark:stroke-slate-600"
            strokeWidth="0.5"
          >
            <path d="M50,50 L150,120" />
            <path d="M100,30 L200,90" />
            <path d="M70,200 L140,120" />
            <path d="M170,180 L220,280" />
            <path d="M250,50 L180,120" />
          </g>
        </svg>
      </div>

      {/* Subtle text snippets representing summaries */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] overflow-hidden text-slate-900 dark:text-slate-300">
        <div className="absolute top-1/4 left-1/5 transform -rotate-12">
          <div className="h-2 w-32 bg-current mb-1"></div>
          <div className="h-2 w-40 bg-current mb-1"></div>
          <div className="h-2 w-20 bg-current"></div>
        </div>
        <div className="absolute bottom-1/3 right-1/4 transform rotate-3">
          <div className="h-2 w-24 bg-current mb-1"></div>
          <div className="h-2 w-36 bg-current mb-1"></div>
          <div className="h-2 w-28 bg-current"></div>
        </div>
      </div>

      <AuthHero />
      {children}
    </div>
  );
};

export default AuthLayout;

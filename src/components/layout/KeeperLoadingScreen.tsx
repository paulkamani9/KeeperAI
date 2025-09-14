import React from "react";
import Logo from "@/components/shared/Logo";

export function KeeperLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 relative overflow-hidden">
      {/* Animated background patterns */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-48 h-48 bg-secondary/10 rounded-full blur-2xl animate-pulse"
          style={{ animationDelay: "0.5s" }}
        />
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Main loading content */}
      <div className="relative z-10 flex flex-col items-center space-y-8 animate-fade-in">
        {/* Logo with pulsing effect */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl animate-pulse" />
          <div className="relative bg-card/50 backdrop-blur-sm p-6 rounded-2xl border border-border/50">
            <Logo size="xl" className="animate-pulse" />
          </div>
        </div>

        {/* Loading text and progress */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-foreground/90 animate-slide-up">
            Welcome to Keeper
          </h2>
          <p
            className="text-muted-foreground animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            Preparing your personalized book discovery experience...
          </p>

          {/* Animated progress dots */}
          <div
            className="flex items-center justify-center space-x-2 animate-slide-up"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            <div
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            />
            <div
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            />
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background/50 to-transparent" />
    </div>
  );
}

/* Add these animations to your globals.css if not already present */
const styles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-10px) rotate(120deg); }
    66% { transform: translateY(5px) rotate(240deg); }
  }
  
  .animate-float {
    animation: float 4s ease-in-out infinite;
  }
`;

// Export styles to be added to globals.css
export { styles as loadingStyles };

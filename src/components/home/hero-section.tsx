import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HeroSection() {
  return (
    <div className="relative rounded-2xl overflow-hidden mb-12 p-8 md:p-16 bg-gradient-to-br from-violet-600 via-purple-600 to-blue-700 animate-gradient-x">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 via-purple-600/50 to-pink-600/50 animate-gradient-xy"></div>

      {/* Grid pattern overlay */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-pattern.svg')] opacity-20"></div>

      {/* Floating orbs */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-white/20 rounded-full blur-xl animate-float"></div>
      <div className="absolute bottom-10 left-10 w-24 h-24 bg-blue-300/30 rounded-full blur-lg animate-float-delayed"></div>

      <div className="relative z-10">
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-6 text-white leading-tight">
          <span className="inline-block animate-fade-in-up">Keeper</span>
          <span className="inline-block animate-fade-in-up animation-delay-200 bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
            AI
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl animate-fade-in-up animation-delay-400">
          Transform your reading journey with AI-powered insights.
          <span className="block mt-2 text-blue-200">
            Search millions of books and get instant, intelligent summaries.
          </span>
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center animate-fade-in-up animation-delay-600">
          <div className="relative w-full sm:w-96 group">
            <Input
              placeholder="Search for books, authors, topics..."
              className="bg-white/95 backdrop-blur-sm border-0 pl-12 h-14 shadow-2xl text-lg rounded-xl group-hover:bg-white transition-all duration-300 focus:ring-4 focus:ring-white/30"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 w-6 h-6"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
          <Button
            size="lg"
            className="h-14 px-8 bg-white text-purple-700 hover:bg-blue-50 shadow-2xl rounded-xl font-semibold text-lg hover:scale-105 transition-all duration-300"
          >
            Discover Books
          </Button>
        </div>
      </div>
    </div>
  );
}

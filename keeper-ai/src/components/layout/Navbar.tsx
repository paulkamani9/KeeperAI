import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <nav className="border-b sticky top-0 z-50 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="font-bold text-xl">
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            KeeperAI
          </span>
        </Link>

        <div className="flex gap-4 items-center">
          <Link
            href="/search"
            className="text-muted-foreground hover:text-blue-600 transition-colors"
          >
            Search
          </Link>
          <Link
            href="/summaries"
            className="text-muted-foreground hover:text-blue-600 transition-colors"
          >
            Summaries
          </Link>
          <Link
            href="/favorites"
            className="text-muted-foreground hover:text-blue-600 transition-colors"
          >
            Favorites
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          >
            Sign In
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            Sign Up
          </Button>
        </div>
      </div>
    </nav>
  );
}

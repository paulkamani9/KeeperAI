import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section with Gradient Background */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 mb-12 p-8 md:p-16">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-pattern.svg')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full">
          <div className="w-full h-full bg-white/10 blur-3xl rounded-full transform translate-x-1/2"></div>
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white">
            KeeperAI
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-2xl">
            Your AI-powered book companion. Search millions of books and get
            instant AI summaries.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:w-96">
              <Input
                placeholder="Search for books..."
                className="bg-white/95 border-0 pl-10 h-12 shadow-lg"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5"
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
              className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
            >
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-8 text-center">
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Discover Books, Save Time
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-white to-blue-50">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              </div>
              <CardTitle>Book Search</CardTitle>
              <CardDescription>
                Explore millions of books from the Google Books library
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Find your next read with our powerful search engine. Filter by
                genre, author, publication year, and more.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" asChild>
                <Link href="/search">Start Searching</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Feature 2 */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-white to-blue-50">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
                  />
                </svg>
              </div>
              <CardTitle>AI Summaries</CardTitle>
              <CardDescription>
                Get instant AI-powered book summaries and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Save hours of reading time with our AI technology that distills
                complex books into concise, comprehensive summaries.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" asChild>
                <Link href="/summaries">View Examples</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Feature 3 */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-white to-blue-50">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
                  />
                </svg>
              </div>
              <CardTitle>Save Favorites</CardTitle>
              <CardDescription>
                Create your personal library of favorite books and summaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Bookmark books and summaries to revisit later. Build your own
                collection of valuable knowledge.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" asChild>
                <Link href="/favorites">Your Library</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="mb-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8">
        <h2 className="text-3xl font-bold mb-8 text-center">
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            How It Works
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center mb-4 mx-auto">
              <span className="text-xl font-bold">1</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Search</h3>
            <p className="text-muted-foreground">
              Enter a book title, author, or topic to find books from the Google
              Books library.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center mb-4 mx-auto">
              <span className="text-xl font-bold">2</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Select</h3>
            <p className="text-muted-foreground">
              Choose a book from the search results and view its details.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center mb-4 mx-auto">
              <span className="text-xl font-bold">3</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Summarize</h3>
            <p className="text-muted-foreground">
              Request an AI-generated summary tailored to your specific needs.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="mb-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join thousands of readers who are saving time and gaining knowledge
          with KeeperAI.
        </p>
        <Button
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8"
        >
          Start for Free
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t pt-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} KeeperAI. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link href="#" className="hover:underline">
            Terms
          </Link>
          <Link href="#" className="hover:underline">
            Privacy
          </Link>
          <Link href="#" className="hover:underline">
            Contact
          </Link>
        </div>
      </footer>
    </div>
  );
}

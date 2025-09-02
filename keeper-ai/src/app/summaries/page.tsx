import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";

// Mock data for summaries
const mockSummaries = [
  {
    id: "sum1",
    bookId: "abcd1234",
    bookTitle: "Atomic Habits",
    bookAuthor: "James Clear",
    coverImage:
      "https://books.google.com/books/content?id=XfFvDwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
    summaryType: "Comprehensive",
    created: "2023-08-15",
    excerpt:
      "Atomic Habits provides a proven framework for improving every day. James Clear reveals practical strategies that will teach you exactly how to form good habits, break bad ones, and master the tiny behaviors that lead to remarkable results...",
  },
  {
    id: "sum2",
    bookId: "efgh5678",
    bookTitle: "The Psychology of Money",
    bookAuthor: "Morgan Housel",
    coverImage:
      "https://books.google.com/books/content?id=TnrrDwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
    summaryType: "Key Insights",
    created: "2023-07-22",
    excerpt:
      "The Psychology of Money explores how our background, ego, pride, marketing, and odd incentives influence our financial decisions. Housel argues that financial success is more about behavior than knowledge...",
  },
  {
    id: "sum3",
    bookId: "ijkl9101",
    bookTitle: "Thinking, Fast and Slow",
    bookAuthor: "Daniel Kahneman",
    coverImage:
      "https://books.google.com/books/content?id=ZuKTvERuPG8C&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
    summaryType: "Chapter Analysis",
    created: "2023-06-10",
    excerpt:
      "Kahneman introduces two cognitive systems: System 1 (fast, intuitive, emotional) and System 2 (slower, deliberative, logical). The book explores cognitive biases and heuristics that affect our decision-making...",
  },
];

export default function SummariesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI-Powered Book Summaries</h1>
        <p className="text-muted-foreground text-lg">
          Get instant insights from your favorite books
        </p>
      </div>

      {/* Summary Types */}
      <div className="mb-10 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">Available Summary Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold text-blue-600 mb-2">Key Insights</h3>
            <p className="text-sm text-muted-foreground">
              A concise overview of the book's main ideas and takeaways. Perfect
              for quick learning.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold text-blue-600 mb-2">Comprehensive</h3>
            <p className="text-sm text-muted-foreground">
              A detailed summary covering all major concepts and supporting
              ideas from the book.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold text-blue-600 mb-2">Chapter Analysis</h3>
            <p className="text-sm text-muted-foreground">
              A chapter-by-chapter breakdown of the book, highlighting key
              points from each section.
            </p>
          </div>
        </div>
      </div>

      {/* Example Summaries */}
      <h2 className="text-2xl font-bold mb-6">Example Summaries</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {mockSummaries.map((summary) => (
          <Card key={summary.id} className="overflow-hidden border-0 shadow-lg">
            <div className="flex flex-col sm:flex-row">
              <div className="relative h-[200px] sm:h-auto sm:w-1/3 bg-gray-100">
                <Image
                  src={summary.coverImage}
                  alt={`Cover of ${summary.bookTitle}`}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-grow sm:w-2/3">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="line-clamp-1">
                        {summary.bookTitle}
                      </CardTitle>
                      <CardDescription>{summary.bookAuthor}</CardDescription>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs">
                      {summary.summaryType}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {summary.excerpt}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                    Read Full Summary
                  </Button>
                </CardFooter>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Call to Action */}
      <div className="text-center bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 p-8 rounded-xl text-white">
        <h2 className="text-2xl font-bold mb-4">Get Your Own Book Summaries</h2>
        <p className="mb-6 max-w-2xl mx-auto">
          Search for any book and request a custom AI summary. Save hours of
          reading time and gain valuable insights instantly.
        </p>
        <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
          Start Searching Books
        </Button>
      </div>
    </div>
  );
}

import Link from "next/link";
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
import Image from "next/image";

// Mock data for initial setup
const mockBooks = [
  {
    id: "abcd1234",
    title: "Atomic Habits",
    author: "James Clear",
    description: "An Easy & Proven Way to Build Good Habits & Break Bad Ones",
    coverImage:
      "https://books.google.com/books/content?id=XfFvDwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
    publishedDate: "2018-10-16",
    categories: ["Self-Help", "Personal Growth"],
  },
  {
    id: "efgh5678",
    title: "The Psychology of Money",
    author: "Morgan Housel",
    description: "Timeless lessons on wealth, greed, and happiness",
    coverImage:
      "https://books.google.com/books/content?id=TnrrDwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
    publishedDate: "2020-09-08",
    categories: ["Business", "Finance"],
  },
  {
    id: "ijkl9101",
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    description:
      "A groundbreaking tour of the mind and explains the two systems that drive the way we think",
    coverImage:
      "https://books.google.com/books/content?id=ZuKTvERuPG8C&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
    publishedDate: "2011-10-25",
    categories: ["Psychology", "Economics"],
  },
];

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Book Search</h1>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Input
              placeholder="Search for books by title, author, or keyword..."
              className="pl-10"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5"
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
          <Button className="bg-blue-600 hover:bg-blue-700">Search</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant="outline" size="sm">
          All Books
        </Button>
        <Button variant="outline" size="sm">
          Business
        </Button>
        <Button variant="outline" size="sm">
          Self-Help
        </Button>
        <Button variant="outline" size="sm">
          Psychology
        </Button>
        <Button variant="outline" size="sm">
          History
        </Button>
        <Button variant="outline" size="sm">
          Science
        </Button>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockBooks.map((book) => (
          <Card
            key={book.id}
            className="flex flex-col h-full overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="relative h-[200px] overflow-hidden bg-gray-100">
              {book.coverImage && (
                <Image
                  src={book.coverImage}
                  alt={`Cover of ${book.title}`}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <CardHeader>
              <CardTitle className="line-clamp-1">{book.title}</CardTitle>
              <CardDescription className="flex justify-between">
                <span>{book.author}</span>
                <span className="text-xs">{book.publishedDate}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-muted-foreground text-sm line-clamp-3">
                {book.description}
              </p>
              <div className="flex gap-2 mt-4">
                {book.categories.map((category) => (
                  <span
                    key={category}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline" size="sm">
                View Details
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Get Summary
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

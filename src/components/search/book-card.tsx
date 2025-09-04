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

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  description: string;
  coverImage?: string;
  publishedDate: string;
  categories: string[];
  onViewDetails?: (id: string) => void;
  onGetSummary?: (id: string) => void;
}

export function BookCard({
  id,
  title,
  author,
  description,
  coverImage,
  publishedDate,
  categories,
  onViewDetails,
  onGetSummary,
}: BookCardProps) {
  return (
    <Card className="flex flex-col h-full overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
      <div className="relative h-[200px] overflow-hidden bg-gray-100">
        {coverImage && (
          <Image
            src={coverImage}
            alt={`Cover of ${title}`}
            fill
            className="object-cover"
          />
        )}
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-1">{title}</CardTitle>
        <CardDescription className="flex justify-between">
          <span>{author}</span>
          <span className="text-xs">{publishedDate}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-muted-foreground text-sm line-clamp-3">
          {description}
        </p>
        <div className="flex gap-2 mt-4 flex-wrap">
          {categories.map((category) => (
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
        <Button variant="outline" size="sm" onClick={() => onViewDetails?.(id)}>
          View Details
        </Button>
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => onGetSummary?.(id)}
        >
          Get Summary
        </Button>
      </CardFooter>
    </Card>
  );
}

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

// Mock data for initial setup
const mockNotes = [
  {
    id: 1,
    title: "Meeting with the team",
    content: "Discussed new project requirements and timeline",
    date: "2023-06-15",
    tags: ["work", "project"],
  },
  {
    id: 2,
    title: "Research on AI applications",
    content: "Explored different use cases of AI in note-taking applications",
    date: "2023-06-14",
    tags: ["research", "AI"],
  },
  {
    id: 3,
    title: "Weekly goals",
    content: "Set goals for the upcoming sprint and assigned tasks",
    date: "2023-06-13",
    tags: ["planning", "work"],
  },
];

export default function Notes() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Notes</h1>
        <Button>Create New Note</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockNotes.map((note) => (
          <Card key={note.id}>
            <CardHeader>
              <CardTitle>{note.title}</CardTitle>
              <CardDescription>{note.date}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{note.content}</p>
              <div className="flex gap-2 mt-4">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">
                View
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Link href="/" className="text-primary hover:underline">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

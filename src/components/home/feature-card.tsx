import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  content: string;
  buttonText: string;
  buttonHref: string;
  gradientFrom: string;
  gradientTo: string;
  hoverBgColor: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  content,
  buttonText,
  buttonHref,
  gradientFrom,
  gradientTo,
  hoverBgColor,
}: FeatureCardProps) {
  return (
    <Card className="group border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white via-blue-50/50 to-purple-50/30 hover:scale-105 backdrop-blur-sm">
      <CardHeader>
        <div
          className={`w-14 h-14 rounded-xl bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
        >
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed">{content}</p>
      </CardContent>
      <CardFooter>
        <Button
          variant="ghost"
          asChild
          className={`${hoverBgColor} transition-colors`}
        >
          <Link href={buttonHref}>{buttonText}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

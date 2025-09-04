import React from "react";
import { Button } from "../ui/button";
import { LogInIcon } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";

export const CallToSignIn = () => {
  return (
    <SignInButton>
      <div className="flex items-center gap-2">
        <Button variant="outline" size={"lg"} className="w-full">
          <LogInIcon className="w-4 h-4" />
          <p>Sign In to begin your journey</p>
        </Button>
      </div>
    </SignInButton>
  );
};

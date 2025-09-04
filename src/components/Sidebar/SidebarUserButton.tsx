"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { CallToSignIn } from "./CallToSignIn";

const SidebarUserButton = () => {
  const { user } = useUser();

  if (!user) {
    return <CallToSignIn />;
  }

  return (
    <div className="flex items-center gap-4 p-2 border rounded-md shadow-sm">
      <UserButton />
      <div className="flex flex-col">
        <p className="text-sm text-muted-foreground font-medium truncate">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {user.emailAddresses[0].emailAddress}
        </p>
      </div>
    </div>
  );
};

export default SidebarUserButton;

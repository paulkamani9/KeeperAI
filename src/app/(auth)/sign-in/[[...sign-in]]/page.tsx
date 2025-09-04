import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex w-full flex-1 items-center justify-center p-6 md:p-10 relative z-10">
      <SignIn />
    </div>
  );
}

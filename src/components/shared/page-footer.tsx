import Link from "next/link";

export function PageFooter() {
  return (
    <footer className="border-t border-gray-200/50 pt-8 text-center text-sm text-muted-foreground">
      <p className="mb-4">
        &copy; {new Date().getFullYear()} KeeperAI. All rights reserved.
      </p>
      <div className="flex justify-center gap-6 mt-2">
        <Link
          href="#"
          className="hover:text-purple-600 transition-colors duration-200"
        >
          Terms
        </Link>
        <Link
          href="#"
          className="hover:text-purple-600 transition-colors duration-200"
        >
          Privacy
        </Link>
        <Link
          href="#"
          className="hover:text-purple-600 transition-colors duration-200"
        >
          Contact
        </Link>
      </div>
    </footer>
  );
}

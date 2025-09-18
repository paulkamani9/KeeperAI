import { Suspense } from "react";
import { SearchView } from "@/views/SearchView";

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading search...</div>}>
      <SearchView />
    </Suspense>
  );
}

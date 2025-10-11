/**
 * Helper utilities for converting between Convex book documents and Book type
 */
import { Book } from "@/types/book";
import { Doc } from "../../convex/_generated/dataModel";

/**
 * Convert a Convex book document to the Book type
 */
export function convexBookToBook(convexBook: Doc<"books">): Book {
  return {
    id: convexBook.id,
    title: convexBook.title,
    authors: convexBook.authors,
    description: convexBook.description,
    publishedDate: convexBook.publishedDate,
    publisher: convexBook.publisher,
    pageCount: convexBook.pageCount,
    categories: convexBook.categories,
    language: convexBook.language,
    isbn10: convexBook.isbn10,
    isbn13: convexBook.isbn13,
    thumbnail: convexBook.thumbnail,
    smallThumbnail: convexBook.smallThumbnail,
    mediumThumbnail: convexBook.mediumThumbnail,
    largeThumbnail: convexBook.largeThumbnail,
    averageRating: convexBook.averageRating,
    ratingsCount: convexBook.ratingsCount,
    previewLink: convexBook.previewLink,
    infoLink: convexBook.infoLink,
    source: convexBook.source,
    originalId: convexBook.originalId,
  };
}

/**
 * Convert a Book to Convex book insert/update format
 */
export function bookToConvexBook(book: Book) {
  return {
    id: book.id,
    title: book.title,
    authors: book.authors,
    description: book.description,
    publishedDate: book.publishedDate,
    publisher: book.publisher,
    pageCount: book.pageCount,
    categories: book.categories,
    language: book.language,
    isbn10: book.isbn10,
    isbn13: book.isbn13,
    thumbnail: book.thumbnail,
    smallThumbnail: book.smallThumbnail,
    mediumThumbnail: book.mediumThumbnail,
    largeThumbnail: book.largeThumbnail,
    averageRating: book.averageRating,
    ratingsCount: book.ratingsCount,
    previewLink: book.previewLink,
    infoLink: book.infoLink,
    source: book.source,
    originalId: book.originalId,
  };
}

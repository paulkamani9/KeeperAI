import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookDescription } from "../BookDescription";
import { describe, it, expect, beforeEach } from "vitest";

const shortDescription = "This is a short description.";
const longDescription =
  "This is a very long description that is definitely going to overflow the container. ".repeat(
    10
  );

// Mocking offsetHeight and scrollHeight to control overflow detection
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    value: 128, // Corresponds to max-h-32
  });
});

describe("BookDescription", () => {
  it("should render the full description if it does not overflow", () => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      value: 100, // Less than clientHeight
    });

    render(<BookDescription description={shortDescription} />);
    expect(screen.getByText(shortDescription)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it('should truncate the description and show "Read More" if it overflows', () => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      value: 300, // More than clientHeight
    });

    render(<BookDescription description={longDescription} />);
    const paragraph = screen.getByTestId("book-description");
    expect(paragraph).toHaveClass("max-h-32");

    const readMoreButton = screen.getByRole("button", { name: /Read More/i });
    expect(readMoreButton).toBeInTheDocument();
    expect(readMoreButton).toHaveAttribute("aria-expanded", "false");
  });

  it('should expand the description and change the button to "Read Less" on click', () => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      value: 300,
    });

    render(<BookDescription description={longDescription} />);
    const readMoreButton = screen.getByRole("button", { name: /Read More/i });
    fireEvent.click(readMoreButton);

    const paragraph = screen.getByTestId("book-description");
    expect(paragraph).not.toHaveClass("max-h-32");

    const readLessButton = screen.getByRole("button", { name: /Read Less/i });
    expect(readLessButton).toBeInTheDocument();
    expect(readLessButton).toHaveAttribute("aria-expanded", "true");
  });

  it('should collapse the description when "Read Less" is clicked', () => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      value: 300,
    });

    render(<BookDescription description={longDescription} />);
    // Expand first
    fireEvent.click(screen.getByRole("button", { name: /Read More/i }));

    // Then collapse
    fireEvent.click(screen.getByRole("button", { name: /Read Less/i }));

    const paragraph = screen.getByTestId("book-description");
    expect(paragraph).toHaveClass("max-h-32");

    const readMoreButton = screen.getByRole("button", { name: /Read More/i });
    expect(readMoreButton).toBeInTheDocument();
    expect(readMoreButton).toHaveAttribute("aria-expanded", "false");
  });
});

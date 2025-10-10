import AppLayout from "@/components/shared/AppLayout";

/**
 * Public layout for unauthenticated pages
 *
 * Uses AppLayout with integrated sidebar and navbar
 * - Desktop: Sidebar collapsed by default
 * - Mobile: Sidebar closed by default
 * - Responsive navbar behavior built-in
 */
const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return <AppLayout>{children}</AppLayout>;
};

export default PublicLayout;

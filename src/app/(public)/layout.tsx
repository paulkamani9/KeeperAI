import React from "react";
import { MainLayout } from "@/components/layout";

const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return <MainLayout>{children}</MainLayout>;
};

export default PublicLayout;

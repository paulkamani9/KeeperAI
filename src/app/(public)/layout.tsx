import { MobileNavbar } from "@/components/shared/MobileNavbar";
import { MainSidebar } from "@/components/Sidebar/MainSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ReactNode } from "react";

const MainLayout = ({ children }: { children: ReactNode }) => {
  return (
    <SidebarProvider>
      <MainSidebar />
      <main className="min-h-screen min-w-full">
        <MobileNavbar />
        {children}
      </main>
    </SidebarProvider>
  );
};

export default MainLayout;

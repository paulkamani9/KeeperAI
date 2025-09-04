import Logo from "../shared/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "../ui/sidebar";
import SidebarUserButton from "./SidebarUserButton";

export const MainSidebar = () => {
  return (
    <Sidebar>
      <SidebarHeader>
        <Logo size="xl" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup />
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
     <SidebarUserButton />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

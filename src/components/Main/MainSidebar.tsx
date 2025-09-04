import Logo from "../shared/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenuItem,
} from "../ui/sidebar";

export const MainSidebar = () => {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenuItem>
          <Logo size="md" />
        </SidebarMenuItem>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup />
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
};

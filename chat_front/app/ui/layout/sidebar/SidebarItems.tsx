// sidebaritems.tsx
import React from "react";
import Menuitems, { MenuElement, MenuGroup, MenuItem } from "./MenuItems";
import { usePathname } from "next/navigation";
import { Box, List } from "@mui/material";
import NavItem from "./NavItem";
import NavGroup from "./NavGroup/NavGroup";



const SidebarItems = ({
  toggleMobileSidebar,
  isSidebarOpen,
  isHovered,
}: any) => {

  const pathname = usePathname();
  const pathDirect = pathname;

  return (
    <Box sx={{ px: 2 }}>
      <List sx={{ pt: 0 }} className="sidebarNav" component="div">
        {Menuitems.map((item: MenuElement) => {
          if ("subheader" in item) {
            return <NavGroup item={item} key={item.id} isSideBarOpen={isSidebarOpen} isHovered={isHovered}/>;
          } else {
            return (
              <NavItem
                item={item}
                key={item.id}
                pathDirect={pathDirect}
                onClick={toggleMobileSidebar}
                isSidebarOpen={isSidebarOpen}
                isHovered={isHovered}
                level={1}
              />
            );
          }
        })}
      </List>
    </Box>
  );
};

export default SidebarItems;
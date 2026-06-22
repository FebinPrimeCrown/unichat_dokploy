import { useMediaQuery, Box, Drawer, IconButton } from "@mui/material";
import Logo from "../shared/logo/Logo";
import SidebarItems from "./SidebarItems";
import Upgrade from "./Updrade";
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useState } from "react";
import { useRef } from "react";
import { styled } from "@mui/material";
import { red } from "@mui/material/colors";
import PerfectScrollbar from 'react-perfect-scrollbar'
import 'react-perfect-scrollbar/dist/css/styles.css';

interface ItemType {
  isMobileSidebarOpen: boolean;
  onSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  transitionDuration: string;
  setTransitionDuration: React.Dispatch<React.SetStateAction<string>>;
}

const Sidebar = ({
  isMobileSidebarOpen,
  onSidebarClose,
  isSidebarOpen,
  toggleSidebar,
  transitionDuration,
  setTransitionDuration
}: ItemType) => {

  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up("lg"));

  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const handleMouseEnter = () => {
    setTransitionDuration('width 0.0s ease-in-out');
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 180); //
  };

  const handleMouseLeave = () => {
    setTransitionDuration('width 0.0s ease-in-out');
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(false);
  };

  const sidebarWidth = isSidebarOpen || isHovered ? "270px" : "85px";


  // if ()

  if (lgUp) {
    return (
      <Box
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* ------------------------------------------- */}
        {/* Sidebar for desktop */}
        {/* ------------------------------------------- */}
        <Drawer
          anchor="left"
          open={false}
          variant="permanent"
          PaperProps={{
            sx: {
              width: sidebarWidth,
              boxSizing: "border-box",
              border: "0",
              boxShadow: "rgba(113, 122, 131, 0.11) 0px 7px 30px 0px",
              transition: transitionDuration
            },
          }}
        >
          {/* ------------------------------------------- */}
          {/* Sidebar Box */}
          {/* ------------------------------------------- */}
          <Box
            sx={{
              height: "100%",
              overflowX: 'hidden',  // Ensure no horizontal scrollbars
              overflowY: 'hidden', 
            }}
            py={2}
          >
            {/* ------------------------------------------- */}
            {/* Logo */}
            {/* ------------------------------------------- */}
            
            
            <Box
              px={isSidebarOpen || isHovered ? 3 : 3} // Adjust padding based on the sidebar state
              display="flex"
              justifyContent={isSidebarOpen || isHovered ? "flex-start" : "flex-start"}
              >
              <Logo />
            </Box>
            <Box sx={{"height": 'calc(100vh - 110px)'}}>
            <PerfectScrollbar options={{ suppressScrollX: true, 
              wheelSpeed: 0.4, 
              maxScrollbarLength: 300, 
              wheelPropagation: true, 
              swipeEasing: true, }}
              style={{"marginTop": "15px"}}>
              <Box>
                <Box mt={3}><SidebarItems isSidebarOpen={isSidebarOpen} isHovered={isHovered}/></Box>
              </Box>
            </PerfectScrollbar>
            </Box>
          </Box>
        </Drawer>
      </Box>
    );
  }

  return (
    <Drawer
      anchor="left"
      open={isMobileSidebarOpen}
      onClose={onSidebarClose}
      variant="temporary"
      PaperProps={{
        sx: {
          width: "270px",
          boxShadow: (theme) => theme.shadows[8],
        },
      }}
    >
      {/* ----------------------------rClose}--------------- */}
      {/* Logo */}
      {/* ------------------------------------------- */}
      <Box px={2} py={2}>
        <Logo />
      </Box>
      {/* ------------------------------------------- */}
      {/* Sidebar For Mobile */}
      {/* ------------------------------------------- */}
      <SidebarItems toggleMobileSidebar={onSidebarClose} isSidebarOpen={true} isHovered={true}/>
    </Drawer>
  );
};

export default Sidebar;

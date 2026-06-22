import React from "react";
// mui imports
import {
  ListItemIcon,
  ListItem,
  List,
  styled,
  ListItemText,
  useTheme,
  ListItemButton,
  Collapse
} from "@mui/material";
import Link from "next/link";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { useState } from "react";
import BulletIcon from "@/app/ui/components/BulletIcon";

type NavGroup = {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: any;
  onClick?: React.MouseEvent<HTMLButtonElement, MouseEvent>;
  children?: NavGroup[];
};

interface ItemType {
  item: NavGroup;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  hideMenu?: any;
  level?: number | any;
  pathDirect: string;
  isSidebarOpen: boolean;
  isHovered: boolean;
}

const NavItem = ({ item, level, pathDirect, onClick, isSidebarOpen, isHovered }: ItemType) => {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;
  const theme = useTheme();
  const itemIcon = level > 1 ? <BulletIcon fontSize="small" /> : <Icon stroke={1.5} size="1.3rem" />;
  const handleClick = () => {
    setOpen(!open);
  };

  const ListItemStyled = styled(ListItem)(() => ({
    padding: 0,
    ".MuiButtonBase-root": {
      whiteSpace: "nowrap",
      marginBottom: "8px",
      padding: "8px 10px",
      borderRadius: "8px",
      backgroundColor: level > 1 ? "transparent !important" : open ? `${theme.palette.primary.main} !important` : "inherit",
      color: open ? `#fff !important` : theme.palette.text.secondary,
      paddingLeft: level>1?"30px":"16px",
      "&:hover": {
        backgroundColor: theme.palette.primary.light,
        color: theme.palette.primary.main,
      },
      "&.Mui-selected": {
        color: "white",
        backgroundColor: theme.palette.primary.main,
        "&:hover": {
          backgroundColor: theme.palette.primary.main,
          color: "white",
        },
      }
    },
  }));
  

  return (
    <>
    <List component="div" disablePadding key={item.id}>
      <ListItemStyled>
        <ListItemButton
          {...(item.href && {
            component: Link,
            href: item.href,
            target: item.external ? "_blank" : "",
            selected: pathDirect === item.href,
          })}
          disabled={item.disabled}
          onClick={item.children ? handleClick : onClick}
        >
          <ListItemIcon
            sx={{
              minWidth: "36px",
              p: "3px 0",
              color: "inherit",
              marginTop: level>1?"10px":"0"
            }}
          >
            {itemIcon}
          </ListItemIcon>
          <ListItemText>
            <div
                style={{
                  visibility: isSidebarOpen || isHovered ? "visible" : "hidden",
                  marginLeft: level>1?"-10px":"0"
                }}
              >
              {item.title}
            </div>
          </ListItemText>
          {item.children && (isSidebarOpen || isHovered) && (open ? <ExpandLess /> : <ExpandMore />)}
        </ListItemButton>
      </ListItemStyled>
      </List>
      {item.children && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children.map((child: any) => (
              <NavItem
                key={child.id}
                item={child}
                level={level + 1}
                pathDirect={pathDirect}
                onClick={onClick}
                isSidebarOpen={isSidebarOpen}
                isHovered={isHovered}
              />
            ))}
          </List>
        </Collapse>
      )}
      </>
  );
};

export default NavItem;

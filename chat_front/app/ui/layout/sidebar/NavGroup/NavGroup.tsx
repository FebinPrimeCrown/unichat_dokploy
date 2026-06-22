import React from 'react';
import {
  ListItem,
  ListItemText,
  ListItemIcon,
  styled,
  useTheme
} from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

type ItemType = {
  subheader: string;
}

interface Items  {
  item: ItemType
  isSideBarOpen: boolean;
  isHovered: boolean;
};

const ListSubheaderStyle = styled(ListItem)(
  ({ theme }) => ({
    fontWeight: '0',
    marginTop: theme.spacing(6),
    marginBottom: theme.spacing(3),
    color: "#636363",
    lineHeight: '26px',
    padding: '3px 0px',
    fontSize: "14px",
    height: "10px"
  })
);

const NavGroup = ({ item, isSideBarOpen, isHovered }: Items) => {
  return (
    <ListSubheaderStyle>
      {isSideBarOpen || isHovered ? (
        item.subheader
      ) : (
          <MoreHorizIcon style={{"fontSize": "17px", "marginLeft": "15px"}}/>
      )}
    </ListSubheaderStyle>
  );
};

export default NavGroup;
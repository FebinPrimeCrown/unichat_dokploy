// menuitems.ts
import {
  IconBoxMultiple,
  IconCircleDot,
  IconHome,
  IconInfoCircle,
  IconLayout,
  IconLayoutGrid,
  IconPhoto,
  IconPoint,
  IconStar,
  IconTable,
  IconUser
} from "@tabler/icons-react";
import DnsIconOutlined from '@mui/icons-material/DnsOutlined';
import { uniqueId } from "lodash";
import StorageIconOutlined from '@mui/icons-material/StorageOutlined';
import EmailIconOutlined from '@mui/icons-material/EmailOutlined';
import CloudOutlined from '@mui/icons-material/CloudOutlined';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const ManagedDatabaseIcon = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M12 2C7.58 2 4 3.79 4 6v12c0 2.21 3.58 4 8 4s8-1.79 8-4V6c0-2.21-3.58-4-8-4zm0 2c3.87 0 6 1.57 6 2s-2.13 2-6 2-6-1.57-6-2 2.13-2 6-2zm0 16c-3.87 0-6-1.57-6-2v-2.1c1.44 1.07 3.64 1.6 6 1.6s4.56-.53 6-1.6V18c0 .43-2.13 2-6 2zm0-4c-3.87 0-6-1.57-6-2V10c1.44 1.07 3.64 1.6 6 1.6s4.56-.53 6-1.6v4c0 .43-2.13 2-6 2zm0-6c-3.87 0-6-1.57-6-2V6c1.44 1.07 3.64 1.6 6 1.6s4.56-.53 6-1.6v2c0 .43-2.13 2-6 2z" />
  </SvgIcon>
);


interface MenuItem {
  id: string;
  title: string;
  icon?: (props: any) => JSX.Element;
  href?: string;
  children?: MenuItem[];
}

interface MenuGroup {
  id: string;
  subheader: string;
}

type MenuElement = MenuItem | MenuGroup;

const Menuitems: MenuElement[] = [
  {
    id: uniqueId(),
    subheader: "HOME",
  },
  {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconHome,
    href: "/dashboard",
  },
  {
    id: uniqueId(),
    subheader: "PRODUCTS",
  },
  {
    id: uniqueId(),
    title: "Widgets",
    icon: IconLayout,
    href: "/dashboard/widgets",
  },
  {
    id: uniqueId(),
    title: "Chats",
    icon: IconLayout,
    href: "/dashboard/chats",
  },
];

export default Menuitems;
export type { MenuItem, MenuGroup, MenuElement };
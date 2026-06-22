import Link from "next/link";
import { styled } from "@mui/material";
import Image from "next/image";

const LinkStyled = styled(Link)(() => ({
  height: "60px",
  width: "250px",
  overflow: "hidden",
  display: "block",
}));

const Logo = () => {
  return (
    <LinkStyled href="/">
      <Image src="/images/logos/pct_logo.png" alt="logo" height={35} width={180} priority />
    </LinkStyled>
  );
};

export default Logo;

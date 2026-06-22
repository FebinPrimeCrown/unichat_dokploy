import { Box, SxProps } from "@mui/material";

interface PropsType {
  children: React.ReactElement | React.ReactNode;
  sx?: SxProps; // Make optional if you sometimes don't pass it
}

const Scrollbar = (props: PropsType) => {
  const { children, sx = {}, ...other } = props;

  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  return (
    <Box
      sx={{
        overflow: "auto",
        maxHeight: "100%",
        scrollbarWidth: "thin", // Firefox
        "&::-webkit-scrollbar": {
          width: "6px",
          height: "6px",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "#999",
          borderRadius: "4px",
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: "transparent",
        },
        ...sx,
      }}
      {...other}
    >
      {children}
    </Box>
  );
};

export default Scrollbar;

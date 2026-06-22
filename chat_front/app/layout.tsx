"use client";
import "./globals.css";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { baselightTheme } from "@/app/utils/theme/DefaultColors";
import WithUserProvider from "./ui/components/WithUserProvider";
import { usePathname } from "next/navigation";
import { UserProvider } from "@/app/context/user-context";
import { DM_Sans } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import { Provider } from "react-redux";
import { store } from "@/app/store/store";

const dm = DM_Sans({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/register";
  console.log("root layout rendered");
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#fafbfb" }} className={dm.className}>
        <ThemeProvider theme={baselightTheme}>
          {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
          <CssBaseline />
          <Provider store={store}>
            <UserProvider>{children}</UserProvider>
          </Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}

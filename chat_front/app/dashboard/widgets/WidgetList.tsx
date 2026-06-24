"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  IconButton,
  CircularProgress,
  TableSortLabel,
  TablePagination,
  TableFooter,
  useTheme,
  Chip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import axios from "axios";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/user-context";
import { visuallyHidden } from "@mui/utils";
import { Widget } from "./types";

type Order = "asc" | "desc";

interface HeadCell {
  id: keyof Widget | "actions" |"flow";
  label: string;
  sortable?: boolean;
  minWidth?: number;
  maxWidth?: number;
}

const headCells: HeadCell[] = [
  { id: "name", label: "Name", sortable: true, minWidth: 150 },
  { id: "token", label: "Token", sortable: true, minWidth: 150 },
  { id: "allowed_domains", label: "Allowed Domains", minWidth: 200 },
  { id: "created_at", label: "Created", sortable: true, minWidth: 120 },
  { id: "actions", label: "Snippet", minWidth: 80 },
  { id: "flow", label: "Flow", minWidth: 80 }
];

const WidgetList = () => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order>("desc");
  const [orderBy, setOrderBy] = useState<keyof Widget>("created_at");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const router = useRouter();
  const { setUser } = useUser();
  const theme = useTheme();
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;

  const apiUrl =
    environment === "production"
      ? process.env.NEXT_PUBLIC_API_URL_PRODUCTION
      : environment === "staging"
      ? process.env.NEXT_PUBLIC_API_URL_STAGING
      : process.env.NEXT_PUBLIC_API_URL_DEVELOPMENT;

  async function getClientFingerprint() {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  }

  const fetchWidgets = async () => {
    try {
      const fingerprint = await getClientFingerprint();
      const response = await axios.get(`${apiUrl}/chatpanel/widgets`, {
        headers: { "X-device_fingerprint": fingerprint },
        withCredentials: true,
      });
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        try {
          const fingerprint = await getClientFingerprint();
          await axios.post(
            `${apiUrl}/auth/refresh_access_token`,
            { device_fingerprint: fingerprint },
            { withCredentials: true }
          );
          const response = await axios.get(`${apiUrl}/chatpanel/widgets`, {
            headers: { "X-device_fingerprint": fingerprint },
            withCredentials: true,
          });
          return response.data;
        } catch {
          await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
          setUser(null);
          router.push("/login");
        }
      } else {
        await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
        setUser(null);
        router.push("/login");
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      const data = await fetchWidgets();
      if (data) setWidgets(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleCopy = (token: string) => {
    const embedCode = `<script src="https://demochatwidget.domainhostingcafe.com/chat-widget.js" data-widget-token="${token}"></script>`;
    navigator.clipboard.writeText(embedCode);
  };

  const handleRequestSort = (
    _: React.MouseEvent<unknown>,
    property: keyof Widget
  ) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const descendingComparator = <T,>(
    a: T,
    b: T,
    orderBy: keyof T
  ): number => {
    if (b[orderBy] < a[orderBy]) return -1;
    if (b[orderBy] > a[orderBy]) return 1;
    return 0;
  };

  const getComparator = <Key extends keyof any>(
    order: Order,
    orderBy: Key
  ): ((a: { [key in Key]: any }, b: { [key in Key]: any }) => number) =>
    order === "desc"
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);

  const stableSort = <T,>(
    array: T[],
    comparator: (a: T, b: T) => number
  ): T[] => {
    const stabilized = array.map((el, idx) => [el, idx] as [T, number]);
    stabilized.sort((a, b) => {
      const cmp = comparator(a[0], b[0]);
      if (cmp !== 0) return cmp;
      return a[1] - b[1];
    });
    return stabilized.map((el) => el[0]);
  };

  const sortedWidgets = stableSort(widgets, getComparator(order, orderBy));
  const paginatedWidgets = sortedWidgets.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <Typography variant="h6" mb={2}>
        Existing Widgets
      </Typography>

      <Paper variant="outlined" sx={{ border: `1px solid ${theme.palette.divider}` }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {headCells.map((headCell) => (
                <TableCell
                  key={headCell.id}
                  sortDirection={orderBy === headCell.id ? order : false}
                  sx={{
                    minWidth: headCell.minWidth,
                    maxWidth: headCell.maxWidth,
                    whiteSpace: "nowrap",
                  }}
                >
                  {headCell.sortable ? (
                    <TableSortLabel
                      active={orderBy === headCell.id}
                      direction={orderBy === headCell.id ? order : "asc"}
                      onClick={(event) =>
                        handleRequestSort(event, headCell.id as keyof Widget)
                      }
                    >
                      {headCell.label}
                      {orderBy === headCell.id && (
                        <Box component="span" sx={visuallyHidden}>
                          {order === "desc"
                            ? "sorted descending"
                            : "sorted ascending"}
                        </Box>
                      )}
                    </TableSortLabel>
                  ) : (
                    headCell.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedWidgets.length > 0 ? (
              paginatedWidgets.map((widget) => (
                <TableRow hover key={widget.id}>
                  <TableCell
                    sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {widget.name}
                  </TableCell>

                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {`${widget.token.substring(0, 6)}...${widget.token.substring(
                      widget.token.length - 6
                    )}`}
                  </TableCell>

                  <TableCell sx={{ maxWidth: 300 }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {widget.allowed_domains.map((domain, i) => (
                        <Chip
                          key={i}
                          label={domain}
                          size="small"
                          sx={{
                            maxWidth: "100%",
                            "& .MuiChip-label": {
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            },
                          }}
                        />
                      ))}
                    </Box>
                  </TableCell>

                  <TableCell>{formatDate(widget.created_at)}</TableCell>

                  <TableCell>
                    <IconButton
                      onClick={() => handleCopy(widget.token)}
                      size="small"
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  <TableCell>
  <Button
    size="small"
    variant="outlined"
    onClick={() => router.push(`/dashboard/ChatFlowBuilder?widgetId=${widget.id}`)}
  >
    Flow
  </Button>
</TableCell>

                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={headCells.length} align="center">
                  No widgets found
                </TableCell>
              </TableRow>
            )}
          </TableBody>

          <TableFooter>
            <TableRow>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                count={widgets.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </TableRow>
          </TableFooter>
        </Table>
      </Paper>
    </Box>
  );
};

export default WidgetList;

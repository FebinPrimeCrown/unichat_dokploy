'use client'
import React, { useState, useEffect } from 'react'
import Image from 'next/image';
import axios from 'axios';
import { useTheme } from '@mui/material/styles';
import {
    Typography,
    Box,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Chip,
    TableContainer,
    Paper,
    Stack,
    Avatar
  } from "@mui/material";
import IconButton from '@mui/material/IconButton';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import TableFooter from '@mui/material/TableFooter';
import TablePagination from '@mui/material/TablePagination';
import CustomSearchBar from './searchbox';
import TableSortLabel from '@mui/material/TableSortLabel';
import { visuallyHidden } from '@mui/utils';
import { IconCheck, IconChecks, IconMoodHappy } from '@tabler/icons-react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { useUser } from '@/app/context/user-context';
import { DetectAccessToken, DetectRefreshToken } from '@/app/utils/actions'
import Link from 'next/link';
import Operations from './operations';
import DetailsDrawer from './DetailsDrawer';
import ManageUsersSkeletonTable from './skeletontable';
import convertToUserTimeZone from '@/app/utils/convertToUTC';

async function getClientFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get()
  return result.visitorId;
}


type User = {
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  is_active: string;
  roles: string[];
};

interface Data {
    full_name: string;
    email: string;
    is_active: string;
}

interface TablePaginationActionsProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (
    event: React.MouseEvent<HTMLButtonElement>,
    newPage: number,
  ) => void;
}

function TablePaginationActions(props: TablePaginationActionsProps) {
  const theme = useTheme();
  const { count, page, rowsPerPage, onPageChange } = props;

  const handleFirstPageButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    onPageChange(event, 0);
  };

  const handleBackButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onPageChange(event, page + 1);
  };

  const handleLastPageButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="first page"
      >
        {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton
        onClick={handleBackButtonClick}
        disabled={page === 0}
        aria-label="previous page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
      >
        {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </Box>
  );
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

type Order = 'asc' | 'desc';

function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key,
): (
  a: { [key in Key]: number | string },
  b: { [key in Key]: number | string },
) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

// Since 2020 all major browsers ensure sort stability with Array.prototype.sort().
// stableSort() brings sort stability to non-modern browsers (notably IE11). If you
// only support modern browsers you can replace stableSort(exampleArray, exampleComparator)
// with exampleArray.slice().sort(exampleComparator)
function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) {
      return order;
    }
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

const UsersTable = () => {
  const [order, setOrder] = React.useState<Order>('asc');
  const [orderBy, setOrderBy] = React.useState<keyof Data>('full_name');
  const [rows, setRows] = useState<User[]>([]);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const [rowsCopy, setRowsCopy] = useState<User[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<User | null>(null);
  const [isloading, setIsLoading] = useState(true)
  const {user, setUser} = useUser()
  const [reloadToggle, setReloadToggle] = useState(false)
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;
    let apiUrl;
    if (environment === 'production') {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_PRODUCTION; // Set your production URL
    } else if (environment === 'staging') {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_STAGING; // Use the staging URL or development URL
    }
    else {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_DEVELOPMENT;
    }
  const [readyToCallApi, setReadyToCallApi] = useState(false)

  const toggleReload = () => {
    setReloadToggle(!reloadToggle);
  };

  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0;

    const visibleRows = React.useMemo(
      () =>
        rowsPerPage === -1
          ? stableSort(rows, getComparator(order, orderBy)) // Show all rows if 'All' is selected
          : stableSort(rows, getComparator(order, orderBy)).slice(
              page * rowsPerPage,
              page * rowsPerPage + rowsPerPage,
            ),
      [order, orderBy, page, rowsPerPage, rows]
    );

  const handleRequestSort = (
    event: React.MouseEvent<unknown>,
    property: keyof Data,
  ) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const createSortHandler =
    (property: keyof Data) => (event: React.MouseEvent<unknown>) => {
      handleRequestSort(event, property);
    };

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    const fetchVirtualMachines = async () => {
      try {
        const device_fingerprint = await getClientFingerprint();
        const response = await axios.get(`${apiUrl}/users/fetch_sub_users/`, { 
          withCredentials: true,
          headers: {
            'X-device_fingerprint': device_fingerprint
          }
        });
        const data = await response.data;
        return data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response && error.response.status === 401) {
            try {
              const device_fingerprint = await getClientFingerprint();
              await axios.post(`${apiUrl}/auth/refresh_access_token`, { device_fingerprint: device_fingerprint }, { withCredentials: true });
              const response = await axios.get(`${apiUrl}/users/fetch_sub_users/`, { 
                withCredentials: true,
                headers: {
                  'X-device_fingerprint': device_fingerprint
                }
              });
              const data = await response.data;
              return data;
            } catch {
              await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
              setUser(null);
            }
          } else {
            await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
            setUser(null);
          }
        } else {
          await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

  
    const getData = async () => {
      const data = await fetchVirtualMachines();
      setRows(data);
      setRowsCopy(data);
      setIsLoading(false);
    };

    const checkRefreshToken = async () => {
      try {
          const access_token_present = await DetectAccessToken();
          if (!access_token_present) {
              const refresh_token_present = await DetectRefreshToken();
              if (!refresh_token_present) {
                  setUser(null)
              }
              else{
                  try {
                      const device_fingerprint = await getClientFingerprint();
                      await axios.post(`${apiUrl}/auth/refresh_access_token`, { device_fingerprint: device_fingerprint }, { withCredentials: true });
                      setReadyToCallApi(true)
                  } catch (error: unknown) {
                      await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                      setUser(null);
                  }
              }
          }
          else{
              setReadyToCallApi(true)
          }
      } catch (error) {
          console.error('Error checking access token:', error);
      }
      };

    if (!readyToCallApi){
      checkRefreshToken();
    }
    if (readyToCallApi){
        getData();
    }
  
  }, [readyToCallApi, reloadToggle]);

  const handleDrawerOpen = (product: User) => {
    setSelectedProduct(product);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedProduct(null);
  };

  const theme = useTheme();
  const borderColor = theme.palette.divider;

  const avatarColors = ['primary.main', 'secondary.main', 'error.main', 'warning.main', 'success.main']

  const handleDelete = () => {
    console.info('You clicked the delete icon.');
  };


  return (
      <>
      {!isloading? (
      <Box sx={{mt: 5}}>
      <CustomSearchBar setRows = {setRows} rowsCopy = {rowsCopy} setPage = {setPage}/>
      <Paper variant="outlined" sx={{ mt: 3, border: `1px solid ${borderColor}` }}>
      <TableContainer
      >
        <Table
          aria-label="vm table"
          sx={{ minWidth: 750 }}
        >
          <TableHead>
            <TableRow>
              <TableCell key="full_name" sx={{ maxWidth: "30%" }} sortDirection={orderBy === "full_name" ? order : false}>
                <TableSortLabel
                  active={orderBy === "full_name"}
                  direction={orderBy === "full_name" ? order : 'asc'}
                  onClick={createSortHandler("full_name")}
                >
                  <Typography color="textSecondary"  fontWeight={500} marginLeft={4}>
                    Name
                  </Typography>
                  {orderBy === "full_name" ? (
                    <Box component="span" sx={visuallyHidden}>
                      {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                    </Box>
                  ) : null}
                </TableSortLabel>
              </TableCell>
              <TableCell key="email" sx={{ maxWidth: "30%" }}>
                <TableSortLabel
                  active={orderBy === "email"}
                  direction={orderBy === "email" ? order : 'asc'}
                  onClick={createSortHandler("email")}
                >
                  <Typography color="textSecondary"  fontWeight={500}>
                    Email
                  </Typography>
                  {orderBy === "email" ? (
                    <Box component="span" sx={visuallyHidden}>
                      {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                    </Box>
                  ) : null}
                </TableSortLabel>
              </TableCell>
              <TableCell key="is_active" sx={{ maxWidth: "30%" }}>
                <TableSortLabel
                  active={orderBy === "is_active"}
                  direction={orderBy === "is_active" ? order : 'asc'}
                  onClick={createSortHandler("is_active")}
                >
                  <Typography color="textSecondary"  fontWeight={500}>
                    Status
                  </Typography>
                  {orderBy === "is_active" ? (
                    <Box component="span" sx={visuallyHidden}>
                      {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                    </Box>
                  ) : null}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ maxWidth: "20%" }}>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((product, index) => (
              <TableRow hover key={product.email} sx={{height: "100px"}} >
                <TableCell sx={{ whiteSpace: "normal", width: "25%" }}>
                  <Stack direction="row" spacing={1} alignItems="center" marginLeft={4}>
                    <Avatar sx={{ bgcolor: avatarColors[index%5] }}>{product.full_name[0]}</Avatar>
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      color={avatarColors[index%5]}
                      sx={{ cursor: 'pointer' }} // Make the text look clickable
                      onClick={() => handleDrawerOpen(product)} // Add onClick event handler
                    >
                      {product.full_name}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ whiteSpace: "normal", width: "30%" }}>
                  {product.email}
                </TableCell>
                <TableCell sx={{ whiteSpace: "normal", width: "20%" }}>
                  
                      <Chip
                        label={product.is_active}
                        variant="outlined"
                        color={product.is_active === "Active" ? "success" : "error"}
                        avatar={
                          <Avatar sx={{ bgcolor: product.is_active === "Active" ? "#01c294" : "#e46a75" }}>
                            {product.is_active[0].toUpperCase()}
                          </Avatar>
                        }
                      />
                    
                </TableCell>
                <TableCell sx={{ whiteSpace: "normal", width: "20%"}}>
                  <Operations onMoreClick={() => handleDrawerOpen(product)}/>
                </TableCell>
              </TableRow>
            ))}
            {emptyRows > 0 && (
              <TableRow style={{ height: 100* emptyRows }}>
                <TableCell colSpan={6} />
              </TableRow>
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TablePagination
                sx={{ "& .MuiTablePagination-toolbar p": { margin: 0, padding: 0 } }}
                rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
                colSpan={20}
                count={rows.length}
                rowsPerPage={rowsPerPage}
                page={page}
                slotProps={{
                  select: {
                    inputProps: {
                      'aria-label': 'rows per page',
                    },
                    native: true,
                  },
                }}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                ActionsComponent={TablePaginationActions}
              />
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
      <DetailsDrawer open={drawerOpen} onClose={handleDrawerClose} selectedProduct={selectedProduct} setRows={setRows} toggleReload={toggleReload}/>
      </Paper></Box>): <ManageUsersSkeletonTable></ManageUsersSkeletonTable>}
      </>
  )
}

export default UsersTable
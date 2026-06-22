import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Skeleton,
  TableContainer,
  Paper,
  Box
} from '@mui/material';


const ManageUsersSkeletonTable = () => {
  return (
    <Box sx={{mt: 5}}>
      <Box sx={{ display: 'flex' }}>
        <Skeleton variant="rectangular" width="25%" height={30} />
      </Box>
      <TableContainer sx={{marginTop: "30px", borderRadius: "10px"}}>
        <Table aria-label="skeleton table" className="table">
          <TableHead>
            <TableRow sx={{height: "80px"}}>
              <TableCell sx={{ maxWidth: "33%" }}>
                <Skeleton variant="text" />
              </TableCell>
              <TableCell sx={{ maxWidth: "33%" }}>
                <Skeleton variant="text" />
              </TableCell>
              <TableCell sx={{ maxWidth: "34%" }}>
                <Skeleton variant="text" />
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index} sx={{height: "50px"}}>
                <TableCell sx={{"width": "33%"}}>
                  <Skeleton variant="text" width={100} />
                </TableCell>
                <TableCell sx={{"width": "33%"}}>
                  <Skeleton variant="text" width={150} />
                </TableCell>
                <TableCell sx={{"width": "34%"}}>
                  <Skeleton variant="text" width={100} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ManageUsersSkeletonTable;
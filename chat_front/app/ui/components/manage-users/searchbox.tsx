import React from 'react';
import { TextField, IconButton, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

type VirtualMachine = {
    full_name: string;
    first_name: string;
    last_name: string;
    email: string;
    is_active: string;
    roles: string[];
  };

interface Data {
    full_name: string;
    email: string;
    is_active: string;
}

interface CustomSearchBarProps {
    setRows: React.Dispatch<React.SetStateAction<VirtualMachine[]>>;
    rowsCopy: VirtualMachine[];
    setPage: React.Dispatch<React.SetStateAction<number>>;
  }

const CustomSearchBar = ({setRows, rowsCopy, setPage}: CustomSearchBarProps)  => {
  const [searched, setSearched] = React.useState('');
  

  const handleSearch = (value: string) => {
    setSearched(value);

    const filteredRows = rowsCopy.filter((row) =>
      Object.values(row).some(
        (fieldValue) =>
          typeof fieldValue === 'string' &&
          fieldValue.toLowerCase().includes(value.toLowerCase())
      )
    );

    setRows(filteredRows);
    setPage(0)
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <TextField
        value={searched}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search Users"
        variant="outlined"
        size="small"
        InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
      />
    </div>
  );
};

export default CustomSearchBar;
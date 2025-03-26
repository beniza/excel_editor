import { useState, useEffect, useCallback } from 'react';
import { read, utils, write } from 'xlsx';
import { 
  Box, Button, Container, Typography, Paper, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, TextField,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  IconButton, Snackbar, Alert, Tooltip, InputAdornment, Switch, FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  Clear as ClearIcon,
  ViewList as TableViewIcon,
  Dashboard as FlexViewIcon,
  FilterList as FilterListIcon,
  FilterAlt as FilterAltIcon
} from '@mui/icons-material';
import FormLayoutManager from './FormLayoutManager';

const ExcelEditor = () => {
  // State variables
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fileName, setFileName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [useFlexibleLayout, setUseFlexibleLayout] = useState(false);
  const [wordWrap, setWordWrap] = useState(true); // State for word wrap toggle
  const [fieldFilters, setFieldFilters] = useState({}); // State for field-level filters
  const [showFilterDialog, setShowFilterDialog] = useState(false); // State for filter dialog
  const [currentFilterColumn, setCurrentFilterColumn] = useState(null); // Current column being filtered
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    title: '',
    message: '',
    confirmText: '',
    confirmCallback: null
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Filter types
  const filterTypes = [
    { id: 'blank', label: 'Blank' },
    { id: 'nonBlank', label: 'Non-Blank' },
    { id: 'startsWith', label: 'Starts With', requiresValue: true },
    { id: 'contains', label: 'Contains', requiresValue: true }
  ];

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = read(e.target.result, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          showSnackbar('No data found in the Excel file', 'error');
          return;
        }

        // Extract column names from the first row
        const cols = Object.keys(jsonData[0]).map(key => ({
          name: key,
          label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
        }));

        setData(jsonData);
        setFilteredData(jsonData);
        setColumns(cols);
        setCurrentIndex(0);
        setFileName(file.name);
        setHasChanges(false);
        showSnackbar(`Loaded ${jsonData.length} entries from ${file.name}`, 'success');
      } catch (error) {
        console.error('Error reading Excel file:', error);
        showSnackbar('Error reading Excel file', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Apply field filters
  const applyFieldFilters = useCallback((dataToFilter) => {
    if (Object.keys(fieldFilters).length === 0) {
      return dataToFilter;
    }

    return dataToFilter.filter(item => {
      return Object.entries(fieldFilters).every(([columnName, filter]) => {
        const value = item[columnName];
        const stringValue = value !== null && value !== undefined ? String(value) : '';
        
        switch (filter.type) {
          case 'blank':
            return stringValue.trim() === '';
          case 'nonBlank':
            return stringValue.trim() !== '';
          case 'startsWith':
            return filter.value && stringValue.toLowerCase().startsWith(filter.value.toLowerCase());
          case 'contains':
            return filter.value && stringValue.toLowerCase().includes(filter.value.toLowerCase());
          default:
            return true;
        }
      });
    });
  }, [fieldFilters]);

  // Search functionality
  useEffect(() => {
    let filtered = data;
    
    // Apply text search if there is a search term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        return columns.some(col => {
          const value = item[col.name];
          return value !== null && 
                 value !== undefined && 
                 String(value).toLowerCase().includes(term);
        });
      });
    }
    
    // Apply field-level filters
    filtered = applyFieldFilters(filtered);
    
    setFilteredData(filtered);
    // Only reset the current index if the filtered data changes and there are results
    if (filtered.length > 0) {
      // Preserve the current index if possible, otherwise reset to 0
      setCurrentIndex(prev => prev < filtered.length ? prev : 0);
    } else {
      setCurrentIndex(-1);
    }
  }, [searchTerm, data, columns, applyFieldFilters]);
  
  // Open filter dialog for a column
  const openFilterDialog = (column) => {
    setCurrentFilterColumn(column);
    setShowFilterDialog(true);
  };
  
  // Apply filter for a column
  const applyFilter = (filterType, filterValue = '') => {
    if (!currentFilterColumn) return;
    
    const newFilters = { ...fieldFilters };
    
    if (filterType) {
      newFilters[currentFilterColumn.name] = {
        type: filterType,
        value: filterValue
      };
    } else {
      // Remove filter if no type is specified
      delete newFilters[currentFilterColumn.name];
    }
    
    setFieldFilters(newFilters);
    setShowFilterDialog(false);
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setFieldFilters({});
  };

  // Create new entry
  const createNewEntry = () => {
    const newEntry = {};
    
    // Initialize with empty values
    columns.forEach(column => {
      newEntry[column.name] = '';
    });
    
    // Add to data and filtered data
    setData(prevData => [...prevData, newEntry]);
    setFilteredData(prevFiltered => [...prevFiltered, newEntry]);
    
    // Go to the new entry
    setCurrentIndex(filteredData.length);
    setHasChanges(true);
    showSnackbar('New entry created', 'success');
  };

  // Delete current entry
  const confirmDeleteEntry = () => {
    if (filteredData.length === 0) return;
    
    showDialog(
      'Delete Entry',
      'Are you sure you want to delete this entry? This action cannot be undone.',
      'Delete',
      deleteCurrentEntry
    );
  };

  const deleteCurrentEntry = () => {
    if (filteredData.length === 0) return;
    
    const currentItem = filteredData[currentIndex];
    
    // Remove from filtered data
    const newFilteredData = [...filteredData];
    newFilteredData.splice(currentIndex, 1);
    setFilteredData(newFilteredData);
    
    // Find and remove from original data
    const originalIndex = data.findIndex(item => {
      return columns.every(col => 
        item[col.name] === currentItem[col.name]
      );
    });
    
    if (originalIndex !== -1) {
      const newData = [...data];
      newData.splice(originalIndex, 1);
      setData(newData);
    }
    
    // Adjust current index if needed
    if (currentIndex >= newFilteredData.length) {
      setCurrentIndex(newFilteredData.length > 0 ? newFilteredData.length - 1 : 0);
    }
    
    setHasChanges(true);
    showSnackbar('Entry deleted', 'success');
  };

  // Save changes
  const saveChanges = () => {
    showDialog(
      'Save Changes',
      'Do you want to save your changes to a new Excel file?',
      'Save',
      exportToExcel
    );
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      // Create worksheet
      const ws = utils.json_to_sheet(data, {
        header: columns.map(col => col.name)
      });
      
      // Create workbook
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Sheet1');
      
      // Generate file name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const newFileName = fileName.replace(/\.[^/.]+$/, '') + '_edited_' + timestamp + '.xlsx';
      
      // Save file
      const wbout = write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = newFileName;
      a.click();
      
      // Cleanup
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
      
      setHasChanges(false);
      showSnackbar(`Changes saved to ${newFileName}`, 'success');
      
    } catch (error) {
      console.error('Error saving file:', error);
      showSnackbar('Error saving file', 'error');
    }
  };

  // Navigation
  const goToPreviousEntry = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNextEntry = () => {
    if (currentIndex < filteredData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Update field value
  const updateFieldValue = (columnName, value) => {
    // Store the current index to prevent jumping
    const indexToUpdate = currentIndex;
    
    // Update in filtered data
    const updatedFilteredData = [...filteredData];
    updatedFilteredData[indexToUpdate] = {
      ...updatedFilteredData[indexToUpdate],
      [columnName]: value
    };
    
    // Find and update in original data
    const originalItem = filteredData[indexToUpdate];
    const originalIndex = data.findIndex(item => {
      return columns.every(col => 
        item[col.name] === originalItem[col.name]
      );
    });
    
    if (originalIndex !== -1) {
      const updatedData = [...data];
      updatedData[originalIndex] = {
        ...updatedData[originalIndex],
        [columnName]: value
      };
      setData(updatedData);
    }
    
    // Update filtered data without changing the current index
    setFilteredData(updatedFilteredData);
    setHasChanges(true);
  };

  // Dialog functions
  const showDialog = (title, message, confirmText, confirmCallback) => {
    setDialogConfig({
      title,
      message,
      confirmText,
      confirmCallback
    });
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleDialogConfirm = () => {
    if (dialogConfig.confirmCallback) {
      dialogConfig.confirmCallback();
    }
    setDialogOpen(false);
  };

  // Snackbar functions
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((event) => {
    // Ctrl+O: Open file
    if (event.ctrlKey && event.key === 'o') {
      event.preventDefault();
      document.getElementById('file-upload').click();
    }
    
    // Ctrl+S: Save changes
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      if (hasChanges) {
        saveChanges();
      }
    }
    
    // Ctrl+F: Focus search
    if (event.ctrlKey && event.key === 'f') {
      event.preventDefault();
      document.getElementById('search-input').focus();
    }
    
    // Ctrl+N: New entry
    if (event.ctrlKey && event.key === 'n') {
      event.preventDefault();
      createNewEntry();
    }
    
    // Ctrl+Left: Previous entry
    if (event.ctrlKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      if (currentIndex > 0) {
        goToPreviousEntry();
      }
    }
    
    // Ctrl+Right: Next entry
    if (event.ctrlKey && event.key === 'ArrowRight') {
      event.preventDefault();
      if (currentIndex < filteredData.length - 1) {
        goToNextEntry();
      }
    }
    
    // Alt+Z: Toggle word wrap
    if (event.altKey && event.key === 'z') {
      event.preventDefault();
      setWordWrap(prev => !prev);
      showSnackbar(`Word wrap ${!wordWrap ? 'enabled' : 'disabled'}`, 'info');
    }
    
    // Delete: Delete entry
    if (event.key === 'Delete' && document.activeElement === document.body) {
      event.preventDefault();
      if (filteredData.length > 0) {
        confirmDeleteEntry();
      }
    }
    
    // Escape: Close dialog
    if (event.key === 'Escape') {
      if (dialogOpen) {
        handleDialogClose();
      } else if (showFilterDialog) {
        setShowFilterDialog(false);
      }
    }
  }, [currentIndex, filteredData.length, hasChanges, dialogOpen, showFilterDialog, wordWrap]);

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <Container maxWidth={false} sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3 }, width: '100vw' }}>
      <Paper sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Typography variant="h4" gutterBottom>
          Excel Editor
        </Typography>
        
        {/* File Upload */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <input
            id="file-upload"
            type="file"
            accept=".xlsx, .xls"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => document.getElementById('file-upload').click()}
          >
            Upload Excel File
          </Button>
          {fileName && (
            <Typography variant="body1" sx={{ ml: 2 }}>
              {fileName}
            </Typography>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            disabled={!hasChanges}
            onClick={saveChanges}
            sx={{ ml: 2 }}
          >
            Save Changes
          </Button>
        </Box>

        {/* Search Bar */}
        <Box sx={{ mb: 3 }}>
          <TextField
            id="search-input"
            label="Search"
            variant="outlined"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton onClick={() => setSearchTerm('')}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>

        {/* Navigation Controls */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={createNewEntry}
              sx={{ mr: 1 }}
            >
              New Entry
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={confirmDeleteEntry}
              disabled={filteredData.length === 0}
            >
              Delete Entry
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Previous Entry (Ctrl+Left)">
              <span>
                <IconButton
                  onClick={goToPreviousEntry}
                  disabled={currentIndex <= 0 || filteredData.length === 0}
                >
                  <PrevIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Typography variant="body1" sx={{ mx: 2 }}>
              {filteredData.length > 0 
                ? `${currentIndex + 1} of ${filteredData.length}` 
                : 'No entries'}
            </Typography>
            <Tooltip title="Next Entry (Ctrl+Right)">
              <span>
                <IconButton
                  onClick={goToNextEntry}
                  disabled={currentIndex >= filteredData.length - 1 || filteredData.length === 0}
                >
                  <NextIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {/* Layout and Word Wrap Toggles */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
          {/* Filter indicator */}
          <Box>
            {Object.keys(fieldFilters).length > 0 && (
              <Button 
                startIcon={<FilterListIcon color="primary" />}
                variant="outlined"
                size="small"
                onClick={clearAllFilters}
              >
                {Object.keys(fieldFilters).length} {Object.keys(fieldFilters).length === 1 ? 'Filter' : 'Filters'} Active - Clear All
              </Button>
            )}
          </Box>
          
          {/* Layout and Word Wrap controls */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={wordWrap}
                  onChange={(e) => setWordWrap(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2">
                    Word Wrap (Alt+Z)
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={useFlexibleLayout}
                  onChange={(e) => setUseFlexibleLayout(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {useFlexibleLayout ? 
                    <FlexViewIcon sx={{ mr: 1 }} /> : 
                    <TableViewIcon sx={{ mr: 1 }} />
                  }
                  <Typography variant="body2">
                    {useFlexibleLayout ? 'Flexible Layout' : 'Table Layout'}
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Box>

        {/* Entry Form */}
        {filteredData.length > 0 && currentIndex >= 0 && currentIndex < filteredData.length ? (
          useFlexibleLayout ? (
            <FormLayoutManager 
              columns={columns} 
              currentItem={filteredData[currentIndex]} 
              updateFieldValue={updateFieldValue}
              layoutKey={fileName ? `${fileName}-layout` : 'default-layout'}
            />
          ) : (
            <Box sx={{ mb: 3 }}>
              <TableContainer component={Paper} variant="outlined" sx={{ width: '100%', overflowX: 'auto' }}>
                <Table sx={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell width="20%">Field</TableCell>
                      <TableCell width="80%">Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {columns.map((column) => {
                      // Check if this field is likely to contain large amounts of text
                      const isLargeTextField = /comment|description|note|target|text|content|message|detail/i.test(column.name);
                      
                      return (
                        <TableRow key={column.name}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {column.label}
                              <Tooltip title="Filter this field">
                                <IconButton size="small" onClick={() => openFilterDialog(column)}>
                                  <FilterListIcon fontSize="small" 
                                    color={fieldFilters[column.name] ? 'primary' : 'inherit'} 
                                  />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <TextField
                              fullWidth
                              variant="outlined"
                              multiline={isLargeTextField}
                              minRows={isLargeTextField ? 2 : 1}
                              maxRows={isLargeTextField ? 6 : 1}
                              value={filteredData[currentIndex][column.name] || ''}
                              onChange={(e) => updateFieldValue(column.name, e.target.value)}
                              sx={{
                                width: '100%',
                                '& .MuiInputBase-root': {
                                  ...(isLargeTextField && {
                                    minHeight: '100px',
                                    alignItems: 'flex-start'
                                  }),
                                  width: '100%',
                                  overflow: 'auto'
                                },
                                '& .MuiInputBase-input': {
                                  width: '100%',
                                  overflow: 'auto',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: wordWrap ? 'pre-wrap' : 'nowrap',
                                  wordWrap: wordWrap ? 'break-word' : 'normal'
                                }
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )
        ) : (
          <Box sx={{ mb: 3, textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {data.length > 0 
                ? 'No entries match your search criteria.' 
                : 'Upload an Excel file to get started.'}
            </Typography>
          </Box>
        )}

        {/* Keyboard Shortcuts Help */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Keyboard Shortcuts:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ctrl+O: Open file | Ctrl+S: Save | Ctrl+F: Search | Ctrl+N: New entry | 
            Ctrl+Left/Right: Navigate | Alt+Z: Toggle word wrap | Delete: Delete entry
          </Typography>
        </Box>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
      >
        <DialogTitle>{dialogConfig.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dialogConfig.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleDialogConfirm} color="primary" autoFocus>
            {dialogConfig.confirmText}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onClose={() => setShowFilterDialog(false)}>
        <DialogTitle>
          Filter: {currentFilterColumn?.label}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ minWidth: 300, mt: 2 }}>
            {filterTypes.map((filterType) => (
              <Box key={filterType.id} sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => {
                    if (filterType.requiresValue) {
                      // Don't close dialog yet for filters that need a value
                    } else {
                      applyFilter(filterType.id);
                    }
                  }}
                  sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                >
                  {filterType.label}
                </Button>
                
                {filterType.requiresValue && (
                  <TextField
                    fullWidth
                    placeholder={`Enter value for ${filterType.label.toLowerCase()}`}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        applyFilter(filterType.id, e.target.value);
                      }
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={(e) => {
                              const input = e.currentTarget.closest('.MuiTextField-root').querySelector('input');
                              applyFilter(filterType.id, input.value);
                            }}
                            edge="end"
                          >
                            <FilterAltIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              </Box>
            ))}
            
            {currentFilterColumn && fieldFilters[currentFilterColumn.name] && (
              <Button 
                variant="outlined" 
                color="error" 
                fullWidth 
                onClick={() => applyFilter(null)}
                sx={{ mt: 2 }}
              >
                Clear Filter
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFilterDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ExcelEditor;
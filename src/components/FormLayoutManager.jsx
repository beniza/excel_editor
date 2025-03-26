import { useState, useEffect } from 'react';
import { Box, Paper, Typography, IconButton, TextField, Tooltip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField as MuiTextField, MenuItem, Select, FormControl, InputLabel, List, ListItem, ListItemText, Checkbox, ListItemIcon } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  DragIndicator as DragIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Save as SaveIcon,
  Restore as RestoreIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const FormLayoutManager = ({ columns, currentItem, updateFieldValue, layoutKey = 'default' }) => {
  // Default layout: one field per row
  const generateDefaultLayout = () => {
    return columns.map((column, index) => ({
      id: column.name,
      column,
      order: index,
      rowId: index, // Each field gets its own row by default
      width: 12, // Full width (12 grid units in Material UI grid system)
      expanded: true,
      size: 'medium', // Options: small, medium, large
      hidden: false // New property for field visibility
    }));
  };

  // State for form layout
  const [formLayout, setFormLayout] = useState([]);
  const [rows, setRows] = useState([]);
  const [savedLayouts, setSavedLayouts] = useState({});
  const [showHiddenFields, setShowHiddenFields] = useState(false);
  const [layoutDialogOpen, setLayoutDialogOpen] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [currentLayoutName, setCurrentLayoutName] = useState('Default');
  const [layoutSwitchDialogOpen, setLayoutSwitchDialogOpen] = useState(false);
  
  // Initialize layout
  useEffect(() => {
    if (columns.length > 0) {
      // Try to load saved layout from localStorage
      const savedLayoutsStr = localStorage.getItem('excelEditorLayouts');
      let savedLayouts = {};
      
      if (savedLayoutsStr) {
        try {
          savedLayouts = JSON.parse(savedLayoutsStr);
          setSavedLayouts(savedLayouts);
        } catch (e) {
          console.error('Error parsing saved layouts:', e);
        }
      }
      
      // If we have a saved layout for this key, use it
      if (savedLayouts[layoutKey] && savedLayouts[layoutKey].layout && 
          savedLayouts[layoutKey].layout.length === columns.length) {
        setFormLayout(savedLayouts[layoutKey].layout);
        setCurrentLayoutName(savedLayouts[layoutKey].name || 'Default');
      } else {
        // Otherwise use default layout
        setFormLayout(generateDefaultLayout());
        setCurrentLayoutName('Default');
      }
    }
  }, [columns, layoutKey]);
  
  // Organize fields into rows whenever formLayout changes
  useEffect(() => {
    if (formLayout.length > 0) {
      // Group fields by rowId
      const rowMap = {};
      
      formLayout.forEach(field => {
        if (!rowMap[field.rowId]) {
          rowMap[field.rowId] = [];
        }
        rowMap[field.rowId].push(field);
      });
      
      // Sort rows by the minimum order of fields in each row
      const sortedRows = Object.keys(rowMap)
        .map(rowId => ({
          id: rowId,
          fields: rowMap[rowId].sort((a, b) => a.order - b.order)
        }))
        .sort((a, b) => {
          const aMinOrder = Math.min(...a.fields.map(f => f.order));
          const bMinOrder = Math.min(...b.fields.map(f => f.order));
          return aMinOrder - bMinOrder;
        });
      
      setRows(sortedRows);
    }
  }, [formLayout]);

  // Handle drag end event
  const handleDragEnd = (result) => {
    const { source, destination, type } = result;
    
    // Dropped outside the list
    if (!destination) return;
    
    // If the drag didn't result in a position change
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    // Handle field reordering within a row or moving to another row
    if (type === 'FIELD') {
      const newFormLayout = [...formLayout];
      const sourceRowId = source.droppableId;
      const destRowId = destination.droppableId;
      
      // Find the field being moved
      const fieldIndex = newFormLayout.findIndex(f => 
        f.rowId.toString() === sourceRowId && 
        f.order === formLayout.filter(field => field.rowId.toString() === sourceRowId)
          .sort((a, b) => a.order - b.order)[source.index].order
      );
      
      if (fieldIndex === -1) return;
      
      // Update the field's row and order
      const movedField = { ...newFormLayout[fieldIndex] };
      movedField.rowId = parseInt(destRowId, 10);
      
      // Remove the field from its current position
      newFormLayout.splice(fieldIndex, 1);
      
      // Get the fields in the destination row, sorted by order
      const destRowFields = formLayout
        .filter(field => field.rowId.toString() === destRowId)
        .sort((a, b) => a.order - b.order);
      
      // Calculate the new order for the moved field
      let newOrder;
      if (destRowFields.length === 0) {
        // If the destination row is empty, use the field's current order
        newOrder = movedField.order;
      } else if (destination.index === 0) {
        // If inserting at the beginning, use one less than the current minimum
        newOrder = Math.max(0, destRowFields[0].order - 1);
      } else if (destination.index >= destRowFields.length) {
        // If inserting at the end, use one more than the current maximum
        newOrder = destRowFields[destRowFields.length - 1].order + 1;
      } else {
        // If inserting in the middle, use the average of the surrounding fields
        newOrder = (destRowFields[destination.index - 1].order + destRowFields[destination.index].order) / 2;
      }
      
      movedField.order = newOrder;
      
      // Add the field back in its new position
      newFormLayout.push(movedField);
      
      setFormLayout(newFormLayout);
    }
    
    // Handle row reordering
    if (type === 'ROW') {
      const reorderedRows = Array.from(rows);
      const [removed] = reorderedRows.splice(source.index, 1);
      reorderedRows.splice(destination.index, 0, removed);
      
      // Update the rowId of all fields to match their new row positions
      const newFormLayout = [...formLayout];
      
      reorderedRows.forEach((row, newIndex) => {
        const oldRowId = parseInt(row.id, 10);
        const fieldsToUpdate = newFormLayout.filter(field => field.rowId === oldRowId);
        
        fieldsToUpdate.forEach(field => {
          field.rowId = newIndex;
        });
      });
      
      setFormLayout(newFormLayout);
    }
  };

  // Toggle field expansion
  const toggleFieldExpansion = (fieldId) => {
    setFormLayout(prevLayout => 
      prevLayout.map(field => 
        field.id === fieldId 
          ? { ...field, expanded: !field.expanded } 
          : field
      )
    );
  };

  // Toggle field visibility
  const toggleFieldVisibility = (fieldId) => {
    setFormLayout(prevLayout => 
      prevLayout.map(field => 
        field.id === fieldId 
          ? { ...field, hidden: !field.hidden } 
          : field
      )
    );
  };

  // Change field size
  const changeFieldSize = (fieldId, newSize) => {
    setFormLayout(prevLayout => 
      prevLayout.map(field => 
        field.id === fieldId 
          ? { ...field, size: newSize } 
          : field
      )
    );
  };

  // Change field width
  const changeFieldWidth = (fieldId, widthChange) => {
    setFormLayout(prevLayout => {
      const updatedLayout = [...prevLayout];
      const fieldIndex = updatedLayout.findIndex(f => f.id === fieldId);
      
      if (fieldIndex !== -1) {
        const field = updatedLayout[fieldIndex];
        const newWidth = Math.max(1, Math.min(12, field.width + widthChange));
        updatedLayout[fieldIndex] = { ...field, width: newWidth };
      }
      
      return updatedLayout;
    });
  };

  // Create a new row
  const createNewRow = () => {
    // Find the highest rowId
    const highestRowId = Math.max(...formLayout.map(field => field.rowId), -1);
    const newRowId = highestRowId + 1;
    
    // Update the first field that's not in a row yet (if any)
    const fieldNotInRow = formLayout.find(field => field.rowId === undefined);
    
    if (fieldNotInRow) {
      setFormLayout(prevLayout => 
        prevLayout.map(field => 
          field.id === fieldNotInRow.id 
            ? { ...field, rowId: newRowId } 
            : field
        )
      );
    } else {
      // If all fields are already in rows, we don't need to do anything
      // The row will be created when a field is dragged into it
    }
  };

  // Open save layout dialog
  const openSaveLayoutDialog = () => {
    setNewLayoutName(currentLayoutName === 'Default' ? '' : currentLayoutName);
    setLayoutDialogOpen(true);
  };

  // Save layout with name
  const saveLayoutWithName = () => {
    const layoutName = newLayoutName.trim() || 'Default';
    const newSavedLayouts = { 
      ...savedLayouts, 
      [layoutKey]: {
        name: layoutName,
        layout: formLayout
      }
    };
    setSavedLayouts(newSavedLayouts);
    setCurrentLayoutName(layoutName);
    localStorage.setItem('excelEditorLayouts', JSON.stringify(newSavedLayouts));
    setLayoutDialogOpen(false);
  };

  // Open layout switch dialog
  const openLayoutSwitchDialog = () => {
    setLayoutSwitchDialogOpen(true);
  };

  // Switch to selected layout
  const switchToLayout = (layoutKeyToLoad) => {
    if (savedLayouts[layoutKeyToLoad]) {
      setFormLayout(savedLayouts[layoutKeyToLoad].layout);
      setCurrentLayoutName(savedLayouts[layoutKeyToLoad].name || 'Default');
    }
    setLayoutSwitchDialogOpen(false);
  };

  // Delete a saved layout
  const deleteLayout = (layoutKeyToDelete) => {
    const newSavedLayouts = { ...savedLayouts };
    delete newSavedLayouts[layoutKeyToDelete];
    setSavedLayouts(newSavedLayouts);
    localStorage.setItem('excelEditorLayouts', JSON.stringify(newSavedLayouts));
  };

  // Restore default layout
  const restoreDefaultLayout = () => {
    setFormLayout(generateDefaultLayout());
    setCurrentLayoutName('Default');
  };

  // Get the appropriate height based on field size
  const getFieldHeight = (field) => {
    if (!field.expanded) return 'auto';
    
    const isLargeTextField = /comment|description|note|target|text|content|message|detail/i.test(field.column.name);
    
    if (isLargeTextField) {
      switch (field.size) {
        case 'small': return '100px';
        case 'large': return '300px';
        default: return '200px'; // medium
      }
    } else {
      switch (field.size) {
        case 'small': return 'auto';
        case 'large': return '120px';
        default: return 'auto'; // medium
      }
    }
  };

  // Calculate grid column width based on field width
  const getGridColumnWidth = (width) => {
    return `${(width / 12) * 100}%`;
  };

  // Filter fields based on visibility
  const getVisibleFields = (fields) => {
    return showHiddenFields ? fields : fields.filter(field => !field.hidden);
  };

  return (
    <Box sx={{ width: '100%', mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ mr: 1 }}>
            Current Layout: {currentLayoutName}
          </Typography>
          <Button 
            variant="outlined" 
            size="small"
            onClick={openLayoutSwitchDialog}
            sx={{ mr: 1 }}
          >
            Switch Layout
          </Button>
        </Box>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<SaveIcon />} 
            onClick={openSaveLayoutDialog}
            sx={{ mr: 1 }}
          >
            Save Layout
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<RestoreIcon />} 
            onClick={restoreDefaultLayout}
          >
            Reset Layout
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={showHiddenFields ? <VisibilityOffIcon /> : <VisibilityIcon />}
          onClick={() => setShowHiddenFields(!showHiddenFields)}
          size="small"
        >
          {showHiddenFields ? 'Hide Hidden Fields' : 'Show Hidden Fields'}
        </Button>
      </Box>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="rows" type="ROW">
          {(provided) => (
            <Box
              {...provided.droppableProps}
              ref={provided.innerRef}
              sx={{ width: '100%' }}
            >
              {rows.map((row, rowIndex) => {
                // Filter visible fields for this row
                const visibleFields = getVisibleFields(row.fields);
                
                // Skip rendering empty rows when hidden fields are not shown
                if (visibleFields.length === 0 && !showHiddenFields) return null;
                
                return (
                  <Draggable key={row.id} draggableId={`row-${row.id}`} index={rowIndex}>
                    {(provided) => (
                      <Paper
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        variant="outlined"
                        sx={{ 
                          mb: 2, 
                          p: 1,
                          backgroundColor: '#f9f9f9',
                          position: 'relative'
                        }}
                      >
                        <Box 
                          {...provided.dragHandleProps}
                          sx={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            p: 1, 
                            cursor: 'grab',
                            '&:hover': { color: 'primary.main' }
                          }}
                        >
                          <DragIcon fontSize="small" />
                        </Box>
                        
                        <Droppable droppableId={row.id.toString()} direction="horizontal" type="FIELD">
                          {(provided) => (
                            <Box
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              sx={{ 
                                display: 'flex', 
                                flexWrap: 'wrap',
                                alignItems: 'flex-start',
                                width: '100%',
                                pl: 4 // Space for the drag handle
                              }}
                            >
                              {visibleFields.map((field, fieldIndex) => (
                                <Draggable
                                  key={field.id}
                                  draggableId={field.id}
                                  index={fieldIndex}
                                >
                                  {(provided) => (
                                    <Box
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      sx={{ 
                                        width: getGridColumnWidth(field.width),
                                        p: 1,
                                        transition: 'all 0.2s ease'
                                      }}
                                    >
                                      <Paper
                                        elevation={1}
                                        sx={{ 
                                          p: 1, 
                                          height: '100%',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          '&:hover': { boxShadow: 3 }
                                        }}
                                      >
                                        <Box sx={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          mb: 1,
                                          pb: 1,
                                          borderBottom: '1px solid #eee'
                                        }}>
                                          <Box 
                                            {...provided.dragHandleProps}
                                            sx={{ 
                                              mr: 1, 
                                              cursor: 'grab',
                                              '&:hover': { color: 'primary.main' }
                                            }}
                                          >
                                            <DragIcon fontSize="small" />
                                          </Box>
                                          
                                          <Typography variant="body2" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                                            {field.column.label}
                                          </Typography>
                                          
                                          <Box>
                                            <Tooltip title="Decrease Width">
                                              <IconButton 
                                                size="small" 
                                                onClick={() => changeFieldWidth(field.id, -1)}
                                                disabled={field.width <= 1}
                                              >
                                                <ZoomOutIcon fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                            
                                            <Tooltip title="Increase Width">
                                              <IconButton 
                                                size="small" 
                                                onClick={() => changeFieldWidth(field.id, 1)}
                                                disabled={field.width >= 12}
                                              >
                                                <ZoomInIcon fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                            
                                            <Tooltip title={field.expanded ? "Collapse" : "Expand"}>
                                              <IconButton 
                                                size="small" 
                                                onClick={() => toggleFieldExpansion(field.id)}
                                              >
                                                {field.expanded ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                                              </IconButton>
                                            </Tooltip>

                                            <Tooltip title={field.hidden ? "Unhide Field" : "Hide Field"}>
                                              <IconButton 
                                                size="small" 
                                                onClick={() => toggleFieldVisibility(field.id)}
                                              >
                                                {field.hidden ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                                              </IconButton>
                                            </Tooltip>
                                          </Box>
                                        </Box>
                                        
                                        {field.expanded && (
                                          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                            <TextField
                                              fullWidth
                                              variant="outlined"
                                              size="small"
                                              multiline={/comment|description|note|target|text|content|message|detail/i.test(field.column.name)}
                                              minRows={1}
                                              value={currentItem[field.column.name] || ''}
                                              onChange={(e) => updateFieldValue(field.column.name, e.target.value)}
                                              sx={{
                                                flexGrow: 1,
                                                '& .MuiInputBase-root': {
                                                  height: getFieldHeight(field),
                                                  alignItems: 'flex-start',
                                                  overflow: 'auto'
                                                },
                                                '& .MuiInputBase-input': {
                                                  overflow: 'auto',
                                                  textOverflow: 'ellipsis',
                                                  whiteSpace: 'pre-wrap',
                                                  wordWrap: 'break-word'
                                                }
                                              }}
                                            />
                                            
                                            <Box sx={{ 
                                              display: 'flex', 
                                              justifyContent: 'flex-end', 
                                              mt: 1,
                                              pt: 1,
                                              borderTop: '1px solid #eee'
                                            }}>
                                              <Tooltip title="Small">
                                                <Button 
                                                  size="small" 
                                                  variant={field.size === 'small' ? "contained" : "text"}
                                                  onClick={() => changeFieldSize(field.id, 'small')}
                                                  sx={{ minWidth: '30px', px: 1 }}
                                                >
                                                  S
                                                </Button>
                                              </Tooltip>
                                              <Tooltip title="Medium">
                                                <Button 
                                                  size="small" 
                                                  variant={field.size === 'medium' ? "contained" : "text"}
                                                  onClick={() => changeFieldSize(field.id, 'medium')}
                                                  sx={{ minWidth: '30px', px: 1 }}
                                                >
                                                  M
                                                </Button>
                                              </Tooltip>
                                              <Tooltip title="Large">
                                                <Button 
                                                  size="small" 
                                                  variant={field.size === 'large' ? "contained" : "text"}
                                                  onClick={() => changeFieldSize(field.id, 'large')}
                                                  sx={{ minWidth: '30px', px: 1 }}
                                                >
                                                  L
                                                </Button>
                                              </Tooltip>
                                            </Box>
                                          </Box>
                                        )}
                                      </Paper>
                                    </Box>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </Box>
                          )}
                        </Droppable>
                      </Paper>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </DragDropContext>

      {/* Save Layout Dialog */}
      <Dialog open={layoutDialogOpen} onClose={() => setLayoutDialogOpen(false)}>
        <DialogTitle>Save Layout</DialogTitle>
        <DialogContent>
          <MuiTextField
            autoFocus
            margin="dense"
            label="Layout Name"
            fullWidth
            variant="outlined"
            value={newLayoutName}
            onChange={(e) => setNewLayoutName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLayoutDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveLayoutWithName} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Switch Layout Dialog */}
      <Dialog 
        open={layoutSwitchDialogOpen} 
        onClose={() => setLayoutSwitchDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Switch Layout</DialogTitle>
        <DialogContent>
          <List>
            {Object.keys(savedLayouts).map((key) => (
              <ListItem 
                key={key} 
                button 
                onClick={() => switchToLayout(key)}
                selected={layoutKey === key}
              >
                <ListItemText 
                  primary={savedLayouts[key].name || 'Unnamed Layout'} 
                  secondary={key}
                />
                {key !== layoutKey && (
                  <IconButton edge="end" onClick={(e) => {
                    e.stopPropagation();
                    deleteLayout(key);
                  }}>
                    <DeleteIcon />
                  </IconButton>
                )}
              </ListItem>
            ))}
            {Object.keys(savedLayouts).length === 0 && (
              <ListItem>
                <ListItemText primary="No saved layouts" />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLayoutSwitchDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FormLayoutManager;
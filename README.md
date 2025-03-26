# React Excel Editor

![React Excel Editor](https://img.shields.io/badge/React-Excel%20Editor-blue)

A powerful, user-friendly web application for viewing, editing, and managing Excel files directly in your browser. Built with React and Material UI, this tool provides an intuitive interface for working with spreadsheet data without requiring Microsoft Excel or other desktop applications.

## Features

### Core Functionality
- **Excel File Import**: Upload and parse Excel (.xlsx, .xls) files
- **Data Viewing**: Browse through entries with an intuitive navigation system
- **Data Editing**: Modify cell values with real-time validation
- **Data Export**: Save changes back to Excel format

### Advanced Features
- **Search**: Quickly find entries with full-text search across all columns
- **Filtering**: Apply column-specific filters (blank, non-blank, starts with, contains)
- **Layout Customization**: Drag-and-drop interface to rearrange fields and create custom layouts
- **Flexible Views**: Toggle between table view and form view for different editing experiences
- **Word Wrap**: Toggle word wrapping for better visibility of long text
- **Keyboard Shortcuts**: Enhance productivity with keyboard navigation and commands

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd react-excel-editor
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Build for production:
   ```bash
   npm run build
   # or
   yarn build
   ```

## Usage Guide

### Importing Excel Files

1. Click the "Upload Excel File" button or use the keyboard shortcut `Ctrl+O`
2. Select an Excel file (.xlsx or .xls) from your computer
3. The data will be loaded and displayed in the editor

### Navigating Data

- Use the navigation buttons (Previous/Next) to move between entries
- Alternatively, use keyboard shortcuts `Ctrl+Left Arrow` and `Ctrl+Right Arrow`
- The current position is displayed (e.g., "Entry 5 of 100")

### Searching and Filtering

- Use the search box to perform a full-text search across all columns
- Click the filter icon next to any column header to apply column-specific filters
- Available filters include: Blank, Non-Blank, Starts With, Contains
- Clear all filters using the "Clear Filters" button

### Editing Data

- In form view: Edit fields directly in the form
- In table view: Click on cells to edit their values
- All changes are tracked and can be saved back to an Excel file

### Layout Customization

1. Toggle between table view and form view using the view toggle button
2. In form view, use the drag handles to rearrange fields
3. Adjust field sizes using the size controls (small, medium, large)
4. Hide/show fields as needed
5. Save custom layouts for future use

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+O | Open file dialog |
| Ctrl+S | Save changes |
| Ctrl+F | Focus search box |
| Ctrl+N | Create new entry |
| Ctrl+Left | Previous entry |
| Ctrl+Right | Next entry |
| Alt+Z | Toggle word wrap |
| Delete | Delete current entry |
| Escape | Close dialog |

## Deployment

The React Excel Editor can be deployed in various ways. For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### Live Demo

You can try out the application without installing it by visiting our Vercel deployment:
[Excel Editor/](https://react-excel-editor.vercel.app/)

### Common Deployment Options

- Static hosting services (Netlify, Vercel, GitHub Pages)
- Traditional web servers (Apache, Nginx)
- Docker containers

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [React](https://reactjs.org/)
- [Material UI](https://mui.com/)
- [SheetJS](https://sheetjs.com/) for Excel file parsing
- [React Beautiful DnD](https://github.com/atlassian/react-beautiful-dnd) for drag-and-drop functionality

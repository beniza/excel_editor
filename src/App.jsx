import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import ExcelEditor from './components/ExcelEditor'
import './App.css'

function App() {
  // Create a theme with primary and secondary colors
  const theme = createTheme({
    palette: {
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
        <ExcelEditor />
      </Box>
    </ThemeProvider>
  )
}

export default App

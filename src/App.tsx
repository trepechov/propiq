import { Navigate, Route, Routes } from 'react-router-dom'
import { AppBar, Toolbar, Typography } from '@mui/material'
import NeighborhoodsPage from './pages/NeighborhoodsPage'

export default function App() {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div">
            PropIQ
          </Typography>
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={<Navigate to="/neighborhoods" replace />} />
        <Route path="/neighborhoods" element={<NeighborhoodsPage />} />
      </Routes>
    </>
  )
}

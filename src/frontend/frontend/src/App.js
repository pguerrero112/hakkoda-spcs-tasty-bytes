import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ThemeProvider } from './utils/ThemeContext';
import { isLoggedIn, clientValidation } from './utils/utils';

import Login   from './pages/Login';
import Home    from './pages/Home';
import Details from './pages/Details';
import Cities  from './pages/Cities';

import './App.css';

function ProtectedRoute() {
  const location = useLocation();
  return isLoggedIn(location.state) ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/"        element={<Home />} />
            <Route path="/home"    element={<Home />} />
            <Route path="/details" element={<Details />} />
            <Route path="/cities"  element={<Cities />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

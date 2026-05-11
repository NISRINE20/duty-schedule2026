import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";

const theme = {
  name: 'light',
  bg: {
    main: '#f8fafc',
    card: '#ffffff',
    input: '#ffffff',
    hover: '#f1f5f9',
    accent: '#eff6ff'
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#94a3b8',
    inverse: '#ffffff'
  },
  border: {
    main: '#e2e8f0',
    focus: '#cbd5e1'
  },
  primary: {
    main: '#2563eb',
    hover: '#1d4ed8',
    light: '#bfdbfe'
  },
  status: {
    success: { bg: '#dcfce7', text: '#166534' },
    error: { bg: '#fee2e2', text: '#991b1b' },
    warning: { bg: '#fef3c7', text: '#92400e' },
    info: { bg: '#e0f2fe', text: '#0369a1' }
  }
};

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <ThemeProvider theme={theme}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ThemeProvider>
);
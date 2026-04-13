import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import DashboardPage from "./Pages/DashboardPage";
import CalendarPage from "./Pages/CalendarPage";
import TemplatesPage from "./Pages/TemplatesPage";
import LoginPage from "./Pages/LoginPage";
import SignupPage from "./Pages/SignupPage";
import SummaryPage from "./Pages/SummaryPage";
import Navbar from "./Components/Navbar";
import GlobalStyles from "./styles/GlobalStyles";
import styled from "styled-components";

// ProtectedRoute component to handle auth redirects
function ProtectedRoute({ children, requiredRole }) {
  const authRole = localStorage.getItem("authRole");
  if (!authRole) {
    return <Navigate to="/login" replace />;
  }
  if (requiredRole && authRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";

  return (
    <AppContainer>
      <GlobalStyles />
      {!isAuthPage && <Navbar />}

      <MainContent $isAuthPage={isAuthPage}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/templates" element={<ProtectedRoute requiredRole="admin"><TemplatesPage /></ProtectedRoute>} />
          <Route path="/summary" element={<ProtectedRoute requiredRole="admin"><SummaryPage /></ProtectedRoute>} />
        </Routes>
      </MainContent>
    </AppContainer>
  );
}

const AppContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: #f8fafc;
`;

const MainContent = styled.div`
  flex: 1;
  overflow-y: auto;
  height: 100vh;

  @media (max-width: 768px) {
    margin-left: ${props => props.$isAuthPage ? '0' : '70px'};
  }
`;

export default App;
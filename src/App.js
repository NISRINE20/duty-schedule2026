import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import DashboardPage from "./Pages/DashboardPage";
import CalendarPage from "./Pages/CalendarPage";
import TemplatesPage from "./Pages/TemplatesPage";
import LoginPage from "./Pages/LoginPage";
import SignupPage from "./Pages/SignupPage";
import SummaryPage from "./Pages/SummaryPage";
import Navbar from "./Components/Navbar";
import GlobalStyles from "./styles/GlobalStyles";
import styled from "styled-components";
import { db } from './firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Cleanup function for denied leave requests older than 24 hours
const cleanupDeniedLeaveRequests = async () => {
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const q = query(
      collection(db, "dutyEvents"),
      where("leaveRequestDenied", "==", true)
    );
    
    const querySnapshot = await getDocs(q);
    const deletePromises = [];
    
    querySnapshot.forEach((document) => {
      const data = document.data();
      if (data.leaveRequestDeniedAt) {
        const deniedAt = new Date(data.leaveRequestDeniedAt);
        if (deniedAt < twentyFourHoursAgo) {
          deletePromises.push(deleteDoc(doc(db, "dutyEvents", document.id)));
        }
      }
    });
    
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`Cleaned up ${deletePromises.length} denied leave requests older than 24 hours`);
    }
  } catch (error) {
    console.error("Error cleaning up denied leave requests:", error);
  }
};

function App() {
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";

  // Run cleanup on app start and every hour
  useEffect(() => {
    cleanupDeniedLeaveRequests();
    
    const interval = setInterval(cleanupDeniedLeaveRequests, 60 * 60 * 1000); // Run every hour
    
    return () => clearInterval(interval);
  }, []);

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
          <Route path="/summary" element={<ProtectedRoute><SummaryPage /></ProtectedRoute>} />
        </Routes>
      </MainContent>
    </AppContainer>
  );
}

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

const AppContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: transparent;
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
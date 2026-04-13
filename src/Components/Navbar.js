import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import Loader from './Loader';

const LogoutIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const DashboardIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9"></rect>
    <rect x="14" y="3" width="7" height="5"></rect>
    <rect x="14" y="12" width="7" height="9"></rect>
    <rect x="3" y="16" width="7" height="5"></rect>
  </svg>
);

const CalendarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const TemplatesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const SummaryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const authRole = localStorage.getItem('authRole');
  const authName = localStorage.getItem('authName');

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Firebase logout error", error);
    }
    localStorage.removeItem('authRole');
    localStorage.removeItem('authName');
    
    // Slight artificial delay to allow animation frame and ensure smooth transition 
    setTimeout(() => {
      setIsLoading(false);
      navigate('/login');
    }, 500);
  };

  return (
    <>
      {isLoading && <Loader message="Logging out..." />}
      <SidebarContainer $isOpen={isOpen}>
        <TopSection $isOpen={isOpen}>
        {isOpen && <Logo>Duty Schedule</Logo>}
        <MenuButton onClick={() => setIsOpen(!isOpen)} $isOpen={isOpen}>
          <MenuIcon />
        </MenuButton>
      </TopSection>

      <LinksContainer>
        <StyledLink to="/" $active={location.pathname === "/"}>
          <IconWrapper><DashboardIcon /></IconWrapper>
          <LinkLabel $isOpen={isOpen}>Dashboard</LinkLabel>
        </StyledLink>
        <StyledLink to="/calendar" $active={location.pathname === "/calendar"}>
          <IconWrapper><CalendarIcon /></IconWrapper>
          <LinkLabel $isOpen={isOpen}>Calendar</LinkLabel>
        </StyledLink>
        {authRole === 'admin' && (
          <>
            <StyledLink to="/templates" $active={location.pathname === "/templates"}>
              <IconWrapper><TemplatesIcon /></IconWrapper>
              <LinkLabel $isOpen={isOpen}>Templates</LinkLabel>
            </StyledLink>
            <StyledLink to="/summary" $active={location.pathname === "/summary"}>
              <IconWrapper><SummaryIcon /></IconWrapper>
              <LinkLabel $isOpen={isOpen}>Summary</LinkLabel>
            </StyledLink>
          </>
        )}
      </LinksContainer>

      <BottomSection>
        {authRole === 'admin' ? (
          <UserProfile $isOpen={isOpen}>Logged in as: <strong>Admin</strong></UserProfile>
        ) : (
          <UserProfile $isOpen={isOpen}>{isOpen ? `Logged in as: ` : ''}<strong>{authName}</strong></UserProfile>
        )}
        <LogoutButton onClick={handleLogout}>
          <IconWrapper><LogoutIcon /></IconWrapper>
          <LinkLabel $isOpen={isOpen}>Logout</LinkLabel>
        </LogoutButton>
      </BottomSection>
    </SidebarContainer>
    </>
  );
}

const SidebarContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: ${(props) => (props.$isOpen ? "280px" : "80px")};
  height: 100vh;
  background: #1e293b;
  color: #f8fafc;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  box-shadow: 4px 0 15px rgba(0,0,0,0.05);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 1000;

  @media (max-width: 768px) {
    position: fixed;
    width: ${(props) => (props.$isOpen ? "250px" : "70px")};
  }
`;

const TopSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: ${(props) => (props.$isOpen ? "space-between" : "center")};
  padding: 24px ${(props) => (props.$isOpen ? "24px" : "0")};
  height: 80px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  @media (max-width: 768px) {
    height: 70px;
    padding: 16px ${(props) => (props.$isOpen ? "16px" : "0")};
  }
`;

const Logo = styled.h2`
  font-size: 20px;
  margin: 0;
  white-space: nowrap;
  font-weight: 700;
  color: #ffffff;
`;

const MenuButton = styled.button`
  background: transparent;
  color: #f8fafc;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 8px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const LinksContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 16px;
  margin-top: 24px;
`;

const StyledLink = styled(Link)`
  display: flex;
  align-items: center;
  color: ${(props) => (props.$active ? "#ffffff" : "#cbd5e1")};
  text-decoration: none;
  padding: 14px 12px;
  border-radius: 10px;
  background: ${(props) => (props.$active ? "rgba(255, 255, 255, 0.1)" : "transparent")};
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
  }
`;

const IconWrapper = styled.div`
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  margin-left: 4px;
`;

const LinkLabel = styled.span`
  white-space: nowrap;
  font-size: 18px;
  font-weight: 500;
  opacity: ${(props) => (props.$isOpen ? "1" : "0")};
  display: ${(props) => (props.$isOpen ? "block" : "none")};
  transition: opacity 0.3s;
`;

const BottomSection = styled.div`
  margin-top: auto;
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  background: transparent;
  color: #f8fafc;
  border: none;
  cursor: pointer;
  padding: 14px 12px;
  border-radius: 10px;
  transition: background 0.2s, color 0.2s;
  font-family: inherit;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
  }
`;

const UserProfile = styled.div`
  color: #94a3b8;
  font-size: 14px;
  padding: 0 12px;
  margin-bottom: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: ${(props) => (props.$isOpen ? "left" : "center")};
  transition: all 0.3s;

  strong {
    color: #f8fafc;
  }
`;

export default Navbar;
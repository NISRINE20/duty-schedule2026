import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Loader from '../Components/Loader';

function LoginPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getPseudoEmail = (n) => {
    return n.trim().toLowerCase().replace(/[^a-z0-9]/g, '') + '@dutyschedule.local';
  };

  const handleLogin = (role, name = '') => {
    localStorage.setItem('authRole', role);
    if (name) localStorage.setItem('authName', name);
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (userName.trim() === '') {
      alert('Please enter your name');
      return;
    }
    if (password.trim() === '') {
      alert('Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const email = getPseudoEmail(userName);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.role !== selectedRole) {
          alert(`Login failed: You selected ${selectedRole} but your account role is ${data.role}.`);
          await auth.signOut();
          return;
        }
        handleLogin(data.role, data.name);
      } else {
        alert("User profile not found in the database. Please contact an administrator.");
        await auth.signOut();
      }
    } catch (error) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        alert("Incorrect Name or Password. Please try again or create an account.");
      } else {
        alert("Login Error: " + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedRole(null);
    setUserName('');
    setPassword('');
  };

  return (
    <PageContainer>
      {isLoading && <Loader message="Logging you in..." />}
      <LoginCard>
        <Title>Duty Schedule System</Title>
        <Subtitle>Please select your role to continue</Subtitle>
        
        {!selectedRole ? (
          <RolesContainer>
            <RoleCard onClick={() => setSelectedRole('admin')}>
              <Icon>🛡️</Icon>
              <RoleTitle>Admin</RoleTitle>
              <RoleDescription>Manage schedules, templates, and users</RoleDescription>
            </RoleCard>
            
            <RoleCard onClick={() => setSelectedRole('user')}>
              <Icon>👤</Icon>
              <RoleTitle>User</RoleTitle>
              <RoleDescription>View schedule and log your duty time</RoleDescription>
            </RoleCard>
          </RolesContainer>
        ) : (
          <UserForm onSubmit={handleSubmit}>
            <Icon>{selectedRole === 'admin' ? '🛡️' : '👤'}</Icon>
            <RoleTitle>{selectedRole === 'admin' ? 'Admin Login' : 'User Login'}</RoleTitle>
            <RoleDescription style={{ marginBottom: '24px' }}>
              Please enter your name and password to continue.
            </RoleDescription>
            
            <Input 
              autoFocus
              type="text" 
              placeholder="Name (e.g., John Doe)" 
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            
            <Input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            
            <ButtonGroup>
              <Button type="button" onClick={resetForm}>Back</Button>
              <Button primary type="submit">Login</Button>
            </ButtonGroup>
          </UserForm>
        )}
        
        <FooterText>
          Don't have an account? <Link to="/signup">Create One</Link>
        </FooterText>
      </LoginCard>
    </PageContainer>
  );
}

export default LoginPage;

// Styled Components
const PageContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
`;

const LoginCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 600px;
  width: 90%;
  text-align: center;
  animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes slideIn {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  @media (max-width: 768px) {
    padding: 24px;
    border-radius: 16px;
  }
`;

const Title = styled.h1`
  color: #0f172a;
  font-size: 32px;
  margin-bottom: 8px;
  font-weight: 800;

  @media (max-width: 768px) {
    font-size: 24px;
    margin-bottom: 4px;
  }
`;

const Subtitle = styled.p`
  color: #64748b;
  font-size: 18px;
  margin-bottom: 32px;

  @media (max-width: 768px) {
    font-size: 15px;
    margin-bottom: 24px;
  }
`;

const RolesContainer = styled.div`
  display: flex;
  gap: 20px;
  justify-content: center;
  
  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const RoleCard = styled.div`
  flex: 1;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #3b82f6;
    background: #eff6ff;
    transform: translateY(-4px);
    box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.2);
  }
`;

const Icon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;

  @media (max-width: 768px) {
    font-size: 36px;
    margin-bottom: 12px;
  }
`;

const RoleTitle = styled.h3`
  color: #1e293b;
  font-size: 24px;
  margin-bottom: 8px;
  font-weight: 700;

  @media (max-width: 768px) {
    font-size: 20px;
  }
`;

const RoleDescription = styled.p`
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
`;

const UserForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: fadeIn 0.3s ease;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`;

const Input = styled.input`
  width: 100%;
  max-width: 300px;
  padding: 16px 20px;
  border: 2px solid #cbd5e1;
  border-radius: 12px;
  font-size: 18px;
  color: #0f172a;
  outline: none;
  transition: all 0.2s;
  margin-bottom: 24px;
  
  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;
  max-width: 300px;
`;

const Button = styled.button`
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.primary ? "#3b82f6" : "#f1f5f9"};
  color: ${props => props.primary ? "white" : "#475569"};

  &:hover {
    background: ${props => props.primary ? "#2563eb" : "#e2e8f0"};
    transform: translateY(-2px);
  }
`;

const FooterText = styled.p`
  margin-top: 24px;
  font-size: 15px;
  color: #64748b;
  
  a {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 600;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

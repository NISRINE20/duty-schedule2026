import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const getPseudoEmail = (n) => {
    return n.trim().toLowerCase().replace(/[^a-z0-9]/g, '') + '@dutyschedule.local';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !password || !confirmPassword) {
      alert("Please fill out all fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    const email = getPseudoEmail(name);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        role: role,
        email: email,
        createdAt: new Date().toISOString()
      });

      alert("Account created successfully! You can now log in.");
      navigate('/login');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        alert("An account with this name already exists. Please choose another name or login.");
      } else {
        alert("Error creating account: " + error.message);
      }
    }
  };

  return (
    <PageContainer>
      <LoginCard>
        <Title>Create Account</Title>
        <Subtitle>Join the Duty Schedule System</Subtitle>

        <UserForm onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Name</Label>
            <Input
              type="text"
              placeholder="e.g., Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <Label>Role</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <Label>Confirm Password</Label>
            <Input
              type="password"
              placeholder="Retype password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </FormGroup>

          <Button primary type="submit">Create Account</Button>
        </UserForm>

        <FooterText>
          Already have an account? <Link to="/login">Log in here</Link>
        </FooterText>
      </LoginCard>
    </PageContainer>
  );
}

export default SignupPage;

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
  max-width: 450px;
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
  font-size: 16px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    font-size: 14px;
    margin-bottom: 20px;
  }
`;

const UserForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  text-align: left;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #cbd5e1;
  border-radius: 10px;
  font-size: 16px;
  color: #0f172a;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
  
  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #cbd5e1;
  border-radius: 10px;
  font-size: 16px;
  color: #0f172a;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
  background: white;
  
  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }
`;

const Button = styled.button`
  margin-top: 8px;
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 10px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.primary ? "#3b82f6" : "#f1f5f9"};
  color: ${props => props.primary ? "white" : "#475569"};

  &:hover {
    background: ${props => props.primary ? "#2563eb" : "#e2e8f0"};
    transform: translateY(-2px);
    box-shadow: 0 8px 15px rgba(37, 99, 235, 0.2);
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

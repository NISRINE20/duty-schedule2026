import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Loader from '../Components/Loader';

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState({ open: false, title: '', message: '', isError: false });

  const handleModalClose = () => {
    const isSuccess = !showConfirmModal.isError && showConfirmModal.title === 'Account Created';
    setShowConfirmModal({ ...showConfirmModal, open: false });
    if (isSuccess) navigate('/login');
  };

  const getPseudoEmail = (n) => {
    return n.trim().toLowerCase().replace(/[^a-z0-9]/g, '') + '@dutyschedule.local';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !pin || !confirmPin) {
      setShowConfirmModal({ open: true, title: 'Missing Info', message: 'Please fill out all fields.', isError: true });
      return;
    }

    if (pin.length !== 4 || isNaN(pin)) {
      setShowConfirmModal({ open: true, title: 'Invalid PIN', message: 'Please enter exactly 4 digits for your PIN.', isError: true });
      return;
    }

    if (pin !== confirmPin) {
      setShowConfirmModal({ open: true, title: 'Mismatch', message: 'PINs do not match.', isError: true });
      return;
    }

    const email = getPseudoEmail(name);

    setIsLoading(true);
    try {
      if (role === 'admin') {
        const adminQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
        const adminSnapshot = await getDocs(adminQuery);
        if (!adminSnapshot.empty) {
          setIsLoading(false);
          setShowConfirmModal({ open: true, title: 'Restriction', message: 'An Administrator account already exists. Only one Admin is allowed per system.', isError: true });
          return;
        }
      }

      // Firebase requires 6 characters for a password. We seamlessly append '00' behind the scenes.
      const securePassword = pin + "00";
      const userCredential = await createUserWithEmailAndPassword(auth, email, securePassword);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        role: role,
        email: email,
        createdAt: new Date().toISOString()
      });

      setShowConfirmModal({ open: true, title: 'Account Created', message: 'Your account was created successfully! You can now log in.', isError: false });
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setShowConfirmModal({ open: true, title: 'Name Taken', message: 'An account with this name already exists. Please choose another name or login.', isError: true });
      } else {
        setShowConfirmModal({ open: true, title: 'Error', message: 'Error creating account: ' + error.message, isError: true });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      {isLoading && <Loader message="Creating account..." />}
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
            <Label>4-Digit PIN</Label>
            <Input
              type="password"
              maxLength="4"
              inputMode="numeric"
              placeholder="Enter 4-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <Label>Confirm PIN</Label>
            <Input
              type="password"
              maxLength="4"
              inputMode="numeric"
              placeholder="Retype 4-digit PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
            />
          </FormGroup>

          <Button primary type="submit">Create Account</Button>
        </UserForm>

        <FooterText>
          Already have an account? <Link to="/login">Log in here</Link>
        </FooterText>
      </LoginCard>

      {showConfirmModal.open && (
        <Overlay onClick={handleModalClose}>
          <ModalContainer onClick={(e) => e.stopPropagation()}>
            <IconWrapper>
              {showConfirmModal.isError ? "⚠️" : "✨"}
            </IconWrapper>
            <ModalTitle $isError={showConfirmModal.isError}>{showConfirmModal.title}</ModalTitle>
            <ModalMessage>{showConfirmModal.message}</ModalMessage>
            <CloseBtn onClick={handleModalClose}>
              Got it
            </CloseBtn>
          </ModalContainer>
        </Overlay>
      )}
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
  background: transparent;
`;

const LoginCard = styled.div`
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
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

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(15, 23, 42, 0.6);
  display: flex; justify-content: center; align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContainer = styled.div`
  background: white;
  padding: 32px 24px;
  border-radius: 16px;
  text-align: center;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

const IconWrapper = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const ModalTitle = styled.h2`
  margin: 0 0 12px 0;
  font-size: 24px;
  color: ${props => props.$isError ? '#ef4444' : '#10b981'};
`;

const ModalMessage = styled.p`
  margin: 0 0 24px 0;
  color: #475569;
  font-size: 16px;
  line-height: 1.5;
`;

const CloseBtn = styled.button`
  background: #2563eb;
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #1d4ed8;
  }
`;

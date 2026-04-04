import React from 'react';
import styled, { keyframes } from 'styled-components';

function Loader({ message = "Loading..." }) {
  return (
    <Overlay>
      <LoaderContainer>
        <Spinner />
        <Message>{message}</Message>
      </LoaderContainer>
    </Overlay>
  );
}

export default Loader;

const fadeIn = keyframes`
  from { opacity: 0; backdrop-filter: blur(0px); }
  to { opacity: 1; backdrop-filter: blur(4px); }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.95); opacity: 0.8; }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: ${fadeIn} 0.3s ease forwards;
`;

const LoaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background: white;
  padding: 32px 48px;
  border-radius: 20px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: ${pulse} 2s infinite ease-in-out;
  border: 1px solid #e2e8f0;
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid #e0f2fe;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 16px;
`;

const Message = styled.p`
  color: #1e293b;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
`;

import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';

const MainLayout = () => {
  const { user, loading } = useAuth();

  // Premium loading screen
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <div style={styles.loadingText}>Synchronizing Kqualitysoft Sessions...</div>
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginPage />;
};

function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#0f121a',
    gap: '20px',
  },
  spinner: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: '3px solid rgba(59, 130, 246, 0.1)',
    borderTopColor: '#3b82f6',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontFamily: "'Lucida Fax', serif",
    color: '#94a3b8',
    fontSize: '1rem',
    fontWeight: '500',
    letterSpacing: '0.05em',
  },
};

export default App;

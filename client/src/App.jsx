import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { ChatProvider } from './context/ChatContext';
import { InboxProvider } from './context/InboxContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { soundSystem } from './utils/soundSystem';

import ChatRoom from './pages/ChatRoom';
import InboxPage from './pages/InboxPage';


import AdminPanel from './pages/AdminPanel';
import MobileNav from './components/MobileNav';

import LandingPage from './pages/LandingPage';
import AuthSelection from './pages/AuthSelection';
import MusicPlayer from './components/MusicPlayer';
import CookieBanner from './components/CookieBanner';

function App() {
  useEffect(() => {
    const handleInteraction = () => {
      soundSystem.unlock();
      // Only needed once
      ['click', 'touchstart', 'keydown'].forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };

    ['click', 'touchstart', 'keydown'].forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true, passive: true });
    });

    return () => {
      ['click', 'touchstart', 'keydown'].forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <SocketProvider>
              <NotificationProvider>
                <ChatProvider>
                  <InboxProvider>
                    <div className="min-h-[100dvh] bg-gray-900 font-sans transition-colors duration-300 relative pb-16 md:pb-0">
                      <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/auth" element={<AuthSelection />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        
                        <Route path="/chat" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
                        <Route path="/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
                        <Route path="/profile" element={<Navigate to="/chat" replace />} />
                        <Route path="/profile/:username" element={<Navigate to="/chat" replace />} />
                        
                        
                        
                        
                        <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
                      </Routes>
                      <MobileNav />
                      <MusicPlayer />
                      <CookieBanner />
                    </div>
                  </InboxProvider>
                </ChatProvider>
              </NotificationProvider>
            </SocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

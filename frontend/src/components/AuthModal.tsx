import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  LogIn,
  UserPlus,
  Check,
  Mail,
  Key,
  Shield,
  LogOut,
  Copy,
  Edit2,
  Lock,
  ArrowRight,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import { UserAccount, LoginRequest, SignUpRequest, UpdateAccountRequest } from '../types';
import * as api from '../services/api';
import { formatDateTime, truncateId } from '../utils/formatters';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onUserChange: (user: UserAccount | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'account'>(
    currentUser ? 'account' : 'signin'
  );

  // Sign In State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up State
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpRole, setSignUpRole] = useState('Software Development Engineer');

  // Account Edit State
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  // Feedback State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setActiveTab('account');
      setEditFullName(currentUser.fullName);
      setEditRole(currentUser.role);
    } else {
      setActiveTab('signin');
    }
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword) {
      setErrorMessage('Please provide both username/email and password.');
      return;
    }
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await api.login({
        emailOrUsername: loginIdentifier.trim(),
        password: loginPassword,
      });

      const user: UserAccount = {
        id: res.id,
        username: res.username,
        email: res.email,
        fullName: res.fullName,
        role: res.role,
        createdAt: res.createdAt,
        lastLoginAt: res.lastLoginAt,
      };

      onUserChange(user);
      setSuccessMessage(`Welcome back, ${user.fullName}!`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpFullName.trim() || !signUpUsername.trim() || !signUpEmail.trim() || !signUpPassword) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await api.signUp({
        fullName: signUpFullName.trim(),
        username: signUpUsername.trim(),
        email: signUpEmail.trim(),
        password: signUpPassword,
        role: signUpRole,
      });

      const user: UserAccount = {
        id: res.id,
        username: res.username,
        email: res.email,
        fullName: res.fullName,
        role: res.role,
        createdAt: res.createdAt,
        lastLoginAt: res.lastLoginAt,
      };

      onUserChange(user);
      setSuccessMessage(`Account created! Welcome, ${user.fullName}!`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Email or username may already exist.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const payload: UpdateAccountRequest = {
        fullName: editFullName.trim() || undefined,
        role: editRole.trim() || undefined,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      };
      const updated = await api.updateAccount(payload);
      onUserChange(updated);
      setSuccessMessage('Account details updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setShowPasswordSection(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await api.logout();
      onUserChange(null);
      setActiveTab('signin');
      setSuccessMessage('Logged out successfully.');
      setTimeout(() => {
        onClose();
      }, 600);
    } catch {
      onUserChange(null);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const quickFillUser = (email: string) => {
    setLoginIdentifier(email);
    setLoginPassword('password123');
    setErrorMessage(null);
  };

  const copyUserId = () => {
    if (currentUser?.id) {
      navigator.clipboard.writeText(currentUser.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: '14px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'scaleUp 0.15s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #21262d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 255, 255, 0.015)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <User size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f0f6fc', margin: 0 }}>
                {activeTab === 'account' ? 'Account Details & Profile' : activeTab === 'signup' ? 'Create FlowGuard Account' : 'Sign In to FlowGuard'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8b949e',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #21262d',
            backgroundColor: '#090d16',
            padding: '4px 16px 0',
            gap: '8px',
          }}
        >
          <button
            onClick={() => {
              setActiveTab('signin');
              setErrorMessage(null);
            }}
            style={{
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'signin' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'signin' ? '#38bdf8' : '#8b949e',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('signup');
              setErrorMessage(null);
            }}
            style={{
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'signup' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'signup' ? '#38bdf8' : '#8b949e',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UserPlus size={14} />
            <span>Create Account</span>
          </button>

          {currentUser && (
            <button
              onClick={() => {
                setActiveTab('account');
                setErrorMessage(null);
              }}
              style={{
                padding: '10px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'account' ? '2px solid #38bdf8' : '2px solid transparent',
                color: activeTab === 'account' ? '#38bdf8' : '#8b949e',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <User size={14} />
              <span>Account Details</span>
            </button>
          )}
        </div>

        {/* Feedback Alerts */}
        <div style={{ padding: '0 20px', marginTop: errorMessage || successMessage ? '16px' : 0 }}>
          {errorMessage && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.76rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: '0.76rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Check size={15} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Body Content */}
        <div style={{ padding: '20px', overflowY: 'auto' }}>
          {/* TAB 1: SIGN IN */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: '#8b949e', display: 'block', marginBottom: '5px' }}>
                  Email or Username
                </label>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', padding: '0 10px' }}>
                  <Mail size={14} style={{ color: '#8b949e', marginRight: '8px' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. aditya@flowlab.dev or aditya"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: '#f0f6fc', fontSize: '0.80rem', width: '100%', padding: '9px 0' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#8b949e', display: 'block', marginBottom: '5px' }}>
                  Password
                </label>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', padding: '0 10px' }}>
                  <Key size={14} style={{ color: '#8b949e', marginRight: '8px' }} />
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: '#f0f6fc', fontSize: '0.80rem', width: '100%', padding: '9px 0' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#238636',
                  border: '1px solid rgba(240, 246, 252, 0.1)',
                  borderRadius: '6px',
                  padding: '10px',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  marginTop: '6px',
                }}
              >
                <LogIn size={15} />
                <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
              </button>

              {/* Quick Fill Pre-Seeded Accounts */}
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #21262d' }}>
                <div style={{ fontSize: '0.70rem', color: '#8b949e', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Quick Fill Demo Accounts:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { email: 'aditya@flowlab.dev', role: 'Lead Backend Engineer', name: 'Aditya' },
                    { email: 'sarah@flowlab.dev', role: 'Staff SDE & Architect', name: 'Sarah' },
                    { email: 'alex@flowlab.dev', role: 'DevOps & SRE', name: 'Alex' },
                  ].map((dev) => (
                    <button
                      key={dev.email}
                      type="button"
                      onClick={() => quickFillUser(dev.email)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        backgroundColor: '#161b22',
                        border: '1px solid #21262d',
                        borderRadius: '6px',
                        color: '#c9d1d9',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span><strong>{dev.name}</strong> ({dev.email})</span>
                      <span style={{ color: '#8b949e', fontSize: '0.68rem' }}>{dev.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: SIGN UP */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: '#8b949e', display: 'block', marginBottom: '5px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aditya Kumar"
                  value={signUpFullName}
                  onChange={(e) => setSignUpFullName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', color: '#f0f6fc', fontSize: '0.80rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#8b949e', display: 'block', marginBottom: '5px' }}>
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. adityak"
                  value={signUpUsername}
                  onChange={(e) => setSignUpUsername(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', color: '#f0f6fc', fontSize: '0.80rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#8b949e', display: 'block', marginBottom: '5px' }}>
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. aditya@domain.com"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', color: '#f0f6fc', fontSize: '0.80rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#8b949e', display: 'block', marginBottom: '5px' }}>
                  Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Choose a secure password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', color: '#f0f6fc', fontSize: '0.80rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#8b949e', display: 'block', marginBottom: '5px' }}>
                  Role / Specialization
                </label>
                <select
                  value={signUpRole}
                  onChange={(e) => setSignUpRole(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', color: '#f0f6fc', fontSize: '0.80rem' }}
                >
                  <option value="Lead Backend Engineer">Lead Backend Engineer</option>
                  <option value="Staff SDE & Architect">Staff SDE & Architect</option>
                  <option value="Software Development Engineer">Software Development Engineer</option>
                  <option value="DevOps & Site Reliability">DevOps & Site Reliability</option>
                  <option value="Systems & Platform Engineer">Systems & Platform Engineer</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '6px',
                  padding: '10px',
                  color: '#07090e',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  marginTop: '6px',
                }}
              >
                <UserPlus size={15} />
                <span>{isLoading ? 'Creating Account...' : 'Register Account'}</span>
              </button>
            </form>
          )}

          {/* TAB 3: ACCOUNT DETAILS */}
          {activeTab === 'account' && currentUser && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Profile Card Header */}
              <div
                style={{
                  padding: '14px',
                  backgroundColor: '#161b22',
                  border: '1px solid #21262d',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: '#ffffff',
                    boxShadow: '0 0 12px rgba(2, 132, 199, 0.4)',
                  }}
                >
                  {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#f0f6fc' }}>
                    {currentUser.fullName}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                    @{currentUser.username}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#8b949e', marginTop: '2px' }}>
                    {currentUser.email} • {currentUser.role}
                  </div>
                </div>
              </div>

              {/* Account Meta Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div style={{ padding: '10px 12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid #21262d', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.68rem', color: '#8b949e', textTransform: 'uppercase' }}>User ID</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.74rem', color: '#f0f6fc', fontFamily: 'monospace' }}>
                      {truncateId(currentUser.id, 6, 4)}
                    </span>
                    <button
                      type="button"
                      onClick={copyUserId}
                      style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '2px' }}
                      title="Copy User ID"
                    >
                      {copiedId ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                <div style={{ padding: '10px 12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid #21262d', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.68rem', color: '#8b949e', textTransform: 'uppercase' }}>Member Since</div>
                  <div style={{ fontSize: '0.74rem', color: '#f0f6fc', marginTop: '2px' }}>
                    {formatDateTime(currentUser.createdAt)}
                  </div>
                </div>
              </div>

              {/* Edit Profile Form */}
              <form onSubmit={handleUpdateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#8b949e', display: 'block', marginBottom: '4px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', color: '#f0f6fc', fontSize: '0.78rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: '#8b949e', display: 'block', marginBottom: '4px' }}>
                    Role / Position
                  </label>
                  <input
                    type="text"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', color: '#f0f6fc', fontSize: '0.78rem' }}
                  />
                </div>

                {/* Password Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                  >
                    <Lock size={12} />
                    <span>{showPasswordSection ? 'Cancel Password Change' : 'Change Password'}</span>
                  </button>

                  {showPasswordSection && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', padding: '10px', backgroundColor: '#161b22', borderRadius: '6px', border: '1px solid #21262d' }}>
                      <input
                        type="password"
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', color: '#f0f6fc', fontSize: '0.76rem' }}
                      />
                      <input
                        type="password"
                        placeholder="New password (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', color: '#f0f6fc', fontSize: '0.76rem' }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      backgroundColor: '#238636',
                      border: '1px solid rgba(240, 246, 252, 0.1)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Save Changes
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoading}
                    style={{
                      padding: '9px 14px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      color: '#f87171',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

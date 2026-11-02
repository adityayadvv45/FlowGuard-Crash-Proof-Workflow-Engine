import React, { useState, useEffect } from 'react';
import { X, User, LogIn, UserPlus, Check, Mail, Key, UserCheck } from 'lucide-react';

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  currency?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
}

const DEFAULT_USERS: UserProfile[] = [
  { name: 'Aditya Kumar', email: 'aditya@flowlab.dev', role: 'Lead Backend Engineer', currency: '₹' },
  { name: 'Sarah Chen', email: 'sarah@flowlab.dev', role: 'Staff SDE & Architect', currency: '$' },
  { name: 'Alex Rivera', email: 'alex@flowlab.dev', role: 'DevOps & Site Reliability', currency: '$' },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'switch'>('switch');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Backend Engineer');
  const [savedUsers, setSavedUsers] = useState<UserProfile[]>(() => {
    const stored = localStorage.getItem('flowlab_all_users');
    return stored ? JSON.parse(stored) : DEFAULT_USERS;
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('flowlab_all_users', JSON.stringify(savedUsers));
  }, [savedUsers]);

  if (!isOpen) return null;

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const existing = savedUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const userToLogin: UserProfile = existing || {
      name: email.split('@')[0].toUpperCase(),
      email,
      role: 'Engineer',
      currency: '$',
    };

    if (!existing) {
      setSavedUsers((prev) => [...prev, userToLogin]);
    }

    onUpdateUser(userToLogin);
    setSuccessMessage(`Logged in successfully as ${userToLogin.name}!`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 900);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const newUser: UserProfile = {
      name,
      email,
      role,
      currency: '$',
    };

    setSavedUsers((prev) => {
      const filtered = prev.filter((u) => u.email.toLowerCase() !== email.toLowerCase());
      return [...filtered, newUser];
    });

    onUpdateUser(newUser);
    setSuccessMessage(`Account created for ${newUser.name}!`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 900);
  };

  const handleSwitchAccount = (user: UserProfile) => {
    onUpdateUser(user);
    setSuccessMessage(`Switched active profile to ${user.name}!`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 700);
  };

  return (
    <div className="drawer-overlay" onClick={onClose} style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', background: '#0e1424', border: '1px solid #1e293b' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="#a855f7" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              User Accounts &amp; Authentication
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1a2234', background: '#080c16', padding: '4px 16px 0' }}>
          <button
            onClick={() => setActiveTab('switch')}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'switch' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'switch' ? '#38bdf8' : '#94a3b8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UserCheck size={14} />
            <span>Switch User</span>
          </button>

          <button
            onClick={() => setActiveTab('signin')}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'signin' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'signin' ? '#38bdf8' : '#94a3b8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <LogIn size={14} />
            <span>Log In</span>
          </button>

          <button
            onClick={() => setActiveTab('signup')}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'signup' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'signup' ? '#38bdf8' : '#94a3b8',
              fontSize: '12px',
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
        </div>

        {successMessage && (
          <div
            style={{
              margin: '16px 20px 0',
              padding: '10px 14px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Check size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: Switch Account */}
        {activeTab === 'switch' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Select an active user profile. Each user tracks their own custom orders and settings:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {savedUsers.map((user) => {
                const isActive = currentUser.email.toLowerCase() === user.email.toLowerCase();
                return (
                  <div
                    key={user.email}
                    onClick={() => handleSwitchAccount(user)}
                    style={{
                      background: isActive ? 'rgba(56, 189, 248, 0.12)' : '#090e18',
                      border: '1px solid ' + (isActive ? '#38bdf8' : '#1e293b'),
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: isActive
                            ? 'linear-gradient(135deg, #38bdf8, #6366f1)'
                            : '#1e293b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '13px',
                          color: 'white',
                        }}
                      >
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                          {user.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {user.email} • {user.role}
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <span
                        style={{
                          background: '#0284c7',
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('signup')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Register New User
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#1e293b',
                  border: 'none',
                  color: '#f8fafc',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Sign In */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignIn} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                Account Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: '#64748b' }} />
                <input
                  type="email"
                  value={email}
                  placeholder="e.g. aditya@flowlab.dev"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#090e18',
                    border: '1px solid #1e293b',
                    borderRadius: '6px',
                    padding: '8px 12px 8px 32px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: '#64748b' }} />
                <input
                  type="password"
                  value={password}
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#090e18',
                    border: '1px solid #1e293b',
                    borderRadius: '6px',
                    padding: '8px 12px 8px 32px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-start"
              style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
            >
              <LogIn size={14} />
              <span>Sign In to FlowLab</span>
            </button>
          </form>
        )}

        {/* TAB 3: Sign Up */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUp} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                placeholder="e.g. Vikram Sharma"
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  background: '#090e18',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                Work Email
              </label>
              <input
                type="email"
                value={email}
                placeholder="e.g. vikram@company.com"
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  background: '#090e18',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Role / Title
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#090e18',
                    border: '1px solid #1e293b',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                >
                  <option value="Lead Backend Engineer">Backend Engineer</option>
                  <option value="Staff SDE & Architect">Software Architect</option>
                  <option value="DevOps & Reliability">DevOps Engineer</option>
                  <option value="Engineering Manager">Engineering Lead</option>
                  <option value="Product Analyst">Product Analyst</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Set Password
                </label>
                <input
                  type="password"
                  value={password}
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#090e18',
                    border: '1px solid #1e293b',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-start"
              style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
            >
              <UserPlus size={14} />
              <span>Register &amp; Login</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

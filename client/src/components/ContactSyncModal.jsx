import React, { useState, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { FaAddressBook, FaTimes, FaSync, FaPhone } from 'react-icons/fa';

const ContactSyncModal = ({ isOpen, onClose }) => {
  const { token, user } = useContext(AuthContext);
  const [phoneInput, setPhoneInput] = useState(user?.phoneNumber || '');
  const [contactsInput, setContactsInput] = useState('');
  const [matchedUsers, setMatchedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(user?.phoneNumber ? 2 : 1);

  if (!isOpen) return null;

  const handleSavePhone = async () => {
    if (!phoneInput) return;
    setIsLoading(true);
    try {
      await api.post('/api/users/update-phone', { phoneNumber: phoneInput }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStep(2);
    } catch (err) {
      console.error(err);
      alert('Failed to update phone number');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!contactsInput) return;
    setIsLoading(true);
    try {
      // In a real mobile app, contacts would be read via a native API.
      // Here, we simulate it by parsing a comma-separated list of numbers.
      const contactsArray = contactsInput.split(',').map(c => c.trim()).filter(c => c);
      const res = await api.post('/api/users/sync-contacts', { contacts: contactsArray }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMatchedUsers(res.data);
      setStep(3);
    } catch (err) {
      console.error(err);
      alert('Failed to sync contacts');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-panel)', width: '90%', maxWidth: '400px', borderRadius: '15px', padding: '20px', color: 'var(--text-main)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>
          <FaTimes />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <FaAddressBook style={{ fontSize: '2.5rem', color: '#6366f1', marginBottom: '10px' }} />
          <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Contact Sync</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '5px' }}>Find your friends on TeluguChat!</p>
        </div>

        {step === 1 && (
          <div>
            <p style={{ fontSize: '0.9rem', marginBottom: '10px' }}>To use this feature, verify your phone number first.</p>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-app)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <FaPhone style={{ color: 'var(--text-muted)', marginRight: '10px' }} />
              <input 
                type="text" 
                placeholder="+91 9876543210" 
                value={phoneInput} 
                onChange={e => setPhoneInput(e.target.value)} 
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', width: '100%' }}
              />
            </div>
            <button 
              onClick={handleSavePhone}
              disabled={isLoading}
              style={{ width: '100%', padding: '12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', marginTop: '15px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {isLoading ? 'Saving...' : 'Verify Phone Number'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Enter phone numbers (comma separated) to find friends.</p>
            <textarea 
              value={contactsInput}
              onChange={e => setContactsInput(e.target.value)}
              placeholder="e.g. +919876543210, +918765432109"
              style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-main)', resize: 'none', boxSizing: 'border-box' }}
            />
            <button 
              onClick={handleSync}
              disabled={isLoading}
              style={{ width: '100%', padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', marginTop: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <FaSync /> {isLoading ? 'Syncing...' : 'Sync Contacts'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Found {matchedUsers.length} Friends</h3>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {matchedUsers.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No matches found in our database.</p>
              ) : (
                matchedUsers.map(u => (
                  <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <img src={u.profilePic || 'https://res.cloudinary.com/demo/image/upload/v1519759714/avatar.png'} alt={u.username} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{u.username}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.phoneNumber}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button 
              onClick={onClose}
              style={{ width: '100%', padding: '12px', background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '15px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactSyncModal;

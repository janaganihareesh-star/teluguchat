import { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { 
  FaTimes, FaGlobe, FaLanguage, FaCalendarAlt, FaHome, FaEye, FaFlag, FaBars,
  FaExclamationTriangle, FaCommentDots, FaUserPlus, FaGift, FaWallet, FaBan, FaEdit, FaStar, FaThumbsUp,
  FaAddressCard, FaHeart, FaEnvelope, FaKey, FaCog, FaLock, FaSignOutAlt, FaTrash, FaUserFriends, FaChevronDown, FaSave,
  FaCamera
} from 'react-icons/fa';
import ImageLightbox from './ImageLightbox';

const NAVY = '#1e3d75';

const FullProfileModal = ({ username, onClose, onPrivate }) => {
  const { token, user: currentUser, updateUser } = useContext(AuthContext);
  const { onlineUsers } = useSocket();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'friends' | 'gifts' | 'account' | 'more'
  const [isSettingsView, setIsSettingsView] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [showCoverMenu, setShowCoverMenu] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  const handleRemoveCover = async () => {
    if (!window.confirm("Remove cover photo?")) return;
    try {
      const { data } = await api.put(`/api/users/profile`, { coverPhoto: '' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(data.user || data);
      updateUser({ ...currentUser, coverPhoto: '' });
      alert("Cover photo removed.");
    } catch (err) {
      alert("Error removing cover photo.");
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm("Remove profile picture?")) return;
    try {
      const { data } = await api.put(`/api/users/profile`, { profilePic: '' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(data.user || data);
      updateUser({ ...currentUser, profilePic: '' });
      alert("Profile picture removed.");
    } catch (err) {
      alert("Error removing profile picture.");
    }
  };

  const [subModal, setSubModal] = useState(null);
  
  const [editGender, setEditGender] = useState('male');
  const [editDobDay, setEditDobDay] = useState(1);
  const [editDobMonth, setEditDobMonth] = useState('January');
  const [editDobYear, setEditDobYear] = useState(2000);
  const [editRelationship, setEditRelationship] = useState('Prefer not to say');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [reenterPassword, setReenterPassword] = useState('');



  const [prefCall, setPrefCall] = useState('On');
  const [prefPrivateChat, setPrefPrivateChat] = useState('On');
  const [prefMemberColors, setPrefMemberColors] = useState('On');
  const [prefAutoPlay, setPrefAutoPlay] = useState('On');
  const [prefFriendReq, setPrefFriendReq] = useState('On');
  const [prefLoginMethod, setPrefLoginMethod] = useState('Username or email');

  const [privShowAge, setPrivShowAge] = useState(true);
  const [privShowGender, setPrivShowGender] = useState(true);
  const [privShowLocation, setPrivShowLocation] = useState(true);
  const [privShowFriendList, setPrivShowFriendList] = useState(true);
  const [privShowGiftList, setPrivShowGiftList] = useState(true);

  const [langLanguage, setLangLanguage] = useState('English');
  const [langCountry, setLangCountry] = useState('India');
  const [langTimezone, setLangTimezone] = useState('Asia/Kolkata');




  const [friends, setFriends] = useState([]);
  const [likedBy, setLikedBy] = useState([]);
  const [likes, setLikes] = useState(0);

  // Modal State Variables for Hamburger Dropdown and Actions Menu
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('Spam / Advertising');
  const [showSendGift, setShowSendGift] = useState(false);
  const [showShareWallet, setShowShareWallet] = useState(false);
  const [coinsToShare, setCoinsToShare] = useState('');
  const [isIgnored, setIsIgnored] = useState(false);
  
  // Gifting updates
  const [giftPage, setGiftPage] = useState(0);
  const [sendingGiftKey, setSendingGiftKey] = useState(null);

  const GIFTS_PAGES = [
    // Page 1 (12 items)
    [
      { key: 'clover', name: 'Clover', icon: '🍀' },
      { key: 'clown', name: 'Clown', icon: '🤡' },
      { key: 'coffee', name: 'Coffee Cup', icon: '☕' },
      { key: 'cool', name: 'Cool Smiley', icon: '😎' },
      { key: 'crown', name: 'Crown', icon: '👑' },
      { key: 'potion_blue', name: 'Blue Potion', icon: '🧪' },
      { key: 'diamond', name: 'Diamond', icon: '💎' },
      { key: 'fish_skeleton', name: 'Fish Skeleton', icon: '🦴' },
      { key: 'flowers', name: 'Flowers', icon: '💐' },
      { key: 'gift_pink', name: 'Gift Box', icon: '🎁' },
      { key: 'gold_pot', name: 'Pot of Gold', icon: '🍯' },
      { key: 'fire', name: 'Fire', icon: '🔥' }
    ],
    // Page 2 (7 items)
    [
      { key: 'rose_heart', name: 'Rose Heart', icon: '💖' },
      { key: 'couple', name: 'Couple', icon: '💑' },
      { key: 'cute_kitten', name: 'Cute Kitten', icon: '🐱' },
      { key: 'stick_figures', name: 'Stick Figures', icon: '🧑‍🤝‍🧑' },
      { key: 'voodoo_doll', name: 'Voodoo Doll', icon: '🧸' },
      { key: 'potion_green', name: 'Green Potion', icon: '🧪' },
      { key: 'kissing_emoji', name: 'Kissing Emoji', icon: '😘' }
    ],
    // Page 3 (12 items)
    [
      { key: 'ice_cream', name: 'Ice Cream', icon: '🍦' },
      { key: 'ice_hand', name: 'Ice Hand', icon: '🖐️' },
      { key: 'thumbs_up', name: 'Thumbs Up', icon: '👍' },
      { key: 'potion_heart', name: 'Heart Potion', icon: '🧪' },
      { key: 'bandaged_heart', name: 'Bandaged Heart', icon: '🩹' },
      { key: 'star_medal', name: 'Star Medal', icon: '🏅' },
      { key: 'stack_cash', name: 'Stack of Cash', icon: '💵' },
      { key: 'potion_lightning', name: 'Lightning Potion', icon: '🧪' },
      { key: 'diamond_ring', name: 'Diamond Ring', icon: '💍' },
      { key: 'red_rose', name: 'Red Rose', icon: '🌹' },
      { key: 'big_grin', name: 'Big Grin Smiley', icon: '😀' },
      { key: 'gift_green', name: 'Green Gift Box', icon: '🎁' }
    ]
  ];

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [moderationWarning, setModerationWarning] = useState(null);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setModerationWarning(null);
    setUploadingAvatar(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/api/users/profile-pic', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setProfile(prev => ({ ...prev, profilePic: data.profilePic }));
      updateUser({ profilePic: data.profilePic });

    } catch (err) {
      console.error('Avatar upload failed:', err);
      const errorMsg = err.response?.data?.message || 'Error uploading profile picture. Please try again.';
      setModerationWarning(errorMsg);
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setModerationWarning(null);
    setUploadingCover(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/api/users/cover-photo', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setProfile(prev => ({ ...prev, coverPhoto: data.coverPhoto }));
      updateUser({ coverPhoto: data.coverPhoto });

    } catch (err) {
      console.error('Cover photo upload failed:', err);
      const errorMsg = err.response?.data?.message || 'Error uploading cover photo. Please try again.';
      setModerationWarning(errorMsg);
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/users/profile/${username}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(data);
        setFriends(data.friends || []);
        setLikes(data.likes || 0);
        setLikedBy(data.likedBy || []);

        if (data._id === currentUser._id) {
          setEditGender(data.gender || 'male');
          setEditRelationship(data.relationshipStatus || 'Prefer not to say');
          setEditEmail(data.email || '');
          if (data.dob) {
            const d = new Date(data.dob);
            setEditDobDay(d.getDate());
            setEditDobMonth(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()]);
            setEditDobYear(d.getFullYear());
          }

          if (data.preferences) {
            setPrefCall(data.preferences.call || 'On');
            setPrefPrivateChat(data.preferences.privateChat || 'On');
            setPrefMemberColors(data.preferences.memberTextColors || 'On');
            setPrefAutoPlay(data.preferences.autoPlayMusic || 'On');
            setPrefFriendReq(data.preferences.friendRequest || 'On');
            setPrefLoginMethod(data.preferences.loginMethod || 'Username or email');
          }
          if (data.privacy) {
            setPrivShowAge(data.privacy.showAge ?? true);
            setPrivShowGender(data.privacy.showGender ?? true);
            setPrivShowLocation(data.privacy.showLocation ?? true);
            setPrivShowFriendList(data.privacy.showFriendList ?? true);
            setPrivShowGiftList(data.privacy.showGiftList ?? true);
          }
          if (data.settings) {
            setLangLanguage(data.settings.language || 'English');
            setLangCountry(data.settings.country || 'India');
            setLangTimezone(data.settings.timezone || 'Asia/Kolkata');
          }

        }


        if (data._id === currentUser._id) {
          setIsSettingsView(true);
          setActiveTab('account');
        } else {
          setIsSettingsView(false);
          setActiveTab('info');
        }

        // Fetch Ignore / Restriction Actions Status
        if (data._id !== currentUser._id) {
          const statusRes = await api.get(`/api/users/actions-status/${data._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setIsIgnored(statusRes.data.isIgnored);
        }
      } catch (err) {
        console.error('Error fetching full profile:', err);
      } finally {
        setLoading(false);
      }
    };
    if (username) {
      fetchProfileData();
    }
  }, [username, token, currentUser._id]);


  const handleSaveInfo = async () => {
    try {
      const monthMap = { 'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5, 'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11 };
      const dobDate = new Date(editDobYear, monthMap[editDobMonth], editDobDay);
      await api.put('/api/users/profile', {
        gender: editGender,
        dob: dobDate
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setProfile({ ...profile, gender: editGender, dob: dobDate, infoEdited: true });
      updateUser({ ...currentUser, gender: editGender, dob: dobDate, infoEdited: true });
      setSubModal(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving info');
    }
  };

  const handleSaveRelationship = async () => {
    try {
      await api.put('/api/users/profile', {
        relationshipStatus: editRelationship
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setProfile({ ...profile, relationshipStatus: editRelationship });
      updateUser({ ...currentUser, relationshipStatus: editRelationship });
      setSubModal(null);
    } catch (err) {
      alert('Error saving relationship');
    }
  };

  
  



  const handleSavePassword = async () => {
    if (newPassword !== reenterPassword) {
      alert("New passwords do not match!");
      return;
    }
    try {
      await api.put('/api/users/change-password', {
        currentPassword,
        newPassword
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      alert("Password changed successfully!");
      setSubModal(null);
      setCurrentPassword('');
      setNewPassword('');
      setReenterPassword('');
    } catch (err) {
      alert(err.response?.data?.message || 'Error changing password');
    }
  };


  
  const handleSaveSettings = async (type) => {
    try {
      let payload = {};
      if (type === 'preferences') {
        payload.preferences = {
          call: prefCall, privateChat: prefPrivateChat, memberTextColors: prefMemberColors,
          autoPlayMusic: prefAutoPlay, friendRequest: prefFriendReq, loginMethod: prefLoginMethod
        };
      } else if (type === 'privacy') {
        payload.privacy = {
          showAge: privShowAge, showGender: privShowGender, showLocation: privShowLocation,
          showFriendList: privShowFriendList, showGiftList: privShowGiftList
        };
      } else if (type === 'language') {
        payload.settings = {
          language: langLanguage, country: langCountry, timezone: langTimezone
        };
      }

      await api.put('/api/users/profile', payload, { headers: { Authorization: `Bearer ${token}` } });
      
      setProfile(prev => ({ ...prev, ...payload }));
      setSubModal(null);
    } catch (err) {
      alert('Error saving settings');
    }
  };


  const handleSaveEmail = async () => {
    try {
      await api.put('/api/users/change-email', {
        newEmail: editEmail,
        password: editPassword
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setProfile({ ...profile, email: editEmail });
      updateUser({ ...currentUser, email: editEmail });
      setSubModal(null);
      setEditPassword('');
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating email');
    }
  };

  const renderSubModal = () => {
    if (!subModal) return null;

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl w-[90%] max-w-sm p-6 relative shadow-2xl">
          <button onClick={() => setSubModal(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800">
            <FaTimes size={18} />
          </button>
          
          {subModal === 'edit_info' && (
            <>
              <div className="flex gap-3 bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg mt-2 mb-6">
                <div className="bg-yellow-400 text-white w-6 h-6 rounded flex items-center justify-center shrink-0 font-bold">!</div>
                <p className="text-[13px] leading-snug font-medium">This information can be edited only once. Please ensure all details are accurate before finalizing your changes.</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Gender</label>
                <div className="relative">
                  <select value={editGender} onChange={e => setEditGender(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  <FaChevronDown className="absolute right-4 top-3.5 text-slate-400 text-xs pointer-events-none" />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Birth date</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                     <select value={editDobDay} onChange={e => setEditDobDay(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500">
                       {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                     </select>
                     <FaChevronDown className="absolute right-3 top-3.5 text-slate-400 text-xs pointer-events-none" />
                  </div>
                  <div className="relative flex-[1.5]">
                     <select value={editDobMonth} onChange={e => setEditDobMonth(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500">
                       {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                     <FaChevronDown className="absolute right-3 top-3.5 text-slate-400 text-xs pointer-events-none" />
                  </div>
                  <div className="relative flex-[1.2]">
                     <select value={editDobYear} onChange={e => setEditDobYear(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500">
                       {Array.from({length: 80}, (_, i) => new Date().getFullYear() - 18 - i).map(y => <option key={y} value={y}>{y}</option>)}
                     </select>
                     <FaChevronDown className="absolute right-3 top-3.5 text-slate-400 text-xs pointer-events-none" />
                  </div>
                </div>
              </div>

              <button onClick={handleSaveInfo} disabled={profile?.infoEdited} className={`w-32 py-2.5 rounded-lg text-white font-bold transition ${profile?.infoEdited ? 'bg-slate-300' : 'bg-[#00bcd4] hover:bg-[#0097a7]'}`}>
                Save
              </button>
            </>
          )}

          {subModal === 'edit_relationship' && (
            <>
              <div className="mb-6 mt-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Relationship</label>
                <div className="relative">
                  <select value={editRelationship} onChange={e => setEditRelationship(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    {['Prefer not to say', 'Single', 'In a relationship', 'Committed', 'Married', "It's complicated", 'None'].map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <FaChevronDown className="absolute right-4 top-3.5 text-slate-400 text-xs pointer-events-none" />
                </div>
              </div>

              <button onClick={handleSaveRelationship} className="w-32 py-2.5 bg-[#00bcd4] hover:bg-[#0097a7] rounded-lg text-white font-bold transition">
                Save
              </button>
            </>
          )}

          {subModal === 'edit_email' && (
            <>
              <div className="mb-4 mt-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                <input 
                  type="email" 
                  value={editEmail} 
                  onChange={e => setEditEmail(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                <input 
                  type="password" 
                  value={editPassword} 
                  onChange={e => setEditPassword(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <button onClick={handleSaveEmail} className="w-32 py-2.5 bg-[#00bcd4] hover:bg-[#0097a7] rounded-lg text-white font-bold transition flex items-center justify-center gap-2">
                <FaSave size={14} /> Save
              </button>
            </>
          )}


          {subModal === 'change_password' && (
            <>
              <div className="mb-4 mt-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Current password</label>
                <input 
                  type="password" 
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">New password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Re-enter password</label>
                <input 
                  type="password" 
                  value={reenterPassword} 
                  onChange={e => setReenterPassword(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <button onClick={handleSavePassword} className="w-32 py-2.5 bg-[#00bcd4] hover:bg-[#0097a7] rounded-lg text-white font-bold transition">
                Save
              </button>
            </>
          )}


          {subModal === 'preferences' && (
            <div className="flex flex-col gap-4 mt-2 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Call</label>
                <div className="relative">
                  <select value={prefCall} onChange={e => setPrefCall(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="On">On</option><option value="Off">Off</option>
                  </select>
                  <FaChevronDown className="absolute right-4 top-3.5 text-slate-400 text-xs pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Private chat</label>
                <div className="relative">
                  <select value={prefPrivateChat} onChange={e => setPrefPrivateChat(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="On">On</option><option value="Off">Off</option>
                  </select>
                  <FaChevronDown className="absolute right-4 top-3.5 text-slate-400 text-xs pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Members text colors</label>
                <div className="relative">
                  <select value={prefMemberColors} onChange={e => setPrefMemberColors(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="On">On</option><option value="Off">Off</option>
                  </select>
                  <FaChevronDown className="absolute right-4 top-3.5 text-slate-400 text-xs pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Auto play profile music</label>
                <div className="relative">
                  <select value={prefAutoPlay} onChange={e => setPrefAutoPlay(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="On">On</option><option value="Off">Off</option>
                  </select>
                  <FaChevronDown className="absolute right-4 top-3.5 text-slate-400 text-xs pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Friend request</label>
                <div className="relative">
                  <select value={prefFriendReq} onChange={e => setPrefFriendReq(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="On">On</option><option value="Off">Off</option>
                  </select>
                  <FaChevronDown className="absolute right-4 top-3.5 text-slate-400 text-xs pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Allow login using</label>
                <div className="relative">
                  <select value={prefLoginMethod} onChange={e => setPrefLoginMethod(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="Username or email">Username or email</option>
                    <option value="Username only">Username only</option>
                    <option value="Email only">Email only</option>
                  </select>
                  <FaChevronDown className="absolute right-4 top-3.5 text-slate-400 text-xs pointer-events-none" />
                </div>
              </div>
              <button onClick={() => handleSaveSettings('preferences')} className="w-32 mt-2 py-2.5 bg-[#00bcd4] hover:bg-[#0097a7] rounded-lg text-white font-bold transition flex items-center justify-center gap-2">
                <FaSave size={14} /> Save
              </button>
            </div>
          )}

          {subModal === 'privacy_settings' && (
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-slate-800">Privacy settings</h2>
              <p className="text-[15px] text-slate-500 mb-6">Information shared with other members</p>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[15px] text-slate-800 font-medium">Age</span>
                  <div onClick={() => setPrivShowAge(!privShowAge)} className={`w-[42px] h-[24px] rounded-full relative cursor-pointer transition-colors ${privShowAge ? 'bg-[#7cb342]' : 'bg-slate-300'}`}>
                    <div className={`w-[20px] h-[20px] bg-white rounded-full absolute top-[2px] transition-all shadow-sm ${privShowAge ? 'left-[20px]' : 'left-[2px]'}`}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[15px] text-slate-800 font-medium">Gender</span>
                  <div onClick={() => setPrivShowGender(!privShowGender)} className={`w-[42px] h-[24px] rounded-full relative cursor-pointer transition-colors ${privShowGender ? 'bg-[#7cb342]' : 'bg-slate-300'}`}>
                    <div className={`w-[20px] h-[20px] bg-white rounded-full absolute top-[2px] transition-all shadow-sm ${privShowGender ? 'left-[20px]' : 'left-[2px]'}`}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[15px] text-slate-800 font-medium">Location</span>
                  <div onClick={() => setPrivShowLocation(!privShowLocation)} className={`w-[42px] h-[24px] rounded-full relative cursor-pointer transition-colors ${privShowLocation ? 'bg-[#7cb342]' : 'bg-slate-300'}`}>
                    <div className={`w-[20px] h-[20px] bg-white rounded-full absolute top-[2px] transition-all shadow-sm ${privShowLocation ? 'left-[20px]' : 'left-[2px]'}`}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[15px] text-slate-800 font-medium">Friend list</span>
                  <div onClick={() => setPrivShowFriendList(!privShowFriendList)} className={`w-[42px] h-[24px] rounded-full relative cursor-pointer transition-colors ${privShowFriendList ? 'bg-[#7cb342]' : 'bg-slate-300'}`}>
                    <div className={`w-[20px] h-[20px] bg-white rounded-full absolute top-[2px] transition-all shadow-sm ${privShowFriendList ? 'left-[20px]' : 'left-[2px]'}`}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[15px] text-slate-800 font-medium">Gift list</span>
                  <div onClick={() => setPrivShowGiftList(!privShowGiftList)} className={`w-[42px] h-[24px] rounded-full relative cursor-pointer transition-colors ${privShowGiftList ? 'bg-[#7cb342]' : 'bg-slate-300'}`}>
                    <div className={`w-[20px] h-[20px] bg-white rounded-full absolute top-[2px] transition-all shadow-sm ${privShowGiftList ? 'left-[20px]' : 'left-[2px]'}`}></div>
                  </div>
                </div>
              </div>
              <button onClick={() => handleSaveSettings('privacy')} className="w-32 mt-6 py-2.5 bg-[#00bcd4] hover:bg-[#0097a7] rounded-lg text-white font-bold transition flex items-center justify-center gap-2">
                <FaSave size={14} /> Save
              </button>
            </div>
          )}

          {subModal === 'language_location' && (
            <div className="flex flex-col gap-4 mt-2">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Language</label>
                <div className="relative">
                  <select value={langLanguage} onChange={e => setLangLanguage(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="English">English</option><option value="Spanish">Spanish</option><option value="Hindi">Hindi</option>
                  </select>
                  <FaChevronDown className="absolute right-4 top-3.5 text-slate-400 text-xs pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Country</label>
                <div className="relative">
                  <select value={langCountry} onChange={e => setLangCountry(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="India">India</option><option value="USA">USA</option><option value="UK">UK</option>
                  </select>
                  <FaChevronDown className="absolute right-4 top-3.5 text-slate-400 text-xs pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">State</label>
                <div className="relative">
                  <select value={langTimezone} onChange={e => setLangTimezone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                    <option value="Chandigarh">Chandigarh</option>
                    <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Lakshadweep">Lakshadweep</option>
                    <option value="Puducherry">Puducherry</option>
                  </select>
                  <FaChevronDown className="absolute right-4 top-3.5 text-slate-400 text-xs pointer-events-none" />
                </div>
              </div>
              <button onClick={() => handleSaveSettings('language')} className="w-32 mt-4 py-2.5 bg-[#00bcd4] hover:bg-[#0097a7] rounded-lg text-white font-bold transition flex items-center justify-center gap-2">
                <FaSave size={14} /> Save
              </button>
            </div>
          )}


          {subModal === 'manage_ignores' && (
            <div className="flex flex-col gap-4 mt-2">
              <h2 className="text-xl font-bold text-slate-800">Manage ignores</h2>
              {(() => {
                const ignoredList = JSON.parse(localStorage.getItem('ignoredUsers') || '[]');
                if (ignoredList.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-center">
                      <div className="text-gray-300 mb-4 opacity-50 select-none">
                         <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="72" width="72" xmlns="http://www.w3.org/2000/svg"><path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM176.4 176a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm128 32a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm-84.3 128.7c22.6-18.1 53-18.1 75.7 0c14.2 11.4 34.6 9.1 46-5.1s9.1-34.6-5.1-46c-45-36-110.1-36-155.1 0c-14.2 11.4-16.4 31.8-5.1 46s31.8 16.4 46 5.1z"></path></svg>
                      </div>
                      <div className="text-sm font-extrabold text-slate-400">Your ignore list is empty</div>
                    </div>
                  );
                }
                return (
                  <div className="max-h-[50vh] overflow-y-auto space-y-2">
                    {ignoredList.map(uid => (
                      <div key={uid} className="flex items-center justify-between p-3 border rounded-xl bg-slate-50">
                        <span className="font-semibold text-slate-700">Ignored User ({uid.substring(uid.length - 4)})</span>
                        <button className="text-xs text-red-500 font-bold px-2 py-1 bg-red-50 hover:bg-red-100 rounded" onClick={() => {
                          const updated = ignoredList.filter(id => id !== uid);
                          localStorage.setItem('ignoredUsers', JSON.stringify(updated));
                          setSubModal(null); setTimeout(() => setSubModal('manage_ignores'), 0);
                        }}>Remove</button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {subModal === 'manage_friends' && (
            <div className="flex flex-col gap-4 mt-2">
              <h2 className="text-xl font-bold text-slate-800">Manage friends</h2>
              {(!friends || friends.length === 0) ? (
                 <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-center">
                   <div className="text-gray-300 mb-4 opacity-50 select-none">
                     <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="72" width="72" xmlns="http://www.w3.org/2000/svg"><path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM176.4 176a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm128 32a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm-84.3 128.7c22.6-18.1 53-18.1 75.7 0c14.2 11.4 34.6 9.1 46-5.1s9.1-34.6-5.1-46c-45-36-110.1-36-155.1 0c-14.2 11.4-16.4 31.8-5.1 46s31.8 16.4 46 5.1z"></path></svg>
                   </div>
                   <div className="text-sm font-extrabold text-slate-400">there are no friends yet</div>
                 </div>
              ) : (
                <div className="max-h-[50vh] overflow-y-auto space-y-2">
                  {friends.map(friend => (
                    <div key={friend._id} className="flex items-center justify-between p-3 border rounded-xl bg-slate-50">
                      <div className="flex items-center gap-3">
                        <img src={friend.profilePic || `https://ui-avatars.com/api/?name=${friend.username}`} className="w-10 h-10 rounded-full object-cover" />
                        <span className="font-bold text-slate-700">{friend.username}</span>
                      </div>
                      <button className="text-slate-400 hover:text-slate-700 font-bold p-2" onClick={async () => {
                         if (!window.confirm('Remove friend?')) return;
                         try {
                           await api.delete(`/api/users/friends/${friend._id}`, { headers: { Authorization: `Bearer ${token}` } });
                           setFriends(friends.filter(f => f._id !== friend._id));
                         } catch (e) { alert('Error removing friend'); }
                      }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={modalOverlayStyle}>
        <div style={modalContentStyle}>
          {renderSubModal()}
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <div className="spinner" style={spinnerStyle} />
            <p style={{ marginTop: '14px', fontSize: '0.9rem', fontWeight: 'bold' }}>Loading profile details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={modalOverlayStyle}>
        <div style={modalContentStyle}>
          <div style={{ padding: '30px', textAlign: 'center' }}>
            <p style={{ color: '#ff3b30', fontWeight: 'bold', fontSize: '1.1rem' }}>User profile not available</p>
            <p style={{ color: '#777', fontSize: '0.85rem', marginTop: '6px' }}>This profile is restricted or user does not exist.</p>
            <button onClick={onClose} style={closeBtnBottomStyle}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const isOnline = onlineUsers.some(u => u._id === profile._id) || profile.isOnline;

  const handleLike = async () => {
    if (profile._id === currentUser._id) return;
    try {
      const { data } = await api.post(`/api/users/profile/${profile._id}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLikes(data.likes);
      setLikedBy(data.likedBy);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrivateAction = () => {
    setShowMenu(false);
    if (onPrivate) {
      onPrivate(profile);
      onClose(); // Close full profile modal so DM opens directly
    }
  };

  const handleAddFriendAction = async () => {
    setShowMenu(false);
    try {
      const { data } = await api.post(`/api/users/friend-request/${profile._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(data.message || 'Friend request sent successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Error sending friend request.');
    }
  };

  const handleIgnoreAction = async () => {
    setShowMenu(false);
    const endpoint = isIgnored ? 'unignore' : 'ignore';
    try {
      const { data } = await api.post(`/api/users/${endpoint}/${profile._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsIgnored(!isIgnored);
      alert(data.message || `User successfully ${isIgnored ? 'unignored' : 'ignored'}.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing request.');
    }
  };

  const handleReportSubmit = async () => {
    setShowReport(false);
    try {
      const { data } = await api.post(`/api/users/report/${profile._id}`, {
        reason: reportReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(data.message || 'Report submitted successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting report.');
    }
  };

  const handleSendGiftSubmit = async (giftKey) => {
    if (sendingGiftKey) return;
    setSendingGiftKey(giftKey);
    try {
      const { data } = await api.post(`/api/users/send-gift/${profile._id}`, {
        giftName: giftKey
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update profile locally to increment count
      setProfile(prev => ({
        ...prev,
        gifts: data.recipientGifts
      }));
      
      // Deduct coins from local user state in AuthContext
      updateUser({ coins: data.coins });
      
      setShowSendGift(false);
      alert(data.message || 'Gift sent successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error sending gift.');
    } finally {
      setSendingGiftKey(null);
    }
  };

  const handleShareWalletSubmit = async () => {
    const amount = Number(coinsToShare);
    if (!amount || amount <= 0) return;
    try {
      const { data } = await api.post(`/api/users/transfer-coins/${profile._id}`, {
        amount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      updateUser({ coins: data.coins });
      
      setShowShareWallet(false);
      setCoinsToShare('');
      alert(data.message || 'Coins shared successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error transferring coins.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" 
      onClick={onClose}
    >
      {viewingImage && <ImageLightbox src={viewingImage} onClose={() => setViewingImage(null)} />}
      <div 
        className="bg-white w-full max-w-md rounded-[24px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] relative" 
        onClick={e => { e.stopPropagation(); setShowCoverMenu(false); setShowAvatarMenu(false); }}
      >
        {renderSubModal()}

        {/* AI Moderation Warning Alert */}
        {moderationWarning && (
          <div className="absolute top-4 left-4 right-4 z-[110] bg-red-50 border border-red-200 rounded-2xl p-4 shadow-xl flex items-start gap-3 transition-all transform duration-300 scale-100">
            <div className="bg-red-500/10 p-2 rounded-xl text-red-600 flex-shrink-0">
              <FaExclamationTriangle size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-red-800 text-sm font-extrabold">🚨 AI Moderation Warning</h4>
              <p className="text-red-700 text-xs mt-1 leading-relaxed">{moderationWarning}</p>
            </div>
            <button 
              onClick={() => setModerationWarning(null)}
              className="text-red-400 hover:text-red-600 transition p-1 cursor-pointer flex-shrink-0"
            >
              <FaTimes size={16} />
            </button>
          </div>
        )}

        <input 
          type="file" 
          ref={avatarInputRef} 
          onChange={handleAvatarUpload} 
          accept="image/*" 
          className="hidden" 
        />
        <input 
          type="file" 
          ref={coverInputRef} 
          onChange={handleCoverUpload} 
          accept="image/*" 
          className="hidden" 
        />

        {/* HEADER AREA - BLUE / COVER PHOTO */}
        <div 
          onClick={() => { if(profile.coverPhoto && !profile.coverPhoto.includes('gradient')) setViewingImage(profile.coverPhoto) }}
          className="bg-[#244273] w-full px-5 py-5 relative flex flex-col items-center min-h-[160px] justify-center transition-all duration-300 cursor-pointer"
          style={{
            backgroundImage: profile.coverPhoto && (profile.coverPhoto.startsWith('http') || profile.coverPhoto.startsWith('/') || profile.coverPhoto.startsWith('data:'))
              ? `url(${profile.coverPhoto})` 
              : (profile.coverPhoto && profile.coverPhoto.includes('gradient') ? profile.coverPhoto : 'none'),
            backgroundColor: profile.coverPhoto && !profile.coverPhoto.startsWith('http') && !profile.coverPhoto.startsWith('/') && !profile.coverPhoto.startsWith('data:') && !profile.coverPhoto.includes('gradient')
              ? profile.coverPhoto 
              : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {uploadingCover && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {profile._id === currentUser._id && !uploadingCover && (
            <div className="absolute top-4 right-4 z-30">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowCoverMenu(!showCoverMenu); setShowAvatarMenu(false); }}
                className="bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition backdrop-blur-sm cursor-pointer shadow-lg border border-white/20"
                title="Manage Cover Photo"
              >
                <FaCamera size={12} />
              </button>
              
              {showCoverMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl py-1 overflow-hidden border border-gray-100 z-50">
                  <button 
                    onClick={(e) => { e.stopPropagation(); coverInputRef.current?.click(); setShowCoverMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-semibold text-gray-700 cursor-pointer"
                  >
                    Add new profile
                  </button>
                  {profile.coverPhoto && !profile.coverPhoto.includes('gradient') && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemoveCover(); setShowCoverMenu(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-red-50 text-sm font-semibold text-red-600 cursor-pointer"
                    >
                      Remove current profile
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Top Icons Row */}
          <div className="w-full flex justify-between items-start mb-2 z-10">
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition rounded-full px-2.5 py-1 cursor-default">
                <FaStar className="text-yellow-400" size={14} />
                <span className="text-white text-xs font-bold">{profile.level || 1}</span>
              </div>
              <button 
                onClick={handleLike} 
                disabled={profile._id === currentUser._id}
                className={`flex items-center gap-1.5 transition rounded-full px-2.5 py-1 ${likedBy.includes(currentUser._id) ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-400' : 'bg-white/10 hover:bg-white/20 text-white cursor-pointer'}`}
              >
                <FaThumbsUp className={likedBy.includes(currentUser._id) ? 'text-cyan-400' : 'text-cyan-400'} size={14} />
                <span className="text-xs font-bold">{likes}</span>
              </button>
            </div>

            <div className="flex gap-4 items-center">
              {profile._id === currentUser._id ? (
                <button 
                  onClick={() => {
                    const newMode = !isSettingsView;
                    setIsSettingsView(newMode);
                    setActiveTab(newMode ? 'account' : 'info');
                  }}
                  className="text-white hover:text-slate-200 transition cursor-pointer"
                >
                  {isSettingsView ? <FaEye size={20} /> : <FaEdit size={20} />}
                </button>
              ) : (
                <>
                  <button onClick={() => setShowReport(true)} className="text-white hover:text-slate-200 transition cursor-pointer" title="Report">
                    <FaFlag size={16} />
                  </button>
                  <button onClick={() => setShowMenu(true)} className="text-white hover:text-slate-200 transition cursor-pointer" title="Menu">
                    <FaBars size={18} />
                  </button>
                </>
              )}
              <button onClick={onClose} className="text-white hover:text-slate-200 transition cursor-pointer" title="Close">
                <FaTimes size={20} />
              </button>
            </div>
          </div>

          {/* Avatar Section */}
          <div className="relative mt-2 mb-3 group/avatar z-10">
            <div className="relative w-24 h-24 rounded-full border-2 border-white shadow-lg overflow-hidden bg-slate-800">
              <img 
                onClick={(e) => { e.stopPropagation(); if (profile.profilePic) setViewingImage(profile.profilePic) }}
                src={profile.profilePic || `https://ui-avatars.com/api/?name=${profile.username}&background=0284c7&color=fff&size=128`} 
                alt="avatar" 
                className={`w-full h-full object-cover transition-opacity duration-300 cursor-pointer ${uploadingAvatar ? 'opacity-40' : 'opacity-100'}`}
              />
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            {isOnline && profile._id !== currentUser._id && (
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-[#244273] rounded-full"></span>
            )}
            
            {profile._id === currentUser._id && !uploadingAvatar && (
              <div className="absolute bottom-0 right-0 z-30">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(!showAvatarMenu); setShowCoverMenu(false); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 transition shadow-md border-2 border-white cursor-pointer"
                  title="Manage Profile Picture"
                >
                  <FaCamera size={12} />
                </button>
                
                {showAvatarMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl py-1 overflow-hidden border border-gray-100 z-50">
                    <button 
                      onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); setShowAvatarMenu(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-semibold text-gray-700 cursor-pointer"
                    >
                      Add new profile
                    </button>
                    {profile.profilePic && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRemoveAvatar(); setShowAvatarMenu(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-red-50 text-sm font-semibold text-red-600 cursor-pointer"
                      >
                        Remove current profile
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <div className={`w-3 h-3 rounded-full border border-[#244273] ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-white font-bold text-sm">
                {profile.role === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>
            <h2 className="text-white text-2xl font-extrabold tracking-wide">
              {profile.username || 'Anonymous'}
            </h2>
          </div>
        </div>

        {/* TABS ROW */}
        {profile.role !== 'guest' && (
          <div className="bg-[#f2f2f2] px-6 py-4 flex justify-center border-b border-gray-200">
            <div className="flex gap-2 bg-[#e6e6e6] p-1 rounded-xl">
              {(() => {
                let tabs = ['Info', 'Friends', 'Gifts'];
                if (isSettingsView) {
                  tabs = ['Account', 'More'];
                } else {
                  if (profile.privacy?.showFriendList === false) tabs = tabs.filter(t => t !== 'Friends');
                  if (profile.privacy?.showGiftList === false) tabs = tabs.filter(t => t !== 'Gifts');
                }
                return tabs;
              })().map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition cursor-pointer ${activeTab === tab.toLowerCase() ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CONTENT LIST */}
        <div className="flex-1 overflow-y-auto bg-white min-h-[300px]">
          
          {activeTab === 'account' && (
            <div className="flex flex-col py-2">
              <button onClick={() => setSubModal('edit_info')} className="flex items-center gap-4 px-6 py-4 hover:bg-black/5 transition text-slate-700 border-b border-black/5 last:border-0 cursor-pointer">
                <FaAddressCard size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Edit info</span>
              </button>
              <button onClick={() => setSubModal('edit_relationship')} className="flex items-center gap-4 px-6 py-4 hover:bg-black/5 transition text-slate-700 border-b border-black/5 last:border-0 cursor-pointer">
                <FaHeart size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Edit relationship</span>
              </button>
              <button onClick={() => setSubModal('edit_email')} className="flex items-center gap-4 px-6 py-4 hover:bg-black/5 transition text-slate-700 border-b border-black/5 last:border-0 cursor-pointer">
                <FaEnvelope size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Edit email</span>
              </button>
              <button onClick={() => setSubModal('change_password')} className="flex items-center gap-4 px-6 py-4 hover:bg-black/5 transition text-slate-700 border-b border-black/5 last:border-0 cursor-pointer">
                <FaKey size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Change password</span>
              </button>
            </div>
          )}

          {activeTab === 'more' && (
            <div className="flex flex-col py-2">
              <button onClick={() => setSubModal('manage_gifts')} className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/5 transition text-slate-700 border-b border-black/5 cursor-pointer">
                <FaGift size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Gifts</span>
              </button>
              <button onClick={() => setSubModal('manage_friends')} className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/5 transition text-slate-700 border-b border-black/5 cursor-pointer">
                <FaUserFriends size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Manage friends</span>
              </button>
              <button onClick={() => setSubModal('manage_ignores')} className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/5 transition text-slate-700 border-b border-black/5 cursor-pointer">
                <FaBan size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Manage ignores</span>
              </button>
              <button onClick={() => setSubModal('preferences')} className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/5 transition text-slate-700 border-b border-black/5 cursor-pointer">
                <FaCog size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Preferences</span>
              </button>
              <button onClick={() => setSubModal('privacy_settings')} className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/5 transition text-slate-700 border-b border-black/5 cursor-pointer">
                <FaLock size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Privacy settings</span>
              </button>
              <button onClick={() => setSubModal('language_location')} className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/5 transition text-slate-700 border-b border-black/5 cursor-pointer">
                <FaGlobe size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Language/Location</span>
              </button>
              <button className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/5 transition text-slate-700 border-b border-black/5 cursor-pointer">
                <FaSignOutAlt size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Logout options</span>
              </button>
              <button className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/5 transition text-slate-700 cursor-pointer">
                <FaTrash size={18} className="text-slate-600" />
                <span className="text-[15px] font-medium">Delete account</span>
              </button>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="flex flex-col py-2 px-6">
              
              {(isSettingsView || profile.privacy?.showAge !== false) && (
              <div className="flex items-center justify-between py-4 border-b border-black/5">
                <div className="flex items-center gap-4">
                  <FaCalendarAlt size={18} className="text-slate-700" />
                  <span className="text-[15px] font-bold text-slate-800">Age</span>
                </div>
                <span className="text-[15px] text-slate-600">{profile.age || '18'} years old</span>
              </div>
              )}
              
              {(isSettingsView || profile.privacy?.showGender !== false) && (
              <div className="flex items-center justify-between py-4 border-b border-black/5">
                <div className="flex items-center gap-4">
                  <span className="text-[18px]">⚧</span>
                  <span className="text-[15px] font-bold text-slate-800">Gender</span>
                </div>
                <span className="text-[15px] text-slate-600 capitalize">{profile.gender || 'Male'}</span>
              </div>
              )}

              {(isSettingsView || profile.privacy?.showLocation !== false) && (
              <div className="flex items-center justify-between py-4 border-b border-black/5">
                <div className="flex items-center gap-4">
                  <FaGlobe size={18} className="text-slate-700" />
                  <span className="text-[15px] font-bold text-slate-800">Country</span>
                </div>
                <span className="text-[15px] text-slate-600">{profile.country || 'India'}</span>
              </div>
              )}

              <div className="flex items-center justify-between py-4 border-b border-black/5">
                <div className="flex items-center gap-4">
                  <FaLanguage size={18} className="text-slate-700" />
                  <span className="text-[15px] font-bold text-slate-800">Language</span>
                </div>
                <span className="text-[15px] text-slate-600">English</span>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-black/5">
                <div className="flex items-center gap-4">
                  <FaUserPlus size={18} className="text-slate-700" />
                  <span className="text-[15px] font-bold text-slate-800">Member since</span>
                </div>
                <span className="text-[15px] text-slate-600">{profile.createdAt ? new Date(profile.createdAt).toISOString().split('T')[0] : 'N/A'}</span>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-black/5">
                <div className="flex items-center gap-4">
                  <FaHome size={18} className="text-slate-700" />
                  <span className="text-[15px] font-bold text-slate-800">Current room</span>
                </div>
                <span className="text-[15px] text-slate-600">Main room</span>
              </div>

              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <FaEye size={18} className="text-slate-700" />
                  <span className="text-[15px] font-bold text-slate-800">Last seen</span>
                </div>
                <span className="text-[15px] text-slate-600">
                  {isOnline 
                    ? 'Online now' 
                    : (profile.lastSeen 
                      ? new Date(profile.lastSeen).toLocaleString('en-IN', { hour12: false }).replace(',', '') 
                      : 'N/A')}
                </span>
              </div>

            </div>
          )}

          {activeTab === 'friends' && (
            <div className="py-2 h-full">
              {friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 px-6">
                  <div className="text-gray-300 mb-4 opacity-50">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="72" width="72" xmlns="http://www.w3.org/2000/svg"><path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM176.4 176a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm128 32a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm-84.3 128.7c22.6-18.1 53-18.1 75.7 0c14.2 11.4 34.6 9.1 46-5.1s9.1-34.6-5.1-46c-45-36-110.1-36-155.1 0c-14.2 11.4-16.4 31.8-5.1 46s31.8 16.4 46 5.1z"></path></svg>
                  </div>
                  <p className="text-gray-500 font-medium">There is currently no data to show</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4 px-6 pt-4">
                  {friends.map(friend => (
                    <div key={friend._id} className="flex flex-col items-center cursor-pointer hover:opacity-80 transition">
                      <img 
                        src={friend.profilePic || `https://ui-avatars.com/api/?name=${friend.username}&background=0284c7&color=fff`}
                        alt={friend.username} 
                        className="w-14 h-14 rounded-full object-cover shadow-sm mb-2"
                      />
                      <div className="text-xs font-bold text-slate-700 truncate w-full text-center">{friend.username}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'gifts' && (
            <div className="py-2 h-full">
              {(!profile.gifts || profile.gifts.length === 0 || profile.gifts.every(g => (g.count || 0) === 0)) ? (
                <div className="flex flex-col items-center justify-center py-24 px-6">
                  <div className="text-gray-300 mb-4 opacity-50">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="72" width="72" xmlns="http://www.w3.org/2000/svg"><path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM176.4 176a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm128 32a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm-84.3 128.7c22.6-18.1 53-18.1 75.7 0c14.2 11.4 34.6 9.1 46-5.1s9.1-34.6-5.1-46c-45-36-110.1-36-155.1 0c-14.2 11.4-16.4 31.8-5.1 46s31.8 16.4 46 5.1z"></path></svg>
                  </div>
                  <p className="text-gray-500 font-medium">There is currently no data to show</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 px-6 pt-4">
                  {profile.gifts
                    .filter(gift => (gift.count || 0) > 0)
                    .map((gift, idx) => (
                      <div key={gift.name || idx} className="bg-white border border-slate-200 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm">
                        <span>{gift.icon}</span>
                        <span className="text-xs font-bold text-slate-700">{gift.name}</span>
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">x{gift.count}</span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )}

        </div>

        {/* MODAL OVERLAYS (SUB-MODALS) */}
        {showMenu && (
          <div style={subModalOverlayStyle} onClick={() => setShowMenu(false)}>
            <div style={hamburgerCardStyle} onClick={e => e.stopPropagation()}>
              <button style={hamburgerCloseBtnStyle} onClick={() => setShowMenu(false)}>✕</button>
              
              <div style={hamburgerHeaderStyle}>
                <img 
                  src={profile.profilePic || 'https://res.cloudinary.com/demo/image/upload/v1519759714/avatar.png'} 
                  alt="avatar" 
                  style={hamburgerAvatarStyle} 
                />
                <h3 style={hamburgerNameStyle}>{profile.username.toUpperCase()}</h3>
              </div>
              
              <div style={hamburgerOptionsListStyle}>
                <button style={hamburgerOptionRowStyle} onClick={handlePrivateAction}>
                  <span style={{ ...hamburgerOptionIconStyle, color: '#4f46e5' }}><FaCommentDots /></span>
                  <span style={hamburgerOptionLabelStyle}>Private</span>
                </button>

                <button style={hamburgerOptionRowStyle} onClick={handleAddFriendAction}>
                  <span style={{ ...hamburgerOptionIconStyle, color: '#10b981' }}><FaUserPlus /></span>
                  <span style={hamburgerOptionLabelStyle}>Add friend</span>
                </button>

                <button style={hamburgerOptionRowStyle} onClick={() => { setShowMenu(false); setShowSendGift(true); }}>
                  <span style={{ ...hamburgerOptionIconStyle, color: '#ec4899' }}><FaGift /></span>
                  <span style={hamburgerOptionLabelStyle}>Send gift</span>
                </button>

                <button style={hamburgerOptionRowStyle} onClick={() => { setShowMenu(false); setShowShareWallet(true); }}>
                  <span style={{ ...hamburgerOptionIconStyle, color: '#eab308' }}><FaWallet /></span>
                  <span style={hamburgerOptionLabelStyle}>Share wallet</span>
                </button>

                <button style={hamburgerOptionRowStyle} onClick={handleIgnoreAction}>
                  <span style={{ ...hamburgerOptionIconStyle, color: '#ef4444' }}><FaBan /></span>
                  <span style={hamburgerOptionLabelStyle}>{isIgnored ? 'Unignore' : 'Ignore'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {showReport && (
          <div style={subModalOverlayStyle} onClick={() => setShowReport(false)}>
            <div style={reportCardStyle} onClick={e => e.stopPropagation()}>
              <div style={reportAlertIconContainerStyle}>
                <FaExclamationTriangle style={{ fontSize: '3rem', color: '#f59e0b' }} />
              </div>
              
              <h3 style={reportTitleStyle}>Report this content</h3>
              
              <p style={reportSubtitleStyle}>
                Please select a reason for reporting this user. False reports may lead to account suspension.
              </p>
              
              <div style={{ width: '100%', marginBottom: '20px' }}>
                <select 
                  value={reportReason} 
                  onChange={e => setReportReason(e.target.value)} 
                  style={reportSelectStyle}
                >
                  <option value="Spam / Advertising">Spam / Advertising</option>
                  <option value="Harassment / Bullying">Harassment / Bullying</option>
                  <option value="Inappropriate avatar or username">Inappropriate avatar or username</option>
                  <option value="Hate speech / Toxicity">Hate speech / Toxicity</option>
                  <option value="Other / General violation">Other / General violation</option>
                </select>
              </div>
              
              <div style={reportActionsContainerStyle}>
                <button style={reportCancelBtnStyle} onClick={() => setShowReport(false)}>
                  Cancel
                </button>
                <button style={reportSubmitBtnStyle} onClick={handleReportSubmit}>
                  Report
                </button>
              </div>
            </div>
          </div>
        )}

        {showSendGift && (
          <div style={subModalOverlayStyle} onClick={() => setShowSendGift(false)}>
            <div style={giftModalCardStyle} onClick={e => e.stopPropagation()}>
              <button style={hamburgerCloseBtnStyle} onClick={() => setShowSendGift(false)}>✕</button>
              
              <h3 style={giftModalTitleStyle}>Send Premium Gift 🎁</h3>
              <p style={giftModalSubtitleStyle}>Your Wallet: <span style={{ color: '#eab308', fontWeight: 'bold' }}>💰 {currentUser.coins || 0} Coins</span></p>

              {/* Grid of gift items for current page */}
              <div style={giftGridStyle}>
                {GIFTS_PAGES[giftPage].map(gift => {
                  const hasEnough = (currentUser.coins || 0) >= 100;
                  const isSendingThis = sendingGiftKey === gift.key;
                  return (
                    <div 
                      key={gift.key} 
                      style={giftGridItemStyle(hasEnough)}
                      onClick={() => hasEnough && !sendingGiftKey && handleSendGiftSubmit(gift.key)}
                      title={`Send ${gift.name} for 100 Coins`}
                    >
                      {isSendingThis ? (
                        <div style={miniSpinnerStyle} />
                      ) : (
                        <span style={giftGridIconStyle}>{gift.icon}</span>
                      )}
                      
                      <div style={giftPillStyle}>
                        <span style={goldCoinStyle}>🪙</span>
                        <span style={goldCoinTextStyle}>100</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION CONTROLS */}
              <div style={paginationContainerStyle}>
                <button 
                  style={paginationBtnStyle(giftPage > 0)}
                  disabled={giftPage === 0}
                  onClick={() => setGiftPage(prev => prev - 1)}
                >
                  &lt;
                </button>
                <button 
                  style={paginationBtnStyle(giftPage < GIFTS_PAGES.length - 1)}
                  disabled={giftPage === GIFTS_PAGES.length - 1}
                  onClick={() => setGiftPage(prev => prev + 1)}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        )}

        {showShareWallet && (
          <div style={subModalOverlayStyle} onClick={() => setShowShareWallet(false)}>
            <div style={shareWalletCardStyle} onClick={e => e.stopPropagation()}>
              <button style={{...hamburgerCloseBtnStyle, color: '#333'}} onClick={() => setShowShareWallet(false)}>✕</button>
              
              <div style={shareWalletTabsStyle}>
                <div style={shareWalletActiveTabStyle}>Gold</div>
              </div>
              
              <div style={{ textAlign: 'left' }}>
                <h3 style={shareWalletTitleStyle}>Gold balance</h3>
                <div style={shareWalletBalanceStyle}>
                  <span style={{color: '#fbbf24', fontSize: '1.2rem'}}>🪙</span> 
                  {currentUser.coins || 0}
                </div>
                
                <div style={shareWalletLabelStyle}>Amount to share</div>
                
                <div style={{ width: '100%', marginBottom: '6px' }}>
                  <input 
                    type="number"
                    min="20"
                    max="100"
                    placeholder="20" 
                    value={coinsToShare}
                    onChange={e => setCoinsToShare(e.target.value)}
                    style={shareWalletInputStyle}
                  />
                </div>
                <div style={shareWalletHelperTextStyle}>
                  Min 20 - Max 100
                </div>
              </div>
              
              <div style={shareWalletActionsStyle}>
                <button 
                  style={shareWalletSubmitBtnStyle(currentUser.coins >= Number(coinsToShare) && Number(coinsToShare) >= 20 && Number(coinsToShare) <= 100)}
                  disabled={currentUser.coins < Number(coinsToShare) || Number(coinsToShare) < 20 || Number(coinsToShare) > 100}
                  onClick={handleShareWalletSubmit}
                >
                  Send
                </button>
                <button style={shareWalletCancelBtnStyle} onClick={() => setShowShareWallet(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// CSS-in-JS styles for FullProfileModal to ensure pixel-perfect matches with premium aesthetics
const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.65)',
  backdropFilter: 'blur(4px)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalContentStyle = {
  background: '#ffffff',
  borderRadius: '24px',
  width: '90%',
  maxWidth: '420px',
  overflow: 'hidden',
  boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};



const spinnerStyle = {
  width: '32px',
  height: '32px',
  border: '3px solid #f3f3f3',
  borderTop: '3px solid #1e3d75',
  borderRadius: '50%',
  margin: '0 auto',
  animation: 'spin 1s linear infinite',
};

const closeBtnBottomStyle = {
  marginTop: '16px',
  background: NAVY,
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '8px 24px',
  fontSize: '0.85rem',
  fontWeight: 'bold',
  cursor: 'pointer',
};

// Virtual Gifting & Dropdown overlay styles matching picture mocks perfectly


const giftBadgeStyle = {
  position: 'absolute',
  bottom: '6px',
  left: '6px',
  background: '#f8fafc',
  color: '#0f172a',
  borderRadius: '6px',
  padding: '2px 6px',
  fontSize: '0.65rem',
  fontWeight: '800',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
};

const subModalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.4)',
  backdropFilter: 'blur(3px)',
  zIndex: 1100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const hamburgerCardStyle = {
  background: '#ffffff',
  borderRadius: '24px',
  width: '88%',
  maxWidth: '340px',
  padding: '24px 20px',
  boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
  position: 'relative',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  textAlign: 'center',
};

const hamburgerCloseBtnStyle = {
  position: 'absolute',
  top: '16px',
  right: '18px',
  background: 'none',
  border: 'none',
  fontSize: '1.2rem',
  color: '#888',
  cursor: 'pointer',
  padding: '4px',
  lineHeight: 1,
};

const hamburgerHeaderStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginBottom: '20px',
};

const hamburgerAvatarStyle = {
  width: '64px',
  height: '64px',
  borderRadius: '50%',
  border: '2px solid #1e3d75',
  objectFit: 'cover',
  marginBottom: '10px',
};

const hamburgerNameStyle = {
  margin: 0,
  fontSize: '1.1rem',
  fontWeight: '800',
  color: '#1e293b',
};

const hamburgerOptionsListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const hamburgerOptionRowStyle = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  background: '#f8fafc',
  border: '1px solid #f1f5f9',
  borderRadius: '14px',
  padding: '12px 16px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  textAlign: 'left',
};

const hamburgerOptionIconStyle = {
  fontSize: '1.1rem',
  marginRight: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const hamburgerOptionLabelStyle = {
  fontSize: '0.85rem',
  fontWeight: '700',
  color: '#334155',
};

const reportCardStyle = {
  background: '#ffffff',
  borderRadius: '24px',
  width: '88%',
  maxWidth: '340px',
  padding: '28px 24px',
  boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
  textAlign: 'center',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const reportAlertIconContainerStyle = {
  marginBottom: '14px',
  display: 'flex',
  justifyContent: 'center',
};

const reportTitleStyle = {
  margin: '0 0 10px 0',
  fontSize: '1.2rem',
  fontWeight: '800',
  color: '#0f172a',
};

const reportSubtitleStyle = {
  fontSize: '0.8rem',
  color: '#64748b',
  margin: '0 0 20px 0',
  lineHeight: '1.4',
  fontWeight: '500',
};

const reportSelectStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
  fontSize: '0.85rem',
  color: '#334155',
  outline: 'none',
  background: '#f8fafc',
};

const reportActionsContainerStyle = {
  display: 'flex',
  gap: '12px',
  marginTop: '20px',
};

const reportCancelBtnStyle = {
  flex: 1,
  background: '#ec4899',
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  padding: '10px 16px',
  fontSize: '0.85rem',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'opacity 0.2s',
};

const reportSubmitBtnStyle = {
  flex: 1,
  background: '#06b6d4',
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  padding: '10px 16px',
  fontSize: '0.85rem',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'opacity 0.2s',
};

const giftModalCardStyle = {
  background: '#ffffff',
  borderRadius: '24px',
  width: '92%',
  maxWidth: '420px',
  padding: '24px 20px',
  boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
  position: 'relative',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const giftModalTitleStyle = {
  margin: '0 0 4px 0',
  fontSize: '1.2rem',
  fontWeight: '800',
  color: '#0f172a',
};

const giftModalSubtitleStyle = {
  margin: '0 0 16px 0',
  fontSize: '0.85rem',
  color: '#64748b',
  fontWeight: '500',
};

const giftGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '12px',
  marginTop: '16px',
  marginBottom: '20px',
};

const giftGridItemStyle = (hasEnough) => ({
  background: '#ffffff',
  border: '1px solid #f1f5f9',
  borderRadius: '16px',
  padding: '12px 4px',
  textAlign: 'center',
  cursor: hasEnough ? 'pointer' : 'not-allowed',
  transition: 'all 0.2s ease',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  opacity: hasEnough ? 1 : 0.65,
  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
});

const giftGridIconStyle = {
  fontSize: '2.5rem',
  display: 'block',
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))',
  marginBottom: '6px',
};

const giftPillStyle = {
  background: '#fafafa',
  borderRadius: '20px',
  border: '1px solid #f1f5f9',
  padding: '2px 8px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  marginTop: '4px',
};

const goldCoinStyle = {
  fontSize: '0.8rem',
};

const goldCoinTextStyle = {
  fontSize: '0.75rem',
  fontWeight: '800',
  color: '#475569',
};

const paginationContainerStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: '14px',
  marginTop: '10px',
  paddingBottom: '4px',
};

const paginationBtnStyle = (isActive) => ({
  width: '46px',
  height: '36px',
  background: '#f1f5f9',
  color: '#334155',
  border: 'none',
  borderRadius: '12px',
  fontSize: '0.95rem',
  fontWeight: 'bold',
  cursor: isActive ? 'pointer' : 'not-allowed',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: isActive ? 1 : 0.4,
  transition: 'all 0.2s',
});

const miniSpinnerStyle = {
  width: '24px',
  height: '24px',
  border: '2px solid #f3f3f3',
  borderTop: '2px solid #1e3d75',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  marginBottom: '6px',
};

const shareWalletCardStyle = {
  background: '#ffffff',
  borderRadius: '16px',
  width: '90%',
  maxWidth: '380px',
  padding: '24px',
  boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
  position: 'relative',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const shareWalletTabsStyle = {
  display: 'flex',
  borderBottom: '1px solid #f1f5f9',
  marginBottom: '24px',
  paddingBottom: '12px'
};

const shareWalletActiveTabStyle = {
  background: '#f1f5f9',
  padding: '6px 16px',
  borderRadius: '6px',
  fontWeight: 'bold',
  color: '#334155',
  fontSize: '0.95rem',
  display: 'inline-block'
};

const shareWalletTitleStyle = {
  margin: '0 0 12px 0',
  fontSize: '1.25rem',
  fontWeight: 'bold',
  color: '#1e293b',
};

const shareWalletBalanceStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '1.1rem',
  color: '#475569',
  marginBottom: '24px',
};

const shareWalletLabelStyle = {
  fontSize: '0.95rem',
  fontWeight: 'bold',
  color: '#1e293b',
  marginBottom: '10px',
};

const shareWalletInputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
  fontSize: '1rem',
  outline: 'none',
  background: '#f8fafc',
  color: '#0f172a',
};

const shareWalletHelperTextStyle = {
  fontSize: '0.8rem',
  color: '#94a3b8',
  marginBottom: '24px',
};

const shareWalletActionsStyle = {
  display: 'flex',
  gap: '10px',
};

const shareWalletSubmitBtnStyle = (isValid) => ({
  flex: 1,
  background: isValid ? '#0ea5e9' : '#94a3b8',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  padding: '10px',
  fontSize: '0.95rem',
  fontWeight: 'bold',
  cursor: isValid ? 'pointer' : 'not-allowed',
  transition: 'background 0.2s',
});

const shareWalletCancelBtnStyle = {
  flex: 1,
  background: '#e11d48',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  padding: '10px',
  fontSize: '0.95rem',
  fontWeight: 'bold',
  cursor: 'pointer',
};

export default FullProfileModal;

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit3, 
  Camera, 
  Briefcase, 
  GraduationCap, 
  Plus, 
  Trash2, 
  Link, 
  Check, 
  Sparkles, 
  Globe, 
  Calendar, 
  User, 
  X,
  PlusCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, uploadAvatar } from '../api/profile';
import Spinner from '../components/Spinner';
import GithubIntegration from '../components/GithubIntegration';

/**
 * Profile Page
 * Handles both public profiles (/profile/:username) and editing own profile (/profile).
 */
const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: authUser, setUser: setAuthUser } = useAuth();

  const isOwnProfile = !username || username === authUser?.username;
  const targetUsername = username || authUser?.username;

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Edit form states
  const [formDetails, setFormDetails] = useState({
    nickname: '',
    title: '',
    bio: '',
    skills: '',
    githubUrl: '',
    linkedinUrl: '',
  });

  const [experience, setExperience] = useState([]);
  const [education, setEducation] = useState([]);

  // Sub-form inline states for adding experience/education
  const [showExpForm, setShowExpForm] = useState(false);
  const [newExp, setNewExp] = useState({
    title: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
  });

  const [showEduForm, setShowEduForm] = useState(false);
  const [newEdu, setNewEdu] = useState({
    school: '',
    degree: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
  });

  // Fetch target profile
  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      const data = await getProfile(targetUsername);
      setUser(data.user);
      
      // Populate edit states
      setFormDetails({
        nickname: data.user.profile?.nickname || '',
        title: data.user.profile?.title || '',
        bio: data.user.bio || '',
        skills: data.user.profile?.skills ? data.user.profile.skills.join(', ') : '',
        githubUrl: data.user.profile?.githubUrl || '',
        linkedinUrl: data.user.profile?.linkedinUrl || '',
      });

      setExperience(data.user.profile?.experience || []);
      setEducation(data.user.profile?.education || []);
    } catch {
      toast.error('Failed to load profile details.');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (targetUsername) {
      fetchUserProfile();
    }
  }, [targetUsername]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormDetails(prev => ({ ...prev, [name]: value }));
  };

  // Avatar Image Helper
  const getBackendUrl = () => {
    return window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : window.location.origin;
  };

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    return `${getBackendUrl()}${avatarPath}`;
  };

  // Profile photo upload trigger
  const handleAvatarClick = () => {
    if (isOwnProfile && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const toastId = toast.loading('Uploading profile photo...');
    try {
      const data = await uploadAvatar(file);
      // Update local state and auth context
      setUser(prev => ({ ...prev, avatar: data.avatar }));
      setAuthUser(prev => ({ ...prev, avatar: data.avatar }));
      toast.success('Profile photo updated! 📸', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload image.', { id: toastId });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Experience timeline managers
  const handleAddExperience = () => {
    if (!newExp.title.trim() || !newExp.company.trim() || !newExp.startDate) {
      toast.error('Role Title, Company, and Start Date are required.');
      return;
    }
    setExperience(prev => [...prev, newExp]);
    setNewExp({
      title: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
    });
    setShowExpForm(false);
  };

  const handleRemoveExperience = (idx) => {
    setExperience(prev => prev.filter((_, i) => i !== idx));
  };

  // Education timeline managers
  const handleAddEducation = () => {
    if (!newEdu.school.trim() || !newEdu.degree.trim() || !newEdu.fieldOfStudy.trim() || !newEdu.startDate) {
      toast.error('School, Degree, Field of Study, and Start Date are required.');
      return;
    }
    setEducation(prev => [...prev, newEdu]);
    setNewEdu({
      school: '',
      degree: '',
      fieldOfStudy: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
    });
    setShowEduForm(false);
  };

  const handleRemoveEducation = (idx) => {
    setEducation(prev => prev.filter((_, i) => i !== idx));
  };

  // Save profile updates
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const toastId = toast.loading('Saving profile changes...');
    try {
      const payload = {
        nickname: formDetails.nickname.trim(),
        title: formDetails.title.trim(),
        bio: formDetails.bio.trim(),
        skills: formDetails.skills,
        githubUrl: formDetails.githubUrl.trim(),
        linkedinUrl: formDetails.linkedinUrl.trim(),
        experience,
        education,
      };

      const data = await updateProfile(payload);
      setUser(data.user);
      setAuthUser(data.user); // Sync Context
      setIsEditing(false);
      toast.success('Profile changes saved successfully! 🎉', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save changes.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="page-loader" style={{ height: '100vh' }}>
        <Spinner />
        <span>Loading developer profile...</span>
      </div>
    );
  }

  if (!user) return null;

  const userInitials = user.username.slice(0, 2).toUpperCase();

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto', animation: 'slideUp 0.3s ease both' }}>
      
      {/* Header Back Link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '0.5rem 0.875rem',
            borderRadius: 'var(--radius-sm)',
            transition: 'var(--transition-fast)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-secondary)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </button>

        {isOwnProfile && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-primary"
            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            <Edit3 size={15} />
            Edit Profile
          </button>
        )}
      </div>

      {/* Profile Overview Card */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
        marginBottom: '2rem'
      }}>
        {/* Banner Gradient */}
        <div style={{
          height: '140px',
          background: 'var(--gradient-brand)',
          position: 'relative'
        }} />

        {/* User Card Info Header */}
        <div style={{
          padding: '0 2rem 2rem',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '1.25rem',
          marginTop: '-60px'
        }} className="md:flex-row md:items-end">
          
          {/* Avatar frame */}
          <div 
            onClick={handleAvatarClick}
            style={{
              width: 120,
              height: 120,
              borderRadius: 24,
              background: '#13151b',
              border: '4px solid #0a0b0f',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              cursor: isOwnProfile ? 'pointer' : 'default',
              overflow: 'hidden',
              flexShrink: 0
            }}
          >
            {user.avatar ? (
              <img 
                src={getAvatarUrl(user.avatar)} 
                alt={user.username} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>
                {userInitials}
              </span>
            )}

            {isOwnProfile && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                opacity: 0,
                transition: 'opacity 0.2s ease'
              }}
              className="hover-camera"
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
              >
                {isUploadingAvatar ? <Spinner /> : <Camera size={22} />}
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              style={{ display: 'none' }}
              accept="image/*"
            />
          </div>

          {/* User basic details */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
                {user.profile?.nickname || user.username}
              </h1>
              {user.profile?.nickname && (
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  (@{user.username})
                </span>
              )}
              <span className="role-badge" style={{ textTransform: 'uppercase' }}>
                {user.role}
              </span>
            </div>
            
            <p style={{
              fontSize: '1rem',
              fontWeight: 500,
              color: 'var(--color-accent-light)',
              marginTop: '0.25rem'
            }}>
              {user.profile?.title || 'Developer'}
            </p>

            <div style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              marginTop: '0.75rem',
              flexWrap: 'wrap',
              fontSize: '0.85rem',
              color: 'var(--color-text-muted)'
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Globe size={13} />
                {user.email}
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={13} />
                Member since {new Date(user.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details Edit Mode / View Mode */}
      {isEditing ? (
        /* ─── EDIT PROFILE FORM ─────────────────────────────────────── */
        <form onSubmit={handleSaveProfile} style={{ animation: 'slideUp 0.25s ease both' }}>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '2rem',
            marginBottom: '2rem'
          }} className="md:grid-cols-3">
            
            {/* Form Fields Column 1 & 2 */}
            <div style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
            }} className="md:col-span-2">
              
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                Profile details
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-nickname">Nickname</label>
                  <input
                    id="edit-nickname"
                    type="text"
                    name="nickname"
                    className="form-input"
                    value={formDetails.nickname}
                    onChange={handleInputChange}
                    style={{ paddingLeft: '1rem' }}
                    placeholder="Display nickname"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-title">Professional Title</label>
                  <input
                    id="edit-title"
                    type="text"
                    name="title"
                    className="form-input"
                    value={formDetails.title}
                    onChange={handleInputChange}
                    style={{ paddingLeft: '1rem' }}
                    placeholder="e.g. Senior Backend Developer"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-bio">Bio</label>
                <textarea
                  id="edit-bio"
                  name="bio"
                  className="form-input"
                  value={formDetails.bio}
                  onChange={handleInputChange}
                  rows={3}
                  maxLength={200}
                  style={{ paddingLeft: '1rem', resize: 'none', height: '74px', fontFamily: 'var(--font-sans)' }}
                  placeholder="Short description about yourself..."
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-skills">Skills (comma-separated)</label>
                <input
                  id="edit-skills"
                  type="text"
                  name="skills"
                  className="form-input"
                  value={formDetails.skills}
                  onChange={handleInputChange}
                  style={{ paddingLeft: '1rem' }}
                  placeholder="e.g. React, Node.js, Mongoose, Python"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-github">GitHub Profile Link</label>
                  <div className="input-wrapper">
                    <Link className="input-icon" size={15} style={{ left: '0.875rem' }} />
                    <input
                      id="edit-github"
                      type="url"
                      name="githubUrl"
                      className="form-input"
                      value={formDetails.githubUrl}
                      onChange={handleInputChange}
                      placeholder="https://github.com/username"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-linkedin">LinkedIn Profile Link</label>
                  <div className="input-wrapper">
                    <Link className="input-icon" size={15} style={{ left: '0.875rem' }} />
                    <input
                      id="edit-linkedin"
                      type="url"
                      name="linkedinUrl"
                      className="form-input"
                      value={formDetails.linkedinUrl}
                      onChange={handleInputChange}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Experience and Education List Column 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Experience Manager */}
              <div style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>
                    Work Experience
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setShowExpForm(true); setShowEduForm(false); }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-accent-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    <PlusCircle size={14} /> Add
                  </button>
                </div>

                {/* Sub-form inline Experience */}
                {showExpForm && (
                  <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <input 
                      type="text" 
                      placeholder="Role (e.g. Architect)" 
                      className="form-input" 
                      style={{ paddingLeft: '0.75rem', fontSize: '0.8rem' }}
                      value={newExp.title}
                      onChange={(e) => setNewExp(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <input 
                      type="text" 
                      placeholder="Company (e.g. Google)" 
                      className="form-input" 
                      style={{ paddingLeft: '0.75rem', fontSize: '0.8rem' }}
                      value={newExp.company}
                      onChange={(e) => setNewExp(prev => ({ ...prev, company: e.target.value }))}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="date" 
                        title="Start Date"
                        className="form-input" 
                        style={{ paddingLeft: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                        value={newExp.startDate}
                        onChange={(e) => setNewExp(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                      <input 
                        type="date" 
                        title="End Date"
                        disabled={newExp.current}
                        className="form-input" 
                        style={{ paddingLeft: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                        value={newExp.endDate}
                        onChange={(e) => setNewExp(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                      <input 
                        type="checkbox" 
                        checked={newExp.current}
                        onChange={(e) => setNewExp(prev => ({ ...prev, current: e.target.checked, endDate: e.target.checked ? '' : prev.endDate }))}
                      />
                      Currently working here
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button 
                        type="button" 
                        onClick={() => setShowExpForm(false)} 
                        className="btn-logout" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="button" 
                        onClick={handleAddExperience} 
                        className="btn-primary" 
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.7rem', width: 'auto' }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {/* Experience List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {experience.length === 0 ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No experience added.</span>
                  ) : (
                    experience.map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.company}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveExperience(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-error)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Education Manager */}
              <div style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>
                    Education
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setShowEduForm(true); setShowExpForm(false); }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-accent-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    <PlusCircle size={14} /> Add
                  </button>
                </div>

                {/* Sub-form inline Education */}
                {showEduForm && (
                  <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <input 
                      type="text" 
                      placeholder="School/University" 
                      className="form-input" 
                      style={{ paddingLeft: '0.75rem', fontSize: '0.8rem' }}
                      value={newEdu.school}
                      onChange={(e) => setNewEdu(prev => ({ ...prev, school: e.target.value }))}
                    />
                    <input 
                      type="text" 
                      placeholder="Degree (e.g. Bachelor of Science)" 
                      className="form-input" 
                      style={{ paddingLeft: '0.75rem', fontSize: '0.8rem' }}
                      value={newEdu.degree}
                      onChange={(e) => setNewEdu(prev => ({ ...prev, degree: e.target.value }))}
                    />
                    <input 
                      type="text" 
                      placeholder="Field of Study (e.g. CS)" 
                      className="form-input" 
                      style={{ paddingLeft: '0.75rem', fontSize: '0.8rem' }}
                      value={newEdu.fieldOfStudy}
                      onChange={(e) => setNewEdu(prev => ({ ...prev, fieldOfStudy: e.target.value }))}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="date" 
                        title="Start Date"
                        className="form-input" 
                        style={{ paddingLeft: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                        value={newEdu.startDate}
                        onChange={(e) => setNewEdu(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                      <input 
                        type="date" 
                        title="End Date"
                        disabled={newEdu.current}
                        className="form-input" 
                        style={{ paddingLeft: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                        value={newEdu.endDate}
                        onChange={(e) => setNewEdu(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                      <input 
                        type="checkbox" 
                        checked={newEdu.current}
                        onChange={(e) => setNewEdu(prev => ({ ...prev, current: e.target.checked, endDate: e.target.checked ? '' : prev.endDate }))}
                      />
                      Currently studying here
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button 
                        type="button" 
                        onClick={() => setShowEduForm(false)} 
                        className="btn-logout" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="button" 
                        onClick={handleAddEducation} 
                        className="btn-primary" 
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.7rem', width: 'auto' }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {/* Education List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {education.length === 0 ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No education added.</span>
                  ) : (
                    education.map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.degree} in {item.fieldOfStudy}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.school}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEducation(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-error)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Form Actions */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '1.5rem'
          }}>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              style={{
                padding: '0.75rem 1.25rem',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving}
              style={{ width: 'auto', padding: '0.75rem 1.75rem' }}
            >
              {isSaving ? <Spinner /> : <Check size={16} />}
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      ) : (
        /* ─── PUBLIC / READ-ONLY VIEW MODE ─────────────────────────── */
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '2rem'
        }} className="md:grid-cols-3">
          
          {/* View Details Column 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Bio & Links Card */}
            <div style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                  About developer
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {user.bio || 'This developer has not written a bio yet.'}
                </p>
              </div>

              {/* Social Links */}
              {(user.profile?.githubUrl || user.profile?.linkedinUrl) && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>
                    Links
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {user.profile.githubUrl && (
                      <a 
                        href={user.profile.githubUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', textDecoration: 'none', transition: 'var(--transition-fast)' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                      >
                        <Link size={15} />
                        GitHub Profile
                      </a>
                    )}
                    {user.profile.linkedinUrl && (
                      <a 
                        href={user.profile.linkedinUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', textDecoration: 'none', transition: 'var(--transition-fast)' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                      >
                        <Link size={15} />
                        LinkedIn Profile
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Skills Tags */}
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>
                  Skills
                </h4>
                {user.profile?.skills && user.profile.skills.length > 0 ? (
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {user.profile.skills.map((skill, idx) => (
                      <span key={idx} style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.5rem',
                        borderRadius: 6,
                        background: 'rgba(139, 92, 246, 0.08)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        color: 'var(--color-accent-light)'
                      }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No skills listed.</span>
                )}
              </div>
            </div>
          </div>

          {/* Timelines Column 2 & 3 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="md:col-span-2">
            
            {/* Work Experience Timeline */}
            <div style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={18} color="var(--color-accent-light)" />
                Work Experience
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', borderLeft: '2px solid var(--color-border)', paddingLeft: '1.5rem', marginLeft: '0.5rem' }}>
                {experience.length === 0 ? (
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>No experience details added yet.</span>
                ) : (
                  experience.map((item, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      {/* Timeline dot */}
                      <span style={{
                        position: 'absolute',
                        left: '-31px',
                        top: '4px',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: 'var(--color-accent)',
                        border: '2px solid #0a0b0f',
                        boxShadow: '0 0 8px var(--color-accent)'
                      }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.25rem' }}>
                        <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>
                          {item.title}
                        </h4>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                          {formatDate(item.startDate)} — {item.current ? 'Present' : formatDate(item.endDate)}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-accent-light)' }}>
                        {item.company} {item.location && <span style={{ color: 'var(--color-text-muted)', fontWeight: 'normal' }}>({item.location})</span>}
                      </p>
                      {item.description && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem', lineHeight: 1.4 }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Education Timeline */}
            <div style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GraduationCap size={18} color="var(--color-accent-light)" />
                Education
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', borderLeft: '2px solid var(--color-border)', paddingLeft: '1.5rem', marginLeft: '0.5rem' }}>
                {education.length === 0 ? (
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>No education details added yet.</span>
                ) : (
                  education.map((item, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      {/* Timeline dot */}
                      <span style={{
                        position: 'absolute',
                        left: '-31px',
                        top: '4px',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: 'var(--color-success)',
                        border: '2px solid #0a0b0f',
                        boxShadow: '0 0 8px var(--color-success)'
                      }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.25rem' }}>
                        <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>
                          {item.degree} in {item.fieldOfStudy}
                        </h4>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                          {formatDate(item.startDate)} — {item.current ? 'Present' : formatDate(item.endDate)}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-success)' }}>
                        {item.school}
                      </p>
                      {item.description && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem', lineHeight: 1.4 }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* GitHub Integration panel */}
      {!isEditing && (
        <div style={{ marginTop: '2rem' }}>
          <GithubIntegration currentUser={user} onUserUpdate={setUser} />
        </div>
      )}
    </div>
  );
};

export default Profile;

import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { buildProfileImageUrl, getInitials } from '../utils/profileImage';
import { fetchCurriculumsCached } from '../utils/curriculumsCache';
import StudentLayout from '../components/student/StudentLayout';
import AdminLayout from '../components/admin/AdminLayout';
import AdviserLayout from '../components/adviser/AdviserLayout';
import ProfileEditForm from '../components/student/ProfileEditForm';
import ProfileViewCard from '../components/student/ProfileViewCard';
import ChangePasswordCard from '../components/student/ChangePasswordCard';
import './Profile.css';

const semesterLabels = { 1: '1st Semester', 2: '2nd Semester', 3: 'Summer' };

const Profile = () => {
  const { user, login } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [completionScore, setCompletionScore] = useState(0);
  const [curricula, setCurricula] = useState([]);
  const [removeProfilePicture, setRemoveProfilePicture] = useState(false);
  const [isProfileLockedForCurrentTerm, setIsProfileLockedForCurrentTerm] = useState(false);
  const [currentProfileTermLabel, setCurrentProfileTermLabel] = useState('current term');
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    preferred_name: '',
    student_id: '',
    program: '',
    curriculum_id: '',
    student_type: '',
    year_level: '',
    contact_number: '',
    alternate_email: '',
    sex: '',
    citizenship: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_number: '',
    profile_picture: null,
  });

  // Derived display values
  const firstName = profile?.first_name || user?.first_name || user?.firstName || '';
  const lastName = profile?.last_name || user?.last_name || user?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Student';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'ST';
  const studentId = profile?.studentId || user?.studentId || user?.student_id || '';
  const email = profile?.email || user?.email || '';
  const contactNumber = profile?.contact_number || user?.contact_number || '';
  const sex = profile?.sex || profile?.gender || user?.gender || '';
  const citizenship = profile?.citizenship || '';
  const address = profile?.address || '';
  const alternateEmail = profile?.alternate_email || '';
  const emergencyContactName = profile?.emergency_contact_name || '';
  const emergencyContactRelationship = profile?.emergency_contact_relationship || '';
  const emergencyContactNumber = profile?.emergency_contact_number || '';
  const suffix = profile?.suffix || '';
  const preferredName = profile?.preferred_name || '';

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const [profileRes, currentTermRes] = await Promise.all([
          api.get(`/users/${user.id}`),
          api.get('/terms/current').catch(() => ({ data: { data: null } })),
        ]);

        let curriculaList = [];
        try {
          if (user?.role === 'student') {
            const optRes = await api.get('/users/curriculum-options');
            curriculaList = optRes?.data?.items || [];
          } else {
            const cached = await fetchCurriculumsCached({
              page: 1,
              pageSize: 200,
              sortBy: 'name',
              sortOrder: 'asc',
            });
            curriculaList = cached?.items || cached?.data || cached?.curriculums || [];
          }
        } catch {
          curriculaList = [];
        }
        setCurricula(curriculaList);

        const p = profileRes.data.user || {};
        const currentTerm = currentTermRes?.data?.data || null;
        const currentTermKey = currentTerm
          ? `${currentTerm.schoolYear}-S${currentTerm.semester}`
          : 'NO_ACTIVE_TERM';
        const lastSubmittedTermKey =
          p.lastSubmittedProfileTermKey || p.profile_last_submitted_term_key || null;
        const lockFromServer = Boolean(p.isProfileLockedForCurrentTerm);
        const lockFromFallback = Boolean(
          user?.role === 'student' &&
          lastSubmittedTermKey &&
          lastSubmittedTermKey === currentTermKey,
        );
        setIsProfileLockedForCurrentTerm(lockFromServer || lockFromFallback);
        if (currentTerm) {
          setCurrentProfileTermLabel(
            `${currentTerm.schoolYear} — ${semesterLabels[currentTerm.semester] || `Semester ${currentTerm.semester}`}`,
          );
        }

        setProfile(p);
        setCompletionScore(p.profileCompletionScore ?? 0);
        setFormData({
          first_name: p.first_name || '',
          middle_name: p.middle_name || '',
          last_name: p.last_name || '',
          suffix: p.suffix || '',
          preferred_name: p.preferred_name || '',
          student_id: p.studentId || '',
          program: p.program || '',
          curriculum_id:
            p.curriculum_id !== null && p.curriculum_id !== undefined
              ? String(p.curriculum_id)
              : '',
          student_type: p.student_type || '',
          year_level:
            p.current_year_level !== null && p.current_year_level !== undefined
              ? String(p.current_year_level)
              : p.year_level || '',
          contact_number: p.contact_number || '',
          alternate_email: p.alternate_email || '',
          sex: p.sex || p.gender || '',
          citizenship: p.citizenship || '',
          address: p.address || '',
          emergency_contact_name: p.emergency_contact_name || '',
          emergency_contact_relationship: p.emergency_contact_relationship || '',
          emergency_contact_number: p.emergency_contact_number || '',
          profile_picture: null,
        });
        setPreview(buildProfileImageUrl(p.profile_picture));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchProfile();
  }, [user?.id, user?.role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name])
      setFieldErrors((prev) => {
        const u = { ...prev };
        delete u[name];
        return u;
      });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, profile_picture: file }));
    if (file) {
      setPreview(URL.createObjectURL(file));
      setRemoveProfilePicture(false);
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, profile_picture: null }));
    setPreview('');
    setRemoveProfilePicture(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hasPictureChange = Boolean(formData.profile_picture) || removeProfilePicture;
    if (user?.role === 'student' && isProfileLockedForCurrentTerm && !hasPictureChange) {
      setError(
        `Profile details are locked for ${currentProfileTermLabel}. You can still update your profile picture.`,
      );
      return;
    }
    setSaving(true);
    setError('');
    setFieldErrors({});
    setSuccess('');
    try {
      const payload = new FormData();
      if (!(user?.role === 'student' && isProfileLockedForCurrentTerm)) {
        payload.append('first_name', formData.first_name);
        payload.append('middle_name', formData.middle_name);
        payload.append('last_name', formData.last_name);
        payload.append('suffix', formData.suffix);
        payload.append('preferred_name', formData.preferred_name);
        payload.append('program', formData.program);
        payload.append('year_level', formData.year_level);
        payload.append('curriculum_id', formData.curriculum_id);
        payload.append('student_type', formData.student_type);
        payload.append('contact_number', formData.contact_number);
        payload.append('alternate_email', formData.alternate_email);
        payload.append('sex', formData.sex);
        payload.append('citizenship', formData.citizenship);
        payload.append('address', formData.address);
        payload.append('emergency_contact_name', formData.emergency_contact_name);
        payload.append('emergency_contact_relationship', formData.emergency_contact_relationship);
        payload.append('emergency_contact_number', formData.emergency_contact_number);
      }
      if (formData.profile_picture) payload.append('profile_picture', formData.profile_picture);
      payload.append('remove_profile_picture', removeProfilePicture ? 'true' : 'false');

      const response = await api.put(`/users/${user.id}/profile`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setCompletionScore(response.data.user?.profileCompletionScore ?? completionScore);
      setPreview(buildProfileImageUrl(response.data.user?.profile_picture));
      setRemoveProfilePicture(false);

      const freshToken = response.data.token;
      if (freshToken) {
        localStorage.setItem('token', freshToken);
        await login(freshToken);
      }

      const refreshed = await api.get(`/users/${user.id}`);
      const p = refreshed.data.user || {};
      setProfile(p);
      setSuccess('Profile updated successfully');
      setEditMode(false);
      window.location.reload();
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        setFieldErrors(data.errors);
        setError(data.message || 'Validation failed. Please correct the highlighted fields.');
      } else {
        setError(data?.message || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordFieldChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      const response = await api.put('/auth/change-password', {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      });
      if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
        await login(response.data.token);
      }
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess('Password changed successfully.');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const Layout =
    user?.role === 'admin' ? AdminLayout : user?.role === 'adviser' ? AdviserLayout : StudentLayout;

  const layoutProps =
    user?.role === 'admin' || user?.role === 'adviser'
      ? { activePage: 'profile', pageTitle: 'Profile' }
      : { activePage: 'profile', pageTitle: 'Profile', avatarOverride: preview || undefined };

  return (
    <Layout {...layoutProps}>
      <div className="profile-wrapper" style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Profile Completion Score */}
        {!loading && completionScore > 0 && (
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              padding: '18px 24px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#333' }}>
                Profile Completion
              </span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  color:
                    completionScore >= 80
                      ? '#2e7d32'
                      : completionScore >= 50
                        ? '#e65100'
                        : '#c62828',
                }}
              >
                {completionScore}%
              </span>
            </div>
            <div style={{ width: '100%', height: 8, background: '#eee', borderRadius: 999 }}>
              <div
                style={{
                  width: `${completionScore}%`,
                  height: '100%',
                  borderRadius: 999,
                  background:
                    completionScore >= 80
                      ? '#43a047'
                      : completionScore >= 50
                        ? '#fb8c00'
                        : '#e53935',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            {completionScore < 100 && (
              <p style={{ fontSize: '0.78rem', color: '#888', margin: '6px 0 0' }}>
                Complete all required fields (marked with *) to reach 100%.
              </p>
            )}
          </div>
        )}
        {/* Page title */}
        <h2
          style={{
            fontSize: '1.9rem',
            fontWeight: 900,
            color: '#111',
            marginBottom: 4,
            marginTop: 0,
          }}
        >
          My Profile
        </h2>
        <p
          style={{
            color: '#555',
            fontSize: '1rem',
            marginBottom: 28,
            fontWeight: 700,
          }}
        >
          View and manage your personal information
        </p>

        {error && (
          <div
            style={{
              background: '#fff3f3',
              color: '#c62828',
              border: '1px solid #e57373',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              background: '#f0fff4',
              color: '#2e7d32',
              border: '1px solid #81c784',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
            }}
          >
            {success}
          </div>
        )}

        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: '#888',
            }}
          >
            Loading profile...
          </div>
        ) : editMode ? (
          <ProfileEditForm
            user={user}
            formData={formData}
            fieldErrors={fieldErrors}
            curricula={curricula}
            saving={saving}
            email={email}
            preview={preview}
            isProfileLockedForCurrentTerm={isProfileLockedForCurrentTerm}
            currentProfileTermLabel={currentProfileTermLabel}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
            handleFileChange={handleFileChange}
            handleRemovePhoto={handleRemovePhoto}
            setEditMode={setEditMode}
            setError={setError}
            setSuccess={setSuccess}
            getInitials={getInitials}
          />
        ) : (
          <ProfileViewCard
            preview={preview}
            initials={initials}
            fullName={fullName}
            suffix={suffix}
            studentId={studentId}
            email={email}
            alternateEmail={alternateEmail}
            contactNumber={contactNumber}
            sex={sex}
            citizenship={citizenship}
            preferredName={preferredName}
            address={address}
            emergencyContactName={emergencyContactName}
            emergencyContactRelationship={emergencyContactRelationship}
            emergencyContactNumber={emergencyContactNumber}
            setEditMode={setEditMode}
          />
        )}

        <ChangePasswordCard
          passwordData={passwordData}
          passwordError={passwordError}
          passwordSuccess={passwordSuccess}
          passwordSaving={passwordSaving}
          handlePasswordFieldChange={handlePasswordFieldChange}
          handlePasswordSubmit={handlePasswordSubmit}
        />
      </div>
    </Layout>
  );
};

export default Profile;

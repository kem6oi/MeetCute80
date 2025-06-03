import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaEnvelope, FaCalendar, FaVenusMars } from 'react-icons/fa';
import api from '../utils/api';

const Profile = () => {
  const [uploading, setUploading] = useState(false);

  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('profilePicture', file);

      console.log('Making request to:', `${import.meta.env.VITE_API_URL}/api/profile/picture`);
      console.log('FormData contents:', file.name, file.type, file.size);
      console.log('Token:', localStorage.getItem('token'));
      console.log('Headers:', {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      });

      const response = await api.post('/api/profile/picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update profile with new picture
      setProfile(prev => ({ ...prev, profile_picture: response.data.profilePicture }));
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setError('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/user/profile');
      setProfile(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="h-48 bg-gradient-to-r from-purple-500 to-purple-700"></div>
          <div className="px-6 pb-6">
            <div className="flex justify-center">
              <div className="-mt-24 relative group">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden">
                  {profile?.profile_picture ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL}${profile.profile_picture}`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-4xl font-bold">
                      {profile?.first_name?.charAt(0)}
                    </div>
                  )}
                </div>
                <label className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <div className="text-white text-sm animate-pulse">Uploading...</div>
                  ) : (
                    <div className="text-white text-sm">Change Photo</div>
                  )}
                </label>
              </div>
            </div>
            <div className="text-center mt-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {profile?.first_name} {profile?.last_name}
              </h1>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Profile Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <FaUser className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                <p className="text-gray-900">{profile?.first_name} {profile?.last_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <FaEnvelope className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                <p className="text-gray-900">{currentUser?.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <FaCalendar className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Date of Birth</h3>
                <p className="text-gray-900">{new Date(profile?.dob).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <FaVenusMars className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Gender</h3>
                <p className="text-gray-900">{profile?.gender}</p>
              </div>
            </div>
            {profile?.bio && (
              <div className="border-t pt-6 mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">About Me</h3>
                <p className="text-gray-900 whitespace-pre-line">{profile.bio}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { changePassword, updateProfile } from '../services/auth';
import toast from 'react-hot-toast';

const Settings = () => {
  const { admin, refreshProfile } = useAuth();

  // Profile update
  const [name, setName] = useState(admin?.name || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }

    setUpdatingProfile(true);
    try {
      await updateProfile(name.trim());
      await refreshProfile();
      toast.success('Admin profile updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Current password is required.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#0F2747] tracking-tight">System Settings & Security</h1>
        <p className="text-xs text-[#667085] mt-0.5">
          Manage administrator credentials, profile configuration, and review system runtime parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Administrator Profile */}
        <div className="bg-white border border-[#D9DEE7] rounded-md p-5">
          <div className="pb-3 mb-4 border-b border-[#D9DEE7]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
              Administrator Profile
            </h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#1F2937] mb-1">
                Username (System ID)
              </label>
              <input
                type="text"
                disabled
                value={admin?.username || 'admin'}
                className="w-full px-3 py-1.5 text-xs bg-[#F5F7FA] border border-[#D9DEE7] rounded text-[#667085] font-mono cursor-not-allowed"
              />
              <span className="text-[11px] text-[#667085] mt-1 block">Institutional login username cannot be altered.</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1F2937] mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Administrator Name"
                className="w-full px-3 py-1.5 text-xs border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={updatingProfile}
                className="px-4 py-2 bg-[#0F2747] hover:bg-[#1a3860] text-white text-xs font-medium rounded transition disabled:opacity-50"
              >
                {updatingProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white border border-[#D9DEE7] rounded-md p-5">
          <div className="pb-3 mb-4 border-b border-[#D9DEE7]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
              Security & Authentication
            </h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#1F2937] mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-1.5 text-xs border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1F2937] mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3 py-1.5 text-xs border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1F2937] mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-1.5 text-xs border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={changingPassword}
                className="px-4 py-2 bg-[#0F2747] hover:bg-[#1a3860] text-white text-xs font-medium rounded transition disabled:opacity-50"
              >
                {changingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* System Technical Specifications */}
      <div className="bg-white border border-[#D9DEE7] rounded-md p-5">
        <div className="pb-3 mb-4 border-b border-[#D9DEE7]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
            Deployment & System Specifications
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-[#F5F7FA] border border-[#D9DEE7] rounded">
            <span className="text-[10px] uppercase font-semibold text-[#667085] tracking-wider block">Frontend Architecture</span>
            <p className="font-semibold text-[#1F2937] mt-1">React 19 + Tailwind CSS</p>
            <p className="text-[11px] text-[#667085] mt-0.5">Vite SPA with Institutional Design System</p>
          </div>

          <div className="p-3 bg-[#F5F7FA] border border-[#D9DEE7] rounded">
            <span className="text-[10px] uppercase font-semibold text-[#667085] tracking-wider block">Backend Engine</span>
            <p className="font-semibold text-[#1F2937] mt-1">FastAPI (Python 3.12)</p>
            <p className="text-[11px] text-[#667085] mt-0.5">JWT Auth & SlowAPI Rate Limiting</p>
          </div>

          <div className="p-3 bg-[#F5F7FA] border border-[#D9DEE7] rounded">
            <span className="text-[10px] uppercase font-semibold text-[#667085] tracking-wider block">Database & State</span>
            <p className="font-semibold text-[#1F2937] mt-1">MongoDB 8 (Motor Async)</p>
            <p className="text-[11px] text-[#667085] mt-0.5">7 Collections with Audit Logging</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

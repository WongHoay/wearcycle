"use client";

import React, { useState } from "react";
import { User } from "../types/user";

interface EditProfileViewProps {
  user: User;
  onSave: (user: Partial<User>) => void;
  onBack: () => void;
}

const EditProfileView: React.FC<EditProfileViewProps> = ({ user, onSave, onBack }) => {
  const [formData, setFormData] = useState({
    username: user.username, // username is display name, taken from register
    region: user.region,
    bio: user.bio || '',
    profilePhotoUrl: user.profilePhotoUrl || ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    if (!formData.username.trim()) {
      newErrors.username = 'Display name is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Display name must be at least 3 characters';
    }
    if (!formData.region) {
      newErrors.region = 'Please select a region';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fix: handle photo upload from file input
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          profilePhotoUrl: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!validateForm()) return;
    setIsSaving(true);
    setTimeout(() => {
      onSave(formData);
      setIsSaving(false);
    }, 1000);
  };

  const regionOptions = [
    { value: 'Kuala Lumpur', label: 'Kuala Lumpur' },
    { value: 'Selangor', label: 'Selangor' },
    { value: 'Penang', label: 'Penang' },
    { value: 'Johor', label: 'Johor' },
    { value: 'Perak', label: 'Perak' },
    { value: 'Sabah', label: 'Sabah' },
    { value: 'Sarawak', label: 'Sarawak' },
    { value: 'Central', label: 'Central' },
    { value: 'East', label: 'East' },
    { value: 'North', label: 'North' },
    { value: 'South', label: 'South' },
    { value: 'West', label: 'West' }
  ];

  const styles = {
    editProfileView: { background: "#fff", minHeight: "100vh" },
    container: { maxWidth: 700, margin: "0 auto", padding: 32 },
    editProfileContainer: { background: "#f9f9f9", borderRadius: 12, padding: 32, boxShadow: "0 2px 8px #eee" },
    editHeader: { display: "flex", alignItems: "center", marginBottom: 24 },
    backButton: { marginRight: 16, background: "none", border: "none", color: "#222", fontSize: 18, cursor: "pointer" },
    editTitle: { fontSize: 24, fontWeight: "bold" },
    generalError: { color: "red", marginBottom: 16 },
    formSection: { marginBottom: 32 },
    sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
    photoUploadSection: { display: "flex", alignItems: "center", gap: 24 },
    currentPhoto: {},
    photoImage: { width: 120, height: 90, borderRadius: "50%", objectFit: "cover" as const, border: "2px solid #ddd", display: "block" },
    photoPlaceholder: { width: 120, height: 120, borderRadius: "50%", background: "#eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 },
    photoInfo: {},
    photoInfoText: { fontSize: 14, color: "#555", marginBottom: 8 },
    uploadButton: { background: "#fff", color: "#222", border: "1px solid #222", borderRadius: 6, padding: "8px 18px", fontWeight: 500, fontSize: 16, cursor: "pointer", marginTop: 8 },
    visibilityNotice: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#888", marginBottom: 16 },
    formGroup: { marginBottom: 20 },
    formLabel: { fontWeight: "bold", marginBottom: 6, display: "block" },
    formInput: { width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc", background: "#fff", fontSize: 15 },
    formInputError: { border: "1px solid red" },
    formSelect: { width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc", background: "#fff", fontSize: 15 },
    formTextarea: { width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc", background: "#fff", fontSize: 15 },
    errorMessage: { color: "red", fontSize: 13, marginTop: 4 },
    profileUrl: { fontSize: 13, color: "#888", marginTop: 4 },
    characterCount: { fontSize: 12, color: "#888", textAlign: "right" as const },
    formActions: { marginTop: 24, display: "flex", justifyContent: "flex-end" },
    saveButton: { background: "#222", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 500, fontSize: 16, cursor: "pointer" }
  };

  return (
    <div style={styles.editProfileView}>
      <div style={styles.container}>
        <div style={styles.editProfileContainer}>
          <div style={styles.editHeader}>
            <button style={styles.backButton} onClick={onBack}>
              ← Back
            </button>
            <h1 style={styles.editTitle}>Edit profile</h1>
          </div>
          {errors.general && (
            <div style={styles.generalError}>
              {errors.general}
            </div>
          )}
          {/* Profile Photo Section */}
          <div style={styles.formSection}>
            <h2 style={styles.sectionTitle}>Profile photo</h2>
            <div style={styles.photoUploadSection}>
              <div style={styles.currentPhoto}>
                {formData.profilePhotoUrl ? (
                  <img src={formData.profilePhotoUrl} alt="Profile" style={styles.photoImage as React.CSSProperties} />
                ) : (
                  <div style={styles.photoPlaceholder}>
                    🎃
                  </div>
                )}
              </div>
              <div style={styles.photoInfo}>
                <p style={styles.photoInfoText}>Clear frontal face photos are an important way for buyers and sellers to learn about each other.</p>
                <label style={styles.uploadButton}>
                  Upload a photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>
          </div>
          {/* Account Details Section */}
          <div style={styles.formSection}>
            {/* <h2 style={styles.sectionTitle}>Account details</h2>
            <div style={styles.visibilityNotice}>
              <span>👁️</span>
              <span>This info appears on your public profile</span>
            </div> */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Display name*
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                style={{...styles.formInput, ...(errors.username ? styles.formInputError : {})}}
                placeholder="Enter your display name"
              />
              {errors.username && (
                <div style={styles.errorMessage}>{errors.username}</div>
              )}
              {/* <div style={styles.profileUrl}>
                Your public SecondStyle Profile: https://secondstyle.com/u/{formData.username}
              </div> */}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Region*
              </label>
              <select
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                style={{...styles.formSelect, ...(errors.region ? styles.formInputError : {})}}
              >
                <option value="">Select region</option>
                {regionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.region && (
                <div style={styles.errorMessage}>{errors.region}</div>
              )}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                style={styles.formTextarea}
                placeholder="Tell buyers about yourself..."
                rows={3}
                maxLength={200}
              />
              <div style={styles.characterCount}>
                {formData.bio.length}/200 characters
              </div>
            </div>
            <div style={styles.formActions}>
              <button
                type="button"
                style={styles.saveButton}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfileView;
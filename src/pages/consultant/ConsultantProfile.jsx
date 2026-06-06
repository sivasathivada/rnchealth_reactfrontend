import React, { useState, useEffect } from 'react';
import { consultantsAPI } from '../../services/api';
import './ConsultantProfile.css';
import { User, Mail, Camera, FileText, Briefcase, Award, Building, DollarSign, Clock, MessageSquare, Globe, Plus, X } from 'lucide-react';

const DynamicListInput = ({ items, setItems, placeholder }) => {
  const [val, setVal] = useState('');
  const handleAdd = (e) => {
    e.preventDefault();
    if(val.trim()){
      setItems([...items, val.trim()]);
      setVal('');
    }
  };
  const handleRemove = (idx, e) => {
    e.preventDefault();
    setItems(items.filter((_, i) => i !== idx));
  };
  return (
    <div className="dynamic-list-container">
      <div className="dynamic-input-row">
        <input 
          type="text" 
          value={val} 
          onChange={(e)=>setVal(e.target.value)} 
          placeholder={placeholder} 
          onKeyDown={(e) => { if(e.key === 'Enter') handleAdd(e); }}
        />
        <button type="button" className="btn-add-item" onClick={handleAdd}><Plus size={16} /> Add</button>
      </div>
      {items.length > 0 && (
        <ul className="dynamic-tags">
          {items.map((it, i) => (
            <li key={i} className="dynamic-tag">{it} 
              <button type="button" onClick={(e)=>handleRemove(i, e)}><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ConsultantProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [specialities, setSpecialities] = useState([]);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchProfile();
    fetchSpecialities();
  }, []);

  const fetchSpecialities = async () => {
    try {
      const { data } = await consultantsAPI.specialities();
      setSpecialities(data);
    } catch (err) {
      console.error('Failed to load specialities', err);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await consultantsAPI.myProfile();
      const pData = data.results ? data.results[0] : data;
      setProfile(pData);
      
      setFormData({
        bio: pData.bio || '',
        years_of_experience: pData.years_of_experience || 0,
        license_number: pData.license_number || '',
        medical_degree: pData.medical_degree || '',
        board_certifications: pData.board_certifications || [],
        additional_qualifications: pData.additional_qualifications || [],
        speciality_id: pData.speciality?.id || '',
        phone_number: pData.phone_number || '',
        clinic_name: pData.clinic_name || '',
        clinic_address: pData.clinic_address || '',
        clinic_city: pData.clinic_city || '',
        clinic_country: pData.clinic_country || '',
        consultation_fee: pData.consultation_fee || 0.00,
        consultation_duration: pData.consultation_duration || 30,
        consultation_types: pData.consultation_types || 'all',
        languages_spoken: pData.languages_spoken || [],
      });
    } catch (err) {
      console.error('Failed to load profile', err);
      setProfile({ user: { first_name: "Doctor", last_name: "Demo", email: "doc@test.com" } });
      // Initialize with empty defaults so DynamicListInput never gets undefined
      setFormData({
        bio: '',
        years_of_experience: 0,
        license_number: '',
        medical_degree: '',
        board_certifications: [],
        additional_qualifications: [],
        speciality_id: '',
        phone_number: '',
        clinic_name: '',
        clinic_address: '',
        clinic_city: '',
        clinic_country: '',
        consultation_fee: 0.00,
        consultation_duration: 30,
        consultation_types: 'all',
        languages_spoken: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    // Create clean payload with all form data
    const payload = { ...formData };
    
    // Convert speciality_id to integer if present and valid
    if (payload.speciality_id) {
      payload.speciality_id = parseInt(payload.speciality_id);
    }
    
    // Keep empty arrays for proper schema updates (don't filter them out)
    Object.keys(payload).forEach(key => {
      if (Array.isArray(payload[key]) && payload[key].length === 0) {
        payload[key] = [];
      }
    });

    try {
      console.log('Sending updated profile data:', payload);
      await consultantsAPI.updateProfile(payload);
      setEditing(false);
      fetchProfile();
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Update failed', err);
      const errMsg = err.response?.data ? JSON.stringify(err.response.data) : 'Unknown error';
      alert(`Failed to update consultant profile. Reason: ${errMsg}\n\nMake sure all required fields are filled and specialty is selected.`);
    }
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type on frontend
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB.');
      return;
    }

    try {
      const form = new FormData();
      form.append('avatar', file);
      const { data } = await consultantsAPI.updateAvatar(form);
      // Immediately update avatar_url in state from the response
      if (data.avatar_url) {
        setProfile(prev => ({ ...prev, avatar_url: data.avatar_url }));
      }
      // Re-fetch full profile in the background to sync all data
      fetchProfile();
    } catch (err) {
      console.error('Avatar update failed', err);
      const errMsg = err.response?.data?.error || 'Failed to update avatar.';
      alert(errMsg);
    }
  };

  if (loading) return <div className="loader">Loading Profile Details...</div>;
  if (!profile) return <div className="error">Profile not found.</div>;

  return (
    <div className="consultant-profile-container">
      <div className="profile-hero">
        <div className="avatar-wrapper">
          <div className="avatar-large">
             {profile.avatar_url ? (
               <img src={profile.avatar_url} alt="Profile" style={{width: '100%', height:'100%', borderRadius: '50%', objectFit: 'cover'}} />
             ) : (
               profile.user?.first_name?.charAt(0) || <User size={48} />
             )}
          </div>
          <label className="avatar-upload-btn">
            <Camera size={16} />
            <input type="file" accept="image/*" onChange={handleAvatarSelect} hidden />
          </label>
        </div>
        <div className="hero-info">
          <h2>Dr. {profile.user?.first_name} {profile.user?.last_name}</h2>
          <p className="hero-email"><Mail size={16} /> {profile.user?.email}</p>
          <div className="status-tags mt-2">
            {profile.is_verified && <span className="tag-verified">Verified</span>}
            <span className={profile.is_available ? "tag-available" : "tag-unavailable"}>
              {profile.is_available ? 'Available' : 'Unavailable'}
            </span>
          </div>
        </div>
        <button className="btn-edit" onClick={() => setEditing(!editing)}>
          {editing ? 'Cancel Editing' : 'Update Profile Schema'}
        </button>
      </div>

      <div className="profile-details-card">
        {editing ? (
          <form onSubmit={handleUpdate} className="schema-accurate-form">
            
            {/* Professional Background */}
            <div className="form-section">
              <h3><Award size={18} /> Credentials & Bio</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>License Number</label>
                  <input type="text" value={formData.license_number} onChange={(e) => setFormData({...formData, license_number: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Medical Degree</label>
                  <input type="text" value={formData.medical_degree} onChange={(e) => setFormData({...formData, medical_degree: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Years of Experience</label>
                  <input type="number" value={formData.years_of_experience} onChange={(e) => setFormData({...formData, years_of_experience: e.target.value})} />
                </div>
                <div className="form-group full-width">
                  <label>Bio (Max 100 chars)</label>
                  <textarea rows="2" maxLength="100" value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} />
                </div>
                <div className="form-group full-width">
                  <label>Board Certifications (JSON Array)</label>
                  <DynamicListInput items={formData.board_certifications} setItems={(arr) => setFormData({...formData, board_certifications: arr})} placeholder="e.g. ABIM Certified" />
                </div>
                <div className="form-group full-width">
                  <label>Additional Qualifications</label>
                  <DynamicListInput items={formData.additional_qualifications} setItems={(arr) => setFormData({...formData, additional_qualifications: arr})} placeholder="e.g. Fellowship in Cardiology" />
                </div>
                <div className="form-group">
                  <label>Medical Specialty</label>
                  <select value={formData.speciality_id} onChange={(e) => setFormData({...formData, speciality_id: e.target.value})}>
                    <option value="">-- Select Specialty --</option>
                    {specialities.map(spec => (
                      <option key={spec.id} value={spec.id}>{spec.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Clinic and Contact Details */}
            <div className="form-section">
              <h3><Building size={18} /> Clinic & Contact</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Phone (+1..)</label>
                  <input type="text" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Clinic Name</label>
                  <input type="text" value={formData.clinic_name} onChange={(e) => setFormData({...formData, clinic_name: e.target.value})} />
                </div>
                <div className="form-group full-width">
                  <label>Clinic Address</label>
                  <textarea rows="2" value={formData.clinic_address} onChange={(e) => setFormData({...formData, clinic_address: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Clinic City</label>
                  <input type="text" value={formData.clinic_city} onChange={(e) => setFormData({...formData, clinic_city: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Clinic Country</label>
                  <input type="text" value={formData.clinic_country} onChange={(e) => setFormData({...formData, clinic_country: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Consultation Preferences */}
            <div className="form-section">
              <h3><MessageSquare size={18} /> Consultation Options</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Base Fee (e.g. 50.00)</label>
                  <input type="number" step="0.01" value={formData.consultation_fee} onChange={(e) => setFormData({...formData, consultation_fee: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Default Duration (Minutes)</label>
                  <input type="number" value={formData.consultation_duration} onChange={(e) => setFormData({...formData, consultation_duration: parseInt(e.target.value) || 30})} />
                </div>
                <div className="form-group">
                  <label>Consultation Types Accepted</label>
                  <select value={formData.consultation_types} onChange={(e) => setFormData({...formData, consultation_types: e.target.value})}>
                    <option value="video">Video Call</option>
                    <option value="audio">Audio Only</option>
                    <option value="chat">Text Chat</option>
                    <option value="all">All Types</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Languages Spoken</label>
                  <DynamicListInput items={formData.languages_spoken} setItems={(arr) => setFormData({...formData, languages_spoken: arr})} placeholder="e.g. English, Spanish" />
                </div>
              </div>
            </div>

            <button type="submit" className="btn-save schema-save">Save Updated Schema</button>
          </form>
        ) : (
          <div className="details-grid">
            <div className="detail-item full-width">
              <div className="detail-icon"><FileText size={20} /></div>
              <div className="detail-content">
                <span>Biography</span>
                <p>{profile.bio || "No biography provided."}</p>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon"><Briefcase size={20} /></div>
              <div className="detail-content">
                <span>Experience / License</span>
                <p>
                  <strong>XP:</strong> {profile.years_of_experience} years <br />
                  <strong>License:</strong> {profile.license_number || 'Pending'}
                </p>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon"><Award size={20} /></div>
              <div className="detail-content">
                <span>Education / Certs / Specialty</span>
                <p>
                  <strong>Degree:</strong> {profile.medical_degree || "N/A"} <br/>
                  <strong>Specialty:</strong> {profile.speciality?.name || "Not specified"} <br/>
                  <strong>Certs:</strong> {profile.board_certifications?.length ? profile.board_certifications.join(', ') : "None"}
                </p>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon"><Building size={20} /></div>
              <div className="detail-content">
                <span>Clinic / Operating Base</span>
                <p>
                  <strong>{profile.clinic_name || 'Independent'}</strong><br/>
                  {profile.clinic_address ? `${profile.clinic_city}, ${profile.clinic_country}` : 'No address specified'}
                </p>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon"><DollarSign size={20} /></div>
              <div className="detail-content">
                <span>Rates & Duration</span>
                <p>
                  <strong>Fee:</strong> ${profile.consultation_fee} <br/>
                  <strong>Duration:</strong> {profile.consultation_duration} mins
                </p>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon"><Globe size={20} /></div>
              <div className="detail-content">
                <span>Languages</span>
                <p>
                  {profile.languages_spoken?.length ? profile.languages_spoken.join(', ') : "English (Default)"}
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultantProfile;

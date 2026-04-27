import React, { useState, useEffect } from 'react';
import { patientsAPI } from '../../services/api';
import './PatientProfile.css';
import { User, Mail, Calendar, Phone, MapPin, Activity, ShieldAlert, FileText, Globe, Plus, X } from 'lucide-react';

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
            <li key={i} className="dynamic-tag">
              {it} 
              <button type="button" onClick={(e)=>handleRemove(i, e)}><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const PatientProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await patientsAPI.me();
      console.log('Patient Profile:', data);
      
      const pData = data.results ? data.results[0] : data; // Handle pagination if API throws list
      setProfile(pData);
      
      // Initialize form with backend data matching exact schema
      setFormData({
        bio: pData.bio || '',
        date_of_birth: pData.date_of_birth ? pData.date_of_birth.split('T')[0] : '', // Format datetime to date picker
        gender: pData.gender || '',
        phone_number: pData.phone_number || '',
        address: pData.address || '',
        city: pData.city || '',
        country: pData.country || '',
        postal_code: pData.postal_code || '',
        emergency_contact_name: pData.emergency_contact_name || '',
        emergency_contact_phone: pData.emergency_contact_phone || '',
        emergency_contact_relationship: pData.emergency_contact_relationship || '',
        blood_type: pData.blood_type || '',
        allergies: pData.allergies || [],
        chronic_conditions: pData.chronic_conditions || [],
        current_medications: pData.current_medications || [],
        medical_notes: pData.medical_notes || '',
        share_medical_history: pData.share_medical_history ?? true,
        allow_emergency_access: pData.allow_emergency_access ?? true,
        preferred_language: pData.preferred_language || 'en'
      });
    } catch (err) {
      console.error('Failed to fetch profile', err);
      setProfile({ user: { first_name: "Patient", email: "error@fetching.com" }});
      // Initialize with safe empty defaults so DynamicListInput never crashes on undefined
      setFormData({
        bio: '',
        date_of_birth: '',
        gender: '',
        phone_number: '',
        address: '',
        city: '',
        country: '',
        postal_code: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: '',
        blood_type: '',
        allergies: [],
        chronic_conditions: [],
        current_medications: [],
        medical_notes: '',
        share_medical_history: true,
        allow_emergency_access: true,
        preferred_language: 'en',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!profile) return;
    
    // Create a clean payload - send all form fields (backend will handle validation)
    const payload = { ...formData };
    
    // Convert empty arrays to actual arrays (not filter them out)
    Object.keys(payload).forEach(key => {
      if (Array.isArray(payload[key]) && payload[key].length === 0) {
        // Keep empty arrays as-is for proper schema updates
        payload[key] = [];
      }
    });

    try {
      if (profile.id) {
         await patientsAPI.update(profile.id, payload);
      } else {
         await patientsAPI.create(payload);
      }
      setEditing(false);
      fetchProfile();
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Update failed', err);
      const errMsg = err.response?.data ? JSON.stringify(err.response.data) : 'Unknown error';
      alert(`Failed to update profile. Reason: ${errMsg}`);
    }
  };

  const handleCheckboxChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.checked });
  };

  if (loading) return <div className="loader">Loading Complete Profile...</div>;
  if (!profile) return <div className="error">Failed to load profile data.</div>;

  return (
    <div className="patient-profile-container">
      <div className="profile-header">
        <div className="avatar-section">
          <div className="avatar-circle">
            {profile.avatar_url ? (
               <img src={profile.avatar_url} alt="Avatar" />
            ) : (
               profile.user?.first_name?.charAt(0) || <User />
            )}
          </div>
          <div className="avatar-info">
            <h2>{profile.user?.first_name} {profile.user?.last_name}</h2>
            <p className="profile-email"><Mail size={16} /> {profile.user?.email}</p>
          </div>
        </div>
        <button className="btn-edit" onClick={() => setEditing(!editing)}>
          {editing ? 'Cancel Editing' : 'Edit Full Profile'}
        </button>
      </div>

      <div className="profile-content">
        {editing ? (
          <form className="profile-form schema-accurate-form" onSubmit={handleUpdate}>
            
            {/* Section 1: Personal Information */}
            <div className="form-section">
              <h3><User size={18} /> Personal Information</h3>
              <div className="form-grid">
                <div className="form-group">
                    <label>Gender</label>
                    <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="others">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Phone Number (e.g. +199999999)</label>
                  <input type="text" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Preferred Language</label>
                  <input type="text" value={formData.preferred_language} onChange={(e) => setFormData({...formData, preferred_language: e.target.value})} placeholder="e.g. en, fr, es" />
                </div>
                <div className="form-group full-width">
                  <label>Biography</label>
                  <textarea rows="2" value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} placeholder="Short bio about yourself (max 500 chars)" maxLength={500} />
                </div>
              </div>
            </div>

            {/* Section 2: Address */}
            <div className="form-section">
              <h3><MapPin size={18} /> Address Details</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Street Address</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input type="text" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Postal Code</label>
                  <input type="text" value={formData.postal_code} onChange={(e) => setFormData({...formData, postal_code: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Section 3: Emergency Contact */}
            <div className="form-section highlight-section">
              <h3><ShieldAlert size={18} /> Emergency Contact</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" value={formData.emergency_contact_name} onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="text" value={formData.emergency_contact_phone} onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Relationship</label>
                  <input type="text" value={formData.emergency_contact_relationship} onChange={(e) => setFormData({...formData, emergency_contact_relationship: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Section 4: Medical Information */}
            <div className="form-section">
              <h3><Activity size={18} /> Medical Profile</h3>
              <div className="form-grid">
                <div className="form-group">
                    <label>Blood Type</label>
                    <select value={formData.blood_type} onChange={(e) => setFormData({...formData, blood_type: e.target.value})}>
                      <option value="">Select Blood Type</option>
                      <option value="A+">A Positive</option><option value="A-">A Negative</option>
                      <option value="B+">B Positive</option><option value="B-">B Negative</option>
                      <option value="AB+">AB Positive</option><option value="AB-">AB Negative</option>
                      <option value="O+">O Positive</option><option value="O-">O Negative</option>
                      <option value="unknown">Unknown</option>
                    </select>
                </div>
                <div className="form-group full-width">
                  <label>Allergies</label>
                  <DynamicListInput 
                    items={formData.allergies} 
                    setItems={(arr) => setFormData({...formData, allergies: arr})} 
                    placeholder="e.g. Peanuts, Penicillin..." 
                  />
                </div>
                <div className="form-group full-width">
                  <label>Chronic Conditions</label>
                  <DynamicListInput 
                    items={formData.chronic_conditions} 
                    setItems={(arr) => setFormData({...formData, chronic_conditions: arr})} 
                    placeholder="e.g. Asthma, Diabetes..." 
                  />
                </div>
                <div className="form-group full-width">
                  <label>Current Medications</label>
                  <DynamicListInput 
                    items={formData.current_medications} 
                    setItems={(arr) => setFormData({...formData, current_medications: arr})} 
                    placeholder="e.g. Lisinopril 10mg..." 
                  />
                </div>
                <div className="form-group full-width">
                  <label>Additional Medical Notes</label>
                  <textarea rows="3" value={formData.medical_notes} onChange={(e) => setFormData({...formData, medical_notes: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Section 5: Security / Settings */}
            <div className="form-section">
              <h3><Globe size={18} /> Privacy & Permissions</h3>
              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input type="checkbox" name="share_medical_history" checked={formData.share_medical_history} onChange={handleCheckboxChange} />
                  <span>Share medical history with my consultants automatically</span>
                </label>
              </div>
              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input type="checkbox" name="allow_emergency_access" checked={formData.allow_emergency_access} onChange={handleCheckboxChange} />
                  <span>Allow emergency doctors bypass access to records</span>
                </label>
              </div>
            </div>

            <button type="submit" className="btn-save schema-save">Save All Profile Changes</button>
          </form>
        ) : (
          <div className="profile-info-grid">
            <div className="info-card">
              <User className="info-icon" />
              <div><span>Gender</span><p>{profile.gender || 'Not specified'}</p></div>
            </div>
            <div className="info-card">
              <Calendar className="info-icon" />
              <div><span>Age / DOB</span><p>{profile.age ? `${profile.age} years old` : profile.date_of_birth || 'Not specified'}</p></div>
            </div>
            <div className="info-card">
              <Activity className="info-icon" />
              <div><span>Blood Type</span><p>{profile.blood_type || 'Unknown'}</p></div>
            </div>
            <div className="info-card">
              <Phone className="info-icon" />
              <div><span>Phone</span><p>{profile.phone_number || 'Not provided'}</p></div>
            </div>
            <div className="info-card full-width">
              <MapPin className="info-icon" />
              <div>
                <span>Address</span>
                <p>
                  {profile.address ? `${profile.address}, ` : ''}
                  {profile.city ? `${profile.city}, ` : ''}
                  {profile.country ? `${profile.country} ` : ''}
                  {profile.postal_code || 'Not provided'}
                </p>
              </div>
            </div>
            <div className="info-card full-width emergency highlight-card">
              <ShieldAlert className="info-icon" />
              <div>
                <span>Emergency Contact</span>
                {profile.emergency_contact_name ? (
                  <p>
                    <strong>{profile.emergency_contact_name}</strong> ({profile.emergency_contact_relationship}) <br />
                    {profile.emergency_contact_phone}
                  </p>
                ) : <p>None specified</p>}
              </div>
            </div>
            <div className="info-card full-width">
              <FileText className="info-icon" />
              <div>
                <span>Medical Insights</span>
                <div className="insight-tags">
                  <strong>Allergies:</strong> {profile.allergies?.length ? profile.allergies.join(", ") : "None declared"} <br/>
                  <strong>Conditions:</strong> {profile.chronic_conditions?.length ? profile.chronic_conditions.join(", ") : "None declared"} <br/>
                  <strong>Medications:</strong> {profile.current_medications?.length ? profile.current_medications.join(", ") : "None declared"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientProfile;

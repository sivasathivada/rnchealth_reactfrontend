import { useState, useEffect } from 'react';
import { patientsAPI } from '../../services/api';
import './MedicalHistory.css';
import { FileText, Plus, Calendar as CalIcon, Activity, Stethoscope, PlusCircle, Hospital, TestTube, Syringe, Folder, X } from 'lucide-react';


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
        <button type="button" className="btn-add-item" onClick={handleAdd}>Add</button>
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

const MedicalHistory = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    record_type: 'diagnosis',
    title: '',
    description: '',
    date_occurred: '',
    healthcare_provider: '',
    attachments: [] // List of reference links or document names
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data } = await patientsAPI.myMedicalHistory();
      setRecords(data.results || data);
    } catch (err) {
      console.error('Failed to load medical history', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await patientsAPI.createMedicalRecord(formData);
      setShowAddForm(false);
      setFormData({ record_type: 'diagnosis', title: '', description: '', date_occurred: '', healthcare_provider: '', attachments: [] });
      fetchHistory();
    } catch (err) {
      console.error('Failed to add record', err);
      alert('Failed to add medical record. Check fields carefully.');
    }
  };

  const getRecordIcon = (type) => {
    switch(type) {
      case 'diagnosis': return <Activity className="icon-record type-diagnosis" />;
      case 'procedure': return <Stethoscope className="icon-record type-procedure" />;
      case 'surgery': return <PlusCircle className="icon-record type-surgery" />;
      case 'hospitalization': return <Hospital className="icon-record type-hospitalization" />;
      case 'test_result': return <TestTube className="icon-record type-test" />;
      case 'vaccination': return <Syringe className="icon-record type-vaccine" />;
      default: return <FileText className="icon-record type-other" />;
    }
  };

  if (loading) return <div className="loader">Loading Medical History...</div>;

  return (
    <div className="medical-history-container">
      <div className="history-header">
        <div>
          <h2>Medical History</h2>
          <p>Review and safely log your past health occurrences.</p>
        </div>
        <button className="btn-add" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={20} /> Add New Record
        </button>
      </div>

      {showAddForm && (
        <div className="add-record-form">
          <h3>Record Medical Event</h3>
          <form onSubmit={handleAddSubmit}>
            <div className="form-grid">
              
              <div className="form-group">
                <label>Event Title</label>
                <input 
                  type="text" required value={formData.title} 
                  onChange={(e) => setFormData({...formData, title: e.target.value})} 
                  placeholder="e.g. Broken Arm"
                />
              </div>

              <div className="form-group">
                <label>Record Type</label>
                <select 
                  value={formData.record_type} 
                  onChange={(e) => setFormData({...formData, record_type: e.target.value})}
                >
                  <option value="diagnosis">Diagnosis</option>
                  <option value="procedure">Medical Procedure</option>
                  <option value="surgery">Surgery</option>
                  <option value="hospitalization">Hospitalization</option>
                  <option value="vaccination">Vaccination</option>
                  <option value="test_result">Test Result</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Date Occurred</label>
                <input 
                  type="date" required value={formData.date_occurred} 
                  onChange={(e) => setFormData({...formData, date_occurred: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label>Healthcare Provider (Clinic/Doctor)</label>
                <input 
                  type="text" value={formData.healthcare_provider} 
                  onChange={(e) => setFormData({...formData, healthcare_provider: e.target.value})} 
                  placeholder="e.g. City Hospital Group"
                />
              </div>

              <div className="form-group full-width">
                <label>Detailed Description</label>
                <textarea 
                  rows="3" required value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  placeholder="Elaborate on the condition, treatment, or notes..."
                />
              </div>

              <div className="form-group full-width">
                <label>Attachments (Link references or file names)</label>
                <DynamicListInput 
                    items={formData.attachments} 
                    setItems={(arr) => setFormData({...formData, attachments: arr})} 
                    placeholder="e.g. scan-result.pdf" 
                />
              </div>

            </div>
            <div className="form-actions mt-3">
              <button type="submit" className="btn-save">Log Event into History</button>
              <button type="button" className="btn-cancel-form" onClick={() => setShowAddForm(false)}>Discard</button>
            </div>
          </form>
        </div>
      )}

      <div className="history-list">
        {records.length === 0 ? (
          <div className="no-data">No medical records securely logged yet.</div>
        ) : (
          records.map(record => (
            <div key={record.id} className="history-card">
              <div className="card-top">
                <div className="condition">
                  {getRecordIcon(record.record_type)}
                  <div>
                    <h3>{record.title}</h3>
                    <span className="source-provider">Recorded by: {record.healthcare_provider || 'Self/Unknown'}</span>
                  </div>
                </div>
                <div className="date-badge">
                  <CalIcon size={16} />
                  <span>{record.date_occurred}</span>
                </div>
              </div>
              <div className="card-body">
                <p className="description-text">{record.description}</p>
                {record.attachments?.length > 0 && (
                   <div className="attachment-pills">
                     <Folder size={14} /> 
                     {record.attachments.map((att, idx) => (
                       <span key={idx} className="attach-tag">{att}</span>
                     ))}
                   </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MedicalHistory;

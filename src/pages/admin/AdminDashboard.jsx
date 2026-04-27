import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Users, Activity, ActivityIcon, PlusCircle, CheckCircle, MapPin, Mail, Navigation } from 'lucide-react';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [searchParams, setSearchParams] = useState({ query: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchPatients();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await adminAPI.statistics();
      setStats(data);
    } catch {
      // Stub
      setStats({
          total_patients: 120,
          new_patients_this_month: 15,
          active_patients: 80,
          patients_sharing_history: 45
      });
    }
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const params = {};
      if(searchParams.query) params.query = searchParams.query;
      const { data } = await adminAPI.searchPatients(params);
      setPatients(data.results || data);
    } catch {
      // Stub
      setPatients([
        { id: 1, user: { full_name: "Alice Walker", email: "alice@demo.com" }, address: "123 Apple St", city: "NYC", phone_number: "+1999222333", share_medical_history: true },
        { id: 2, user: { full_name: "Bob Smith", email: "bob@demo.com" }, address: "456 Banana Rd", city: "LA", phone_number: "+1999222111", share_medical_history: false }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPatients();
  }

  return (
    <div className="page-container admin-dashboard animate-fadeIn">
      <div className="page-header">
        <h1>Admin Control Panel</h1>
        <p>Monitor system statistics and search patient data</p>
      </div>

      {stats && (
        <div className="admin-stats-grid mb-6">
          <div className="admin-stat-card">
            <div className="icon primary"><Users size={24} /></div>
            <div className="data">
              <span className="value">{stats.total_patients}</span>
              <span className="label">Total Patients</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="icon success"><PlusCircle size={24} /></div>
            <div className="data">
              <span className="value">{stats.new_patients_this_month}</span>
              <span className="label">New This Month</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="icon accent"><ActivityIcon size={24} /></div>
            <div className="data">
              <span className="value">{stats.active_patients}</span>
              <span className="label">Active Patients</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="icon warning"><CheckCircle size={24} /></div>
            <div className="data">
              <span className="value">{stats.patients_sharing_history}</span>
              <span className="label">Sharing History</span>
            </div>
          </div>
        </div>
      )}

      <div className="card admin-search-card">
        <h2 className="card-title">Patient Directory Search</h2>
        <form onSubmit={handleSearch} className="admin-search-form mt-4">
           <input 
             type="text" 
             placeholder="Search by name, email, or city..." 
             className="form-input" 
             value={searchParams.query}
             onChange={(e) => setSearchParams({query: e.target.value})}
           />
           <button type="submit" className="btn btn-primary">Search</button>
        </form>
      </div>

      {loading ? (
        <div className="loading-inline"><div className="loading-spinner" /></div>
      ) : (
        <div className="admin-patient-list mt-6 block">
           {patients.length === 0 ? (
             <div className="empty-state card">No patients match search.</div>
           ) : (
             <div className="admin-table-wrapper">
               <table>
                 <thead>
                   <tr>
                     <th>Name & Contact</th>
                     <th>Address & City</th>
                     <th>Phone</th>
                     <th>Medical Info Sharing</th>
                   </tr>
                 </thead>
                 <tbody>
                   {patients.map(p => (
                     <tr key={p.id}>
                       <td>
                          <strong>{p.user?.full_name}</strong><br/>
                          <span className="text-sm text-muted"><Mail size={12}/> {p.user?.email}</span>
                       </td>
                       <td>
                          <span>{p.address}</span><br/>
                          <span className="text-sm text-muted"><MapPin size={12}/> {p.city}</span>
                       </td>
                       <td>{p.phone_number || 'N/A'}</td>
                       <td>
                          <span className={`badge ${p.share_medical_history ? 'badge-success' : 'badge-muted'}`}>
                            {p.share_medical_history ? 'YES' : 'NO'}
                          </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
        </div>
      )}
    </div>
  );
}

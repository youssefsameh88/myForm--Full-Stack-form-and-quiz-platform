import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../utils/api';

function Dashboard({ user }) {
  const [myForms, setMyForms] = useState([]);
  const [allForms, setAllForms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New Form State
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newFormDesc, setNewFormDesc] = useState('');
  const [newFormType, setNewFormType] = useState('survey');
  const navigate = useNavigate();

  useEffect(() => {
    fetchForms();
  }, [user]);

  const fetchForms = async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        fetchApi('/api/forms'),
        user ? fetchApi('/api/forms/my') : Promise.resolve({ ok: false })
      ]);
      
      if (allRes.ok) {
        setAllForms(await allRes.json());
      }
      if (myRes.ok) {
        setMyForms(await myRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForm = async (e) => {
    e.preventDefault();
    if (!newFormTitle) return;
    try {
      const res = await fetchApi('/api/forms', {
        method: 'POST',
        body: JSON.stringify({
          title: newFormTitle,
          description: newFormDesc,
          type: newFormType,
          time_limit: 0
        })
      });
      if (res.ok) {
        const [created] = await res.json();
        navigate(`/forms/${created.id}/edit`);
      } else {
        const text = await res.text();
        alert('Error creating form: ' + text);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteForm = async (id) => {
    if (!window.confirm("Are you sure you want to delete this form?")) return;
    try {
      const res = await fetchApi(`/api/forms/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMyForms(myForms.filter(f => f.id !== id));
        setAllForms(allForms.filter(f => f.id !== id));
      } else {
        const text = await res.text();
        alert('Error: ' + text);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Loading forms...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="title" style={{ marginBottom: 0 }}>Dashboard</h1>
      </div>
      
      {user && (
        <div className="card">
          <h2 className="subtitle">Create New Form</h2>
          <form onSubmit={handleCreateForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="flex gap-4">
              <input 
                type="text" 
                className="form-input" 
                placeholder="Form Title..." 
                value={newFormTitle}
                onChange={(e) => setNewFormTitle(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <select 
                className="form-input" 
                value={newFormType} 
                onChange={(e) => setNewFormType(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="survey">Survey</option>
                <option value="poll">Poll</option>
                <option value="quiz">Quiz</option>
              </select>
            </div>
            <textarea
              className="form-input"
              placeholder="Form Description..."
              value={newFormDesc}
              onChange={(e) => setNewFormDesc(e.target.value)}
              style={{ minHeight: '80px', resize: 'vertical' }}
            />
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Create Form</button>
          </form>
        </div>
      )}

      {user && myForms.length > 0 && (
        <div className="mb-4">
          <h2 className="subtitle">My Forms</h2>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {myForms.map(form => (
              <div key={form.id} className="card" style={{ marginBottom: 0 }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{form.title}</h3>
                <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  Status: {form.status} • Type: {form.type}
                </p>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  <Link to={`/forms/${form.id}/edit`} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Edit</Link>
                  <Link to={`/forms/${form.id}`} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>View</Link>
                  <Link to={`/forms/${form.id}/results`} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Results</Link>
                  <button onClick={() => handleDeleteForm(form.id)} className="btn btn-danger" style={{ padding: '0.5rem 0.75rem', fontSize: '1rem' }} title="Delete form">❌</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="subtitle">All Available Forms</h2>
        {allForms.length === 0 ? (
          <p>No forms available.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {allForms.map(form => (
              <div key={form.id} className="card" style={{ marginBottom: 0, width: '100%' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{form.title}</h3>
                <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  Type: {form.type}
                </p>
                <Link to={`/forms/${form.id}`} className="btn btn-primary" style={{ display: 'block', textAlign: 'center' }}>Take Form</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchApi } from '../utils/api';

function FormBuilder({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  const [newQuestion, setNewQuestion] = useState('');
  const [newChoiceText, setNewChoiceText] = useState({});
  const [newChoiceCorrect, setNewChoiceCorrect] = useState({});
  const [pollChoiceText, setPollChoiceText] = useState('');
  
  const [error, setError] = useState('');
  const [notAuthorized, setNotAuthorized] = useState(false);
  
  // Editing state
  const [isEditingForm, setIsEditingForm] = useState(false);
  const [editFormTitle, setEditFormTitle] = useState('');
  const [editFormDesc, setEditFormDesc] = useState('');
  
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editQuestionText, setEditQuestionText] = useState('');

  useEffect(() => {
    fetchFormDetails();
  }, [id]);

  const fetchFormDetails = async () => {
    try {
      const res = await fetchApi(`/api/forms/${id}/questions`);
      let fetchedForm = null;
      let fetchedQuestions = [];

      if (res.ok) {
        const data = await res.json();
        fetchedForm = { title: data.title, description: data.description, type: data.type };
        fetchedQuestions = (data.questions || []).filter(q => q.id != null && String(q.id) !== 'null');
      } else {
        const basicRes = await fetchApi(`/api/forms/${id}`);
        if (basicRes.ok) {
          const basicData = await basicRes.json();
          fetchedForm = basicData;
        } else {
          setError('Could not load form');
          return;
        }
      }

      const myRes = await fetchApi('/api/forms/my');
      if (myRes.ok) {
        const myForms = await myRes.json();
        const thisForm = myForms.find(f => f.id == id);
        if (thisForm) {
          fetchedForm.status = thisForm.status;
        } else {
          // The logged-in user does not own this form and cannot edit it
          setNotAuthorized(true);
          return;
        }
      } else if (myRes.status === 401) {
        setError('You must be logged in to edit a form');
        return;
      }

      setForm(fetchedForm);
      setQuestions(fetchedQuestions);
    } catch (err) {
      console.error(err);
      setError('Error loading form details');
    }
  };

  // Form Details Edit
  const handleUpdateForm = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchApi(`/api/forms/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: editFormTitle, description: editFormDesc })
      });
      if (res.ok) {
        setIsEditingForm(false);
        fetchFormDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Questions
  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion) return;
    try {
      const res = await fetchApi(`/api/forms/${id}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          question_text: newQuestion,
          answer_type: form.type === 'survey' ? 'text' : 'choice'
        })
      });
      if (res.ok) {
        setNewQuestion('');
        fetchFormDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateQuestion = async (e, qId) => {
    e.preventDefault();
    try {
      const res = await fetchApi(`/api/questions/${qId}`, {
        method: 'PATCH',
        body: JSON.stringify({ question_text: editQuestionText })
      });
      if (res.ok) {
        setEditingQuestionId(null);
        fetchFormDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteQuestion = async (qId) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await fetchApi(`/api/questions/${qId}`, { method: 'DELETE' });
      fetchFormDetails();
    } catch (err) {
      console.error(err);
    }
  };

  // Choices
  const submitChoice = async (qId, text, isCorrect) => {
    if (!qId || String(qId) === 'null') return;
    await fetchApi(`/api/choices/${qId}/choices`, {
      method: 'POST',
      body: JSON.stringify({ choice_text: text, is_correct: isCorrect })
    });
  };

  const handleAddChoice = async (qId, e) => {
    e.preventDefault();
    const text = newChoiceText[qId];
    if (!text) return;
    try {
      await submitChoice(qId, text, form.type === 'quiz' ? (newChoiceCorrect[qId] || false) : false);
      setNewChoiceText(prev => ({ ...prev, [qId]: '' }));
      setNewChoiceCorrect(prev => ({ ...prev, [qId]: false }));
      fetchFormDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChoice = async (cId) => {
    if (!window.confirm("Delete this choice?")) return;
    try {
      await fetchApi(`/api/choices/${cId}`, { method: 'DELETE' });
      fetchFormDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPollChoice = async (e) => {
    e.preventDefault();
    if (!pollChoiceText) return;
    try {
      let qId = null;
      if (questions.length === 0) {
        const qRes = await fetchApi(`/api/forms/${id}/questions`, {
          method: 'POST',
          body: JSON.stringify({ question_text: form.title, answer_type: 'choice' })
        });
        if (qRes.ok) {
          const qData = await qRes.json();
          qId = qData[0].id;
        }
      } else {
        qId = questions[0].id;
      }
      if (qId) {
        await submitChoice(qId, pollChoiceText, false);
        setPollChoiceText('');
        fetchFormDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenClose = async (action) => {
    try {
      const res = await fetchApi(`/api/forms/${id}/${action}`, { method: 'POST' });
      if (res.ok) {
        navigate('/');
      } else {
        const text = await res.text();
        alert(text);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (notAuthorized) {
    return (
      <div className="card text-center" style={{ padding: '3rem' }}>
        <h2 className="title" style={{ color: 'var(--error-color)' }}>Not Allowed</h2>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>You don't have permission to edit this form.</p>
        <Link to="/" className="btn btn-secondary">Back to Dashboard</Link>
      </div>
    );
  }

  if (error) return <div>{error}</div>;
  if (!form) return <div>Loading...</div>;

  return (
    <div>
      <div className="card">
        {isEditingForm ? (
          <form onSubmit={handleUpdateForm} className="flex gap-4" style={{ flexDirection: 'column' }}>
            <input 
              type="text" className="form-input" 
              value={editFormTitle} onChange={(e) => setEditFormTitle(e.target.value)}
              placeholder="Title" required
            />
            <textarea 
              className="form-input" 
              value={editFormDesc} onChange={(e) => setEditFormDesc(e.target.value)}
              placeholder="Description"
            />
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">Save Details</button>
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditingForm(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h1 className="title" style={{ marginBottom: '0.5rem' }}>{form.title}</h1>
              <button 
                onClick={() => {
                  setEditFormTitle(form.title);
                  setEditFormDesc(form.description);
                  setIsEditingForm(true);
                }} 
                className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
              >
                Edit Details
              </button>
            </div>
            <p style={{ color: '#64748b', marginBottom: '1rem' }}>{form.description}</p>
            <p className="subtitle" style={{ fontSize: '1rem', color: '#64748b' }}>
              Type: {form.type} | Status: {form.status || 'draft'}
            </p>
          </>
        )}
        
        <div className="flex gap-4 mt-4 pt-4" style={{ borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
          {form.status !== 'open' && (
            <button onClick={() => handleOpenClose('open')} className="btn btn-primary">Publish / Open Form</button>
          )}
          <button onClick={() => handleOpenClose('close')} className="btn btn-danger">Close Form</button>
          <Link to={`/forms/${id}/results`} className="btn btn-secondary">View Results</Link>
        </div>
      </div>

      <div className="card">
        {form.type === 'poll' ? (
          <>
            <h2 className="subtitle">Poll Options</h2>
            {questions.length > 0 && questions[0].choices && questions[0].choices.length > 0 ? (
              <ul style={{ listStyle: 'none', marginBottom: '1.5rem', padding: 0 }}>
                {questions[0].choices.map(c => (
                  <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '0.5rem' }}>
                    <span>• {c.choice_text}</span>
                    <button onClick={() => handleDeleteChoice(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }} title="Delete">❌</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#64748b', marginBottom: '1rem' }}>No options added yet.</p>
            )}

            <form onSubmit={handleAddPollChoice} className="flex gap-4">
              <input 
                type="text" className="form-input" placeholder="New poll option..." 
                value={pollChoiceText} onChange={(e) => setPollChoiceText(e.target.value)} style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>Add Option</button>
            </form>
          </>
        ) : (
          <>
            <h2 className="subtitle">Questions</h2>
            {questions.length === 0 ? (
              <p style={{ color: '#64748b', marginBottom: '1rem' }}>No questions added yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', marginBottom: '1.5rem', padding: 0 }}>
                {questions.map((q, idx) => (
                  <li key={q.id} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1rem' }}>
                    
                    {editingQuestionId === q.id ? (
                      <form onSubmit={(e) => handleUpdateQuestion(e, q.id)} className="flex gap-2 mb-2">
                        <input 
                          type="text" className="form-input" value={editQuestionText} 
                          onChange={(e) => setEditQuestionText(e.target.value)} required style={{ flex: 1 }}
                        />
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>Save</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setEditingQuestionId(null)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>Cancel</button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between mb-2">
                        <strong>{idx + 1}. {q.question_text}</strong>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setEditingQuestionId(q.id); setEditQuestionText(q.question_text); }} 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDeleteQuestion(q.id)} 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                            title="Delete"
                          >
                            ❌
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {form.type === 'quiz' && (
                      <div style={{ marginTop: '1rem', paddingLeft: '1rem' }}>
                        <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: '#64748b' }}>Choices:</h4>
                        {q.choices && q.choices.length > 0 ? (
                          <ul style={{ marginBottom: '1rem' }}>
                            {q.choices.map(c => (
                              <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', marginBottom: '0.25rem', color: c.is_correct ? '#10b981' : 'inherit' }}>
                                <span>• {c.choice_text} {c.is_correct && '✅'}</span>
                                <button onClick={() => handleDeleteChoice(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }} title="Delete">❌</button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1rem' }}>No choices yet.</p>
                        )}

                        <form onSubmit={(e) => handleAddChoice(q.id, e)} className="flex items-center gap-2">
                          <input 
                            type="text" className="form-input" placeholder="New choice..."
                            style={{ padding: '0.5rem', fontSize: '0.875rem', flex: 1 }}
                            value={newChoiceText[q.id] || ''}
                            onChange={(e) => setNewChoiceText(prev => ({...prev, [q.id]: e.target.value}))}
                          />
                          <label style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <input 
                              type="checkbox" checked={newChoiceCorrect[q.id] || false}
                              onChange={(e) => setNewChoiceCorrect(prev => ({...prev, [q.id]: e.target.checked}))}
                            /> Correct
                          </label>
                          <button type="submit" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Add</button>
                        </form>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleAddQuestion} className="flex gap-4">
              <input 
                type="text" className="form-input" placeholder="New question text..." 
                value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>Add Question</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default FormBuilder;

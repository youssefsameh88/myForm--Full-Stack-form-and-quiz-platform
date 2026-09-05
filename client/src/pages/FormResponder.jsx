import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchApi } from '../utils/api';

function FormResponder({ user }) {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [responseId, setResponseId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  
  // Quiz results state
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);

  useEffect(() => {
    loadForm();
  }, [id]);

  const loadForm = async () => {
    try {
      // 1. Load form + questions
      const qRes = await fetchApi(`/api/forms/${id}/questions`);
      if (!qRes.ok) {
        setError(await qRes.text());
        setLoading(false);
        return;
      }
      const data = await qRes.json();
      const formData = { title: data.title, description: data.description, type: data.type };
      setForm(formData);
      setQuestions((data.questions || []).filter(q => q.id != null && String(q.id) !== 'null'));

      // 2. Only proceed if user is logged in
      if (!user) {
        setError('You must be logged in to take this form.');
        setLoading(false);
        return;
      }

      // 3. Check localStorage: has this user already submitted this form?
      const submittedKey = `submitted_${user.id}_${id}`;
      if (localStorage.getItem(submittedKey)) {
        setAlreadySubmitted(true);
        setLoading(false);
        return;
      }

      // 4. Check localStorage: do we have an existing in-progress responseId?
      const inProgressKey = `response_${user.id}_${id}`;
      const savedResponseId = localStorage.getItem(inProgressKey);
      if (savedResponseId) {
        setResponseId(parseInt(savedResponseId));
        setLoading(false);
        return;
      }

      // 5. Start a new response
      const startRes = await fetchApi(`/api/forms/${id}/start`, { method: 'POST' });
      if (startRes.ok) {
        const startData = await startRes.json();
        const newResponseId = startData[0].id;
        setResponseId(newResponseId);
        localStorage.setItem(inProgressKey, newResponseId);
      } else {
        const errText = await startRes.text();
        setError(errText);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (questionId, val) => {
    setAnswers(prev => ({ ...prev, [questionId]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!responseId) return;

    const formattedAnswers = questions
      .filter(q => answers[q.id] !== undefined && answers[q.id] !== '')
      .map(q => {
        if (q.choices && q.choices.length > 0) {
          return { question_id: q.id, choice_id: parseInt(answers[q.id]) };
        }
        return { question_id: q.id, value: answers[q.id] };
      });

    try {
      const res = await fetchApi(`/api/forms/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ response_id: responseId, answers: formattedAnswers })
      });

      if (res.ok) {
        const resData = await res.json();
        // Mark as submitted in localStorage so user can't retake
        const submittedKey = `submitted_${user.id}_${id}`;
        const inProgressKey = `response_${user.id}_${id}`;
        localStorage.setItem(submittedKey, '1');
        localStorage.removeItem(inProgressKey);

        if (form.type === 'quiz' && resData.score !== undefined && resData.score !== null) {
          setScore(resData.score);
          setSubmitted(true);
        } else {
          setSubmitted(true);
        }
      } else {
        const errText = await res.text();
        if (errText === 'Response already submitted') {
          setAlreadySubmitted(true);
        } else {
          alert('Error: ' + errText);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="app-container">Loading...</div>;

  if (alreadySubmitted || error === 'Response already submitted') {
    return (
      <div className="card text-center" style={{ padding: '4rem 2rem' }}>
        <h2 className="title">Already Submitted</h2>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>You have already submitted this form.</p>
        <Link to="/" className="btn btn-secondary">Return to Dashboard</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center" style={{ padding: '4rem 2rem' }}>
        <h2 className="title" style={{ color: 'var(--error-color)' }}>Oops!</h2>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>{error}</p>
        <Link to="/" className="btn btn-secondary">Return to Dashboard</Link>
      </div>
    );
  }

  if (submitted) {
    if (form.type === 'quiz' && score !== null) {
      const totalQuestions = questions.length;
      const percentage = totalQuestions > 0
        ? Math.round((score / totalQuestions) * 100)
        : 0;
      return (
        <div className="card text-center" style={{ padding: '4rem 2rem' }}>
          <h1 className="title">Quiz Completed! 🎉</h1>
          <div style={{ fontSize: '5rem', fontWeight: 'bold', color: 'var(--primary-color)', margin: '1.5rem 0' }}>
            {score}<span style={{ fontSize: '2.5rem', color: '#64748b' }}>/{questions.length}</span>
          </div>
          <div style={{
            display: 'inline-block', padding: '0.5rem 1.5rem', borderRadius: '999px',
            background: percentage >= 70 ? '#d1fae5' : percentage >= 40 ? '#fef3c7' : '#fee2e2',
            color: percentage >= 70 ? '#065f46' : percentage >= 40 ? '#92400e' : '#991b1b',
            fontWeight: 600, marginBottom: '2rem'
          }}>
            {percentage}% — {percentage >= 70 ? 'Great job!' : percentage >= 40 ? 'Not bad!' : 'Keep practicing!'}
          </div>
          <br />
          <Link to="/" className="btn btn-primary">Return to Dashboard</Link>
        </div>
      );
    }
    return (
      <div className="card text-center" style={{ padding: '4rem 2rem' }}>
        <h1 className="title">Submitted! ✅</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Thank you for your response.</p>
        <Link to="/" className="btn btn-primary">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="title">{form?.title}</h1>
      {form?.description && (
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>{form.description}</p>
      )}

      <form onSubmit={handleSubmit}>
        {questions.map((q, idx) => (
          <div key={q.id} className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label" style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'block' }}>
              {form?.type === 'poll' ? '' : `${idx + 1}. `}{q.question_text}
            </label>
            
            {q.choices && q.choices.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {q.choices.map(c => (
                  <label key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                    padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px',
                    transition: 'background 0.2s',
                    background: answers[q.id] == c.id ? '#ede9fe' : 'transparent',
                    borderColor: answers[q.id] == c.id ? 'var(--primary-color)' : '#e2e8f0',
                  }}>
                    <input 
                      type="radio" 
                      name={`question_${q.id}`} 
                      value={c.id} 
                      checked={answers[q.id] == c.id}
                      onChange={(e) => handleChange(q.id, e.target.value)}
                      required
                    />
                    {c.choice_text}
                  </label>
                ))}
              </div>
            ) : (
              <input 
                type="text" 
                className="form-input" 
                placeholder="Your answer..."
                value={answers[q.id] || ''}
                onChange={(e) => handleChange(q.id, e.target.value)}
                required
              />
            )}
          </div>
        ))}
        
        {questions.length === 0 ? (
          <p style={{ color: '#64748b' }}>No questions in this form.</p>
        ) : (
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Submit
          </button>
        )}
      </form>
    </div>
  );
}

export default FormResponder;

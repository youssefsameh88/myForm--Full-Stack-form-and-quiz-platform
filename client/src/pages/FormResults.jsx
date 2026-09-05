import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchApi } from '../utils/api';

function FormResults({ user }) {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadResults();
  }, [id]);

  const loadResults = async () => {
    try {
      const qRes = await fetchApi(`/api/forms/${id}/questions`);
      if (!qRes.ok) { setError(await qRes.text()); setLoading(false); return; }
      const qData = await qRes.json();
      const fetchedForm = { title: qData.title, description: qData.description, type: qData.type };
      const fetchedQuestions = (qData.questions || []).filter(q => q.id != null && String(q.id) !== 'null');

      const rRes = await fetchApi(`/api/forms/${id}/results`);
      if (!rRes.ok) {
        const errText = await rRes.text();
        setError(rRes.status === 403
          ? "You are not allowed to view these results."
          : (errText || 'Failed to load results'));
        setLoading(false);
        return;
      }
      const rData = await rRes.json();

      setForm(fetchedForm);
      setQuestions(fetchedQuestions);
      setResults(rData);
    } catch (err) {
      console.error(err);
      setError('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading results...</div>;
  if (error) return (
    <div className="card text-center" style={{ padding: '3rem' }}>
      <p style={{ color: 'var(--error-color)' }}>{error}</p>
      <Link to="/" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Back to Dashboard</Link>
    </div>
  );

  // ---- QUIZ ----
  // Backend returns one row per submitted response: {id, user_id, score, started_at, submitted_at}
  const renderQuizResults = () => {
    const totalSubmissions = results.length;
    if (totalSubmissions === 0) return <p style={{ color: '#64748b' }}>No submissions yet.</p>;
    if (questions.length === 0) return <p style={{ color: '#64748b' }}>This quiz has no questions.</p>;

    const maxScore = questions.length;
    const scoreCounts = {};
    results.forEach(r => {
      const s = r.score ?? 0;
      scoreCounts[s] = (scoreCounts[s] || 0) + 1;
    });
    const avgScore = totalSubmissions > 0
      ? (results.reduce((sum, r) => sum + (r.score || 0), 0) / totalSubmissions).toFixed(2)
      : 0;

    return (
      <>
        <div className="flex gap-4 mb-4" style={{ flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: 1, minWidth: '150px', textAlign: 'center', padding: '1.5rem', marginBottom: 0 }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)' }}>{totalSubmissions}</div>
            <div style={{ color: '#64748b' }}>Total Submissions</div>
          </div>
          <div className="card" style={{ flex: 1, minWidth: '150px', textAlign: 'center', padding: '1.5rem', marginBottom: 0 }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)' }}>{avgScore}/{maxScore}</div>
            <div style={{ color: '#64748b' }}>Average Score</div>
          </div>
        </div>

        <h3 className="subtitle" style={{ marginBottom: '1rem' }}>Score Distribution</h3>
        {Array.from({ length: maxScore + 1 }, (_, i) => i).map(s => {
          const count = scoreCounts[s] || 0;
          const pct = totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0;
          return (
            <div key={s} style={{ marginBottom: '0.75rem' }}>
              <div className="flex justify-between" style={{ marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                <span>{s}/{maxScore}</span>
                <span>{count} respondent{count !== 1 ? 's' : ''} ({pct}%)</span>
              </div>
              <div style={{ background: '#e2e8f0', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary-color)', borderRadius: '999px', transition: 'width 0.5s' }} />
              </div>
            </div>
          );
        })}
      </>
    );
  };

  // ---- POLL ----
  // Backend returns one answer row per vote: {question_id, choice_id, value}
  // Each voter submits exactly 1 answer (1 choice), so results.length = total votes
  const renderPollResults = () => {
    if (results.length === 0 || questions.length === 0) return <p style={{ color: '#64748b' }}>No votes yet.</p>;

    const choiceCounts = {};
    results.forEach(r => {
      if (r.choice_id != null) {
        choiceCounts[r.choice_id] = (choiceCounts[r.choice_id] || 0) + 1;
      }
    });

    const pollQuestion = questions[0];
    const choices = pollQuestion?.choices || [];
    const totalVotes = results.filter(r => r.choice_id != null).length;

    return (
      <>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)' }}>{totalVotes}</div>
          <div style={{ color: '#64748b' }}>Total Votes</div>
        </div>

        {choices.map(c => {
          const count = choiceCounts[c.id] || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          return (
            <div key={c.id} style={{ marginBottom: '1rem' }}>
              <div className="flex justify-between" style={{ marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 500 }}>{c.choice_text}</span>
                <span style={{ color: '#64748b', fontSize: '0.875rem' }}>{count} votes ({pct}%)</span>
              </div>
              <div style={{ background: '#e2e8f0', borderRadius: '999px', height: '14px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary-color)', borderRadius: '999px', transition: 'width 0.5s' }} />
              </div>
            </div>
          );
        })}
      </>
    );
  };

  // ---- SURVEY ----
  // Backend returns one answer row per question per submission: {question_id, choice_id, value}
  // Total submissions = total answer rows / number of questions (since each submission answers all questions)
  const renderSurveyResults = () => {
    if (results.length === 0) return <p style={{ color: '#64748b' }}>No submissions yet.</p>;

    const numQuestions = questions.length;
    // Each submission produces numQuestions answer rows
    const totalSubmissions = numQuestions > 0 ? Math.round(results.length / numQuestions) : 0;

    return (
      <>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)' }}>{totalSubmissions}</div>
          <div style={{ color: '#64748b' }}>Total Submissions</div>
        </div>

        {questions.map((q, idx) => {
          const qAnswers = results.filter(r => r.question_id === q.id && r.value);
          return (
            <div key={q.id} style={{ marginBottom: '2rem' }}>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem', fontWeight: 600 }}>{idx + 1}. {q.question_text}</h4>
              {qAnswers.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No answers yet.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {qAnswers.map((a, i) => (
                    <li key={i} style={{ padding: '0.5rem 1rem', borderLeft: '3px solid var(--primary-color)', background: '#f8fafc', marginBottom: '0.5rem', borderRadius: '0 6px 6px 0', fontSize: '0.9rem' }}>
                      {a.value}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <Link to="/" style={{ color: '#64748b', fontSize: '0.875rem' }}>← Dashboard</Link>
      </div>

      <div className="card">
        <h1 className="title">{form?.title}</h1>
        {form?.description && <p style={{ color: '#64748b', marginBottom: '0.5rem' }}>{form.description}</p>}
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Type: {form?.type}</p>
      </div>

      <div className="card">
        <h2 className="subtitle">Results</h2>
        {form?.type === 'quiz' && renderQuizResults()}
        {form?.type === 'poll' && renderPollResults()}
        {form?.type === 'survey' && renderSurveyResults()}
      </div>
    </div>
  );
}

export default FormResults;

import { useState } from 'react';

const CORRECT_ID = import.meta.env.VITE_LOGIN_ID;
const CORRECT_PW = import.meta.env.VITE_LOGIN_PASSWORD;

export default function Login({ onLogin }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (id === CORRECT_ID && pw === CORRECT_PW) {
      onLogin();
    } else {
      setError('IDまたはパスワードが正しくありません。');
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f4f8',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        padding: '48px 40px',
        width: 340,
      }}>
        <h2 style={{ margin: '0 0 8px', color: '#1a237e', fontSize: 22, fontWeight: 700 }}>
          経審スコアシミュレーター
        </h2>
        <p style={{ margin: '0 0 28px', color: '#666', fontSize: 13 }}>
          ログインしてください
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#444', marginBottom: 4 }}>ID</label>
            <input
              type="text"
              value={id}
              onChange={e => setId(e.target.value)}
              autoComplete="username"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid #ccc',
                fontSize: 15,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#444', marginBottom: 4 }}>パスワード</label>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid #ccc',
                fontSize: 15,
                boxSizing: 'border-box',
              }}
            />
          </div>
          {error && (
            <p style={{ color: '#c62828', fontSize: 13, marginBottom: 16, marginTop: -12 }}>{error}</p>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '11px',
              background: '#1a237e',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Login from './components/Login.jsx';

function Root() {
  const [loggedIn, setLoggedIn] = useState(
    () => sessionStorage.getItem('keishin_auth') === '1'
  );

  function handleLogin() {
    sessionStorage.setItem('keishin_auth', '1');
    setLoggedIn(true);
  }

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />;
  }
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

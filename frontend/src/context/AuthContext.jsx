import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken } from '../api.js';
import { reconnectSocket } from '../socket.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api.get('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const finish = useCallback((data) => {
    setToken(data.token);
    setUser(data.user);
    reconnectSocket();
    return data.user;
  }, []);

  const login = useCallback(async (email, password) => finish(await api.post('/auth/login', { email, password })), [finish]);
  const register = useCallback(async (payload) => finish(await api.post('/auth/register', payload)), [finish]);
  const logout = useCallback(() => { api.post('/auth/logout').catch(() => {}); setToken(null); setUser(null); reconnectSocket(); }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

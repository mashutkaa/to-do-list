import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

const AuthContext = createContext(null);

const normalizeUser = (user) => {
  if (!user || typeof user !== 'object' || !user.id || !user.email) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: typeof user.name === 'string' ? user.name : '',
  };
};

const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!token || !storedUser) {
      return null;
    }

    return normalizeUser(JSON.parse(storedUser));
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const login = useCallback(({ token: nextToken, user: nextUser }) => {
    const normalizedUser = normalizeUser(nextUser);

    if (!nextToken || !normalizedUser) {
      throw new Error('Invalid authentication payload');
    }

    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setToken(nextToken);
    setUser(normalizedUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user && token),
      login,
      logout,
    }),
    [user, token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

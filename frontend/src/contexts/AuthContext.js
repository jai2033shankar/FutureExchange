import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AuthContext = createContext(null);

function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('e4n_token'));

  const axiosConfig = useCallback(() => {
    const config = { withCredentials: true, headers: {} };
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  }, [token]);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/auth/me`, axiosConfig());
      setUser(data);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('e4n_token');
    } finally {
      setLoading(false);
    }
  }, [axiosConfig]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('e4n_token', data.token);
      }
      setUser(data);
      return { success: true };
    } catch (e) {
      return { success: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const register = async (email, password, name, role, organization) => {
    try {
      const { data } = await axios.post(`${API}/auth/register`, { email, password, name, role, organization }, { withCredentials: true });
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('e4n_token', data.token);
      }
      setUser(data);
      return { success: true };
    } catch (e) {
      return { success: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch {}
    setUser(null);
    setToken(null);
    localStorage.removeItem('e4n_token');
  };

  const apiCall = useCallback(async (method, url, data = null) => {
    const config = axiosConfig();
    try {
      const response = method === 'get'
        ? await axios.get(`${API}${url}`, config)
        : method === 'delete'
          ? await axios.delete(`${API}${url}`, config)
          : await axios[method](`${API}${url}`, data, config);
      return response.data;
    } catch (e) {
      throw new Error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  }, [axiosConfig]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, apiCall, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

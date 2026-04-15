// contexts/AuthContext.js
import React, { createContext, useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);

    const logout = async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        setUser(null);
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, setUser, setToken, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
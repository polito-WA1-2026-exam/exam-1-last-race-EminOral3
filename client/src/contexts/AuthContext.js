import { createContext } from 'react';

// Holds the current user (or null) plus login/logout helpers.
const AuthContext = createContext(null);

export default AuthContext;
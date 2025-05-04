import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { getToken, removeToken, setToken } from "../utils/token";

import { jwtDecode } from "jwt-decode";

export type AuthenticationState =
  | {
      isAuthenticated: true;
      token: string;
      userId: string;
    }
  | {
      isAuthenticated: false;
    };

export type Authentication = {
  state: AuthenticationState;
  authenticate: (token: string) => void;
  signout: () => void;
};

export const AuthenticationContext = createContext<Authentication | undefined>(
  undefined,
);

export const AuthenticationProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [state, setState] = useState<AuthenticationState>(() => {
    const storedToken = getToken();
    if (storedToken) {
      try {
        const decoded = jwtDecode<{ id: string }>(storedToken);
        return {
          isAuthenticated: true,
          token: storedToken,
          userId: decoded.id,
        };
      } catch (error) {
        removeToken();
      }
    }
    return { isAuthenticated: false };
  });

  const authenticate = useCallback(
    (token: string) => {
      setToken(token);
      setState({
        isAuthenticated: true,
        token,
        userId: jwtDecode<{ id: string }>(token).id,
      });
    },
    [setState],
  );

  const signout = useCallback(() => {
    removeToken();
    setState({ isAuthenticated: false });
  }, [setState]);

  const contextValue = useMemo(
    () => ({ state, authenticate, signout }),
    [state, authenticate, signout],
  );

  return (
    <AuthenticationContext.Provider value={contextValue}>
      {children}
    </AuthenticationContext.Provider>
  );
};

export function useAuthentication() {
  const context = useContext(AuthenticationContext);
  if (!context) {
    throw new Error(
      "useAuthentication must be used within an AuthenticationProvider",
    );
  }
  return context;
}

export function useAuthToken() {
  const { state } = useAuthentication();
  if (!state.isAuthenticated) {
    throw new Error("User is not authenticated");
  }
  return state.token;
}

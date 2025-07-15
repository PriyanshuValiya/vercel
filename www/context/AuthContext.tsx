/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client"; // Use the same client instance
import { type User } from "../types/types";

export const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const mapUser = (user: any): User | null => {
      if (!user) return null;
      return {
        id: user.id,
        email: user.email ?? "",
        user_metadata: {
          full_name: user.identities[0]?.identity_data?.preferred_username,
          avatar_url: user.user_metadata?.avatar_url,
        },
      };
    };

    const getSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setUser(mapUser(data?.session?.user));
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(mapUser(session?.user));
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

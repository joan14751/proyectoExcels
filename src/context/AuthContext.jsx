import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../api/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const getProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error perfil:", error);
        
        // Crear perfil si no existe
        if (error.code === 'PGRST116') {
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              nombre: "Usuario",
              email: user?.email || '',
              rol: 'usuario'
            })
            .select()
            .single();
          setProfile(newProfile);
        }
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) getProfile(session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth Event:", event);
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = (email, password) => supabase.auth.signInWithPassword({ email, password });

  const register = async (email, password, nombre, rol = 'usuario') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } }
    });
    if (error) throw error;

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        nombre,
        email,
        rol
      });
    }
    return data;
  };

  const logout = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
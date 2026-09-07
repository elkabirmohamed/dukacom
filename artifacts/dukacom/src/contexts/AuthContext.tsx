import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserDoc, getUserDoc, UserDoc } from "@/lib/firestore-helpers";

interface AuthContextType {
  currentUser: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, nom: string, password: string, role: "visiteur" | "vendeur") => Promise<void>;
  logout: () => Promise<void>;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUserDoc() {
    if (currentUser) {
      const doc = await getUserDoc(currentUser.uid);
      setUserDoc(doc);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserDoc(null);
        setLoading(false);
        return;
      }

      try {
        const doc = await getUserDoc(user.uid);
        setUserDoc(doc);
      } catch (error) {
        // Une erreur de lecture du profil ne doit pas empêcher Firebase Auth
        // de terminer son initialisation ni bloquer les pages protégées.
        console.error("Impossible de charger le profil utilisateur :", error);
        setUserDoc(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function register(
    email: string,
    nom: string,
    password: string,
    role: "visiteur" | "vendeur"
  ) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: nom });
    await createUserDoc(cred.user.uid, { email, nom, role });
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{ currentUser, userDoc, loading, login, register, logout, refreshUserDoc }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

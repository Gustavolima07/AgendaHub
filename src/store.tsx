import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { onValue, ref, runTransaction, get } from 'firebase/database';
import { Account } from './types';
import { auth, db } from './firebase';
import { emptyAccount, normalize } from './domain';
type Store = {
  user: User | null;
  account: Account;
  loading: boolean;
  online: boolean;
  ready: boolean;
  error: string;
  mutate: (fn: (a: Account) => void) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Store>(null!);
export const useStore = () => useContext(Context);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [account, setAccount] = useState(emptyAccount),
    [loading, setLoading] = useState(true),
    [ready, setReady] = useState(false),
    [online, setOnline] = useState(false),
    [error, setError] = useState('');
  const current = useRef<User | null>(null);
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        current.current = u;
        setUser(u);
        setAccount(emptyAccount());
        setReady(false);
        setLoading(false);
        setError('');
      }),
    [],
  );
  useEffect(() => onValue(ref(db, '.info/connected'), (s) => setOnline(s.val() === true)), []);
  useEffect(() => {
    if (!user) return;
    return onValue(
      ref(db, `users/${user.uid}`),
      (s) => {
        setAccount(normalize(s.val()));
        setReady(true);
        setError('');
      },
      () => {
        setError('Não foi possível sincronizar os dados. Verifique sua conexão e tente novamente.');
        setReady(false);
      },
    );
  }, [user]);
  async function mutate(fn: (a: Account) => void) {
    const u = current.current;
    if (!u || !ready) throw Error('Aguarde a sincronização da sua conta.');
    if (!online) throw Error('Você está offline. Reconecte-se para salvar com segurança.');
    const node = ref(db, `users/${u.uid}`);
    await get(node);
    await runTransaction(
      node,
      (raw) => {
        const data = normalize(raw ? JSON.parse(JSON.stringify(raw)) : null);
        fn(data);
        return JSON.parse(JSON.stringify(data));
      },
      { applyLocally: false },
    );
  }
  async function logout() {
    await signOut(auth);
  }
  return (
    <Context.Provider value={{ user, account, loading, ready, online, error, mutate, logout }}>
      {children}
    </Context.Provider>
  );
}

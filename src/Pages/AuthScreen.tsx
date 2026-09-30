import React, { useState } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { CalendarDays, ArrowRight, Check, Leaf } from 'lucide-react-native';
import { auth } from '../firebase';
import { ThemedText, Field, Button, Chips, Card, layoutStyles, useTheme } from '../ui';
export function AuthScreen() {
  const t = useTheme(),
    { width } = useWindowDimensions(),
    [mode, setMode] = useState('login'),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [name, setName] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit() {
    setMessage('');
    setBusy(true);
    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        throw Error('Informe um e-mail válido.');
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email.trim());
        setMessage(
          'Se houver uma conta com esse e-mail, você receberá as instruções de recuperação.',
        );
        return;
      }
      if (mode === 'signup') {
        if (!name.trim()) throw Error('Informe seu nome.');
        if (password.length < 8) throw Error('Use uma senha com pelo menos 8 caracteres.');
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(result.user, { displayName: name.trim() });
      } else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: any) {
      const errors: Record<string, string> = {
        'auth/invalid-credential': 'E-mail ou senha incorretos.',
        'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde e tente novamente.',
        'auth/network-request-failed': 'Não foi possível conectar. Verifique sua internet.',
        'auth/weak-password': 'Escolha uma senha mais forte.',
        'auth/operation-not-allowed': 'O login ainda não foi habilitado no Firebase.',
      };
      setMessage(
        errors[e.code] || (e.code ? 'Não foi possível entrar. Tente novamente.' : e.message),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.background }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: width > 800 ? 60 : 24,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{
          width: '100%',
          maxWidth: 1100,
          flexDirection: width > 800 ? 'row' : 'column',
          gap: width > 800 ? 90 : 32,
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1, gap: 28, width: '100%' }}>
          <View style={layoutStyles.row}>
            <View style={{ backgroundColor: t.primary, padding: 12, borderRadius: 16 }}>
              <CalendarDays size={28} color="white" />
            </View>
            <ThemedText bold size={26}>
              AgendaHub
              <ThemedText color={t.primary} size={26}>
                .
              </ThemedText>
            </ThemedText>
          </View>
          <View style={{ gap: 18 }}>
            <ThemedText
              size={width > 800 ? 48 : 34}
              bold
              style={{ lineHeight: width > 800 ? 56 : 42 }}
            >
              Seu dia em ordem. Seu negócio em movimento.
            </ThemedText>
            <ThemedText muted size={17}>
              Clientes, produtos, compromissos e entregas. Tudo conectado, em um só lugar.
            </ThemedText>
          </View>
          <View style={{ gap: 14 }}>
            {[
              'Uma agenda que acompanha seu ritmo',
              'Entregas planejadas, sem esquecimentos',
              'Seu espaço, com as suas cores',
            ].map((x) => (
              <View key={x} style={layoutStyles.row}>
                <Check size={18} color={t.primary} />
                <ThemedText muted>{x}</ThemedText>
              </View>
            ))}
          </View>
          <View style={layoutStyles.row}>
            <Leaf size={17} color={t.primary} />
            <ThemedText size={12} muted>
              Mais organização. Mais espaço para crescer.
            </ThemedText>
          </View>
        </View>
        <Card style={{ width: width > 800 ? 400 : '100%', padding: 30, gap: 22 }}>
          <ThemedText size={25} bold>
            {mode === 'signup'
              ? 'Vamos começar?'
              : mode === 'reset'
                ? 'Recuperar acesso'
                : 'Bem-vindo de volta'}
          </ThemedText>
          <ThemedText muted>
            {mode === 'signup'
              ? 'Crie sua conta e organize seu próximo passo.'
              : mode === 'reset'
                ? 'Enviaremos as instruções para seu e-mail.'
                : 'Entre para cuidar do que vem a seguir.'}
          </ThemedText>
          <Chips
            options={[
              { id: 'login', label: 'Entrar' },
              { id: 'signup', label: 'Criar conta' },
            ]}
            value={mode}
            onChange={(v) => {
              setMode(v);
              setMessage('');
            }}
          />
          {mode === 'signup' && <Field label="Seu nome" value={name} onChange={setName} />}
          <Field label="E-mail" value={email} onChange={setEmail} placeholder="voce@exemplo.com" />
          {mode !== 'reset' && (
            <Field
              label="Senha"
              value={password}
              onChange={setPassword}
              secure
              placeholder={mode === 'signup' ? 'Pelo menos 8 caracteres' : 'Sua senha'}
            />
          )}
          {!!message && (
            <ThemedText color={mode === 'reset' ? '#22634C' : '#B33D3D'}>{message}</ThemedText>
          )}
          <Button
            label={
              busy
                ? 'Aguarde…'
                : mode === 'signup'
                  ? 'Criar minha conta'
                  : mode === 'reset'
                    ? 'Enviar instruções'
                    : 'Entrar no AgendaHub'
            }
            icon={ArrowRight}
            disabled={busy}
            onPress={submit}
          />
          {mode !== 'reset' && (
            <Button
              label="Esqueci minha senha"
              secondary
              small
              onPress={() => {
                setMode('reset');
                setMessage('');
              }}
            />
          )}
          <ThemedText size={11} muted style={{ textAlign: 'center' }}>
            Seus dados ficam vinculados à sua conta.
          </ThemedText>
        </Card>
      </View>
    </ScrollView>
  );
}

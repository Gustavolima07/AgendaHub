import React, { useState } from 'react';
import { View, Pressable, Switch } from 'react-native';
import { Check, Palette as PaletteIcon, Bell, User } from 'lucide-react-native';
import { Palette } from '../types';
import { useStore } from '../store';
import { T, Card, Button, Field, ThemeContext, s, Badge, useTheme } from '../ui';
import { palettes, uid } from '../domain';
import { enableNotifications } from '../notifications';
export function Settings({ notify }: { notify: (s: string) => void }) {
  const { account, mutate, user } = useStore(),
    t = useTheme(),
    [preview, setPreview] = useState<Palette>(t),
    [custom, setCustom] = useState(false),
    [name, setName] = useState(account.settings.name || user?.displayName || ''),
    [busy, setBusy] = useState(false);
  const valid = [
    preview.primary,
    preview.background,
    preview.surface,
    preview.text,
    preview.muted,
    preview.accent,
  ].every((c) => /^#[0-9a-f]{6}$/i.test(c));
  async function apply() {
    if (!valid || !preview.name.trim())
      return notify('Preencha o nome e cores hexadecimais válidas (#RRGGBB).');
    setBusy(true);
    try {
      await mutate((a) => {
        a.settings.palette = preview;
        if (custom)
          a.settings.palettes = [
            ...(a.settings.palettes || []).filter((p) => p.id !== preview.id),
            preview,
          ];
      });
      notify('Sua nova paleta foi aplicada.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.stack}>
      <Card>
        <View style={s.row}>
          <PaletteIcon color={t.primary} />
          <T bold size={20}>
            Um espaço com a sua cara
          </T>
        </View>
        <T muted>Escolha uma paleta e veja como o aplicativo ficará antes de aplicar.</T>
        <View style={s.wrap}>
          {[...palettes, ...account.settings.palettes].map((p) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Prévia ${p.name}`}
              key={p.id}
              onPress={() => {
                setPreview(p);
                setCustom(false);
              }}
              style={{
                width: 155,
                padding: 14,
                borderRadius: 14,
                borderColor: preview.id === p.id ? t.primary : t.muted + '33',
                borderWidth: 2,
                gap: 10,
              }}
            >
              <View style={s.row}>
                {[p.primary, p.accent, p.background].map((c, i) => (
                  <View
                    key={i}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: c,
                      borderWidth: 1,
                      borderColor: '#00000015',
                    }}
                  />
                ))}
              </View>
              <T bold size={13}>
                {p.name}
                {t.id === p.id ? ' • atual' : ''}
              </T>
            </Pressable>
          ))}
        </View>
        <Button
          secondary
          label="Criar minha paleta"
          onPress={() => {
            setCustom(true);
            setPreview({ ...t, id: uid(), name: 'Minha paleta' });
          }}
        />
        {custom && (
          <View style={s.stack}>
            <Field
              label="Nome da paleta"
              value={preview.name}
              onChange={(v) => setPreview({ ...preview, name: v })}
            />
            <View style={s.wrap}>
              {(['primary', 'background', 'surface', 'text', 'muted', 'accent'] as const).map(
                (key, i) => (
                  <View key={key} style={{ width: 180 }}>
                    <Field
                      label={
                        [
                          'Cor principal',
                          'Fundo',
                          'Cartões',
                          'Texto',
                          'Texto secundário',
                          'Destaque',
                        ][i]
                      }
                      value={preview[key]}
                      onChange={(v) => setPreview({ ...preview, [key]: v })}
                    />
                  </View>
                ),
              )}
            </View>
          </View>
        )}
        <T bold>Prévia ao vivo</T>
        {valid ? (
          <ThemeContext.Provider value={preview}>
            <View
              style={{
                backgroundColor: preview.background,
                padding: 24,
                borderRadius: 16,
                gap: 16,
                borderWidth: 1,
                borderColor: preview.muted + '40',
              }}
            >
              <View style={s.between}>
                <T size={22} bold>
                  Olá, {name.split(' ')[0] || 'você'} ☀
                </T>
                <Badge>Hoje</Badge>
              </View>
              <Card>
                <T bold>Seu dia está organizado</T>
                <T muted>09:00 • Entrega programada</T>
                <Button label="Ver minha agenda" icon={Check} onPress={() => {}} />
              </Card>
              <T size={12} muted>
                Exemplo de cores, textos e botões do aplicativo.
              </T>
            </View>
          </ThemeContext.Provider>
        ) : (
          <T color="#B33D3D">Use cores no formato #RRGGBB para visualizar.</T>
        )}
        <Button
          label={busy ? 'Aplicando…' : 'Aplicar esta paleta'}
          onPress={apply}
          disabled={busy || !valid}
        />
      </Card>
      <Card>
        <View style={s.row}>
          <User color={t.primary} />
          <T size={20} bold>
            Minha conta
          </T>
        </View>
        <T muted>{user?.email}</T>
        <Field label="Como você quer ser chamado?" value={name} onChange={setName} />
        <Button
          secondary
          label="Salvar nome"
          onPress={async () => {
            try {
              await mutate((a) => {
                a.settings.name = name.trim();
              });
              notify('Nome atualizado.');
            } catch (e) {
              notify((e as Error).message);
            }
          }}
        />
      </Card>
      <Card>
        <View style={s.between}>
          <View style={s.row}>
            <Bell color={t.primary} />
            <T bold>Notificações no aparelho</T>
          </View>
          <Switch
            accessibilityLabel="Ativar notificações"
            value={account.settings.notifications}
            onValueChange={async (v) => {
              try {
                if (v) await enableNotifications();
                await mutate((a) => {
                  a.settings.notifications = v;
                });
                notify(v ? 'Lembretes ativados neste aparelho.' : 'Lembretes desativados.');
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          />
        </View>
        <T muted>
          O painel sempre mostra as próximas atividades. No Android/iOS, você também pode receber
          lembretes locais, mesmo com o app fechado. Abra o aplicativo após alterações feitas em
          outro aparelho para atualizar os lembretes.
        </T>
      </Card>
    </View>
  );
}

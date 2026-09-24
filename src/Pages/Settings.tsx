import React, { useState } from 'react';
import { View, Pressable, Switch } from 'react-native';
import { Check, Palette as PaletteIcon, Bell, User } from 'lucide-react-native';
import { Palette } from '../types';
import { useStore } from '../store';
import {
  ThemedText,
  Card,
  Button,
  Field,
  ThemeContext,
  layoutStyles,
  interactiveZoom,
  Badge,
  useTheme,
} from '../ui';
import { palettes, uid } from '../domain';
import { enableNotifications } from '../notifications';
export function Settings({ notify }: { notify: (s: string) => void }) {
  const { account, mutate, user } = useStore(),
    theme = useTheme(),
    [preview, setPreview] = useState<Palette>(theme),
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
  ].every((colorHex) => /^#[0-9a-f]{6}$/i.test(colorHex));
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
    <View style={layoutStyles.stack}>
      <Card>
        <View style={layoutStyles.row}>
          <PaletteIcon color={theme.primary} />
          <ThemedText bold size={20}>
            Um espaço com a sua cara
          </ThemedText>
        </View>
        <ThemedText muted>
          Escolha uma paleta e veja como o aplicativo ficará antes de aplicar.
        </ThemedText>
        <View style={layoutStyles.wrap}>
          {[...palettes, ...account.settings.palettes].map((palette) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Prévia ${palette.name}`}
              key={palette.id}
              onPress={() => {
                setPreview(palette);
                setCustom(false);
              }}
              style={({ pressed, hovered }: any) => ({
                width: 155,
                padding: 14,
                borderRadius: 14,
                borderColor: preview.id === palette.id ? theme.primary : theme.muted + '33',
                borderWidth: 2,
                gap: 10,
                ...interactiveZoom(pressed, hovered, 0.975, 1.025),
              })}
            >
              <View style={layoutStyles.row}>
                {[palette.primary, palette.accent, palette.background].map((colorHex, index) => (
                  <View
                    key={index}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: colorHex,
                      borderWidth: 1,
                      borderColor: '#00000015',
                    }}
                  />
                ))}
              </View>
              <ThemedText bold size={13}>
                {palette.name}
                {theme.id === palette.id ? ' • atual' : ''}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <Button
          secondary
          label="Criar minha paleta"
          onPress={() => {
            setCustom(true);
            setPreview({ ...theme, id: uid(), name: 'Minha paleta' });
          }}
        />
        {custom && (
          <View style={layoutStyles.stack}>
            <Field
              label="Nome da paleta"
              value={preview.name}
              onChange={(v) => setPreview({ ...preview, name: v })}
            />
            <View style={layoutStyles.wrap}>
              {(['primary', 'background', 'surface', 'text', 'muted', 'accent'] as const).map(
                (key, colorIndex) => (
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
                        ][colorIndex]
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
        <ThemedText bold>Prévia ao vivo</ThemedText>
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
              <View style={layoutStyles.between}>
                <ThemedText size={22} bold>
                  Olá, {name.split(' ')[0] || 'você'} ☀
                </ThemedText>
                <Badge>Hoje</Badge>
              </View>
              <Card>
                <ThemedText bold>Seu dia está organizado</ThemedText>
                <ThemedText muted>09:00 • Entrega programada</ThemedText>
                <Button label="Ver minha agenda" icon={Check} onPress={() => {}} />
              </Card>
              <ThemedText size={12} muted>
                Exemplo de cores, textos e botões do aplicativo.
              </ThemedText>
            </View>
          </ThemeContext.Provider>
        ) : (
          <ThemedText color="#B33D3D">Use cores no formato #RRGGBB para visualizar.</ThemedText>
        )}
        <Button
          label={busy ? 'Aplicando…' : 'Aplicar esta paleta'}
          onPress={apply}
          disabled={busy || !valid}
        />
      </Card>
      <Card>
        <View style={layoutStyles.row}>
          <User color={theme.primary} />
          <ThemedText size={20} bold>
            Minha conta
          </ThemedText>
        </View>
        <ThemedText muted>{user?.email}</ThemedText>
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
        <View style={layoutStyles.between}>
          <View style={layoutStyles.row}>
            <Bell color={theme.primary} />
            <ThemedText bold>Notificações no aparelho</ThemedText>
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
        <ThemedText muted>
          O painel sempre mostra as próximas atividades. No Android/iOS, você também pode receber
          lembretes locais, mesmo com o app fechado. Abra o aplicativo após alterações feitas em
          outro aparelho para atualizar os lembretes.
        </ThemedText>
      </Card>
    </View>
  );
}

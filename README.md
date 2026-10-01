# AgendaHub 🌿

Seu dia em ordem. Seu negócio em movimento.

Aplicativo em **React Native + Expo + TypeScript** que reúne clientes, produtos, compromissos, pedidos mensais e entregas. Interface adaptável a celulares, tablets e navegador, com animações **Moti** e temas personalizáveis.

- **Aplicativo web:** https://agendahub-26997.web.app
- **Repositório:** https://github.com/Gustavolima07/AgendaHub
- **Firebase:** https://console.firebase.google.com/project/agendahub-26997/overview

## Funcionalidades

| Área        | Recursos                                                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Visão geral | Resumo diário, atividades próximas, pendências, contadores e atalhos                                                                          |
| Agenda      | Calendário, visualizações por dia/semana/mês, compromissos, vínculo com cliente, duração, conclusão/cancelamento, horários livres e conflitos |
| Clientes    | Contato, endereço, observações, histórico, arquivamento/restauração e produtos mensais fixos                                                  |
| Produtos    | Nome, tipo, preço, estoque físico, quantidade reservada e disponível                                                                          |
| Entregas    | Programação por calendário, destinatário, endereço, produtos, conclusão e cancelamento                                                        |
| Recorrência | Geração de pedidos mensais com prevenção de duplicações e ajuste para meses curtos                                                            |
| Exportação  | CSV mensal com **somente Nome, Tipo e Quantidade**, agrupado por nome e tipo                                                                  |
| Rotas       | Paradas do dia, inclusão/edição, reordenação, sugestão por proximidade, Google Maps, Waze e exportação TXT                                    |
| Aparência   | Jardim, Oceano, Lavanda, Terracota, Rosé e Noturno; criação e armazenamento de paletas; prévia antes de aplicar                               |
| Contas      | Firebase Authentication com e-mail/senha, sessão persistente e recuperação de senha                                                           |
| Lembretes   | Painel de alertas e notificações locais opcionais no Android/iOS                                                                              |

## Rodar o projeto

Requisitos: Node.js 22.13 ou superior e npm. O projeto utiliza Expo SDK 57; use um Expo Go compatível com esse SDK ou um development build.

```bash
npm ci
npm start
```

Escaneie o QR Code com o Expo Go. Computador e celular devem estar na mesma rede. Para desenvolvimento web:

```bash
npm run web
```

Outros comandos:

```bash
npm run android       # abrir no emulador Android disponível
npm run ios           # simulador iOS, requer macOS
npm run typecheck
npm test
npm run build:web
```

## Primeiro uso

1. Crie sua conta na tela inicial.
2. Cadastre os produtos com preço e quantidade em estoque.
3. Cadastre clientes com endereço completo. Se necessário, ative **Produtos mensais fixos**, escolha produtos, quantidades, dia e horário.
4. Em **Entregas e rotas**, escolha o mês no calendário e pressione **Gerar entregas mensais**. Também é possível criar entregas avulsas.
5. Revise compromissos na agenda e ordene as paradas em **Rota do dia**.
6. Ao entregar, pressione **Concluir entrega** para baixar o estoque.
7. Em **Personalizar**, escolha uma paleta, confira a prévia e aplique.

## Regras de funcionamento

- Cada conta tem seus próprios dados em `users/{uid}`. Não existe compartilhamento de dados entre contas.
- Compromissos e entregas usam a mesma disponibilidade. Sobreposição de intervalos bloqueia o salvamento; atividades consecutivas são permitidas.
- Horários livres sugeridos: 08h–18h, em passos de 30 minutos. É possível informar outro horário manualmente; a atividade deve terminar no mesmo dia.
- Datas e horários são locais, sem conversão de fuso. Use o mesmo fuso nos dispositivos que gerenciam a conta.
- Entregas pendentes reservam estoque. Concluir uma entrega baixa a quantidade uma única vez; cancelar libera a reserva. Entregas finalizadas ficam no histórico e não são reabertas.
- Preço, nome, tipo e endereço são copiados para a entrega, preservando o histórico após mudanças no cadastro.
- Arquivar preserva o histórico. Clientes com entregas pendentes e produtos associados a entregas pendentes ou planos mensais não podem ser arquivados.
- A geração mensal é acionada pelo usuário, não por um serviço em segundo plano. Cada cliente gera no máximo uma entrega por mês; até uma entrega cancelada mantém a chave para impedir duplicações. Para uma substituição, crie uma entrega avulsa.
- Dia 31 é ajustado ao último dia dos meses mais curtos. Se houver conflito ou falta de estoque, a geração inteira é cancelada e o cliente que exige ajuste aparece no aviso.
- Transações do Realtime Database evitam perda de atualização simultânea e verificam novamente conflitos e reservas. É necessário estar online para salvar.
- A exportação mensal inclui entregas pendentes e concluídas do mês selecionado; exclui canceladas. Usa UTF-8 com BOM, separador `;` e proteção contra fórmulas em células de texto.

## Rotas e navegação

As paradas são as entregas pendentes da data selecionada. Use as setas para reordenar. Para retirar uma parada, reprograme a data ou cancele a entrega. Alterações de ordem não modificam os horários: revise as janelas antes de sair.

**Proximidade:** preencha latitude e longitude no cadastro dos clientes. A sugestão mantém a primeira parada e escolhe as próximas pela distância geográfica aproximada. Não considera trânsito, estradas, tempo real ou restrições de horário e não garante a rota ótima. Sem coordenadas, a ordem manual funciona normalmente.

**Google Maps:** as rotas são divididas em trechos de até três paradas para compatibilidade móvel; cada trecho posterior começa na última parada anterior. **Waze:** abre um destino por vez. O arquivo TXT contém a lista na ordem escolhida e os links dos trechos do Maps.

## Notificações

Ative em **Personalizar → Notificações no aparelho** e permita notificações no sistema. São lembretes locais, não push de um servidor. O app agenda as próximas 60 notificações futuras e atualiza/cancela os lembretes ao sincronizar mudanças. Ao sair da conta, cancela os agendamentos locais.

Abra o aplicativo em cada aparelho após mudanças realizadas em outro dispositivo para atualizar seus lembretes. A entrega da notificação depende das permissões, economia de bateria e políticas do sistema. Na web, os alertas são exibidos dentro do aplicativo; não há notificação web com o navegador fechado.

## Firebase

Projeto: `agendahub-26997`. Authentication por e-mail/senha e Realtime Database estão configurados. O banco está na região `us-central1`.

`src/firebase-config.json` contém apenas a configuração pública do SDK cliente. Ela **não é uma credencial administrativa**. Senhas são gerenciadas pelo Firebase Authentication e não são armazenadas no Realtime Database. Não inclua tokens da CLI, chaves de contas de serviço ou arquivos privados no Git.

As regras em `database.rules.json` negam acesso anônimo e entre usuários, validam campos essenciais, quantidades e status. Regras de negócio como conflitos e otimização são implementadas no domínio do aplicativo; não constituem um mecanismo de autorização para cenários futuros de equipes compartilhadas.

```text
users/{uid}/
  clients/{id}
  products/{id}
  appointments/{id}
  deliveries/{id}
  settings/
```

Para usar outro projeto, substitua a configuração do SDK e o alias em `.firebaserc`, habilite e-mail/senha, crie o Realtime Database e publique as regras.

## Testes locais com Firebase Emulator

Requisitos adicionais: Firebase CLI e Java compatível com os emuladores.

```bash
firebase emulators:exec --only database --project demo-agendahub --config firebase.test.json "npm run test:rules"
```

Os testes usam uma configuração isolada na porta `9001`, para poderem rodar enquanto o emulador usado pela interface permanece aberto na porta `9000`.

Testes cobrem isolamento de contas, acesso anônimo, validação de estoque, conflitos, reservas, conclusão idempotente, recorrência, CSV e divisão de rotas.

Para testar a interface com dados fictícios, em terminais separados:

```bash
firebase emulators:start --only auth,database --project agendahub-26997
npx tsx scripts/seed-emulator.ts
```

No PowerShell:

```powershell
$env:EXPO_PUBLIC_USE_EMULATORS='true'
npx expo start --web --port 8085
```

Conta exclusivamente local: `demo@agendahub.test`, senha `AgendaHub-local-2026`. O script conecta explicitamente aos emuladores, nunca ao banco de produção. Remova a variável antes de iniciar desenvolvimento contra o Firebase real. O uso de emuladores também exige `__DEV__`; builds de produção ignoram a variável.

## Publicação web

### Google Places e Geocoding

O cadastro de clientes usa Places Autocomplete para sugerir endereços e Geocoding para converter o endereço em coordenadas. Ative **Maps JavaScript API**, **Places API (New)** e **Geocoding API** no mesmo projeto do Google Cloud, com faturamento configurado. Defina `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` em `.env.local` antes de iniciar o Expo ou gerar o site. O arquivo `.env.example` mostra o formato; não coloque a chave real no Git.

Como a chave usada pela Maps JavaScript API aparece no navegador, restrinja-a por HTTP referrer aos domínios de desenvolvimento e produção e limite as APIs permitidas às três acima. As chamadas nativas exigem chaves Android e iOS separadas, configuradas em `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY` e `EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY`, com restrições para o aplicativo; no Android, informe também o SHA-1 do certificado em `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_CERT_SHA1`. Não reutilize a chave web. Consulte as [práticas de segurança do Google Maps Platform](https://developers.google.com/maps/api-security-best-practices).

```bash
firebase login
npm run deploy
```

O comando gera `dist/` e publica Hosting e regras no projeto configurado. O Firebase Hosting fornece HTTPS. O app web inicia na tela de login e a conta do usuário começa sem dados de demonstração.

## Builds Android e iOS

O arquivo `eas.json` inclui os perfis development, preview (APK Android) e production. Para gerar binários, use sua conta Expo e configure o projeto EAS:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

Publicar nas lojas exige as contas de desenvolvedor e a assinatura correspondentes. O repositório inclui o código nativo compartilhado e a configuração; um deploy web não gera nem publica APK/IPA automaticamente.

## Estrutura

```text
src/app/                Rotas e layouts do Expo Router (entrada do aplicativo)
src/app/(workspace)/    Rotas protegidas por autenticação
src/Pages/              Uma tela por arquivo: Dashboard, Agenda, Clients, Products,
                        Deliveries, Settings e AuthScreen
src/Components/         Layout responsivo, componentes compartilhados e EditorSheet
src/contexts/           Ações compartilhadas, mensagens, editor e lembretes
src/Router/navigation.ts Metadados e caminhos do menu
src/hooks/              Hooks compartilhados
src/ui.tsx              Componentes visuais e animações Moti
src/domain.ts           Regras de horários, estoque, recorrência e rotas
src/store.tsx           Autenticação, assinatura em tempo real e transações
src/firebase*.ts        SDK web e persistência nativa
src/notifications.ts    Agendamento local
src/export.ts           Download web e compartilhamento nativo
tests/                  Testes de domínio e regras do Firebase
scripts/                Dados fictícios para emuladores locais
```

Referências: [Expo e Firebase](https://docs.expo.dev/guides/using-firebase/), [Firebase Security Rules](https://firebase.google.com/docs/database/security), [Moti](https://moti.fyi/).

### Rotas

As páginas ficam em `src/Pages` e são conectadas por arquivos pequenos em `src/app`.
Não há um arquivo único com todas as telas. A navegação usa Expo Router, com suporte
a histórico do navegador, links diretos e proteção de telas após sair da conta.

| Caminho         | Página                                 |
| --------------- | -------------------------------------- |
| `/login`        | Entrar, criar conta e recuperar acesso |
| `/`             | Visão geral                            |
| `/agenda`       | Agenda; aceita `?date=AAAA-MM-DD`      |
| `/clientes`     | Clientes e histórico                   |
| `/produtos`     | Catálogo e estoque                     |
| `/entregas`     | Entregas e rotas                       |
| `/personalizar` | Temas, conta e lembretes               |

Execute `npm run lint` e `npm run typecheck` antes de publicar alterações.

# comu-ministerio

Sistema para comunicação entre Gestor de Chamados e ministérios da igreja.

## Estrutura

- `painel/`: painel web em HTML, CSS, JavaScript e Bootstrap 5.
- `app/`: app Ionic + Capacitor + JavaScript para Android.

## Firebase

O projeto usa Firebase Authentication com Google Auth e Firebase Realtime Database.

Nos do banco usados:

- `ministerios`
- `gestores`
- `usuarios`
- `usuariosOnline`
- `mensagens`

O primeiro gestor cadastrado no painel é aprovado automaticamente quando ainda não existe outro gestor aprovado. Depois disso, novos gestores ficam pendentes e devem ser aprovados na aba `Aprovações`.

## Como abrir o painel

Abra `painel/index.html` em um navegador moderno ou sirva a pasta com um servidor local.

## Como rodar o app Ionic/Capacitor

Entre na pasta do app:

```bash
cd app
npm install
npm run start
```

Abra no PC:

```text
http://localhost:8100
```

Esse modo é o mais rápido para testar tela, login, Realtime Database e fluxo geral. Como o Firebase sincroniza em tempo real, alterações no banco aparecem sem recarregar. Alterações no código HTML/CSS/JS podem precisar de um refresh do navegador.

Para Android:

```bash
npm run cap:add:android
npm run assets:generate
npm run cap:copy:google-services
npm run cap:copy
npx cap open android
```

O arquivo `google-services.json` fica guardado em `app/google-services.json`. Depois que a pasta Android for criada, rode `npm run cap:copy:google-services` para copiá-lo para `app/android/app/google-services.json`, que é o caminho esperado pelo Android/Firebase.

A logo principal fica em `img/logo.png`. Ela foi copiada para o painel, para o app web e para `app/resources/icon.png`. Rode `npm run assets:generate` depois de criar o Android para gerar os ícones nativos do APK.

Para testar em emulador Android:

1. Instale o Android Studio.
2. Abra o Device Manager e crie/inicie um emulador.
3. Rode `npm run android:open` dentro da pasta `app`.
4. No Android Studio, clique em Run.

Para live reload no emulador, use o Ionic CLI:

```bash
npx ionic capacitor run android -l --external
```

Se o emulador não conseguir acessar o servidor, teste no navegador primeiro e confirme que o PC e o emulador estão na mesma rede virtual. No Android Studio, o endereço `10.0.2.2` aponta para o `localhost` do PC.

No Firebase Console, habilite `Authentication > Sign-in method > Google` e adicione os domínios/SHAs necessários para web e Android.

## Regras sugeridas para o Realtime Database

Use `database.rules.json` como ponto de partida e ajuste conforme a política da igreja.

# Paseo Generative UI

Plugin Paseo che porta in ogni chat l'equivalente di "Intelligent UI" di ChatGPT (7 ottobre 2026): gli agenti mostrano blocchi di interfaccia interattivi tramite lo strumento MCP `show_ui`. Design e decisioni: `docs/design.md`. Catalogo componenti: `docs/catalogo.md`. Guida per gli agenti: `docs/guida-agenti.md`.

## Architettura

- `index.server.ts`: hook `agent.create` inietta un server MCP stdio inline (`node --eval`) con `show_ui`; bridge HTTP loopback con token per agente che fa `timeline.append` (kind `generative-ui` v1); persistenza in `~/.paseo/plugin-data/generative-ui/<agent>.json` (max 200 righe per agente).
- `shared/`: schema Zod della spec, azioni, sanificazione HTML.
- `client/`: renderer della timeline, design system in `client/ds/`, galleria UI (`client/gallery.tsx`, schermata con interruttore "Forza compatto"): dal 3 novembre 2026 NON è più registrata né ha la voce in sidebar (Matteo non la vuole, i blocchi compaiono in linea nelle risposte); il file resta come banco di prova, per riattivarla servono `addScreen` e `addSidebarHeaderItem` in `index.client.tsx`.
- Azioni utente: `usePaseo().agents.ref(agentId).send("[Azione UI] ...")`.
- OpenUI Lang (dal 9 novembre 2026, ispirato a thesysdev/open-intelligent-ui, scelto da Matteo dopo il confronto con CopilotKit e Aditya): `show_ui` accetta `openui` (testo, max 20000 caratteri) in alternativa a `spec`. Le firme dei componenti (Zod, ordine delle chiavi = ordine degli argomenti) stanno in `shared/openui-signatures.ts` senza React e servono al server (validazione con `@openuidev/lang-core`, `checkOpenUi`) e al client; l'implementazione React Native è in `client/openui/` (`library.tsx`, `base.tsx`, `content.tsx`, `controls.tsx`) e il blocco è disegnato da `Renderer` di `@openuidev/react-lang` (ramo `OpenUiBlock` in `client/generative-ui.tsx`). Il prompt per gli agenti è GENERATO: `npm run prompt` scrive `docs/openui-prompt.md` e `shared/openui-prompt.generated.ts`, e la descrizione dello strumento show_ui lo include (`server/mcp-program.ts`). Dopo ogni modifica alle firme rilancia `npm run prompt`. Test: `npm test` (tsx). Componenti rimandati perché solo web o con backend: Map, MapMarker, Math, Popover, HtmlView, YouTube, SearchImage, Svg, Celebration, Flashcard, DatePicker, Timer. Binding `$variabile` dei campi (Input, Slider, Select...) NON verificato a runtime. Slider senza trascinamento (passi meno e più).
- Aggiornamento automatico: `scripts/sync-upstream.sh`, lanciato ogni 6 ore dal LaunchAgent `com.matteozampieri.generative-ui-upstream-sync` (copia del plist in `scripts/`). Se escono nuove versioni di `@openuidev/react-lang` o `lang-core`: ramo auto, install esatto, `npm run prompt`, typecheck, test, merge in main, `paseo plugin reload`, controllo `running`; se non è running revert e secondo reload; se tutto va bene push. Salta se main non è pulito (lavoro in corso). Esito in `~/.paseo/plugin-data/generative-ui/upstream-sync.log`, fallimenti in `upstream-failure.md`, componenti upstream non ancora portati in `upstream-report.md` (i nuovi componenti si portano a mano). Non invia notifiche. Il plugin NON segue i commit di thesys: segue le versioni npm.

## Trappole

- SINTOMO `CONNECTION_CLOSED` sul server MCP: nel sottoprocesso del plugin `process.execPath` è Paseo Helper, non Node. Il comando deve essere `node` risolto dal PATH. Non usare execPath né percorsi assoluti dello script.
- L'hook è `agent.create`, non `agent.open.before`: vale per create, resume, refresh e import, non per sessioni già aperte (serve una nuova chat).
- `DocumentFrame` non esegue script: l'HTML è statico. Su mobile l'HTML mostra un ripiego perché l'SDK non offre scrittura `file:`.
- Nel runtime dei plugin mancano `react-native-svg` e `figma-squircle`: il secondo è incluso nel plugin per lo squircle su web; i grafici usano solo View (niente donut).
- SINTOMO (6 novembre 2026, da telefono): il blocco compare dentro il gruppo "Used N tools" e va aperto a mano. Causa: `timeline.append` a chiamata di `show_ui` inseriva la riga fra i passaggi degli strumenti. Correzione: il bridge accoda le righe per agente (`pendingRows`) e le aggiunge in `agent.turn_ended`, quindi dopo la risposta finale. Conseguenza: durante il turno il blocco non si vede, compare a turno finito; con lo stesso `id` vince l'ultima versione.
- Ricarica plugin con i comandi ufficiali (`paseo plugin reload generative-ui --json`), mai riavviando il daemon (ucciderebbe le chat in corso). Dopo OGNI reload verifica `paseo plugin ls generative-ui`: deve dire running.
- SINTOMO `Build failed ... Could not resolve "react-dom"` al reload, plugin `failed` (9 novembre 2026): il bundler del plugin usa esbuild senza la condition react-native, quindi `@openuidev/react-lang` risolve la build web che importa `react-dom/client` e `@openuidev/devtools`. Soluzione in uso: pacchetto stub `client/stubs/react-dom/` dichiarato come `"react-dom": "file:./client/stubs/react-dom"` (deve stare in client/, server/ o shared/: fuori da lì il boundary del plugin lo rifiuta). In React Native `document` non esiste e il percorso web non parte. Il reload fallito ferma il plugin: lo script di sync fa revert e ricarica se succede dopo un aggiornamento. Alternativa più pulita ma fragile: deep import di `index.native.mjs`.
- SINTOMO nei log di prova di `sync-upstream.sh` con `GUI_NO_RELOAD=1`: scrive comunque «plugin ricaricato e running» (la prova non verifica il reload).

## Regole di design (di Matteo)

Squircle smoothing 1, giallo #fffb00 solo accento (mai pastiglie gialle piene con glifo nero), spaziature 4/8/12/16/24/32/48/64/96, mobile compatto con aree di tocco 44 punti, testi in italiano senza trattini come connettori né grassetto.

## Stato

Fasi 1 a 3 fatte (fondazione, catalogo, azioni, persistenza, HTML). Mancano verifiche visive reali su desktop e mobile (cliccare un bottone, resa web del frame HTML): aggiornare qui l'esito.

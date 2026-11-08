# Paseo Generative UI

Plugin Paseo che porta in ogni chat l'equivalente di "Intelligent UI" di ChatGPT (7 ottobre 2026): gli agenti mostrano blocchi di interfaccia interattivi tramite lo strumento MCP `show_ui`. Design e decisioni: `docs/design.md`. Catalogo componenti: `docs/catalogo.md`. Guida per gli agenti: `docs/guida-agenti.md`.

## Architettura

- `index.server.ts`: hook `agent.create` inietta un server MCP stdio inline (`node --eval`) con `show_ui`; bridge HTTP loopback con token per agente che fa `timeline.append` (kind `generative-ui` v1); persistenza in `~/.paseo/plugin-data/generative-ui/<agent>.json` (max 200 righe per agente).
- `shared/`: schema Zod della spec, azioni, sanificazione HTML.
- `client/`: renderer della timeline, design system in `client/ds/`, galleria UI (`client/gallery.tsx`, schermata con interruttore "Forza compatto"): dal 3 novembre 2026 NON è più registrata né ha la voce in sidebar (Matteo non la vuole, i blocchi compaiono in linea nelle risposte); il file resta come banco di prova, per riattivarla servono `addScreen` e `addSidebarHeaderItem` in `index.client.tsx`.
- Azioni utente: `usePaseo().agents.ref(agentId).send("[Azione UI] ...")`.

## Trappole

- SINTOMO `CONNECTION_CLOSED` sul server MCP: nel sottoprocesso del plugin `process.execPath` è Paseo Helper, non Node. Il comando deve essere `node` risolto dal PATH. Non usare execPath né percorsi assoluti dello script.
- L'hook è `agent.create`, non `agent.open.before`: vale per create, resume, refresh e import, non per sessioni già aperte (serve una nuova chat).
- `DocumentFrame` non esegue script: l'HTML è statico. Su mobile l'HTML mostra un ripiego perché l'SDK non offre scrittura `file:`.
- Nel runtime dei plugin mancano `react-native-svg` e `figma-squircle`: il secondo è incluso nel plugin per lo squircle su web; i grafici usano solo View (niente donut).
- SINTOMO (6 novembre 2026, da telefono): il blocco compare dentro il gruppo "Used N tools" e va aperto a mano. Causa: `timeline.append` a chiamata di `show_ui` inseriva la riga fra i passaggi degli strumenti. Correzione: il bridge accoda le righe per agente (`pendingRows`) e le aggiunge in `agent.turn_ended`, quindi dopo la risposta finale. Conseguenza: durante il turno il blocco non si vede, compare a turno finito; con lo stesso `id` vince l'ultima versione.
- Ricarica plugin con i comandi ufficiali, mai riavviando il daemon (ucciderebbe le chat in corso).

## Regole di design (di Matteo)

Squircle smoothing 1, giallo #fffb00 solo accento (mai pastiglie gialle piene con glifo nero), spaziature 4/8/12/16/24/32/48/64/96, mobile compatto con aree di tocco 44 punti, testi in italiano senza trattini come connettori né grassetto.

## Stato

Fasi 1 a 3 fatte (fondazione, catalogo, azioni, persistenza, HTML). Mancano verifiche visive reali su desktop e mobile (cliccare un bottone, resa web del frame HTML): aggiornare qui l'esito.

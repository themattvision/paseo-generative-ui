# Paseo Generative UI: design

Data: 2 novembre 2026. Stato: approvato da Matteo in chat il 2 novembre 2026 (mix catalogo + HTML libero, regole di design sue, esecutori GPT).

## Intento

ChatGPT ha lanciato "Intelligent UI" il 7 ottobre 2026 (con GPT-6): le risposte possono contenere grafici, form, bottoni e piccoli strumenti interattivi invece di solo testo. Matteo vuole la stessa cosa in Paseo, in QUALSIASI chat e contesto, per qualsiasi provider (Claude, Codex, altri), e vuole che l'aspetto rispetti sempre le sue regole di design.

## Obiettivi

1. Un plugin Paseo (`paseo-generative-ui`) installato sul daemon di Matteo, senza modifiche al codice di Paseo.
2. Ogni agente riceve uno strumento MCP `show_ui` che inserisce nella timeline della chat un blocco di interfaccia.
3. Due modalità:
   a. Catalogo di componenti interattivi in React Native (card, testo, tabella, grafico a barre/linee, form con campi, bottoni, slider, scelta singola/multipla, stat, lista, callout). Funziona su desktop, web, iOS, Android.
   b. HTML/SVG statico in sandbox (`DocumentFrame`, senza script) per visuali libere: diagrammi, infografiche, mockup.
4. Le azioni dell'utente (bottone, invio form) tornano all'agente nella stessa chat.
5. Le regole di design sono imposte dal plugin, non lasciate all'agente.
6. Una guida breve per gli agenti (quando preferire l'interfaccia al testo, come comporre `show_ui`) da aggiungere a CLAUDE.md e AGENTS.md globali di Matteo.

7. Mobile di prima classe (richiesta di Matteo del 2 novembre 2026): su iPhone e Android i blocchi sono compatti ma di qualità, non versioni ridotte alla meglio. Con `layout.compact` i componenti usano spaziature più strette della scala (4/8/12/16), un'unica colonna, tabelle che diventano liste di righe o scorrono in orizzontale, grafici a larghezza piena con etichette ridotte, bottoni e campi con area di tocco di almeno 44 punti, form a campo singolo per riga, tastiera gestita (nessun campo coperto), scroll orizzontale mai nascosto. Ogni componente nasce con la variante compatta e si verifica a larghezza 390 punti oltre che a desktop.

## Non obiettivi e anti-obiettivi

- Niente mini app con JavaScript arbitrario: `DocumentFrame` non esegue script. L'interattività passa solo dal catalogo.
- Non sostituire le risposte testuali: il testo resta il default quando basta.
- Non toccare i sorgenti di Paseo; non rompere altri plugin né le chat esistenti.
- Fallimento anche se "funziona tecnicamente": se l'aspetto viola le regole di design (pastiglie gialle piene con glifo nero, rounded di Tailwind, valori fuori scala di spaziatura, parole orfane).

## Vincoli tecnici (verificati sulla documentazione, 2 novembre 2026)

- API plugin: `@getpaseo/plugin` (server) e `@getpaseo/plugin/client` / `client/ui`. UI con primitive React Native, mai elementi DOM, className o CSS.
- `PluginTheme.colors`: foreground, foregroundMuted, surface0/1/2, border, accent, accentForeground, statusSuccess, statusWarning, statusDanger. `layout.compact` e `layout.platform`.
- Righe timeline: `paseo.agents.ref(id).timeline.append({...})` dal server, rinnovabili con lo stesso `id`; limite 64 KiB serializzati; vivono nella memoria del daemon (si perdono al riavvio: salvare una copia su file e ripopolare).
- Renderer: `client.addTimelineRenderer({ kind, version, schema (Zod), Component })`, props `agentId, item, timestamp, theme, host, layout`. La documentazione non mostra come un renderer invii prompt o chiami RPC: usare `useRpc` / `usePaseo` (esistono nel client) e verificare con una prova.
- Iniezione MCP: hook `agent.open.before` (README di `plugin-examples/agent-configuration` e `public-docs/plugins/hooks.md` nel repo Paseo). Il server MCP iniettato non viene salvato nella configurazione dell'agente. Esempi locali: `/Users/matteozampieri/ProgettiApp/paseo/plugin-examples`.
- `DocumentFrame` (Paseo 0.13+): `blob:` su web, `file:` su nativo; sandbox senza script né same-origin.
- Plugin attivi solo con interruttore globale dei plugin acceso sul daemon; l'abilitazione richiede l'ok di Matteo (vedi skill paseo-plugin, sezione "Hosts and trust").
- Installazione per daemon: il Mac locale è il caso da coprire; la VPS è un host separato e va dichiarato nel resoconto.

## Regole di design imposte dal catalogo

- Angoli: squircle con cornerSmoothing 1 su card, bottoni, campi, pill (mai radius semplici).
- Colori: nero #14141a verso #0c0c10 come fondo, bianco con opacity scalate per il testo, giallo #fffb00 solo come accento (sottolineatura, bordo, un solo punto per sezione). Mai riempimento giallo di micro elementi con glifo nero: la forma piena è nera e il giallo sta dentro come glifo. Rispettare comunque `theme` (chiaro/scuro) per testo e superfici.
- Spaziatura: scala 4/8/12 interni, 16/24/32/48 componenti, 64/96 stacchi; mai valori fuori scala.
- Tipografia: line-height body 1.3 a 1.6, titoli 0.9 a 1.2, letter-spacing titoli circa -2%; `text-wrap: balance` sui titoli e `pretty` sul body nell'HTML libero.
- Testi in italiano, tono diretto di Matteo, niente trattini come connettori, niente grassetto/asterischi.
- Altezza: mai 100vh nell'HTML libero, usare dvh/svh.
- Per l'HTML libero il plugin avvolge l'HTML dell'agente in un documento con foglio di stile obbligatorio e token di design; il contenuto non può ridefinirli.
- Skill da consultare per costruire il catalogo e la guida (a build-time, non a runtime): design-taste-frontend, ui-ux-pro-max, impeccable, squircle-ui, react-native-design.

## Parti decise da Matteo

- Mix catalogo + HTML libero.
- Rispetto delle sue regole di design (squircle, colori, comunicazione, layout) usando le skill taste, ui-ux-pro-max, impeccable.
- Esecutori GPT, non Claude.

## Scelte mie (da controllare)

- Plugin in `~/ProgettiApp/paseo-generative-ui`, repository GitHub privato.
- Formato del catalogo ispirato ad A2UI (albero JSON dichiarativo di componenti con id), validato con Zod.
- Fasi sequenziali con un esecutore Codex Risparmio (GPT-5.6 Terra) per fase, perimetro chiuso e circa 40 tool call:
  1. Fondazione e prova: scaffold del plugin, `show_ui` iniettato via MCP, riga timeline con un componente di prova, verifica live.
  2. Catalogo di componenti e design system (tema, squircle, spaziature), con test.
  3. Ritorno delle azioni all'agente, HTML libero in sandbox, persistenza su file.
  4. Guida per gli agenti, installazione e verifica su chat vera (desktop e layout compatto), documentazione, commit e push.

## Lasciato al costruttore

- Nomi interni dei componenti e struttura delle cartelle.
- Libreria dei grafici (preferire SVG con `react-native-svg` se già disponibile nel client plugin; altrimenti disegno a mano con View).
- Dettaglio del meccanismo di ritorno delle azioni, dopo la prova di fase 1.

## Verifica

Una fase non è conclusa finché non si vede funzionare in una chat Paseo reale: agente che chiama `show_ui`, riga visibile durante e dopo lo streaming, aggiornamento con lo stesso id, azione utente che torna all'agente, controllo su finestra larga e compatta, tema chiaro e scuro.

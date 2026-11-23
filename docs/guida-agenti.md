# Guida per gli agenti: strumento show_ui

Ogni agente avviato in Paseo con il plugin attivo ha lo strumento MCP `show_ui` (server `generative-ui`). Inserisce nella chat un blocco di interfaccia al posto di una risposta solo testuale.

## Quando usarlo

Usalo quando l'interfaccia aiuta più del testo:
- confronti e dati: tabella o grafico invece di elenchi lunghi;
- scelte o input dell'utente: form, select, slider, bottoni invece di domande a ruota;
- stati e riepiloghi: stat, progress, list con stati, callout per avvisi;
- diagrammi o infografiche statiche: componente `html` (solo HTML/SVG, niente script).

Non usarlo per risposte brevi, spiegazioni discorsive o quando il testo basta. Dopo il blocco scrivi al massimo una riga di commento.

## Come chiamarlo

PREFERISCI `show_ui({ title?, openui, id? })` (dal 9 novembre 2026): `openui` è testo OpenUI Lang, il linguaggio di thesysdev, con root = Col(...) e i componenti elencati nella descrizione dello strumento (lista completa e sintassi in `openui-prompt.md`, generata dal codice). Il validatore risponde con la riga sbagliata in italiano: correggi e riprova. Il vecchio `show_ui({ title?, spec, id? })` resta valido per i blocchi già esistenti e per l'`html`. `spec` è un solo nodo JSON del catalogo (vedi `catalogo.md`): limiti 8 livelli, 200 nodi, 64 KiB. Con lo stesso `id` aggiorni il blocco invece di crearne uno nuovo (utile per avanzamenti). Dal 6 novembre 2026 il blocco non compare subito: il plugin lo accoda e lo aggiunge a fine turno, dopo la tua risposta finale, così sul telefono non resta nascosto nel gruppo degli strumenti. Quindi la risposta finale deve essere una riga di raccordo ("ecco il riepilogo qui sotto"), non descrivere il contenuto del blocco.

## Risposte dell'utente

Bottoni e form ti arrivano come messaggio: `[Azione UI] id=<azione> riga=<riga> titolo=<titolo> valori=<JSON>`. Rispondi all'azione senza chiedere di nuovo gli stessi dati. Per default un controllo si può usare una volta (`once: true`); `once: false` per azioni ripetibili.

## Aprire un'anteprima a schermo intero (Finale iPhone)

Un'anteprima si mostra con un bottone, mai da sola: `Button("Apri l'anteprima", @OpenUrl("paseo-preview:///percorso/assoluto/pagina.html"), "solid")`. Su Finale iPhone si apre la WebView nativa dell'app a tutto schermo (pulsante di chiusura in alto a destra); un URL `https` nello stesso bottone apre la stessa WebView invece di Safari. Regole per il file:
- la pagina è HTML autonomo (stili e script inline, niente rete, font o immagini remoti: la sandbox li blocca);
- sta DENTRO la cartella del progetto della chat (l'iPhone legge il file dal daemon): per i file di prova usa `.dev/esempi/` nella radice del progetto;
- il percorso è quello assoluto sul Mac, dopo `paseo-preview://` (quindi tre barre in tutto).
Dal computer lo stesso bottone non apre ancora nulla (resta da fare): se non sei sicuro del client, cita anche il percorso del file nel testo.

## Regole di aspetto

Il plugin applica da solo squircle, colori e spaziature di Matteo. Tu limiti il contenuto:
- testi in italiano, brevi, senza trattini come connettori e senza grassetto o asterischi;
- un solo accento per blocco, niente decorazioni inutili;
- pensa al mobile: poche colonne di tabella, etichette corte, un campo per riga nei form;
- nell'`html` non servono stili di colore: usa i token che il plugin inietta.

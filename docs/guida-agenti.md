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

`show_ui({ title?, spec, id? })`. `spec` è un solo nodo JSON del catalogo (vedi `catalogo.md`): limiti 8 livelli, 200 nodi, 64 KiB. Con lo stesso `id` aggiorni il blocco invece di crearne uno nuovo (utile per avanzamenti).

## Risposte dell'utente

Bottoni e form ti arrivano come messaggio: `[Azione UI] id=<azione> riga=<riga> titolo=<titolo> valori=<JSON>`. Rispondi all'azione senza chiedere di nuovo gli stessi dati. Per default un controllo si può usare una volta (`once: true`); `once: false` per azioni ripetibili.

## Regole di aspetto

Il plugin applica da solo squircle, colori e spaziature di Matteo. Tu limiti il contenuto:
- testi in italiano, brevi, senza trattini come connettori e senza grassetto o asterischi;
- un solo accento per blocco, niente decorazioni inutili;
- pensa al mobile: poche colonne di tabella, etichette corte, un campo per riga nei form;
- nell'`html` non servono stili di colore: usa i token che il plugin inietta.

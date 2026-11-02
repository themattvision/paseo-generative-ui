# Catalogo Generative UI

La spec è un solo nodo JSON. I contenitori usano `children`. Il limite è 8 livelli e 200 nodi. Il renderer mostra un messaggio discreto per i tipi futuri non ancora supportati.

## stack

Dispone i figli in verticale o orizzontale. `gap` usa soltanto 4, 8, 12, 16, 24, 32, 48, 64 o 96. `align` è `start`, `center`, `end` o `stretch`.

```json
{"type":"stack","direction":"vertical","gap":12,"children":[{"type":"text","text":"Ciao"}]}
```

## text

Testo con `variant`: `title`, `heading`, `body`, `caption` o `mono`.

```json
{"type":"text","variant":"heading","text":"Il piano è pronto"}
```

## card

Raggruppa contenuto con `title` facoltativo e `tone` `default` o `accent`.

```json
{"type":"card","title":"Riepilogo","tone":"accent","children":[{"type":"text","text":"Tre attività"}]}
```

## stat

Valore sintetico. `delta` e `trend` (`up`, `down`, `flat`) sono facoltativi.

```json
{"type":"stat","label":"Completati","value":"24","delta":"+12%","trend":"up"}
```

## callout

Avviso con `tone` `info`, `success`, `warning` o `danger`, sempre con `title` e `text`.

```json
{"type":"callout","tone":"warning","title":"Controlla prima","text":"Rivedi i dati."}
```

## list

Elenco di `items`, ciascuno con `title`, `description` facoltativa, `icon` facoltativa e `status` `complete`, `pending` o `attention`. Il segno di stato è nero con glifo giallo.

```json
{"type":"list","items":[{"title":"Spec validata","status":"complete"}]}
```

## badge

Piccola pill con `label`. È sempre in inchiostro scuro, mai gialla piena.

```json
{"type":"badge","label":"In corso"}
```

## button

Bottone con `label`, `variant` `primary`, `secondary` o `ghost`, `action` e `disabled`. `action.id` è obbligatorio, `payload` è un oggetto facoltativo. In questa fase l'azione viene solo registrata localmente.

```json
{"type":"button","label":"Continua","variant":"primary","action":{"id":"continue","payload":{"step":2}},"disabled":false}
```

## divider

Separatore visivo senza proprietà.

```json
{"type":"divider"}
```

## progress

Avanzamento da 0 a 100, con `label` facoltativa.

```json
{"type":"progress","label":"Avanzamento","value":68}
```

## table

Tabella con massimo 50 righe e 12 colonne. In compatto ogni riga diventa una card con etichetta e valore, quindi non nasconde mai lo scorrimento orizzontale.

```json
{"type":"table","columns":[{"key":"nome","label":"Nome"},{"key":"stato","label":"Stato","align":"end"}],"rows":[{"nome":"Spec","stato":"Pronta"}]}
```

## chart

Grafico `bar` o `line`, con una o quattro serie e fino a 100 valori per serie. È disegnato con primitive View per funzionare senza SVG. Il primo tratto è in inchiostro con un micro accento giallo, gli altri sono neutri. Il donut non fa parte del catalogo perché senza SVG non resta pulito e coerente su tutte le piattaforme.

```json
{"type":"chart","kind":"bar","series":[{"label":"Uso","values":[12,18,9]}]}
```

## form e campi

Un form contiene campi e un submit. I tipi disponibili sono `input` (`text`, `number`, `multiline`), `select`, `multiselect`, `switch`, `slider` e `radio`. I select e radio sono card selezionabili, non menu di sistema; i campi obbligatori mostrano il messaggio italiano sotto il campo. Il submit registra l'azione con `payload.values` e l'`agentId` della timeline.

```json
{"type":"form","id":"nuovo-task","children":[{"type":"input","name":"titolo","label":"Titolo","required":true},{"type":"select","name":"priorita","label":"Priorità","options":[{"label":"Normale","value":"normal"},{"label":"Alta","value":"high"}]},{"type":"slider","name":"durata","label":"Durata","min":5,"max":60,"step":5,"initialValue":30}],"submit":{"label":"Invia","action":{"id":"create-task"}}}
```

## Note di rendering

Il catalogo usa i token semantici del tema Paseo. Su iOS i contenitori usano `borderCurve: "continuous"`; sul web `figma-squircle` calcola dopo il layout un percorso con smoothing 1 e lo applica con `clipPath: path(...)`. Il bordo è un layer separato e clippato, per evitare che venga tagliato dal clip.

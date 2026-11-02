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

## Note di rendering

Il catalogo usa i token semantici del tema Paseo. Su iOS i contenitori usano `borderCurve: "continuous"`. Il runtime del plugin non espone `react-native-svg`, quindi sul web questa fase usa il fallback controllato con bordi continui e larghezza estesa; il percorso SVG `figma-squircle` verrà attivato solo quando il runtime lo includerà.

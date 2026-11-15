// Etichetta dell'ultimo bottone premuto: il renderer OpenUI non la passa all'evento (humanFriendlyMessage è il
// testo lungo dell'azione), quindi la teniamo qui e la mettiamo nel messaggio all'agente, così la timeline può
// mostrare il bottone premuto al posto del testo tecnico.
let lastPressedLabel: string | undefined;

export function rememberPressedLabel(label: string): void {
  lastPressedLabel = label;
}

export function takePressedLabel(): string | undefined {
  const label = lastPressedLabel;
  lastPressedLabel = undefined;
  return label;
}

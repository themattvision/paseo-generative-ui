// Ponte verso la build NATIVA di @openuidev/react-lang.
// Il bundler del plugin (esbuild senza la condition "react-native") risolverebbe la build web, che disegna <div>:
// sul telefono dà «View config getter callback for component `div` must be a function».
// L'import relativo aggira la mappa "exports" del pacchetto e prende index.native.mjs (View, Text, Pressable).
// I tipi (import type) continuano a venire dal pacchetto normale.
export {
  Renderer,
  createLibrary,
  defineComponent,
  useTriggerAction,
} from "../../node_modules/@openuidev/react-lang/dist/index.native.mjs";

// Stub: react-dom non è disponibile nel plugin. Il percorso web di react-lang lo usa solo se document esiste.
export const createPortal = () => { throw new Error("react-dom non disponibile nel plugin"); };
export const flushSync = (fn) => fn();
export default {};

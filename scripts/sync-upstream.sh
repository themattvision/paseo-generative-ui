#!/bin/bash
# Aggiornamento automatico del renderer OpenUI del plugin generative-ui.
# Lanciato ogni 6 ore dal LaunchAgent com.matteozampieri.generative-ui-upstream-sync.
# Cosa fa:
#  1. controlla le ultime versioni npm di @openuidev/react-lang e @openuidev/lang-core;
#  2. se sono nuove: installa su un ramo, rigenera il prompt, esegue test e typecheck;
#  3. se passano: unisce in main, ricarica il plugin e verifica che sia "running"; se non lo è annulla
#     con un revert, ricarica di nuovo e lo scrive nel log; se è tutto ok fa push;
#  4. in ogni caso confronta i componenti del system prompt di thesysdev/open-intelligent-ui con quelli
#     del plugin e scrive i mancanti in upstream-report.md (i nuovi componenti si portano a mano).
# Non invia notifiche. Esito in ~/.paseo/plugin-data/generative-ui/upstream-sync.log.
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Variabili solo per le prove: GUI_REPO (altra cartella), GUI_STATE_DIR, GUI_NO_RELOAD=1, GUI_NO_PUSH=1.
REPO="${GUI_REPO:-$HOME/ProgettiApp/paseo-generative-ui}"
STATE_DIR="${GUI_STATE_DIR:-$HOME/.paseo/plugin-data/generative-ui}"
LOG="$STATE_DIR/upstream-sync.log"
REPORT="$STATE_DIR/upstream-report.md"
PLUGIN="generative-ui"
UPSTREAM_PROMPT_URL="https://raw.githubusercontent.com/thesysdev/open-intelligent-ui/main/src/generated/system-prompt.txt"

mkdir -p "$STATE_DIR"
log() { echo "$(date '+%F %T') $*" >> "$LOG"; }

# Blocco anti doppia esecuzione (macOS non ha flock).
LOCK="$STATE_DIR/.sync.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  # Lock vecchio di oltre 2 ore: processo morto, si ripulisce.
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +120 2>/dev/null)" ]; then rmdir "$LOCK" 2>/dev/null; mkdir "$LOCK" 2>/dev/null || exit 0; else exit 0; fi
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

cd "$REPO" || { log "ERRORE cartella $REPO non trovata"; exit 0; }

plugin_running() {
  paseo plugin ls "$PLUGIN" 2>/dev/null | rg -qi "running"
}
reload_plugin() {
  if [ "${GUI_NO_RELOAD:-0}" = "1" ]; then log "(prova) reload saltato"; return 0; fi
  paseo plugin reload "$PLUGIN" --json >> "$LOG" 2>&1
  sleep 3
  plugin_running
}

# --- Report dei componenti upstream mancanti (non modifica nulla) ---
report_components() {
  local tmp; tmp="$(mktemp)"
  if curl -fsS --max-time 30 "$UPSTREAM_PROMPT_URL" -o "$tmp" 2>/dev/null; then
    rg -o '^[A-Z][A-Za-z0-9]+\(' "$tmp" | tr -d '(' | sort -u > "$tmp.up"
    rg -o 'name: "[A-Z][A-Za-z0-9]+"' shared/openui-signatures.ts | sed -E 's/name: "([^"]+)"/\1/' | sort -u > "$tmp.ours"
    {
      echo "# Componenti upstream non ancora nel plugin"
      echo
      echo "Controllo del $(date '+%F %T') su thesysdev/open-intelligent-ui (system-prompt.txt)."
      echo
      comm -23 "$tmp.up" "$tmp.ours" | sed 's/^/- /'
    } > "$REPORT"
    log "report componenti aggiornato ($(comm -23 "$tmp.up" "$tmp.ours" | wc -l | tr -d ' ') mancanti)"
  else
    log "report componenti: download del prompt upstream fallito"
  fi
  rm -f "$tmp" "$tmp.up" "$tmp.ours"
}

# --- Precondizioni ---
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
if [ "$branch" != "main" ]; then log "salto: il ramo corrente è $branch, non main"; exit 0; fi
if [ -n "$(git status --porcelain)" ]; then log "salto: albero di lavoro non pulito (lavoro in corso)"; exit 0; fi

report_components

cur_lr="$(node -p "require('./package.json').dependencies['@openuidev/react-lang']" 2>/dev/null)"
cur_lc="$(node -p "require('./package.json').dependencies['@openuidev/lang-core']" 2>/dev/null)"
new_lr="$(npm view @openuidev/react-lang version 2>/dev/null)"
new_lc="$(npm view @openuidev/lang-core version 2>/dev/null)"
if [ -z "$new_lr" ] || [ -z "$new_lc" ]; then log "salto: npm view non risponde"; exit 0; fi
if [ "$cur_lr" = "$new_lr" ] && [ "$cur_lc" = "$new_lc" ]; then log "nessuna novità (react-lang $cur_lr, lang-core $cur_lc)"; exit 0; fi

log "novità: react-lang $cur_lr -> $new_lr, lang-core $cur_lc -> $new_lc"
prev="$(git rev-parse HEAD)"
work="auto/openui-$new_lr"
git branch -D "$work" >/dev/null 2>&1
git checkout -b "$work" >> "$LOG" 2>&1 || { log "ERRORE creazione ramo"; exit 0; }

abort_upgrade() {
  log "AGGIORNAMENTO ANNULLATO: $1 (main intatto a $prev)"
  {
    echo "# Aggiornamento OpenUI fallito"
    echo
    echo "$(date '+%F %T'): react-lang $new_lr e lang-core $new_lc non passano ($1). Il plugin resta sulle versioni $cur_lr e $cur_lc."
    echo
    echo "Ultime righe del log:"
    tail -n 25 "$LOG"
  } > "$STATE_DIR/upstream-failure.md"
  git checkout -f main >> "$LOG" 2>&1
  git branch -D "$work" >/dev/null 2>&1
  npm ci >> "$LOG" 2>&1
  exit 0
}

npm install --save-exact "@openuidev/react-lang@$new_lr" "@openuidev/lang-core@$new_lc" >> "$LOG" 2>&1 || abort_upgrade "npm install"
npm run prompt >> "$LOG" 2>&1 || abort_upgrade "rigenerazione del prompt"
npm run typecheck >> "$LOG" 2>&1 || abort_upgrade "typecheck"
npm test >> "$LOG" 2>&1 || abort_upgrade "test"
npm run check:bundle >> "$LOG" 2>&1 || abort_upgrade "controllo bundle client"

git add package.json package-lock.json shared/openui-prompt.generated.ts docs/openui-prompt.md
git commit -m "Aggiorna OpenUI a react-lang $new_lr e lang-core $new_lc (automatico)" >> "$LOG" 2>&1 || abort_upgrade "commit"
git checkout main >> "$LOG" 2>&1 && git merge --ff-only "$work" >> "$LOG" 2>&1 || abort_upgrade "merge in main"
git branch -D "$work" >/dev/null 2>&1

if reload_plugin; then
  log "plugin ricaricato e running con react-lang $new_lr, lang-core $new_lc"
  if [ "${GUI_NO_PUSH:-0}" = "1" ]; then log "(prova) push saltato"
  elif git push origin main >> "$LOG" 2>&1; then log "push su origin/main eseguito"; else log "push fallito (da rifare a mano)"; fi
  rm -f "$STATE_DIR/upstream-failure.md"
else
  log "ROLLBACK: il plugin non è tornato running dopo l'aggiornamento"
  git revert --no-edit HEAD >> "$LOG" 2>&1
  npm ci >> "$LOG" 2>&1
  if reload_plugin; then log "ROLLBACK riuscito: plugin running sulle versioni precedenti"; else log "ROLLBACK FALLITO: il plugin NON è running, intervento manuale"; fi
  {
    echo "# Aggiornamento OpenUI annullato dopo il reload"
    echo
    echo "$(date '+%F %T'): react-lang $new_lr e lang-core $new_lc hanno rotto il build del plugin. Rollback eseguito con un revert."
    echo
    tail -n 25 "$LOG"
  } > "$STATE_DIR/upstream-failure.md"
fi
exit 0

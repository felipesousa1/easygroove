# CLAUDE.md

Este arquivo fornece orientações para o Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Projeto

EasyGroove é uma plataforma web para escrever, reproduzir e organizar partituras simplificadas de percussão (arranjos de bateria/percussão de samba — surdos, caixa, repique, chocalho, tamborim). O backend é FastAPI + SQLModel (SQLite); o frontend é composto por páginas renderizadas no servidor com Jinja2 + HTMX, além de um editor de partituras em grade feito em JS puro (ES modules, sem etapa de build). Todas as strings visíveis ao usuário, comentários e mensagens de commit deste repositório estão em português (pt-BR) — mantenha esse padrão ao editar templates, textos de UI ou mensagens de erro.

## Comandos

```bash
# Setup
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Executa o servidor de desenvolvimento (cria easygroove.db / tabelas automaticamente no startup via lifespan)
uvicorn app.main:app --reload

# Popula o banco com usuários/arranjos/coleções de exemplo
python seed.py
```

Não há etapa de build/bundle de JS (ES modules simples carregados via `<script type="module">`), não há package.json, e não há suíte de testes ou linter configurados neste repositório — não invente comandos npm/pytest que não existem aqui.

URLs principais em ambiente local: `/` (login/redirect), `/biblioteca` (biblioteca, requer autenticação), `/app` ou `/app?id=<arrangement_id>` (editor de partituras).

## Arquitetura

### Backend (`app/`)

- `main.py` — configuração do app FastAPI, montagem de arquivos estáticos, rotas de página (`/`, `/app`, `/biblioteca`, `/biblioteca/search`). O handler `lifespan` chama `SQLModel.metadata.create_all(engine)` no startup — não há migrations; mudanças de schema em `app/models/domain.py` exigem um `easygroove.db` novo (ou ALTER manual), já que não há Alembic.
- `database.py` — engine SQLite (`easygroove.db` na raiz do repositório) e a dependency `get_session`.
- `models/domain.py` — modelos de tabela SQLModel: `User`, `Collection`, `Arrangement`, `ArrangementCollectionLink` (tabela de junção N:M). `Arrangement.score_data` é uma coluna JSON que guarda *todo* o blob de estado do editor (ver Modelo de dados da partitura abaixo) — não tem estrutura relacional, então mudanças no conteúdo dos arranjos não exigem schema no backend.
- `models/schemas.py` — schemas Pydantic de request/response, separados dos modelos de tabela.
- `routers/` — `auth.py` (`/api/auth/*`: register/login/logout/me/forgot-password/reset-password, JWT via `PyJWT` + bcrypt), `arrangements.py` (`/api/arrangements/*`: CRUD, upload de imagem de capa, vínculo com coleções), `collections.py` (`/api/collections/*`: CRUD).
- `auth/security.py` / `auth/dependencies.py` — criação/validação de JWT e a dependency `get_current_user`. A autenticação é baseada em cookie: um cookie HTTP-only `access_token` guarda `Bearer <jwt>`; `main.py` também tem sua própria `get_user_from_cookie` duplicada para rotas de página que toleram acesso anônimo (diferente de `get_current_user`, que lança 401).
- Todas as verificações de posse seguem o mesmo padrão: busca pelo id, depois verifica `.user_id == current_user.id`, senão 404 (não 403, para evitar expor a existência do recurso).

### Editor frontend (`app/static/assets/js/`)

O editor de partituras (`templates/app.html`) é uma single-page app feita à mão, sem framework — ES modules puros conectados de forma imperativa em `main.js`, que no `DOMContentLoaded` chama uma sequência de funções `setup*Events()` de cada módulo e então renderiza. Não há framework reativo: toda mutação de estado precisa ser seguida de uma chamada explícita a `renderScore()` (e geralmente `setIsDirty(true)`) para refletir na tela.

- `core/state.js` — a única fonte de verdade em memória, `scoreState` (título, bpm, timeSignature, configuração por compasso, array de instrumentos com seu `pattern` de notas, estado de loop, ferramenta de desenho ativa, clipboard). Também guarda `currentArrangementId` e a flag `isDirty` usada para avisar antes de fechar a página.
- `core/constants.js` — `STROKE_DEFINITIONS` (tipos de cabeça de nota: pele-aberto, abafado, rimshot, rufo, slap, aro, fantasma, chocalho-frente/tras, tamborim-chapado/ponta), `INSTRUMENT_PRESETS` (quais strokes cada instrumento suporta), `TIME_SIGNATURES` (beats/subdivisões/agrupamento de beams por fórmula de compasso). Um `LEGACY_STROKE_MAP` em `sanitizeStrokes()` atualiza chaves de stroke salvas antigas — continue estendendo esse mapa em vez de quebrar arranjos antigos ao renomear chaves de stroke.
- `core/history.js` — pilha de undo/redo (`historyManager`) que opera sobre snapshots de `scoreState`.
- `ui/renderScore.js` — reconstrói o DOM da grade da partitura a partir de `scoreState`; `ui/beams.js` desenha os beams de subdivisão; `ui/instrument.js`, `ui/toolbar.js`, `ui/menu.js`, `ui/repeat.js`, `ui/loop.js`, `ui/newArrangementModal.js`, `ui/help.js`, `ui/toast.js` cada um é responsável por uma área da UI e expõe um ponto de entrada `setup*Events()` chamado por `main.js`.
- `interaction/selection.js` / `interaction/clipboard.js` — seleção multi-célula/multi-instrumento (incluindo seleção por arrasto na grade) e copiar/colar, com verificações de compatibilidade (`checkPasteCompatibility`), já que nem todo instrumento suporta todo tipo de stroke.
- `interaction/shortcuts.js` — atalhos de teclado (undo/redo, copiar/colar, ESC para cancelar seleção, etc.).
- `audio/audio.js` / `audio/playhead.js` — motor de reprodução Web Audio e o cursor de playhead/metrônomo, guiados por `scoreState.bpm` e pelos patterns dos instrumentos.
- `services/api.js` — persistência: `saveCurrentArrangement()` faz POST/PUT em `/api/arrangements` enviando `scoreState` (sem `loopState`) como `score_data`, e `loadArrangementFromURL()` hidrata `scoreState` a partir do `?id=` no carregamento via `Object.assign`. Como `score_data` é persistido como JSON sem schema, adicionar novos campos a `scoreState` é retrocompatível para novos salvamentos, mas o código que lê arranjos antigos precisa tolerar campos ausentes (ver os valores padrão de fallback em `createEmptyMeasureForSig` e o mapa de strokes legado).
- `services/export.js` — exportação em JSON do arranjo atual.
- `pages/biblioteca.js` — comportamento da página de biblioteca (busca/ordenação/filtro via partials HTMX retornados por `/biblioteca/search` em `main.py`, drag-and-drop para coleções).

### Modelo de dados da partitura

Uma partitura é organizada assim: `measuresConfig` (uma entrada por compasso, cada uma com sua própria `timeSignature`) × `instruments[].pattern` (uma entrada de compasso por instrumento, cada uma contendo objetos de beat com `subdivisions` e um array `notes` de stroke-key-ou-null). As fórmulas de compasso mapeiam para `{ beats, subdivisions, beamType }` em `constants.js`, o que guia tanto o layout da grade quanto a renderização dos beams. Ao adicionar um novo instrumento ou tipo de stroke, atualize `INSTRUMENT_PRESETS`/`STROKE_DEFINITIONS` em `constants.js` e o ícone correspondente em `static/assets/icons/`.

### Templates (`app/templates/`)

Templates Jinja2: `login.html`, `biblioteca.html` (+ partials HTMX em `templates/partials/`), `app.html` (o shell do editor que carrega os módulos JS acima). `main.py` registra um filtro Jinja customizado, `relative_time`, para timestamps relativos legíveis (pt-BR: "editado há Xmin", "ontem", etc.).

## Observações

- `SECRET_KEY` em `app/auth/security.py` é um placeholder hardcoded explicitamente marcado para substituição em produção — não "corrija" isso sem o usuário pedir, mas também não copie esse padrão em código novo.
- `app/static/uploads/` (imagens de capa dos arranjos) e `easygroove.db` estão no gitignore; `seed.py` é a forma de colocar dados de exemplo em um banco novo.

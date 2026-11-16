# Como contribuir com o EasyGroove

Obrigado pelo interesse em contribuir! O EasyGroove é software livre (Licença MIT) e aceita contribuições de músicos, arranjadores e desenvolvedores.

## Formas de contribuir

- **Relatar erros:** abra uma *issue* descrevendo o que aconteceu, o que era esperado, os passos para reproduzir e o navegador/dispositivo usado. Se possível, anexe o arranjo exportado em JSON.
- **Sugerir funcionalidades:** abra uma *issue* explicando o caso de uso (por exemplo, um novo instrumento, toque ou ritmo).
- **Enviar código ou documentação:** siga o fluxo descrito abaixo.

## Preparando o ambiente

```bash
git clone https://github.com/felipesousa1/easygroove.git
cd easygroove
python -m venv venv
source venv/bin/activate      # No Windows: venv\Scripts\activate
pip install -r requirements.txt
python seed.py                # opcional: dados de exemplo
uvicorn app.main:app --reload
```

O app abre em `http://localhost:8000` usando SQLite local; nenhuma variável de ambiente é necessária em desenvolvimento.

O frontend não tem etapa de build: os arquivos em `app/static/assets/js/` são ES modules carregados diretamente pelo navegador. Basta recarregar a página após alterá-los.

## Fluxo de contribuição

1. Faça um *fork* do repositório e crie um *branch* a partir de `main`:
   ```bash
   git checkout -b feat/nome-da-funcionalidade
   ```
2. Faça suas alterações em commits pequenos e focados.
3. Teste manualmente no editor e na biblioteca, incluindo a abertura de arranjos salvos antes da sua mudança.
4. Abra um *pull request* descrevendo o que mudou e por quê. Capturas de tela ajudam em mudanças de interface.

## Padrões do projeto

- **Idioma:** textos da interface, comentários, mensagens de erro e commits em português (pt-BR).
- **Commits:** seguem o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/), por exemplo:
  - `feat: adiciona toque de aro no tamborim`
  - `fix: corrige sincronia do playhead no ritornelo`
  - `refactor:`, `style:`, `perf:`, `docs:`, `chore:`
- **Compatibilidade de arranjos:** a partitura é salva como JSON sem schema (`score_data`). Novos campos devem ter valores padrão ao ler arranjos antigos, e chaves de toques renomeadas devem ser adicionadas ao `LEGACY_STROKE_MAP` em `core/constants.js`, para não quebrar arranjos existentes.
- **Novos instrumentos ou toques:** atualize `INSTRUMENT_PRESETS` e `STROKE_DEFINITIONS` em `core/constants.js`, adicione o ícone em `static/assets/icons/` e, se houver, a amostra em `static/assets/strokes/`. Amostras de áudio devem ser de autoria própria ou ter licença compatível com a MIT (informe a origem no *pull request*).
- **Sem frameworks no frontend:** o editor usa JavaScript puro; após alterar o estado (`scoreState`), chame `renderScore()` explicitamente.

## Licença das contribuições

Ao enviar uma contribuição, você concorda que ela será distribuída sob a mesma [Licença MIT](LICENSE) do projeto.

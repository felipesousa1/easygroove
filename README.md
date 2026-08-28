# EasyGroove

Plataforma web para escrita, reprodução e organização de partituras simplificadas de percussão. Backend desenvolvido com FastAPI e SQLModel, frontend com Jinja2 e HTMX.

## Requisitos
- Python 3.10+
- SQLite (embutido)

## Instalação e Execução

1. **Crie e ative o ambiente virtual:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # No Windows: venv\Scripts\activate
   ```

2. **Instale as dependências:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   uvicorn app.main:app --reload
   ```

4. **Acessos principais:**
   - Editor/Workspace: `http://localhost:8000/`
   - Biblioteca: `http://localhost:8000/biblioteca`
   - Autenticação: `http://localhost:8000/login`

## Banco de Dados

O banco de dados SQLite (`database.db`) é instanciado automaticamente na raiz do projeto na primeira inicialização. A estrutura das tabelas é gerenciada via SQLModel.

Para a validação E2E, execute este fluxo no seu ambiente:

1. Acesse `http://localhost:8000/login` e crie um usuário novo.
2. Faça o login.
3. No editor, preencha o título, adicione notas ao arranjo e salve.
4. Acesse a biblioteca e confirme se o arranjo renderiza corretamente.
5. Faça o upload de uma imagem de capa para este arranjo.
6. Clique no corpo do card para reabrir o arranjo no editor. Altere o título ou os dados da partitura e salve novamente.
7. Retorne à biblioteca e confirme a atualização.
8. Exclua o arranjo via menu de contexto.

Execute os passos. Se houver qualquer falha de validação, erro no console (500) ou comportamento de concorrência inesperado, me envie o log para corrigirmos antes de fechar a sprint.
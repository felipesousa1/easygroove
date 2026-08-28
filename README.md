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

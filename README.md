# EasyGroove

Plataforma web para escrita, reprodução e organização de partituras simplificadas de percussão. Backend desenvolvido com FastAPI e SQLModel, frontend com Jinja2 e HTMX e um editor em JavaScript puro.

## Requisitos
- Python 3.10+
- SQLite (embutido, desenvolvimento) ou Postgres (produção)

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

Sem configuração, o app usa SQLite (`easygroove.db`, criado na raiz na primeira inicialização). Com `DATABASE_URL` definida, usa o Postgres indicado. As tabelas são criadas automaticamente (SQLModel, sem migrations). Para popular dados de exemplo: `python seed.py`.

## Variáveis de ambiente

Veja `.env.example`.

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Postgres de produção (Neon, Supabase...). Vazia = SQLite local |
| `EASYGROOVE_SECRET_KEY` | Chave de assinatura do login. Obrigatória em produção |
| `EASYGROOVE_SMTP_USER`, `EASYGROOVE_SMTP_PASSWORD`, `EASYGROOVE_BASE_URL` | Envio do e-mail de recuperação de senha (Gmail com senha de app). Sem eles, "esqueci minha senha" não envia nada |
| `EASYGROOVE_ENV` | `production` ativa cookie Secure, cache longo dos estáticos e exige a chave |

## Deploy na Vercel

1. Crie um banco Postgres (Neon, ou pelo Marketplace da Vercel) e copie a `DATABASE_URL`.
2. Importe o repositório na Vercel (o FastAPI é detectado em `app/main.py`; `pyproject.toml` manda os estáticos para o CDN).
3. Em Settings > Environment Variables, defina `DATABASE_URL`, `EASYGROOVE_SECRET_KEY` (gere com `python -c "import secrets;print(secrets.token_urlsafe(48))"`) e `EASYGROOVE_ENV=production`.
4. Faça o deploy. Opcional: `DATABASE_URL=... python seed.py` para dados de exemplo.

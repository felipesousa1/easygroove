# EasyGroove

Plataforma web de código aberto para escrita, reprodução e organização de partituras simplificadas de percussão de ritmos brasileiros. Backend desenvolvido com FastAPI e SQLModel, frontend com Jinja2 e HTMX e um editor em JavaScript puro, com reprodução sonora no navegador via Web Audio API (Tone.js).

<!-- Capturas de tela: adicionar imagens em docs/ e descomentar as linhas abaixo
![Editor de partituras](docs/editor.png)
![Biblioteca de arranjos](docs/biblioteca.png)
-->

## Funcionalidades

- **Editor em grade:** notação por subdivisão temporal, com toques (*strokes*) específicos de cada instrumento — surdos de 1ª, 2ª e 3ª, caixa, repique, tamborim, chocalho, agogô, xequerê, triângulo e timbal.
- **Métricas flexíveis:** fórmula de compasso por compasso e subdivisões dos tempos personalizáveis.
- **Reprodução:** player com metrônomo, loop, ritornelos, solo/mudo e volume por instrumento, usando amostras gravadas e síntese sonora.
- **Edição:** desfazer/refazer, seleção multi-instrumento, copiar/colar, pintura por arraste e atalhos de teclado.
- **Biblioteca:** arranjos organizados em coleções, com busca, ordenação, duplicação e importação.
- **Exportação:** JSON, PDF (grade geral e particella) e áudio em WAV.
- **Contas:** cadastro, login, recuperação de senha por e-mail e modo convidado.
- **Responsivo:** uso em computador e celular.

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
   - Login/cadastro: `http://localhost:8000/`
   - Editor de partituras: `http://localhost:8000/app` (ou `/app?id=<id do arranjo>`)
   - Biblioteca: `http://localhost:8000/biblioteca`

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

## Auto-hospedagem

Qualquer grupo pode rodar sua própria instância do EasyGroove. Para uso local ou em rede interna, basta seguir a seção [Instalação e Execução](#instalação-e-execução) (SQLite, sem configuração). Para uma instância pública, use um servidor com Python 3.10+, defina as variáveis de ambiente acima (com `EASYGROOVE_ENV=production` e um Postgres em `DATABASE_URL`) e execute com `uvicorn app.main:app --host 0.0.0.0 --port 8000` atrás de um proxy reverso com HTTPS.

## Contribuindo

Contribuições são bem-vindas: relatos de erros, sugestões de toques e instrumentos, melhorias de código e de documentação. Veja o guia em [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

Distribuído sob a [Licença MIT](LICENSE). Você pode usar, estudar, modificar e redistribuir o código, inclusive para fins comerciais, desde que mantenha o aviso de copyright e o texto da licença.

As amostras de áudio em `app/static/assets/strokes/` foram gravadas pelo autor e são distribuídas sob a mesma licença.

## Créditos de terceiros

O EasyGroove utiliza as seguintes bibliotecas de código aberto, cada uma sob sua própria licença:

| Biblioteca | Uso | Licença |
|---|---|---|
| [Tone.js](https://tonejs.github.io/) | Agendamento e síntese de áudio sobre a Web Audio API | MIT |
| [HTMX](https://htmx.org/) | Atualizações parciais da biblioteca | BSD 2-Clause |
| [FastAPI](https://fastapi.tiangolo.com/) | API REST e rotas de página | MIT |
| [SQLModel](https://sqlmodel.tiangolo.com/) / [SQLAlchemy](https://www.sqlalchemy.org/) | Modelos e acesso ao banco de dados | MIT |
| [Jinja2](https://jinja.palletsprojects.com/) | Templates do servidor | BSD 3-Clause |
| [PyJWT](https://pyjwt.readthedocs.io/) | Tokens de autenticação | MIT |
| [bcrypt](https://github.com/pyca/bcrypt) | Hash de senhas | Apache 2.0 |

## Autor

Felipe Sousa — desenvolvido como Trabalho de Conclusão de Curso. Contato: contato.easygroove@gmail.com

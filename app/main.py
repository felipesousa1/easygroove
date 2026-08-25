from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI(title="EasyGroove")

app.mount("/assets", StaticFiles(directory="app/static/assets"), name="assets")
templates = Jinja2Templates(directory="app/templates")

@app.get("/")
async def get_editor(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")

@app.get("/login")
async def get_login(request: Request):
    return templates.TemplateResponse(request=request, name="login.html")

@app.get("/biblioteca")
async def get_biblioteca(request: Request):
    return templates.TemplateResponse(request=request, name="biblioteca.html")
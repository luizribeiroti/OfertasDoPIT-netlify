from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials  
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from jose import JWTError
import json
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'ofertas-do-pit-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Create the main app without a prefix
app = FastAPI(title="Ofertas do PIT API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Pydantic Models
class Categoria(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    slug: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoriaCreate(BaseModel):
    nome: str
    slug: str

class Promocao(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    titulo: str
    imagemProduto: str  # URL da imagem
    precoOriginal: float
    precoOferta: float
    percentualDesconto: float
    linkOferta: str
    categoria_id: str
    dataPostagem: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ativo: bool = True

class PromocaoCreate(BaseModel):
    titulo: str
    imagemProduto: str
    precoOriginal: float
    precoOferta: float
    linkOferta: str
    categoria_id: str
    ativo: bool = True

class PromocaoUpdate(BaseModel):
    titulo: Optional[str] = None
    imagemProduto: Optional[str] = None
    precoOriginal: Optional[float] = None
    precoOferta: Optional[float] = None
    linkOferta: Optional[str] = None
    categoria_id: Optional[str] = None
    ativo: Optional[bool] = None

class Usuario(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    role: str = "admin"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UsuarioCreate(BaseModel):
    email: EmailStr
    senha: str
    role: str = "admin"

class LoginRequest(BaseModel):
    email: EmailStr
    senha: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Usuario

# Utility functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def calculate_discount_percentage(original_price: float, offer_price: float) -> float:
    if original_price <= 0:
        return 0.0
    return round(((original_price - offer_price) / original_price) * 100, 2)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    user = await db.usuarios.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    
    return Usuario(**user)

# Initialize admin user
async def create_admin_user():
    existing_admin = await db.usuarios.find_one({"email": "luiz.ribeiro"})
    if not existing_admin:
        hashed_password = hash_password("secure")
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "luiz.ribeiro",
            "senha": hashed_password,
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        }
        await db.usuarios.insert_one(admin_user)
        print("Admin user created: luiz.ribeiro")

# Auth Routes
@api_router.post("/auth/login", response_model=Token)
async def login(login_data: LoginRequest):
    user = await db.usuarios.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.senha, user["senha"]):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    access_token = create_access_token(data={"sub": user["id"]})
    user_obj = Usuario(**user)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_obj
    }

# Categoria Routes
@api_router.get("/categorias", response_model=List[Categoria])
async def get_categorias():
    categorias = await db.categorias.find().to_list(100)
    return [Categoria(**cat) for cat in categorias]

@api_router.post("/categorias", response_model=Categoria)
async def create_categoria(categoria: CategoriaCreate, current_user: Usuario = Depends(get_current_user)):
    categoria_dict = categoria.dict()
    categoria_obj = Categoria(**categoria_dict)
    await db.categorias.insert_one(categoria_obj.dict())
    return categoria_obj

@api_router.delete("/categorias/{categoria_id}")
async def delete_categoria(categoria_id: str, current_user: Usuario = Depends(get_current_user)):
    result = await db.categorias.delete_one({"id": categoria_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return {"message": "Categoria removida com sucesso"}

# Promocao Routes
@api_router.get("/promocoes", response_model=List[Promocao])
async def get_promocoes(
    categoria_id: Optional[str] = None,
    ordenar_por: Optional[str] = "data_recente",
    ativo: Optional[bool] = True
):
    query = {}
    if categoria_id:
        query["categoria_id"] = categoria_id
    if ativo is not None:
        query["ativo"] = ativo
    
    # Sorting options
    sort_options = {
        "data_recente": [("dataPostagem", -1)],
        "maior_desconto": [("percentualDesconto", -1)],
        "menor_desconto": [("percentualDesconto", 1)],
        "maior_preco": [("precoOferta", -1)],
        "menor_preco": [("precoOferta", 1)]
    }
    
    sort_by = sort_options.get(ordenar_por, [("dataPostagem", -1)])
    
    promocoes = await db.promocoes.find(query).sort(sort_by).to_list(100)
    return [Promocao(**promo) for promo in promocoes]

@api_router.get("/promocoes/{promocao_id}", response_model=Promocao)
async def get_promocao(promocao_id: str):
    promocao = await db.promocoes.find_one({"id": promocao_id})
    if not promocao:
        raise HTTPException(status_code=404, detail="Promoção não encontrada")
    return Promocao(**promocao)

@api_router.post("/promocoes", response_model=Promocao)
async def create_promocao(promocao: PromocaoCreate, current_user: Usuario = Depends(get_current_user)):
    # Verify categoria exists
    categoria = await db.categorias.find_one({"id": promocao.categoria_id})
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    promocao_dict = promocao.dict()
    promocao_dict["percentualDesconto"] = calculate_discount_percentage(
        promocao.precoOriginal, promocao.precoOferta
    )
    
    promocao_obj = Promocao(**promocao_dict)
    await db.promocoes.insert_one(promocao_obj.dict())
    return promocao_obj

@api_router.put("/promocoes/{promocao_id}", response_model=Promocao)
async def update_promocao(
    promocao_id: str, 
    promocao_update: PromocaoUpdate, 
    current_user: Usuario = Depends(get_current_user)
):
    existing_promocao = await db.promocoes.find_one({"id": promocao_id})
    if not existing_promocao:
        raise HTTPException(status_code=404, detail="Promoção não encontrada")
    
    update_dict = {k: v for k, v in promocao_update.dict().items() if v is not None}
    
    # Recalculate discount if prices are updated
    if "precoOriginal" in update_dict or "precoOferta" in update_dict:
        original_price = update_dict.get("precoOriginal", existing_promocao["precoOriginal"])
        offer_price = update_dict.get("precoOferta", existing_promocao["precoOferta"])
        update_dict["percentualDesconto"] = calculate_discount_percentage(original_price, offer_price)
    
    # Verify categoria if being updated
    if "categoria_id" in update_dict:
        categoria = await db.categorias.find_one({"id": update_dict["categoria_id"]})
        if not categoria:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    await db.promocoes.update_one({"id": promocao_id}, {"$set": update_dict})
    updated_promocao = await db.promocoes.find_one({"id": promocao_id})
    return Promocao(**updated_promocao)

@api_router.delete("/promocoes/{promocao_id}")
async def delete_promocao(promocao_id: str, current_user: Usuario = Depends(get_current_user)):
    result = await db.promocoes.delete_one({"id": promocao_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promoção não encontrada")
    return {"message": "Promoção removida com sucesso"}

# Config Routes
@api_router.get("/config/links")
async def get_social_links():
    config = await db.config.find_one({"type": "social_links"})
    if not config:
        # Default links
        return {
            "whatsapp": "https://wa.me/",
            "telegram": "https://t.me/"
        }
    return config["links"]

@api_router.put("/config/links")
async def update_social_links(links: dict, current_user: Usuario = Depends(get_current_user)):
    await db.config.update_one(
        {"type": "social_links"},
        {"$set": {"links": links}},
        upsert=True
    )
    return {"message": "Links atualizados com sucesso"}

# Basic Routes
@api_router.get("/")
async def root():
    return {"message": "Ofertas do PIT API"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc)}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
async def startup_event():
    await create_admin_user()
    
    # Create default categories if they don't exist
    existing_categories = await db.categorias.count_documents({})
    if existing_categories == 0:
        default_categories = [
            {"nome": "Eletrônicos", "slug": "eletronicos"},
            {"nome": "Informática", "slug": "informatica"},
            {"nome": "Moda", "slug": "moda"},
            {"nome": "Casa e Jardim", "slug": "casa-jardim"},
            {"nome": "Esportes", "slug": "esportes"},
            {"nome": "Livros", "slug": "livros"}
        ]
        
        for cat in default_categories:
            categoria_obj = Categoria(**cat)
            await db.categorias.insert_one(categoria_obj.dict())
        
        print("Default categories created")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
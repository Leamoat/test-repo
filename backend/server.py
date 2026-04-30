from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import random
import string
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ===== Config =====
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@boxradar.app')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Admin123!')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="boxRadar API")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)


# ===== Helpers =====
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())

def create_token(user_id: str, email: str, days: int = 30) -> str:
    payload = {
        "sub": user_id, "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=days),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def gen_id() -> str:
    return str(uuid.uuid4())

def gen_validation_code() -> str:
    return ''.join(random.choices(string.digits, k=6))

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


# ===== Models =====
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    user_type: Literal["sender", "traveler", "pro"] = "sender"
    phone: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserPublic(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    user_type: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    rating: float = 0.0
    review_count: int = 0
    created_at: datetime

class AuthResponse(BaseModel):
    token: str
    user: UserPublic

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    user_type: Optional[Literal["sender", "traveler", "pro"]] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class ListingCreate(BaseModel):
    type: Literal["parcel", "trip"]
    origin_city: str
    origin_country: str
    destination_city: str
    destination_country: str
    travel_date: datetime
    weight_kg: float
    price_estimate: float
    title: str
    description: Optional[str] = ""

class Listing(ListingCreate):
    id: str
    user_id: str
    user_name: str
    user_rating: float = 0.0
    status: Literal["active", "matched", "in_transit", "delivered", "cancelled"] = "active"
    created_at: datetime

class OfferCreate(BaseModel):
    listing_id: str
    price: float
    message: Optional[str] = ""

class MessageCreate(BaseModel):
    text: str

class ValidateCodeRequest(BaseModel):
    code: str

class ReviewCreate(BaseModel):
    delivery_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = ""


# ===== Auth =====
@api.post("/auth/register", response_model=AuthResponse)
async def register(body: RegisterRequest):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    user_id = gen_id()
    user_doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(body.password),
        "full_name": body.full_name,
        "user_type": body.user_type,
        "phone": body.phone,
        "bio": "",
        "avatar_url": None,
        "rating": 0.0,
        "review_count": 0,
        "created_at": now_utc(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id, email)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return {"token": token, "user": user_doc}

@api.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(user["id"], email)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": token, "user": user}

@api.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return user

@api.patch("/auth/profile", response_model=UserPublic)
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return fresh


# ===== Listings =====
@api.post("/listings", response_model=Listing)
async def create_listing(body: ListingCreate, user: dict = Depends(get_current_user)):
    listing_id = gen_id()
    doc = {
        **body.dict(),
        "id": listing_id,
        "user_id": user["id"],
        "user_name": user["full_name"],
        "user_rating": user.get("rating", 0.0),
        "status": "active",
        "created_at": now_utc(),
    }
    await db.listings.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/listings", response_model=List[Listing])
async def search_listings(
    type: Optional[Literal["parcel", "trip"]] = None,
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    max_weight: Optional[float] = None,
    user_id: Optional[str] = None,
    status: Optional[str] = None,
):
    q: dict = {}
    if type:
        q["type"] = type
    if origin:
        q["origin_city"] = {"$regex": f"^{origin}", "$options": "i"}
    if destination:
        q["destination_city"] = {"$regex": f"^{destination}", "$options": "i"}
    if max_weight is not None:
        q["weight_kg"] = {"$lte": max_weight}
    if user_id:
        q["user_id"] = user_id
    if status:
        q["status"] = status
    else:
        q.setdefault("status", {"$in": ["active", "matched", "in_transit"]})
    items = await db.listings.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items

@api.get("/listings/{listing_id}", response_model=Listing)
async def get_listing(listing_id: str):
    doc = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Listing not found")
    return doc


# ===== Conversations / Offers =====
@api.post("/offers")
async def make_offer(body: OfferCreate, user: dict = Depends(get_current_user)):
    listing = await db.listings.find_one({"id": body.listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(404, "Listing not found")
    if listing["user_id"] == user["id"]:
        raise HTTPException(400, "Cannot offer on your own listing")

    # Find or create conversation
    convo = await db.conversations.find_one({
        "listing_id": body.listing_id,
        "participants": {"$all": [user["id"], listing["user_id"]]},
    }, {"_id": 0})
    if not convo:
        convo_id = gen_id()
        convo = {
            "id": convo_id,
            "listing_id": body.listing_id,
            "listing_title": listing["title"],
            "listing_type": listing["type"],
            "participants": [user["id"], listing["user_id"]],
            "participant_names": {
                user["id"]: user["full_name"],
                listing["user_id"]: listing["user_name"],
            },
            "owner_id": listing["user_id"],
            "offerer_id": user["id"],
            "current_offer": body.price,
            "offer_status": "pending",  # pending, accepted, rejected
            "delivery_id": None,
            "last_message": body.message or f"Offer: €{body.price}",
            "updated_at": now_utc(),
            "created_at": now_utc(),
        }
        await db.conversations.insert_one(dict(convo))
    else:
        await db.conversations.update_one(
            {"id": convo["id"]},
            {"$set": {
                "current_offer": body.price,
                "offer_status": "pending",
                "last_message": body.message or f"New offer: €{body.price}",
                "updated_at": now_utc(),
            }},
        )
        convo["id"] = convo["id"]

    # Add message
    msg = {
        "id": gen_id(),
        "conversation_id": convo["id"],
        "sender_id": user["id"],
        "sender_name": user["full_name"],
        "text": body.message or f"I'd like to make an offer of €{body.price}",
        "type": "offer",
        "offer_price": body.price,
        "offer_status": "pending",
        "created_at": now_utc(),
    }
    await db.messages.insert_one(dict(msg))
    msg.pop("_id", None)
    return {"conversation_id": convo["id"], "message": msg}


@api.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    items = await db.conversations.find(
        {"participants": user["id"]}, {"_id": 0}
    ).sort("updated_at", -1).to_list(200)
    return items


@api.get("/conversations/{convo_id}")
async def get_conversation(convo_id: str, user: dict = Depends(get_current_user)):
    convo = await db.conversations.find_one({"id": convo_id}, {"_id": 0})
    if not convo or user["id"] not in convo["participants"]:
        raise HTTPException(404, "Conversation not found")
    msgs = await db.messages.find(
        {"conversation_id": convo_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    delivery = None
    if convo.get("delivery_id"):
        delivery = await db.deliveries.find_one({"id": convo["delivery_id"]}, {"_id": 0})
    return {"conversation": convo, "messages": msgs, "delivery": delivery}


@api.post("/conversations/{convo_id}/messages")
async def post_message(convo_id: str, body: MessageCreate, user: dict = Depends(get_current_user)):
    convo = await db.conversations.find_one({"id": convo_id}, {"_id": 0})
    if not convo or user["id"] not in convo["participants"]:
        raise HTTPException(404, "Conversation not found")
    msg = {
        "id": gen_id(),
        "conversation_id": convo_id,
        "sender_id": user["id"],
        "sender_name": user["full_name"],
        "text": body.text,
        "type": "text",
        "created_at": now_utc(),
    }
    await db.messages.insert_one(dict(msg))
    await db.conversations.update_one(
        {"id": convo_id},
        {"$set": {"last_message": body.text, "updated_at": now_utc()}},
    )
    msg.pop("_id", None)
    return msg


@api.post("/conversations/{convo_id}/accept-offer")
async def accept_offer(convo_id: str, user: dict = Depends(get_current_user)):
    convo = await db.conversations.find_one({"id": convo_id}, {"_id": 0})
    if not convo:
        raise HTTPException(404, "Conversation not found")
    if convo["owner_id"] != user["id"]:
        raise HTTPException(403, "Only listing owner can accept offers")
    if convo.get("offer_status") != "pending":
        raise HTTPException(400, "No pending offer")

    # Determine sender vs traveler
    listing = await db.listings.find_one({"id": convo["listing_id"]}, {"_id": 0})
    if listing["type"] == "parcel":
        sender_id = listing["user_id"]
        traveler_id = convo["offerer_id"]
    else:
        sender_id = convo["offerer_id"]
        traveler_id = listing["user_id"]

    code = gen_validation_code()
    delivery_id = gen_id()
    delivery = {
        "id": delivery_id,
        "conversation_id": convo_id,
        "listing_id": convo["listing_id"],
        "sender_id": sender_id,
        "traveler_id": traveler_id,
        "validation_code": code,
        "agreed_price": convo["current_offer"],
        "status": "in_transit",  # in_transit -> delivered
        "created_at": now_utc(),
        "delivered_at": None,
    }
    await db.deliveries.insert_one(dict(delivery))
    await db.conversations.update_one(
        {"id": convo_id},
        {"$set": {
            "offer_status": "accepted",
            "delivery_id": delivery_id,
            "last_message": "Offer accepted! Validation code generated.",
            "updated_at": now_utc(),
        }},
    )
    await db.listings.update_one({"id": convo["listing_id"]}, {"$set": {"status": "in_transit"}})
    # System message
    await db.messages.insert_one({
        "id": gen_id(),
        "conversation_id": convo_id,
        "sender_id": "system",
        "sender_name": "boxRadar",
        "text": f"Offer of €{convo['current_offer']} accepted. Sender: keep your validation code safe.",
        "type": "system",
        "created_at": now_utc(),
    })
    delivery.pop("_id", None)
    return delivery


@api.post("/conversations/{convo_id}/reject-offer")
async def reject_offer(convo_id: str, user: dict = Depends(get_current_user)):
    convo = await db.conversations.find_one({"id": convo_id}, {"_id": 0})
    if not convo:
        raise HTTPException(404, "Conversation not found")
    if convo["owner_id"] != user["id"]:
        raise HTTPException(403, "Only listing owner can reject offers")
    await db.conversations.update_one(
        {"id": convo_id},
        {"$set": {"offer_status": "rejected", "last_message": "Offer rejected.", "updated_at": now_utc()}},
    )
    await db.messages.insert_one({
        "id": gen_id(),
        "conversation_id": convo_id,
        "sender_id": "system",
        "sender_name": "boxRadar",
        "text": "Offer rejected. You can make a new offer.",
        "type": "system",
        "created_at": now_utc(),
    })
    return {"ok": True}


# ===== Deliveries =====
@api.get("/deliveries/{delivery_id}")
async def get_delivery(delivery_id: str, user: dict = Depends(get_current_user)):
    d = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Delivery not found")
    if user["id"] not in (d["sender_id"], d["traveler_id"]):
        raise HTTPException(403, "Not allowed")
    # Hide code from traveler
    if user["id"] == d["traveler_id"] and d["status"] != "delivered":
        d.pop("validation_code", None)
    return d


@api.post("/deliveries/{delivery_id}/validate")
async def validate_delivery(delivery_id: str, body: ValidateCodeRequest, user: dict = Depends(get_current_user)):
    d = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Delivery not found")
    if user["id"] != d["traveler_id"]:
        raise HTTPException(403, "Only traveler can validate delivery")
    if d["status"] == "delivered":
        raise HTTPException(400, "Already delivered")
    if body.code.strip() != d["validation_code"]:
        raise HTTPException(400, "Invalid validation code")
    await db.deliveries.update_one(
        {"id": delivery_id},
        {"$set": {"status": "delivered", "delivered_at": now_utc()}},
    )
    await db.listings.update_one({"id": d["listing_id"]}, {"$set": {"status": "delivered"}})
    await db.conversations.update_one(
        {"id": d["conversation_id"]},
        {"$set": {"last_message": "Delivery completed!", "updated_at": now_utc()}},
    )
    await db.messages.insert_one({
        "id": gen_id(),
        "conversation_id": d["conversation_id"],
        "sender_id": "system",
        "sender_name": "boxRadar",
        "text": "Delivery validated and marked as completed. Please leave a review.",
        "type": "system",
        "created_at": now_utc(),
    })
    return {"ok": True, "status": "delivered"}


# ===== Reviews =====
@api.post("/reviews")
async def post_review(body: ReviewCreate, user: dict = Depends(get_current_user)):
    d = await db.deliveries.find_one({"id": body.delivery_id}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Delivery not found")
    if d["status"] != "delivered":
        raise HTTPException(400, "Delivery not completed yet")
    if user["id"] not in (d["sender_id"], d["traveler_id"]):
        raise HTTPException(403, "Not allowed")
    target_id = d["traveler_id"] if user["id"] == d["sender_id"] else d["sender_id"]

    existing = await db.reviews.find_one({"delivery_id": body.delivery_id, "reviewer_id": user["id"]})
    if existing:
        raise HTTPException(400, "Already reviewed")

    review = {
        "id": gen_id(),
        "delivery_id": body.delivery_id,
        "reviewer_id": user["id"],
        "reviewer_name": user["full_name"],
        "target_id": target_id,
        "rating": body.rating,
        "comment": body.comment,
        "created_at": now_utc(),
    }
    await db.reviews.insert_one(dict(review))
    # Update target rating
    pipeline = [{"$match": {"target_id": target_id}}, {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}]
    agg = await db.reviews.aggregate(pipeline).to_list(1)
    if agg:
        await db.users.update_one({"id": target_id}, {"$set": {"rating": round(agg[0]["avg"], 2), "review_count": agg[0]["count"]}})
    review.pop("_id", None)
    return review


@api.get("/users/{user_id}")
async def get_user_public(user_id: str):
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0, "email": 0, "phone": 0})
    if not u:
        raise HTTPException(404, "User not found")
    reviews = await db.reviews.find({"target_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"user": u, "reviews": reviews}


@api.get("/")
async def root():
    return {"app": "boxRadar", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.listings.create_index("id", unique=True)
    await db.listings.create_index([("origin_city", 1), ("destination_city", 1)])
    await db.conversations.create_index("id", unique=True)
    await db.conversations.create_index("participants")
    await db.messages.create_index("conversation_id")
    await db.deliveries.create_index("id", unique=True)
    await db.reviews.create_index([("target_id", 1)])

    # Seed admin
    if not await db.users.find_one({"email": ADMIN_EMAIL.lower()}):
        await db.users.insert_one({
            "id": gen_id(),
            "email": ADMIN_EMAIL.lower(),
            "password_hash": hash_password(ADMIN_PASSWORD),
            "full_name": "boxRadar Admin",
            "user_type": "pro",
            "phone": None,
            "bio": "Platform administrator",
            "avatar_url": None,
            "rating": 0.0,
            "review_count": 0,
            "created_at": now_utc(),
        })
    # Seed demo users + listings if empty
    if await db.listings.count_documents({}) == 0:
        demo_users = [
            ("aminata@boxradar.app", "Demo123!", "Aminata Diop", "sender", "+221 77 123 4567"),
            ("lucas@boxradar.app", "Demo123!", "Lucas Martin", "traveler", "+33 6 12 34 56 78"),
            ("kwame@boxradar.app", "Demo123!", "Kwame Mensah", "pro", "+233 24 555 7890"),
        ]
        user_map = {}
        for em, pw, nm, ut, ph in demo_users:
            existing = await db.users.find_one({"email": em})
            if existing:
                user_map[em] = existing
                continue
            uid = gen_id()
            udoc = {
                "id": uid, "email": em, "password_hash": hash_password(pw),
                "full_name": nm, "user_type": ut, "phone": ph,
                "bio": f"Demo {ut} on boxRadar",
                "avatar_url": None, "rating": 4.8, "review_count": 12,
                "created_at": now_utc(),
            }
            await db.users.insert_one(udoc)
            user_map[em] = udoc

        demo_listings = [
            ("trip", "lucas@boxradar.app", "Paris", "France", "Dakar", "Senegal", 5, 8.0, 80.0,
             "Paris → Dakar via Air France", "I have 8kg available in my suitcase. Direct flight."),
            ("trip", "kwame@boxradar.app", "London", "United Kingdom", "Accra", "Ghana", 12, 15.0, 150.0,
             "London → Accra direct flight", "Pro carrier, 15kg available, professional service."),
            ("parcel", "aminata@boxradar.app", "Marseille", "France", "Abidjan", "Côte d'Ivoire", 3, 3.5, 45.0,
             "Documents and small gifts", "Important documents and family gifts to deliver to my mother."),
            ("trip", "lucas@boxradar.app", "Brussels", "Belgium", "Kinshasa", "DR Congo", 20, 10.0, 120.0,
             "Brussels → Kinshasa weekly flight", "Regular traveler, 10kg space available."),
            ("parcel", "kwame@boxradar.app", "Madrid", "Spain", "Lagos", "Nigeria", 7, 5.0, 60.0,
             "Birthday gift package", "Wrapped gifts for my niece's birthday."),
        ]
        for typ, em, oc, ocn, dc, dcn, day_offset, w, p, title, desc in demo_listings:
            u = user_map[em]
            await db.listings.insert_one({
                "id": gen_id(), "type": typ,
                "origin_city": oc, "origin_country": ocn,
                "destination_city": dc, "destination_country": dcn,
                "travel_date": now_utc() + timedelta(days=day_offset),
                "weight_kg": w, "price_estimate": p,
                "title": title, "description": desc,
                "user_id": u["id"], "user_name": u["full_name"],
                "user_rating": u["rating"], "status": "active",
                "created_at": now_utc(),
            })


@app.on_event("shutdown")
async def shutdown():
    client.close()

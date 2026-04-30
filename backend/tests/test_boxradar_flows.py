"""
boxRadar backend regression tests.
Covers: auth, listings, offers/conversations, accept/reject, delivery validate,
reviews, public user profile, and demo seed data.
"""
import os
import time
import uuid
import requests
import pytest

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL",
                      "https://brave-darwin-6.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

AMINATA = ("aminata@boxradar.app", "Demo123!")  # sender
LUCAS   = ("lucas@boxradar.app",   "Demo123!")  # traveler
KWAME   = ("kwame@boxradar.app",   "Demo123!")  # pro


# --- helpers ---
def login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    return data["token"], data["user"]

def auth_h(token):
    return {"Authorization": f"Bearer {token}"}


# --- fixtures ---
@pytest.fixture(scope="module")
def aminata():
    t, u = login(*AMINATA); return {"token": t, "user": u}

@pytest.fixture(scope="module")
def lucas():
    t, u = login(*LUCAS); return {"token": t, "user": u}

@pytest.fixture(scope="module")
def kwame():
    t, u = login(*KWAME); return {"token": t, "user": u}


# --- Auth ---
class TestAuth:
    def test_register_new_user(self):
        email = f"test_{uuid.uuid4().hex[:10]}@boxradar.app"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Test1234!",
            "full_name": "Test User", "user_type": "sender"
        }, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body and body["user"]["email"] == email.lower()
        assert body["user"]["user_type"] == "sender"

    def test_register_duplicate_email(self):
        r = requests.post(f"{API}/auth/register", json={
            "email": AMINATA[0], "password": "Demo123!",
            "full_name": "Dup", "user_type": "sender"
        }, timeout=15)
        assert r.status_code == 400

    def test_login_demo_users(self):
        for em, pw in [AMINATA, LUCAS, KWAME]:
            t, u = login(em, pw)
            assert u["email"] == em

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": AMINATA[0], "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self, aminata):
        r = requests.get(f"{API}/auth/me", headers=auth_h(aminata["token"]), timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == AMINATA[0]

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_invalid_token(self):
        r = requests.get(f"{API}/auth/me",
                         headers={"Authorization": "Bearer garbage"}, timeout=15)
        assert r.status_code == 401


# --- Listings ---
class TestListings:
    def test_list_all(self):
        r = requests.get(f"{API}/listings", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 5, "expected seeded listings"

    def test_filter_by_type_trip(self):
        r = requests.get(f"{API}/listings", params={"type": "trip"}, timeout=15)
        assert r.status_code == 200
        assert all(x["type"] == "trip" for x in r.json())

    def test_filter_by_origin(self):
        r = requests.get(f"{API}/listings", params={"origin": "Paris"}, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        assert all(x["origin_city"].lower().startswith("paris") for x in items)

    def test_filter_by_destination(self):
        r = requests.get(f"{API}/listings", params={"destination": "Dakar"}, timeout=15)
        assert r.status_code == 200
        assert any(x["destination_city"] == "Dakar" for x in r.json())

    def test_filter_max_weight(self):
        r = requests.get(f"{API}/listings", params={"max_weight": 5}, timeout=15)
        assert r.status_code == 200
        assert all(x["weight_kg"] <= 5 for x in r.json())

    def test_get_listing_by_id(self):
        items = requests.get(f"{API}/listings", timeout=15).json()
        first = items[0]
        r = requests.get(f"{API}/listings/{first['id']}", timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == first["id"]

    def test_get_listing_not_found(self):
        r = requests.get(f"{API}/listings/{uuid.uuid4()}", timeout=15)
        assert r.status_code == 404

    def test_create_listing_auth_required(self):
        r = requests.post(f"{API}/listings", json={
            "type": "trip", "origin_city": "X", "origin_country": "Y",
            "destination_city": "A", "destination_country": "B",
            "travel_date": "2026-05-01T00:00:00Z", "weight_kg": 1,
            "price_estimate": 1, "title": "t"
        }, timeout=15)
        assert r.status_code == 401

    def test_create_listing_authed(self, lucas):
        payload = {
            "type": "trip", "origin_city": "TEST_Lyon", "origin_country": "France",
            "destination_city": "Abidjan", "destination_country": "Côte d'Ivoire",
            "travel_date": "2026-05-20T10:00:00Z", "weight_kg": 4.0,
            "price_estimate": 55.0, "title": "TEST_Lyon → Abidjan",
            "description": "Test listing"
        }
        r = requests.post(f"{API}/listings", json=payload,
                          headers=auth_h(lucas["token"]), timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["user_id"] == lucas["user"]["id"]
        # Verify via GET
        g = requests.get(f"{API}/listings/{created['id']}", timeout=15)
        assert g.status_code == 200 and g.json()["title"] == payload["title"]


# --- Offers / Conversations / Delivery / Reviews ---
class TestOfferAndDeliveryFlow:
    """Full happy-path: offer -> accept -> validate -> review."""

    @pytest.fixture(scope="class")
    def ctx(self, aminata, lucas):
        # Lucas (traveler) creates a fresh trip listing; Aminata (sender) makes offer.
        payload = {
            "type": "trip", "origin_city": "TEST_Nice", "origin_country": "France",
            "destination_city": "Bamako", "destination_country": "Mali",
            "travel_date": "2026-06-01T10:00:00Z", "weight_kg": 6.0,
            "price_estimate": 70.0, "title": "TEST_flow Nice→Bamako",
            "description": "flow"
        }
        r = requests.post(f"{API}/listings", json=payload,
                          headers=auth_h(lucas["token"]), timeout=15)
        assert r.status_code == 200, r.text
        listing = r.json()
        return {"listing": listing, "aminata": aminata, "lucas": lucas}

    def test_make_offer_creates_conversation(self, ctx):
        r = requests.post(f"{API}/offers", json={
            "listing_id": ctx["listing"]["id"], "price": 65.0, "message": "Hi"
        }, headers=auth_h(ctx["aminata"]["token"]), timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "conversation_id" in body and body["message"]["type"] == "offer"
        ctx["convo_id"] = body["conversation_id"]

    def test_offer_on_own_listing_forbidden(self, ctx):
        r = requests.post(f"{API}/offers", json={
            "listing_id": ctx["listing"]["id"], "price": 1.0
        }, headers=auth_h(ctx["lucas"]["token"]), timeout=15)
        assert r.status_code == 400

    def test_list_conversations_for_aminata(self, ctx):
        r = requests.get(f"{API}/conversations",
                         headers=auth_h(ctx["aminata"]["token"]), timeout=15)
        assert r.status_code == 200
        ids = [c["id"] for c in r.json()]
        assert ctx["convo_id"] in ids

    def test_get_conversation_detail(self, ctx):
        r = requests.get(f"{API}/conversations/{ctx['convo_id']}",
                         headers=auth_h(ctx["aminata"]["token"]), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "conversation" in data and "messages" in data
        assert data["delivery"] is None
        assert len(data["messages"]) >= 1

    def test_post_message(self, ctx):
        r = requests.post(f"{API}/conversations/{ctx['convo_id']}/messages",
                          json={"text": "Looking forward!"},
                          headers=auth_h(ctx["aminata"]["token"]), timeout=15)
        assert r.status_code == 200
        assert r.json()["text"] == "Looking forward!"

    def test_non_owner_cannot_accept(self, ctx):
        # aminata (offerer) should NOT be able to accept
        r = requests.post(f"{API}/conversations/{ctx['convo_id']}/accept-offer",
                          headers=auth_h(ctx["aminata"]["token"]), timeout=15)
        assert r.status_code == 403

    def test_owner_accepts_offer(self, ctx):
        r = requests.post(f"{API}/conversations/{ctx['convo_id']}/accept-offer",
                          headers=auth_h(ctx["lucas"]["token"]), timeout=15)
        assert r.status_code == 200, r.text
        delivery = r.json()
        assert "id" in delivery and len(delivery["validation_code"]) == 6
        assert delivery["status"] == "in_transit"
        assert delivery["agreed_price"] == 65.0
        ctx["delivery"] = delivery

    def test_traveler_cannot_see_code_in_transit(self, ctx):
        # For trip listing: sender=offerer(aminata), traveler=owner(lucas)
        r = requests.get(f"{API}/deliveries/{ctx['delivery']['id']}",
                         headers=auth_h(ctx["lucas"]["token"]), timeout=15)
        assert r.status_code == 200
        assert "validation_code" not in r.json(), "Traveler must NOT see code before delivered"

    def test_sender_can_see_code(self, ctx):
        r = requests.get(f"{API}/deliveries/{ctx['delivery']['id']}",
                         headers=auth_h(ctx["aminata"]["token"]), timeout=15)
        assert r.status_code == 200
        assert r.json()["validation_code"] == ctx["delivery"]["validation_code"]

    def test_non_traveler_cannot_validate(self, ctx):
        r = requests.post(f"{API}/deliveries/{ctx['delivery']['id']}/validate",
                          json={"code": ctx["delivery"]["validation_code"]},
                          headers=auth_h(ctx["aminata"]["token"]), timeout=15)
        assert r.status_code == 403

    def test_validate_wrong_code(self, ctx):
        r = requests.post(f"{API}/deliveries/{ctx['delivery']['id']}/validate",
                          json={"code": "000000"},
                          headers=auth_h(ctx["lucas"]["token"]), timeout=15)
        assert r.status_code == 400

    def test_validate_correct_code(self, ctx):
        r = requests.post(f"{API}/deliveries/{ctx['delivery']['id']}/validate",
                          json={"code": ctx["delivery"]["validation_code"]},
                          headers=auth_h(ctx["lucas"]["token"]), timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "delivered"
        # verify listing status updated
        g = requests.get(f"{API}/listings/{ctx['listing']['id']}", timeout=15)
        assert g.json()["status"] == "delivered"

    def test_validate_already_delivered(self, ctx):
        r = requests.post(f"{API}/deliveries/{ctx['delivery']['id']}/validate",
                          json={"code": ctx["delivery"]["validation_code"]},
                          headers=auth_h(ctx["lucas"]["token"]), timeout=15)
        assert r.status_code == 400

    def test_review_after_delivery(self, ctx):
        r = requests.post(f"{API}/reviews", json={
            "delivery_id": ctx["delivery"]["id"], "rating": 5, "comment": "Great!"
        }, headers=auth_h(ctx["aminata"]["token"]), timeout=15)
        assert r.status_code == 200, r.text
        rev = r.json()
        assert rev["rating"] == 5
        # Lucas (traveler) rating should update
        pu = requests.get(f"{API}/users/{ctx['lucas']['user']['id']}", timeout=15)
        assert pu.status_code == 200
        assert pu.json()["user"]["review_count"] >= 1
        ctx["review_done"] = True

    def test_duplicate_review_blocked(self, ctx):
        r = requests.post(f"{API}/reviews", json={
            "delivery_id": ctx["delivery"]["id"], "rating": 4, "comment": "again"
        }, headers=auth_h(ctx["aminata"]["token"]), timeout=15)
        assert r.status_code == 400


class TestRejectOffer:
    def test_reject_offer_flow(self, aminata, kwame):
        # Kwame creates listing, Aminata offers, Kwame rejects
        lp = {
            "type": "trip", "origin_city": "TEST_Rome", "origin_country": "Italy",
            "destination_city": "Cairo", "destination_country": "Egypt",
            "travel_date": "2026-07-01T10:00:00Z", "weight_kg": 2.0,
            "price_estimate": 40.0, "title": "TEST_reject Rome→Cairo"
        }
        r = requests.post(f"{API}/listings", json=lp,
                          headers=auth_h(kwame["token"]), timeout=15)
        assert r.status_code == 200
        listing = r.json()
        o = requests.post(f"{API}/offers", json={"listing_id": listing["id"], "price": 30.0},
                          headers=auth_h(aminata["token"]), timeout=15)
        assert o.status_code == 200
        convo_id = o.json()["conversation_id"]

        # Offerer cannot reject
        bad = requests.post(f"{API}/conversations/{convo_id}/reject-offer",
                            headers=auth_h(aminata["token"]), timeout=15)
        assert bad.status_code == 403

        rej = requests.post(f"{API}/conversations/{convo_id}/reject-offer",
                            headers=auth_h(kwame["token"]), timeout=15)
        assert rej.status_code == 200

        # Verify status
        c = requests.get(f"{API}/conversations/{convo_id}",
                         headers=auth_h(kwame["token"]), timeout=15)
        assert c.json()["conversation"]["offer_status"] == "rejected"


class TestPublicUser:
    def test_public_user_no_email(self, aminata):
        r = requests.get(f"{API}/users/{aminata['user']['id']}", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "user" in data and "reviews" in data
        assert "email" not in data["user"], "public profile must not leak email"
        assert "password_hash" not in data["user"]

    def test_public_user_not_found(self):
        r = requests.get(f"{API}/users/{uuid.uuid4()}", timeout=15)
        assert r.status_code == 404

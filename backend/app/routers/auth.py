"""인증 API 라우터 (회원가입, 로그인, 내 정보)"""

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services.auth import (
    hash_password,
    verify_password,
    create_token,
    require_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5)
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """회원가입"""
    # 이메일 중복 확인
    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다.")

    # 유저네임 중복 확인
    result = await db.execute(select(User).where(User.username == request.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 사용 중인 사용자명입니다.")

    user = User(
        email=request.email,
        username=request.username,
        hashed_password=hash_password(request.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_token(user.id, user.email)

    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "plan": user.plan,
        },
    }


@router.post("/login")
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """로그인"""
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    token = create_token(user.id, user.email)

    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "plan": user.plan,
        },
    }


@router.get("/me")
async def get_me(user: User = Depends(require_user)):
    """내 정보 조회"""
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "plan": user.plan,
        "daily_usage": user.daily_usage,
        "created_at": user.created_at.isoformat(),
    }

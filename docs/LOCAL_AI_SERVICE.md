# 本机 AI 服务示例（127.0.0.1 + /decide）

本文件给出一份可运行的 Python FastAPI 示例，实现本站的 `POST /decide` 协议。
它是**你本机的服务**，不是本站的后端。

## 1. 协议

请求：

```json
{
  "protocolVersion": 1,
  "game": "gomoku",
  "observation": { "...": "公开局面" },
  "legalActions": [
    { "type": "place", "row": 7, "col": 7 }
  ],
  "turn": 0,
  "playerId": "black"
}
```

响应：

```json
{ "action": { "type": "place", "row": 7, "col": 7 } }
```

规则：

- `action` 必须与 `legalActions` 中某一项**结构完全一致**；
- 服务可以返回 4xx/5xx，本站会按 401 / 403 / 404 / 429 / 5xx 分类显示；
- 本站每次决策都带超时；超时会取消请求并终止本回合。
- 服务不能绕过规则修改局面——它只能给一个候选动作。

## 2. 安装与运行（Windows PowerShell 7）

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install fastapi uvicorn pydantic
python .\server.py
```

只监听 `127.0.0.1`：

```powershell
uvicorn server:app --host 127.0.0.1 --port 8787
```

不要用 `--host 0.0.0.0`；那会把服务暴露到局域网。

## 3. 完整示例 `server.py`

```python
from __future__ import annotations

import os
from typing import Any, Literal

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# 只放行你自己的站点 Origin；不要使用 "*"。
ALLOWED_ORIGINS = {
    "http://localhost:5173",   # 本地开发
    # "https://your-site.example",  # 实际部署地址
}

# 可选：设置该环境变量后，要求 Authorization: Bearer <token>。
# CORS 白名单不是身份认证，令牌也不是万能防护；两者都要有。
ACCESS_TOKEN = os.environ.get("DECIDE_TOKEN", "")

app = FastAPI(title="StrategyGameArcades local decide service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(ALLOWED_ORIGINS),
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    allow_credentials=False,
)


class DecideRequest(BaseModel):
    protocolVersion: Literal[1]
    game: str = Field(min_length=1, max_length=64)
    observation: dict[str, Any]
    legalActions: list[dict[str, Any]] = Field(min_length=1)
    turn: int = Field(ge=0)
    playerId: str = Field(min_length=1, max_length=64)


class DecideResponse(BaseModel):
    action: dict[str, Any]


def normalize(action: dict[str, Any]) -> str:
    """稳定比较 JSON 结构；不依赖字典插入顺序。"""
    import json

    return json.dumps(action, sort_keys=True, separators=(",", ":"))


def choose(req: DecideRequest) -> dict[str, Any]:
    """
    这里替换成你的策略或模型调用。
    示例只返回第一个合法动作，用于先跑通协议。
    """
    # 示例：五子棋优先占据中心附近。
    if req.game == "gomoku":
        size = int(req.observation.get("size", 15))
        middle = size // 2
        legal = {normalize(a) for a in req.legalActions}
        for radius in range(0, size):
            for dr in range(-radius, radius + 1):
                for dc in range(-radius, radius + 1):
                    candidate = {
                        "type": "place",
                        "row": middle + dr,
                        "col": middle + dc,
                    }
                    if normalize(candidate) in legal:
                        return candidate
    return req.legalActions[0]


@app.post("/decide", response_model=DecideResponse)
def decide(
    req: DecideRequest,
    authorization: str | None = Header(default=None),
) -> DecideResponse:
    if ACCESS_TOKEN:
        expected = f"Bearer {ACCESS_TOKEN}"
        if authorization != expected:
            raise HTTPException(status_code=401, detail="invalid token")

    action = choose(req)

    # 服务侧也必须校验，不能把非法动作发回去。
    if normalize(action) not in {normalize(a) for a in req.legalActions}:
        raise HTTPException(status_code=422, detail="chosen action is not legal")

    return DecideResponse(action=action)
```

## 4. 接到 Ollama / LM Studio

这两者已经提供 OpenAI 兼容接口，通常**不需要** `/decide` 代理：

- 完整请求地址填 `http://127.0.0.1:11434/v1/chat/completions`（Ollama）
  或 `http://127.0.0.1:1234/v1/chat/completions`（LM Studio）；
- 模型 ID 填本机已加载的模型；
- 在本地服务中放行本站 Origin 的 CORS。

只有当你想在服务端做额外的特征编码、搜索或模型组合时，才需要 `/decide`：

```python
# choose() 内部示例：调用本机 Ollama
# response = requests.post(
#     "http://127.0.0.1:11434/v1/chat/completions",
#     json={...},
#     timeout=30,
# )
# 解析并校验成 legalActions 中的一个动作后再返回
```

## 5. 安全说明

- CORS 只限制浏览器能否读取响应，**不是身份认证**；本机其它程序仍可访问服务。
- 需要访问控制时，设置 `DECIDE_TOKEN` 并在配置页填写同一个令牌。
- 服务只监听 `127.0.0.1`，不要监听所有网卡。
- 不要在服务里执行用户提交的任意代码；如果接收策略源码，必须使用独立沙箱。
- 服务日志可能包含棋局数据；是否落盘、保存多久由你自己决定。
- 浏览器可能在 localhost / 私有网络请求上增加额外限制；以实际浏览器与 DevTools 为准。

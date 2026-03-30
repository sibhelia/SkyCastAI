from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

from api.graph import create_graph, State
from api.utils import get_city_image
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

app = FastAPI()

# Gerekli CORS ayarları (Frontend'den erişim için)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    provider: str = "gemini"
    history: List[dict] = []

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # LangGraph akışını seçilen provider ile oluştur
        graph = create_graph(request.provider)
        
        # Geçmişi mesaj nesnelerine çevir
        messages = []
        for m in request.history:
            if m["role"] == "user":
                messages.append(HumanMessage(content=m["content"]))
            elif m["role"] == "assistant":
                messages.append(AIMessage(content=m["content"]))
        
        # Yeni mesajı ekle
        messages.append(HumanMessage(content=request.message))
        
        # Graph'ı çalıştır
        final_state = graph.invoke({"messages": messages})
        
        # Son mesajı al
        last_msg = final_state["messages"][-1]
        
        # Ek verileri ayıkla (eğer get_weather çalıştıysa)
        weather_data = None
        tool_location = None
        
        for m in reversed(final_state["messages"]):
            if isinstance(m, ToolMessage):
                import json
                try:
                    content = m.content
                    # ToolMessage string olarak JSON döner
                    if isinstance(content, str) and content.strip().startswith("{"):
                        weather_data = json.loads(content)
                        tool_location = weather_data.get("location")
                    break
                except Exception:
                    break

        # Şehir ismi ve Resim URL bulma
        # Öncelik tool'dan gelen kesin lokasyonda
        image_url = None
        search_city = tool_location
        
        # Eğer tool çalışmadıysa (selamlaşma vb), mesajdan bulmaya çalış
        if not search_city:
            possible_cities = [word.capitalize() for word in request.message.split() if len(word) > 3]
            if possible_cities:
                search_city = possible_cities[0]

        if search_city:
            image_url = get_city_image(search_city)

        return {
            "response": last_msg.content,
            "image_url": image_url,
            "weather_details": weather_data,
            "provider": request.provider
        }
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

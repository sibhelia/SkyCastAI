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
        # LangGraph'ta alet yanıtları ToolMessage olarak saklanır.
        weather_data = None
        for m in reversed(final_state["messages"]):
            if isinstance(m, ToolMessage):
                import json
                try:
                    content = m.content
                    if isinstance(content, str) and content.strip().startswith("{"):
                        weather_data = json.loads(content)
                    break
                except Exception:
                    break

        # Şehir ismi bulma
        image_url = None
        possible_cities = [word.capitalize() for word in request.message.split() if len(word) > 3]
        if possible_cities:
            image_url = get_city_image(possible_cities[0])
        elif weather_data and "location" in weather_data:
            image_url = get_city_image(weather_data["location"])

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

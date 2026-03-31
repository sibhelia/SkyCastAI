import os
from typing import Annotated, TypedDict, List
from dotenv import load_dotenv

from langchain_core.messages import BaseMessage, HumanMessage, ToolMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
import requests
import json

load_dotenv()

# --- 1. State Definition ---
class State(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    provider: str  # Hangi provider'ın kullanıldığı bilgisi

# --- 2. Tool Tanımı ---
@tool
def get_weather(location: str):
    """Belirtilen konumun anlık hava durumunu, rüzgar hızını, nem oranını ve basıncı getirir."""
    api_key = os.getenv("OPENWEATHERMAP_API_KEY")
    
    if not api_key or "your_weather_key" in api_key:
        return f"{location} için hava durumu şu an 22°C, Nem: %45, Rüzgar: 10 km/sa (Simüle Edilen Veri)."
    
    url = f"http://api.openweathermap.org/data/2.5/weather?q={location}&appid={api_key}&units=metric&lang=tr"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        temp = data['main']['temp']
        humidity = data['main']['humidity']
        pressure = data['main']['pressure']
        wind_speed = round(data['wind']['speed'] * 3.6, 1) # m/s to km/h
        desc = data['weather'][0]['description']
        
        result = {
            "location": location,
            "temp": f"{temp}°C",
            "humidity": f"%{humidity}",
            "pressure": f"{pressure} hPa",
            "wind": f"{wind_speed} km/sa",
            "description": desc,
            "raw_text": f"{location} konumunda hava {temp}°C ve {desc}. Nem: %{humidity}, Rüzgar: {wind_speed} km/sa."
        }
        return json.dumps(result, ensure_ascii=False)
    else:
        return f"Hata: {location} için hava durumu bilgisi çekilemedi."

tools = [get_weather]

# --- 3. Dynamic LLM Factory ---
def get_llm(provider: str):
    """
    Seçilen provider'a göre LLM objesini döner.
    Bazı provider'lar (Gemini gibi) kota hataları için bir liste (fallback) dönebilir.
    """
    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        # Gemini 2.0 Flash Lite -> Gemini 1.5 FlashFallback silsilesi
        return [
            ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", temperature=0.7),
            ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.7),
            ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.7),
        ]
    
    # Şimdilik Gemini ile başladık, diğerleri boş
    return None

# --- 4. Node Logic ---
def agent_node(state: State):
    """
    Modeli çağırıp yanıtı state'e ekleyen ana düğüm.
    """
    provider = state.get("provider", "gemini")
    messages = state["messages"]
    
    # Sistem talimatı (Kısa cevap kuralı burada sabit)
    sys_msg = SystemMessage(content="""Sen gelişmiş bir mobil hava durumu uygulamasının asistanısın. 
    1. Cevabın ÇOK KISA (maks 2-3 cümle) olmalı.
    2. Mutlaka 1 pratik tavsiye ver.
    3. Gereksiz kelime kullanma.""")
    
    all_messages = [sys_msg] + messages
    
    # 1. Gemini İşleme (Fallback Mantığı ile)
    if provider == "gemini":
        llms = get_llm("gemini")
        last_error = None
        for llm in llms:
            try:
                llm_with_tools = llm.bind_tools(tools)
                msg = llm_with_tools.invoke(all_messages)
                print(f"[Graph Log] {llm.model} başarıyla yanıt verdi.")
                return {"messages": [msg]}
            except Exception as e:
                err_str = str(e).lower()
                if any(x in err_str for x in ["quota", "429", "resource_exhausted"]):
                    print(f"[Graph Log] {llm.model} kota doldu, sonraki deneniyor...")
                    last_error = e
                    continue
                raise e
        raise last_error

    # Diğer provider'lar henüz 'grafa dahil değil' :)
    # Bu adımı bitirdikten sonra sıradakini buraya ekleyeceğiz.
    print(f"[Graph Log] Hata: '{provider}' henüz yapılandırılmadı.")
    return {"messages": [HumanMessage(content="Üzgünüm, bu model henüz hazır değil.")]}

# --- 5. Graph Definition ---
def create_graph(provider: str = "gemini"):
    workflow = StateGraph(State)
    
    # Düğümleri ekle
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", ToolNode(tools))
    
    # Akışı tanımla
    workflow.set_entry_point("agent")
    workflow.add_conditional_edges("agent", tools_condition)
    workflow.add_edge("tools", "agent")
    
    return workflow.compile()

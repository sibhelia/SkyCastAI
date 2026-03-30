import os
from typing import Annotated, TypedDict, List
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, HumanMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END, MessageGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition

# .env dosyasını yükle
load_dotenv()

# --- 1. State Definition ---
class State(TypedDict):
    # messages listesini yöneten state. add_messages ile listeye yeni yanıtlar eklenir.
    messages: Annotated[List[BaseMessage], add_messages]

# --- 2. Tool Tanımı ---
@tool
def get_weather(location: str):
    """Belirtilen konumun anlık hava durumunu getirir."""
    # OPENWEATHERMAP_API_KEY henüz yoksa mock veri dönüyoruz.
    api_key = os.getenv("OPENWEATHERMAP_API_KEY")
    
    if not api_key or "your_weather_key" in api_key:
        # Mock Veri (Placeholder)
        return f"{location} için hava durumu şu an 22°C ve Güneşli (Simüle Edilen Veri)."
    
    # Real API Logic (OpenWeatherMap)
    import requests
    url = f"http://api.openweathermap.org/data/2.5/weather?q={location}&appid={api_key}&units=metric&lang=tr"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        temp = data['main']['temp']
        desc = data['weather'][0]['description']
        return f"{location} konumunda hava {temp}°C ve {desc}."
    else:
        return f"Hata: {location} için hava durumu bilgisi çekilemedi."

# --- 3. Node Logic: Classifier/LLM ---
# LLM'e tool bind ediliyor.
llm = ChatGoogleGenerativeAI(
    model="models/gemini-2.5-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY")
)
tools = [get_weather]
llm_with_tools = llm.bind_tools(tools)

def classifier_node(state: State):
    """Kullanıcının girdisini alır ve tool çağrısı (tool_calls) üretip üretmeyeceğine karar verir."""
    return {"messages": [llm_with_tools.invoke(state["messages"])]}

# --- 4. Graph Architecture ---
workflow = StateGraph(State)

# Düğümler ekleniyor
workflow.add_node("agent", classifier_node)
workflow.add_node("tools", ToolNode(tools))

# Akış (Edges) ayarlanıyor
# Giriş noktası: agent
workflow.set_entry_point("agent")

# Şartlı Geçiş (Conditional Mapping)
# Eğer LLM tool çağırdıysa "tools" düğümüne, aksi halde sonlandır (END).
workflow.add_conditional_edges(
    "agent",
    tools_condition,
)

# Tool çalıştıktan sonra tekrar LLM'e (agent) dön ki sonucu yorumlasın.
workflow.add_edge("tools", "agent")

# Graph derleniyor
app = workflow.compile()

# --- 5. Uygulamayı Çalıştırma (CLI) ---
def run_weather_bot():
    print("--- Hava Durumu Asistanı Başlatıldı (Çıkış için 'exit' yazın) ---")
    messages = []
    
    while True:
        user_input = input("\nSiz: ")
        if user_input.lower() in ["exit", "çıkış", "quit"]:
            break
            
        # State'i güncelle
        messages.append(HumanMessage(content=user_input))
        
        # Graph üzerinden akışı başlat
        for chunk in app.stream({"messages": messages}, stream_mode="values"):
            # En son mesajı yazdır (LLM veya Tool yanıtı)
            last_message = chunk["messages"][-1]
            
            # Eğer HumanMessage değilse ve içeriği varsa yazdır
            if not isinstance(last_message, HumanMessage) and last_message.content:
                if isinstance(last_message, ToolMessage):
                    print(f"[Tool Yanıtı]: {last_message.content}")
                else:
                    print(f"\nAsistan: {last_message.content}")
        
        # Konuşma geçmişini güncelle
        messages = chunk["messages"]

if __name__ == "__main__":
    run_weather_bot()

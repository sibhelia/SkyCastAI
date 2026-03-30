import os
from typing import Annotated, TypedDict, List
from dotenv import load_dotenv

from langchain_core.messages import BaseMessage, HumanMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
import requests

load_dotenv()

# --- 1. State Definition ---
class State(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]

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
        # LangChain ToolMessage string içerik gerektirir
        import json
        return json.dumps(result, ensure_ascii=False)
    else:
        return f"Hata: {location} için hava durumu bilgisi çekilemedi."

tools = [get_weather]

# --- 3. Dynamic LLM Factory ---
def get_llm(provider: str):
    if provider == "openai-gpt3.5":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model="gpt-3.5-turbo", temperature=0.7)
    elif provider == "openai-gpt4o":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model="gpt-4o", temperature=0.7)
    elif provider == "openai-gpt4o-mini":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
    elif provider == "anthropic-claude3":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model_name="claude-3-haiku-20240307", temperature=0.7)
    elif provider == "groq-llama3":
        from langchain_groq import ChatGroq
        # Groq Llama3 70B çok yetenekli ve genelde free tier'da erişilebilir (rate limitlere dikkat)
        return ChatGroq(model_name="llama3-70b-8192", temperature=0.7)
    elif provider == "groq-mixtral":
        from langchain_groq import ChatGroq
        return ChatGroq(model_name="mixtral-8x7b-32768", temperature=0.7)
    elif provider == "ollama-llama3.2":
        from langchain_ollama import ChatOllama
        return ChatOllama(model="llama3.2", temperature=0.7)
    elif provider == "ollama-mistral":
        from langchain_ollama import ChatOllama
        return ChatOllama(model="mistral", temperature=0.7)
    elif provider == "ollama-phi3":
        from langchain_ollama import ChatOllama
        return ChatOllama(model="phi3", temperature=0.7)
    elif provider == "gemini-lite":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", google_api_key=os.getenv("GOOGLE_API_KEY"), temperature=0.7)
    else: # default to gemini flash
        from langchain_google_genai import ChatGoogleGenerativeAI
        # gemini-2.0-flash-lite: Free tier'da çok daha yüksek quota
        # gemini-2.0-flash quota bitince fallback olarak kullanılır
        gemini_models = [
            "gemini-2.0-flash-lite",
            "gemini-2.0-flash",
            "gemini-flash-latest",
        ]
        last_error = None
        for model_name in gemini_models:
            try:
                llm = ChatGoogleGenerativeAI(
                    model=model_name,
                    google_api_key=os.getenv("GOOGLE_API_KEY"),
                    temperature=0.7
                )
                # Bağlantıyı test etmeden döndür — invoke sırasında hata çıkarsa bir sonraki dene
                return llm
            except Exception as e:
                last_error = e
                continue
        raise last_error

# --- 4. Node Logic ---
from langchain_core.messages import SystemMessage

def create_graph(provider: str = "gemini"):
    # Create the LLM bound with tools
    llm = get_llm(provider)
    
    def classifier_node(state: State):
        sys_msg = SystemMessage(content="""Sen gelişmiş bir mobil hava durumu uygulamasının akıllı ve dost canlısı asistanısın. 

KRİTİK KURAL: 
Ekran SABİTTİR ve SCROLL (kaydırma) yoktur. Bu yüzden cevabın ÇOK KISA (maksimum 2-3 kısa cümle) olmalı.

İÇERİK:
1. Hava durumunu (sıcaklık, rüzgar vb.) doğal bir dille söyle. 
2. Mutlaka 1 tane pratik tavsiye ver (Örn: 'Şemsiye al', 'Güneş kremi sür').
3. Şehir ismini vurgula (Örn: 'Balıkesir'de hava...').
4. Gereksiz hiçbir kelime kullanma.""")
        messages_with_sys = [sys_msg] + state["messages"]
        
        # Gemini free-tier quota hatalarına karşı fallback modelleri
        if provider == "gemini":
            from langchain_google_genai import ChatGoogleGenerativeAI
            fallback_models = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-flash-latest"]
            last_err = None
            for model_name in fallback_models:
                try:
                    current_llm = ChatGoogleGenerativeAI(
                        model=model_name,
                        google_api_key=os.getenv("GOOGLE_API_KEY"),
                        temperature=0.7
                    )
                    llm_with_tools = current_llm.bind_tools(tools)
                    msg = llm_with_tools.invoke(messages_with_sys)
                    print(f"[OK] Model: {model_name}")
                    return {"messages": [msg]}
                except Exception as e:
                    err_str = str(e).lower()
                    if "quota" in err_str or "resource_exhausted" in err_str or "429" in err_str:
                        print(f"[QUOTA] {model_name} quota doldu, sonraki deneniyor...")
                        last_err = e
                        continue
                    raise e  # Quota dışı hata ise yeniden fırlat
            raise last_err
        else:
            llm_with_tools = llm.bind_tools(tools)
            msg = llm_with_tools.invoke(messages_with_sys)
            return {"messages": [msg]}

    workflow = StateGraph(State)
    
    workflow.add_node("agent", classifier_node)
    workflow.add_node("tools", ToolNode(tools))

    
    workflow.set_entry_point("agent")
    workflow.add_conditional_edges("agent", tools_condition)
    workflow.add_edge("tools", "agent")
    
    return workflow.compile()

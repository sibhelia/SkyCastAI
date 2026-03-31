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
    provider: str

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
        temp        = data['main']['temp']
        feels_like  = data['main']['feels_like']
        humidity    = data['main']['humidity']
        pressure    = data['main']['pressure']
        wind_speed  = round(data['wind']['speed'] * 3.6, 1)
        desc        = data['weather'][0]['description']
        visibility  = data.get('visibility', None)
        rain_1h     = data.get('rain', {}).get('1h', 0)

        result = {
            "location":    location,
            "temp":        f"{temp}°C",
            "feels_like":  f"{feels_like}°C",
            "humidity":    f"%{humidity}",
            "pressure":    f"{pressure} hPa",
            "wind":        f"{wind_speed} km/sa",
            "description": desc,
            "rain_1h":     rain_1h,
            "visibility":  visibility,
            "raw_text": (
                f"{location}: {temp}°C ({desc}). "
                f"Hissedilen: {feels_like}°C. "
                f"Nem: %{humidity}. "
                f"Rüzgar: {wind_speed} km/sa. "
                f"Basınç: {pressure} hPa."
                + (f" Son 1 saatte {rain_1h}mm yağış." if rain_1h else "")
            )
        }
        return json.dumps(result, ensure_ascii=False)
    else:
        return f"Hata: {location} için hava durumu bilgisi çekilemedi."

tools = [get_weather]

# --- Hava durumuna göre akıllı tavsiye sistemi ---
ADVICE_SYSTEM_PROMPT = """Sen hava durumu konusunda uzmanlaşmış, samimi ve pratik bir asistansın.

Gelen hava verilerini analiz edip şu formatta **kesinlikle JSON** yanıt ver, başka hiçbir şey yazma:

{
  "summary": "2-3 cümlelik özet + pratik tavsiye",
  "advice_type": "danger|warning|neutral|good",
  "icon_query": "Şehrin en ikonik mekanı (ör: Galata Kulesi)"
}

advice_type seçim kuralları:
- "danger"  → Don riski (≤2°C), aşırı sıcak (≥38°C), fırtına, çok yüksek rüzgar (≥60 km/sa), yoğun yağış
- "warning" → Yağışlı hava, serin/soğuk (3-10°C), sıcak ama bunaltıcı (33-37°C), kuvvetli rüzgar (40-59 km/sa)
- "neutral"  → Bulutlu, hafif rüzgarlı, orta sıcaklık (11-20°C)
- "good"     → Güneşli, 20-30°C arası, düşük nem, sakin rüzgar

summary için ZORUNLU kurallar:
1. İlk cümle: Koşulların canlı, etkileyici yorumu (sadece rakam okuma, değerlendirme yap)
2. İkinci cümle: Somut eylem tavsiyesi (örn: "Şemsiyeni çantana at.", "Hafif bir ceket yeterli.", "Bugün piknik için biçilmiş kaftan!", "Evden çıkma zorunlu değilse çıkma.")
3. Hissedilen sıcaklık gerçekten farklıysa (±4°C) mutlaka belirt
4. Yüksek nem (>%75) boğuculuk, düşük nem (<30%) kuruluk olarak yorum yap
5. Kesinlikle "Merhaba" veya selamlama ile başlama, direkt konuya gir

Örnekler:
- 5°C, yağmurlu → "Islak ve üşütücü bir gün sizi bekliyor. Uzun mont, su geçirmez ayakkabı şart; şemsiye çantanızda olsun."
- 28°C, güneşli, nem %40 → "Harika bir gün! Güneş kremi sürmeyi ve bol su içmeyi unutmayın."
- 35°C, nem %80 → "Bunaltıcı, nemli bir sıcaklık var — hissedilen çok daha fazla. Öğlen saatlerinde dışarı çıkmaktan kaçının, yanınızda mutlaka su taşıyın."
- -3°C, karlı → "Don tehlikesi! Yollarda buzlanma riski var. Şişme mont, eldiven ve kaymayan taban zorunlu."
"""

# --- 3. Dynamic LLM Factory ---
def get_llm(provider: str):
    if provider == "gemini-2.5-flash":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.5)

    elif provider == "gemini-2.5-pro":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model="gemini-2.5-pro", temperature=0.5)

    elif provider == "gemini-2.0-flash":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.5)

    elif provider == "gemini-2.0-flash-lite":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", temperature=0.5)

    elif provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return [
            ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite", temperature=0.5),
            ChatGoogleGenerativeAI(model="gemini-2.5-flash",       temperature=0.5),
            ChatGoogleGenerativeAI(model="gemini-2.5-pro",         temperature=0.5),
        ]

    elif provider.startswith("ollama-"):
        from langchain_ollama import ChatOllama
        model_name = provider.replace("ollama-", "")
        return ChatOllama(model=model_name, temperature=0.5)

    elif provider == "groq-llama3":
        from langchain_groq import ChatGroq
        return [
            ChatGroq(model_name="llama-3.3-70b-versatile", temperature=0.5),
            ChatGroq(model_name="llama-3.1-8b-instant",    temperature=0.5),
        ]

    return None


def _invoke_llm(llm, messages):
    """Tek bir LLM objesini araç bağlayarak çağırır."""
    llm_with_tools = llm.bind_tools(tools)
    return llm_with_tools.invoke(messages)


def agent_node(state: State):
    provider = state.get("provider", "gemini-2.0-flash-lite")
    messages  = state["messages"]

    has_tool_results = any(m.type == "tool" for m in messages)

    if not has_tool_results:
        # İlk tur: sadece aracı tetikle
        sys_msg = SystemMessage(
            content=(
                "Sen bir hava durumu asistanısın. "
                "Kullanıcının belirttiği şehrin hava durumunu get_weather aracıyla getir. "
                "Hiçbir şey söyleme, sadece aracı çağır."
            )
        )
    else:
        # Araç verisi geldi: akıllı tavsiye modu
        sys_msg = SystemMessage(content=ADVICE_SYSTEM_PROMPT)

    all_messages = [sys_msg] + messages

    # ---- Gemini ----
    if "gemini" in provider:
        current_llm = get_llm(provider)
        llm_list    = current_llm if isinstance(current_llm, list) else [current_llm]

        if not isinstance(current_llm, list):
            llm_list = llm_list + [
                get_llm("gemini-2.0-flash-lite"),
                get_llm("gemini-2.5-flash"),
            ]

        last_err = None
        for llm in llm_list:
            if not llm:
                continue
            try:
                msg = _invoke_llm(llm, all_messages)
                print(f"[Graph] Gemini ({llm.model}) OK")
                return {"messages": [msg]}
            except Exception as e:
                if any(x in str(e).lower() for x in ["quota", "429", "resource_exhausted"]):
                    print(f"[Graph] {llm.model} kota doldu, yedek deneniyor...")
                    last_err = e
                    continue
                return {"messages": [HumanMessage(content=f"Gemini Hatası: {e}")]}

        return {"messages": [HumanMessage(
            content=f"Tüm Gemini modellerinin kotası doldu. Groq veya Ollama kullanın. ({last_err})"
        )]}

    # ---- Ollama ----
    elif provider.startswith("ollama-"):
        llm = get_llm(provider)
        try:
            msg = _invoke_llm(llm, all_messages)
            return {"messages": [msg]}
        except Exception as e:
            return {"messages": [HumanMessage(
                content=f"Ollama '{provider}' bağlantı hatası. Model açık mı? ({e})"
            )]}

    # ---- Groq ----
    elif provider == "groq-llama3":
        llms     = get_llm(provider)
        last_err = None
        for llm in llms:
            try:
                msg = _invoke_llm(llm, all_messages)
                print(f"[Graph] Groq ({llm.model_name}) OK")
                return {"messages": [msg]}
            except Exception as e:
                print(f"[Graph] Groq ({llm.model_name}) hata: {e}")
                last_err = e
                continue
        return {"messages": [HumanMessage(
            content=f"Groq API hatası (kota?): {last_err}"
        )]}

    return {"messages": [HumanMessage(content="Bu model henüz hazır değil.")]}


# --- 5. Graph Definition ---
def create_graph(provider: str = "gemini"):
    workflow = StateGraph(State)

    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", ToolNode(tools))

    workflow.set_entry_point("agent")
    workflow.add_conditional_edges("agent", tools_condition)
    workflow.add_edge("tools", "agent")

    return workflow.compile()
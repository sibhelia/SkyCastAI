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
        
        return {
            "location": location,
            "temp": f"{temp}°C",
            "humidity": f"%{humidity}",
            "pressure": f"{pressure} hPa",
            "wind": f"{wind_speed} km/sa",
            "description": desc,
            "raw_text": f"{location} konumunda hava {temp}°C ve {desc}. Nem: %{humidity}, Rüzgar: {wind_speed} km/sa."
        }
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
    elif provider == "anthropic-claude3":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model_name="claude-3-haiku-20240307", temperature=0.7)
    elif provider == "groq-llama3":
        from langchain_groq import ChatGroq
        return ChatGroq(model_name="llama3-8b-8192", temperature=0.7)
    elif provider == "ollama-llama3.2":
        from langchain_community.chat_models import ChatOllama
        return ChatOllama(model="llama3.2", temperature=0.7)
    elif provider == "ollama-mistral":
        from langchain_community.chat_models import ChatOllama
        return ChatOllama(model="mistral", temperature=0.7)
    elif provider == "ollama-phi3":
        from langchain_community.chat_models import ChatOllama
        return ChatOllama(model="phi3", temperature=0.7)
    else: # default to gemini
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model="models/gemini-2.5-flash",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.7
        )

# --- 4. Node Logic ---
from langchain_core.messages import SystemMessage

def create_graph(provider: str = "gemini"):
    # Create the LLM bound with tools
    llm = get_llm(provider)
    llm_with_tools = llm.bind_tools(tools)
    
    def classifier_node(state: State):
        # Akıllı asistanın çalışma stili (Mobil App asistanı, TV Spikeri DEĞİL)
        sys_msg = SystemMessage(content="Sen gelişmiş bir mobil hava durumu uygulamasının akıllı asistanısın. TV sunucusu veya spiker gibi 'sayın seyirciler' gibi hitaplar kullanma. Ancak sadece sıkıcı veriler de verme. Hava durumunu (rüzgar, nem dahil) doğal, okunması keyifli bir dille açıkla ve gerekirse pratik uyarılarda bulun (kalın giyin, şemsiye al, güneş gözlüğü tak). Kısa ve net ol.")
        messages_with_sys = [sys_msg] + state["messages"]
        
        msg = llm_with_tools.invoke(messages_with_sys)
        return {"messages": [msg]}

    workflow = StateGraph(State)
    
    workflow.add_node("agent", classifier_node)
    workflow.add_node("tools", ToolNode(tools))

    
    workflow.set_entry_point("agent")
    workflow.add_conditional_edges("agent", tools_condition)
    workflow.add_edge("tools", "agent")
    
    return workflow.compile()

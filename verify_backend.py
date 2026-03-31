import requests
import json

BASE_URL = "http://localhost:8000"

def test_chat(message, provider):
    print(f"\n--- Testing Provider: {provider} ---")
    try:
        response = requests.post(
            f"{BASE_URL}/chat",
            json={"message": message, "provider": provider, "history": []},
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            print(f"Success!")
            print(f"Response: {data['response'][:100]}...")
            print(f"Weather Location: {data.get('weather_details', {}).get('location')}")
            print(f"Image URL: {data.get('image_url')}")
        else:
            print(f"Failed with status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error connecting to backend: {e}")

if __name__ == "__main__":
    providers_to_test = [
        "gemini-2.0-flash",
        "openrouter/google/gemini-2.0-flash-lite-preview-02-05:free",
        "groq-llama3"
    ]
    
    for p in providers_to_test:
        test_chat("İstanbul'da hava nasıl?", p)

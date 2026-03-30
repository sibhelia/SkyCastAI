import requests
import urllib.parse

def get_city_image(city_name: str):
    """
    Wikipedia Commons üzerinden şehrin görselini çeker.
    """
    try:
        # Şehir ismini URL uyumlu hale getir (Balıkesir -> Bal%C4%B1kesir)
        encoded_city = urllib.parse.quote(city_name)
        
        # Wikipedia Search API - Önce Türkçe, bulamazsa İngilizce deneriz
        search_urls = [
            f"https://tr.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageimages|pageterms&piprop=original&titles={encoded_city}",
            f"https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageimages|pageterms&piprop=original&titles={encoded_city}"
        ]
        
        for url in search_urls:
            response = requests.get(url, timeout=5)
            data = response.json()
            pages = data.get("query", {}).get("pages", [])
            if pages and "original" in pages[0]:
                return pages[0]["original"]["source"]
        
        # Yedek görsel (Hava durumu temalı kaliteli bir fotoğraf)
        return "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80"
    except Exception as e:
        print(f"Image search error: {e}")
        return "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80"

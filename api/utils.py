import requests
import urllib.parse
import re

def get_city_image(city_name: str):
    """
    Wikipedia Commons üzerinden şehrin görselini çeker.
    Robust olması için birden fazla dilde ve farklı varyasyonlarda arama yapar.
    """
    if not city_name:
        return "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80"
    
    # Şehir ismini temizle (Örn: "Balikesir, TR" -> "Balikesir")
    clean_city = city_name.split(',')[0].strip()
    
    # Arama varyasyonları
    search_queries = [
        clean_city,
        f"{clean_city} City",
        f"{clean_city} (şehir)",
        f"{clean_city} Municipality"
    ]
    
    # Dil varyasyonları
    languages = ['tr', 'en']
    
    try:
        for lang in languages:
            for query in search_queries:
                encoded_query = urllib.parse.quote(query)
                url = f"https://{lang}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageimages|pageterms&piprop=original&titles={encoded_query}"
                
                response = requests.get(url, timeout=3)
                if response.status_code == 200:
                    data = response.json()
                    pages = data.get("query", {}).get("pages", [])
                    
                    if pages and "original" in pages[0]:
                        img_url = pages[0]["original"]["source"]
                        # SVG'leri bazen React Native iyi gösteremez, jpg/png tercih edebiliriz (Wikipedia genellikle jpg döner origin'de)
                        return img_url

        # Eğer Wikipedia'da resim bulunamadıysa, güvenilir sabit bir manzara resmine dön (source.unsplash.com artık 503 hatası verdiği için kullanmıyoruz)
        return "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80"
        
    except Exception as e:
        print(f"Image search error: {e}")
        # En son yedek
        return "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80"

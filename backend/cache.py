import time
from typing import Any, Dict, Optional

class SimpleCache:
    def __init__(self):
        self.cache: Dict[str, tuple[Any, float]] = {}
    
    def get(self, key: str, ttl: int = 300) -> Optional[Any]:
        if key in self.cache:
            value, timestamp = self.cache[key]
            if time.time() - timestamp < ttl:
                return value
            else:
                del self.cache[key]
        return None
    
    def set(self, key: str, value: Any):
        self.cache[key] = (value, time.time())
    
    def delete(self, key: str):
        if key in self.cache:
            del self.cache[key]
    
    def clear(self):
        self.cache.clear()

# Global cache instance
_cache = SimpleCache()

def get_cache():
    return _cache

def cache_get(key: str, ttl: int = 300):
    return _cache.get(key, ttl)

def cache_set(key: str, value: Any):
    _cache.set(key, value)

def cache_delete(key: str):
    _cache.delete(key)

def cache_clear():
    _cache.clear()

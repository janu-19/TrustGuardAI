import time
from typing import Dict, List
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)
    
    def is_allowed(self, client_id: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds
        
        # Remove old requests
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if req_time > cutoff
        ]
        
        # Check if limit exceeded
        if len(self.requests[client_id]) >= self.max_requests:
            logger.warning(f"Rate limit exceeded for {client_id}")
            return False
        
        # Add current request
        self.requests[client_id].append(now)
        return True
    
    def get_remaining(self, client_id: str) -> int:
        now = time.time()
        cutoff = now - self.window_seconds
        
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if req_time > cutoff
        ]
        
        return max(0, self.max_requests - len(self.requests[client_id]))

# Global rate limiter
_limiter = RateLimiter(max_requests=1000, window_seconds=60)

def check_rate_limit(client_id: str) -> bool:
    return _limiter.is_allowed(client_id)

def get_remaining_requests(client_id: str) -> int:
    return _limiter.get_remaining(client_id)

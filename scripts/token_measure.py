import requests
import time

url = "http://localhost:11434/api/generate"

payload = {
    "model": "smollm:latest",
    "prompt": "Explain ETL in simple terms",
    "stream": False
}

start = time.time()

try:
    response = requests.post(url, json=payload)
    print("Status code:", response.status_code)
    r = response.json()
    print("Response:", r)
    
    end = time.time()
    
    output_tokens = r["eval_count"]
    duration = r["eval_duration"]
    
    tok_per_sec = output_tokens / (duration / 1e9)  # duration is in nanoseconds
    
    print("tokens:", output_tokens)
    print("tok/s:", tok_per_sec)
except Exception as e:
    print("Error:", e)
    end = time.time()
    print("Time taken:", end - start)

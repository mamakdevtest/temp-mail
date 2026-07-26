import json, os

BASE = r"C:\Users\MAMAK\AppData\Local\Temp\claude\f---Work--MamakGames-MamakHub-projects-Web-temp-mail\a30daf3b-ae4c-42cd-83cf-04cec13ea2b2\tasks"

def extract(task_id, out_name):
    path = os.path.join(BASE, task_id + ".output")
    if not os.path.exists(path):
        print(out_name, "MISSING", path)
        return
    best = ""
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            if obj.get("type") != "assistant":
                continue
            msg = obj.get("message", {})
            if not isinstance(msg, dict):
                continue
            if msg.get("model") == "<synthetic>":
                continue
            chunks = [b["text"] for b in msg.get("content", []) if isinstance(b, dict) and b.get("type") == "text" and b.get("text")]
            text = "\n".join(chunks).strip()
            if text and not text.startswith("[Request interrupted") and len(text) > len(best):
                best = text
    print(out_name, "len:", len(best))
    with open("graphify-out/" + out_name, "w", encoding="utf-8") as out:
        out.write(best)

extract("aa47ca0114f66c6fe", ".design_audit.md")
extract("a8dc2f2f3202d5500", ".state_audit.md")

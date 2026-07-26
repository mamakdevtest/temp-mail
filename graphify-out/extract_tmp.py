import json
path = r"C:\Users\MAMAK\AppData\Local\Temp\claude\f---Work--MamakGames-MamakHub-projects-Web-temp-mail\a30daf3b-ae4c-42cd-83cf-04cec13ea2b2\tasks\aa8f86511703eafb4.output"
final_text = ""
with open(path, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        msg = obj.get("message", {})
        if obj.get("type") == "assistant" and isinstance(msg, dict):
            for block in msg.get("content", []):
                if isinstance(block, dict) and block.get("type") == "text" and block.get("text"):
                    final_text = block["text"]
print(len(final_text))
with open("graphify-out/.ui_inventory.md", "w", encoding="utf-8") as out:
    out.write(final_text)
print("saved")

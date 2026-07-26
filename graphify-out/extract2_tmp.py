import json
path = r"C:\Users\MAMAK\AppData\Local\Temp\claude\f---Work--MamakGames-MamakHub-projects-Web-temp-mail\a30daf3b-ae4c-42cd-83cf-04cec13ea2b2\tasks\aa8f86511703eafb4.output"
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
        # skip synthetic stop messages
        if msg.get("model") == "<synthetic>":
            continue
        chunks = []
        for block in msg.get("content", []):
            if isinstance(block, dict) and block.get("type") == "text" and block.get("text"):
                chunks.append(block["text"])
        text = "\n".join(chunks).strip()
        if text and not text.startswith("[Request interrupted"):
            best = text
print("len:", len(best))
with open("graphify-out/.ui_inventory.md", "w", encoding="utf-8") as out:
    out.write(best)
print("saved")

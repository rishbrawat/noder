# api/extract_catalog.py
# Script to convert standardUENodes.ts into structured JSON for the backend AI schema retriever
import re
import json

def main():
    with open('src/data/standardUENodes.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the STANDARD_UE_NODES array
    start_idx = content.find('export const STANDARD_UE_NODES')
    if start_idx == -1:
        print("Could not find STANDARD_UE_NODES")
        return

    array_text = content[start_idx:]
    
    # Regex to extract each node object
    node_pattern = re.compile(
        r"\{\s*id:\s*['\"]([^'\"]+)['\"],\s*"
        r"category:\s*['\"]([^'\"]+)['\"],\s*"
        r"title:\s*['\"]([^'\"]+)['\"],\s*"
        r"subtitle:\s*['\"]([^'\"]+)['\"],\s*"
        r"nodeType:\s*['\"]([^'\"]+)['\"],.*?"
        r"inputs:\s*\[(.*?)\]\s*,\s*"
        r"outputs:\s*\[(.*?)\]",
        re.DOTALL
    )

    pin_pattern = re.compile(
        r"\{\s*name:\s*['\"]([^'\"]+)['\"],\s*type:\s*['\"]([^'\"]+)['\"](?:,\s*value:\s*([^}]+))?\s*\}"
    )

    nodes = []
    for match in node_pattern.finditer(array_text):
        node_id, category, title, subtitle, node_type, inputs_raw, outputs_raw = match.groups()
        
        inputs = []
        for pin_m in pin_pattern.finditer(inputs_raw):
            pin_name, pin_type, pin_val = pin_m.groups()
            pin_obj = {"name": pin_name, "type": pin_type}
            if pin_val:
                val_clean = pin_val.strip().strip("'\"")
                pin_obj["value"] = val_clean
            inputs.append(pin_obj)

        outputs = []
        for pin_m in pin_pattern.finditer(outputs_raw):
            pin_name, pin_type, _ = pin_m.groups()
            outputs.append({"name": pin_name, "type": pin_type})

        nodes.append({
            "id": node_id,
            "category": category,
            "title": title,
            "subtitle": subtitle,
            "nodeType": node_type,
            "inputs": inputs,
            "outputs": outputs
        })

    print(f"Extracted {len(nodes)} canonical Unreal Engine 5 nodes!")
    with open('api/ue_nodes_catalog.json', 'w', encoding='utf-8') as out:
        json.dump(nodes, out, indent=2)

if __name__ == "__main__":
    main()


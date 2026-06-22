import json

def get_start_node(flow_json: dict):
    """Find the start node in the flow"""
    for node in flow_json.get("nodes", []):
        if node.get("type") == "start":
            return node
    return None


def build_response(node: dict):
    """Convert a node into a response dict"""
    if not node:
        return None

    node_type = node.get("type")

    if node_type == "message":
        return {"type": "text", "text": node.get("text", "")}
    elif node_type == "dynamicDecision":
        return {
            "type": "options",
            "text": node.get("text", ""),
            "options": node.get("options", []),
        }
    elif node_type == "ai":
        return {"type": "ai"}
    elif node_type == "mega":
        return {"type": "text", "text": node.get("text", "")}
    elif node_type == "collect":
        return {
            "type": "collect",
            "text": node.get("text", ""),
            "fields": node.get("fields", []) or [],
        }
    elif node_type == "human_handoff":
        return {
            "type": "human_handoff",
            "text": node.get("text", "No human available"),
            "time": node.get("time", 10),  # test 10 seconds
        }
 

    return None

def get_next_node(flow_json: dict, current_node_id: str, user_msg: str):
    edges = flow_json.get("edges", [])
    nodes = flow_json.get("nodes", [])

    user_norm = (user_msg or "").strip().lower()

    def find_node(node_id: str):
        return next((n for n in nodes if n.get("id") == node_id), None)

    # get all possible next nodes from current
    possible_edges = [e for e in edges if e.get("from") == current_node_id]

    for edge in possible_edges:
        from_node = find_node(current_node_id)
        if not from_node:
            continue

        # --- Handle dynamicDecision branch ---
        if edge.get("sourceHandle") is not None:
            opts = from_node.get("options", []) or []
            try:
                idx = [o.strip().lower() for o in opts].index(user_norm)
            except ValueError:
                continue

            if edge["sourceHandle"] == f"opt-{idx}":
                next_node = find_node(edge["to"])
                return next_node, build_response(next_node)

        # --- Normal direct edge ---
        else:
            next_node = find_node(edge.get("to"))
            if not next_node:
                continue


            # if the next node is a mega, show it, but keep following until non-mega
            if next_node.get("type") == "mega":
                return next_node, build_response(next_node)

            # otherwise return it normally
            return next_node, build_response(next_node)

    return None, None

"""
Server-side physics validation engine.
Mirrors the TypeScript logic in lib/physics.ts
"""
from typing import List, Dict, Any

# Part definitions (mirrors PARTS in lib/parts.ts)
PARTS = {
    "seat":            {"kind": "surface", "w": 0.45, "h": 0.04, "d": 0.45, "kg": 2.5},
    "tabletop":        {"kind": "surface", "w": 1.2,  "h": 0.04, "d": 0.7,  "kg": 8},
    "shelf":           {"kind": "surface", "w": 0.8,  "h": 0.025,"d": 0.3,  "kg": 3},
    "leg-short":       {"kind": "leg",     "w": 0.04, "h": 0.45, "d": 0.04, "kg": 0.5},
    "leg-long":        {"kind": "leg",     "w": 0.04, "h": 0.72, "d": 0.04, "kg": 0.8},
    "crossbar":        {"kind": "support", "w": 0.4,  "h": 0.03, "d": 0.03, "kg": 0.6},
    "backrest":        {"kind": "back",    "w": 0.44, "h": 0.45, "d": 0.04, "kg": 1.8},
    "armrest":         {"kind": "support", "w": 0.2,  "h": 0.03, "d": 0.2,  "kg": 0.9},
    "panel":           {"kind": "panel",   "w": 0.04, "h": 1.8,  "d": 0.4,  "kg": 5},
    "prod-oak-top":    {"kind": "surface", "w": 1.6,  "h": 0.04, "d": 0.8,  "kg": 12},
    "prod-walnut-top": {"kind": "surface", "w": 1.8,  "h": 0.04, "d": 0.9,  "kg": 14},
    "prod-pine-desk":  {"kind": "surface", "w": 1.2,  "h": 0.04, "d": 0.6,  "kg": 8},
    "prod-bamboo-shelf":{"kind":"surface", "w": 0.8,  "h": 0.025,"d": 0.25, "kg": 2},
    "prod-dining-seat":{"kind": "surface", "w": 0.42, "h": 0.04, "d": 0.42, "kg": 2},
    "prod-cushion":    {"kind": "cushion", "w": 0.4,  "h": 0.08, "d": 0.4,  "kg": 0.8},
    "prod-hairpin":    {"kind": "leg",     "w": 0.015,"h": 0.71, "d": 0.015,"kg": 0.4},
    "prod-scandi-leg": {"kind": "leg",     "w": 0.04, "h": 0.45, "d": 0.04, "kg": 0.6},
    "prod-u-leg":      {"kind": "leg",     "w": 0.6,  "h": 0.71, "d": 0.04, "kg": 2.5},
    "prod-tall-panel": {"kind": "panel",   "w": 0.04, "h": 1.8,  "d": 0.4,  "kg": 8},
    "prod-door":       {"kind": "door",    "w": 0.4,  "h": 0.7,  "d": 0.02, "kg": 3},
}


def get_bounds(part: Dict) -> Dict:
    """Get bounding box for a part."""
    def_data = PARTS.get(part["type"])
    if not def_data:
        return None
    return {
        "min_x": part["x"] - def_data["w"] / 2,
        "max_x": part["x"] + def_data["w"] / 2,
        "min_y": part["y"] - def_data["h"] / 2,
        "max_y": part["y"] + def_data["h"] / 2,
        "min_z": part["z"] - def_data["d"] / 2,
        "max_z": part["z"] + def_data["d"] / 2,
        "cx": part["x"], "cy": part["y"], "cz": part["z"],
    }


def validate_design(parts: List[Dict]) -> Dict:
    """
    Validate furniture design physics.
    Returns stability score, grade, reasons, and per-part status.
    """
    reasons = []
    per_part_status = {p["id"]: "neutral" for p in parts}
    score = 100

    if not parts:
        return {
            "stable": False, "score": 0,
            "reasons": ["No parts placed"],
            "com": {"x": 0, "y": 0, "z": 0},
            "leg_count": 0, "surface_count": 0,
            "per_part_status": {},
        }

    # Categorize parts
    surfaces = [p for p in parts if PARTS.get(p["type"], {}).get("kind") in ["surface", "cushion"]]
    legs = [p for p in parts if PARTS.get(p["type"], {}).get("kind") == "leg"]
    backs = [p for p in parts if PARTS.get(p["type"], {}).get("kind") == "back"]
    panels_list = [p for p in parts if PARTS.get(p["type"], {}).get("kind") == "panel"]

    # Center of mass
    total_mass = sum(PARTS.get(p["type"], {}).get("kg", 0) for p in parts)
    com_x = com_y = com_z = 0.0
    if total_mass > 0:
        for p in parts:
            kg = PARTS.get(p["type"], {}).get("kg", 0)
            com_x += p["x"] * kg
            com_y += p["y"] * kg
            com_z += p["z"] * kg
        com_x /= total_mass
        com_y /= total_mass
        com_z /= total_mass

    if not surfaces:
        reasons.append("No surface detected")
        score -= 40

    if not legs and not panels_list:
        reasons.append("No legs or supports")
        score -= 40

    TOL = 0.12

    for surface in surfaces:
        sb = get_bounds(surface)
        if not sb:
            continue
        surface_bottom = sb["min_y"]

        # Find supporting legs
        supporting_legs = []
        for leg in legs:
            lb = get_bounds(leg)
            if lb and abs(lb["max_y"] - surface_bottom) < TOL:
                supporting_legs.append(leg)

        # Find supporting panels
        supporting_panels = []
        for panel in panels_list:
            pb = get_bounds(panel)
            if pb and pb["max_y"] >= surface_bottom - TOL:
                supporting_panels.append(panel)

        if len(supporting_legs) >= 3 or len(supporting_panels) >= 2:
            per_part_status[surface["id"]] = "stable"
            for l in supporting_legs:
                per_part_status[l["id"]] = "stable"
            for p in supporting_panels:
                per_part_status[p["id"]] = "stable"

            # Check leg height consistency
            if len(supporting_legs) > 1:
                bottoms = [get_bounds(l)["min_y"] for l in supporting_legs]
                if max(bottoms) - min(bottoms) > 0.08:
                    reasons.append("Legs have unequal heights")
                    score -= 25
                    per_part_status[surface["id"]] = "unstable"
                    for l in supporting_legs:
                        per_part_status[l["id"]] = "unstable"

            # Check CoM within leg span
            if len(supporting_legs) >= 2:
                lxs = [l["x"] for l in supporting_legs]
                lzs = [l["z"] for l in supporting_legs]
                if (com_x < min(lxs) - 0.05 or com_x > max(lxs) + 0.05 or
                        com_z < min(lzs) - 0.05 or com_z > max(lzs) + 0.05):
                    reasons.append("Center of mass outside support base")
                    score -= 30
                    per_part_status[surface["id"]] = "unstable"
        else:
            per_part_status[surface["id"]] = "unstable"
            if supporting_legs or supporting_panels:
                reasons.append("Insufficient support (need 3+ legs or 2+ panels)")
                score -= 20
            else:
                reasons.append("Surface has no support")
                score -= 35

        # Backrest check
        for back in backs:
            sx_span = (sb["max_x"] - sb["min_x"]) / 2 + 0.1
            in_range = (abs(back["x"] - surface["x"]) < sx_span and
                        abs(back["z"] - surface["z"]) < 0.3)
            per_part_status[back["id"]] = "stable" if in_range else "unstable"
            if not in_range:
                reasons.append("Backrest not connected to seat")
                score -= 15

    # Ground-level parts are stable
    for part in parts:
        if per_part_status[part["id"]] == "neutral":
            b = get_bounds(part)
            if b and b["min_y"] < 0.04:
                per_part_status[part["id"]] = "stable"

    score = max(0, min(100, score))
    stable = score >= 70 and not reasons
    if stable:
        reasons.append("Structure is stable")

    # Determine grade
    if score >= 90:
        grade = "A"
    elif score >= 75:
        grade = "B"
    elif score >= 50:
        grade = "C"
    else:
        grade = "D"

    return {
        "stable": stable,
        "score": score,
        "grade": grade,
        "reasons": reasons,
        "com": {"x": com_x, "y": com_y, "z": com_z},
        "leg_count": len(legs),
        "surface_count": len(surfaces),
        "per_part_status": per_part_status,
    }

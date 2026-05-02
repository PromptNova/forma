"""
Server-side physics validation engine.
Mirrors the TypeScript logic in lib/physics.ts exactly.
Updated with correct real-product dimensions from lib/parts.ts.
"""
from typing import List, Dict, Any, Optional

# ── Part definitions (mirrors PARTS in lib/parts.ts) ─────────
# All dimensions in meters, kg in kilograms
PARTS: Dict[str, Dict[str, Any]] = {
    # Basic parts
    "seat":           {"kind": "surface", "w": 0.45, "h": 0.04, "d": 0.45, "kg": 2.5},
    "tabletop":       {"kind": "surface", "w": 1.20, "h": 0.04, "d": 0.70, "kg": 8.0},
    "shelf":          {"kind": "surface", "w": 0.80, "h": 0.025,"d": 0.30, "kg": 3.0},
    "leg-short":      {"kind": "leg",     "w": 0.04, "h": 0.45, "d": 0.04, "kg": 0.5},
    "leg-long":       {"kind": "leg",     "w": 0.04, "h": 0.72, "d": 0.04, "kg": 0.8},
    "crossbar":       {"kind": "support", "w": 0.40, "h": 0.03, "d": 0.03, "kg": 0.6},
    "backrest":       {"kind": "back",    "w": 0.44, "h": 0.45, "d": 0.04, "kg": 1.8},
    "armrest":        {"kind": "support", "w": 0.20, "h": 0.03, "d": 0.20, "kg": 0.9},
    "panel":          {"kind": "panel",   "w": 0.04, "h": 1.80, "d": 0.40, "kg": 5.0},
    # Real products — exact dimensions
    "prod-oak-top":     {"kind": "surface", "w": 1.80, "h": 0.04, "d": 0.80, "kg": 22.0},
    "prod-walnut-top":  {"kind": "surface", "w": 1.60, "h": 0.04, "d": 0.75, "kg": 18.0},
    "prod-pine-desk":   {"kind": "surface", "w": 1.60, "h": 0.03, "d": 0.80, "kg": 12.0},
    "prod-bamboo-shelf":{"kind": "surface", "w": 0.80, "h": 0.02, "d": 0.25, "kg": 1.6},
    "prod-dining-seat": {"kind": "surface", "w": 0.42, "h": 0.04, "d": 0.42, "kg": 2.0},
    "prod-cushion":     {"kind": "cushion", "w": 0.40, "h": 0.08, "d": 0.40, "kg": 0.8},
    "prod-hairpin":     {"kind": "leg",     "w": 0.04, "h": 0.71, "d": 0.04, "kg": 0.6},
    "prod-scandi-leg":  {"kind": "leg",     "w": 0.04, "h": 0.43, "d": 0.04, "kg": 0.5},
    "prod-u-leg":       {"kind": "leg",     "w": 0.50, "h": 0.72, "d": 0.04, "kg": 4.2},
    "prod-tall-panel":  {"kind": "panel",   "w": 0.04, "h": 1.80, "d": 0.40, "kg": 8.0},
    "prod-door":        {"kind": "door",    "w": 0.40, "h": 0.70, "d": 0.02, "kg": 3.0},
}

SURFACE_KINDS = frozenset(["surface", "cushion"])


def _is_surface(kind: Optional[str]) -> bool:
    return kind in SURFACE_KINDS


def get_bounds(part: Dict) -> Optional[Dict]:
    """Get bounding box for a placed part."""
    defn = PARTS.get(part.get("type", ""))
    if not defn:
        return None
    x, y, z = part.get("x", 0.0), part.get("y", 0.0), part.get("z", 0.0)
    return {
        "min_x": x - defn["w"] / 2,
        "max_x": x + defn["w"] / 2,
        "min_y": y - defn["h"] / 2,
        "max_y": y + defn["h"] / 2,
        "min_z": z - defn["d"] / 2,
        "max_z": z + defn["d"] / 2,
        "cx": x, "cy": y, "cz": z,
    }


def validate_design(parts: List[Dict]) -> Dict:
    """
    Validate furniture design physics. Mirrors lib/physics.ts:validatePhysics().

    Args:
        parts: List of placed parts [{id, type, x, y, z, ...}]

    Returns:
        {stable, score, grade, reasons, com, leg_count, surface_count, per_part_status}
    """
    reasons: List[str] = []
    per_part_status: Dict[str, str] = {p["id"]: "neutral" for p in parts}
    score = 100

    if not parts:
        return {
            "stable": False, "score": 0, "grade": "D",
            "reasons": ["No parts placed"],
            "com": {"x": 0.0, "y": 0.0, "z": 0.0},
            "leg_count": 0, "surface_count": 0,
            "per_part_status": {},
        }

    # Categorise parts
    surfaces   = [p for p in parts if _is_surface(PARTS.get(p.get("type",""), {}).get("kind"))]
    legs       = [p for p in parts if PARTS.get(p.get("type",""), {}).get("kind") == "leg"]
    backs      = [p for p in parts if PARTS.get(p.get("type",""), {}).get("kind") == "back"]
    panels_all = [p for p in parts if PARTS.get(p.get("type",""), {}).get("kind") == "panel"]

    # Centre of mass
    total_mass = sum(PARTS.get(p.get("type",""), {}).get("kg", 0) for p in parts)
    com_x = com_y = com_z = 0.0
    if total_mass > 0:
        for p in parts:
            kg = PARTS.get(p.get("type",""), {}).get("kg", 0)
            com_x += p.get("x", 0) * kg
            com_y += p.get("y", 0) * kg
            com_z += p.get("z", 0) * kg
        com_x /= total_mass
        com_y /= total_mass
        com_z /= total_mass

    # Basic checks
    if not surfaces:
        reasons.append("No surface detected")
        score -= 40
    if not legs and not panels_all:
        reasons.append("No legs or panels")
        score -= 40

    TOL = 0.12  # 12 cm tolerance for leg-surface contact

    for surf in surfaces:
        sb = get_bounds(surf)
        if not sb:
            continue
        surf_bottom = sb["min_y"]

        # Find legs supporting this surface
        s_legs = [
            l for l in legs
            if (b := get_bounds(l)) and abs(b["max_y"] - surf_bottom) < TOL
        ]
        # Find panels supporting this surface
        s_panels = [
            p for p in panels_all
            if (b := get_bounds(p)) and b["max_y"] >= surf_bottom - TOL
        ]

        if len(s_legs) >= 3 or len(s_panels) >= 2:
            per_part_status[surf["id"]] = "stable"
            for l in s_legs:
                per_part_status[l["id"]] = "stable"
            for p in s_panels:
                per_part_status[p["id"]] = "stable"

            # Height consistency check
            if len(s_legs) > 1:
                bottoms = [get_bounds(l)["min_y"] for l in s_legs if get_bounds(l)]
                if bottoms and (max(bottoms) - min(bottoms)) > 0.08:
                    reasons.append("Legs have unequal heights")
                    score -= 25
                    per_part_status[surf["id"]] = "unstable"
                    for l in s_legs:
                        per_part_status[l["id"]] = "unstable"

            # CoM within leg polygon check (±5cm tolerance)
            if len(s_legs) >= 2:
                lxs = [l.get("x", 0) for l in s_legs]
                lzs = [l.get("z", 0) for l in s_legs]
                if (
                    com_x < min(lxs) - 0.05 or com_x > max(lxs) + 0.05 or
                    com_z < min(lzs) - 0.05 or com_z > max(lzs) + 0.05
                ):
                    reasons.append("Centre of mass outside support base")
                    score -= 30
                    per_part_status[surf["id"]] = "unstable"
        else:
            per_part_status[surf["id"]] = "unstable"
            if s_legs or s_panels:
                reasons.append("Insufficient support (need 3+ legs or 2+ panels)")
                score -= 20
            else:
                reasons.append("Surface has no support")
                score -= 35

        # Backrest connectivity check
        sx_span = (sb["max_x"] - sb["min_x"]) / 2 + 0.1
        for b in backs:
            in_range = (
                abs(b.get("x", 0) - surf.get("x", 0)) < sx_span and
                abs(b.get("z", 0) - surf.get("z", 0)) < 0.3
            )
            per_part_status[b["id"]] = "stable" if in_range else "unstable"
            if not in_range:
                reasons.append("Backrest disconnected")
                score -= 15

    # Ground-level neutrals become stable
    for p in parts:
        if per_part_status[p["id"]] == "neutral":
            b = get_bounds(p)
            if b and b["min_y"] < 0.04:
                per_part_status[p["id"]] = "stable"

    score = max(0, min(100, score))
    stable = score >= 70 and not reasons
    if stable:
        reasons.append("Structure is stable")

    grade = "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 50 else "D"

    return {
        "stable": stable,
        "score": score,
        "grade": grade,
        "reasons": reasons,
        "com": {"x": round(com_x, 3), "y": round(com_y, 3), "z": round(com_z, 3)},
        "leg_count": len(legs),
        "surface_count": len(surfaces),
        "per_part_status": per_part_status,
    }

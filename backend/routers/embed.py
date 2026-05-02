from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import HTMLResponse
from ..models.design import EmbedConfig
from typing import Optional

router = APIRouter(prefix="/embed", tags=["embed"])


@router.get("/{design_id}", response_class=HTMLResponse)
async def get_embed_html(
    design_id: str,
    width: int = 800,
    height: int = 600,
    theme: str = "dark",
    x_api_key: Optional[str] = Header(None),
):
    """Generate embeddable iframe HTML for a design."""
    # API key validation for B2B customers
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key required for embed")

    embed_url = f"https://forma.vercel.app/view/{design_id}?theme={theme}&embed=1"

    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Forma Design Embed</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ background: {'#0e0d0b' if theme == 'dark' else '#f5f1ea'}; }}
    iframe {{
      width: {width}px;
      height: {height}px;
      border: none;
      border-radius: 8px;
    }}
  </style>
</head>
<body>
  <iframe src="{embed_url}" allow="fullscreen"></iframe>
</body>
</html>"""
    return HTMLResponse(content=html)


@router.get("/snippet/{design_id}")
async def get_embed_snippet(
    design_id: str,
    width: int = 800,
    height: int = 600,
    theme: str = "dark",
):
    """Get the embed code snippet (JavaScript)."""
    snippet = f"""<script src="https://forma.vercel.app/embed.js"
  data-design-id="{design_id}"
  data-width="{width}"
  data-height="{height}"
  data-theme="{theme}">
</script>"""
    return {"snippet": snippet, "design_id": design_id}

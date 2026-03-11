"""E2B Cloud Sandbox — ephemeral preview environments for pitches.

Each pitch gets a cloud sandbox with a public preview URL.
The sandbox runs a lightweight HTTP server serving the rendered pitch HTML.
"""

import os
import json
from e2b_code_interpreter import Sandbox
from backend.sandbox.renderer import render_pitch_html

E2B_API_KEY = os.environ.get("E2B_API_KEY", "")

# Cache active sandboxes: pitch_id -> sandbox_id
_active_sandboxes: dict[str, str] = {}


async def create_preview_sandbox(pitch: dict) -> dict:
    """Create an E2B sandbox with a live preview of the pitch.

    Returns: {"sandbox_id": str, "preview_url": str} or {"error": str}
    """
    if not E2B_API_KEY:
        return {"error": "E2B_API_KEY not set — using local preview only"}

    pitch_id = pitch.get("id", "unknown")

    try:
        # Create sandbox
        sbx = Sandbox(api_key=E2B_API_KEY, timeout=300)

        # Render the pitch HTML
        html = render_pitch_html(pitch)

        # Write HTML to sandbox filesystem
        sbx.files.write("/home/user/index.html", html)

        # Start a simple HTTP server
        sbx.commands.run(
            "cd /home/user && python3 -m http.server 3000 &",
            background=True,
        )

        # Get the public URL
        host = sbx.get_host(3000)
        preview_url = f"https://{host}"

        # Cache the sandbox
        _active_sandboxes[pitch_id] = sbx.sandbox_id

        return {
            "sandbox_id": sbx.sandbox_id,
            "preview_url": preview_url,
            "pitch_id": pitch_id,
        }

    except Exception as e:
        return {"error": str(e)}


async def update_preview_sandbox(pitch: dict) -> dict:
    """Update an existing sandbox with new pitch content.

    If no sandbox exists for this pitch, creates a new one.
    """
    pitch_id = pitch.get("id", "unknown")
    sandbox_id = _active_sandboxes.get(pitch_id)

    if not sandbox_id:
        return await create_preview_sandbox(pitch)

    if not E2B_API_KEY:
        return {"error": "E2B_API_KEY not set"}

    try:
        # Reconnect to existing sandbox
        sbx = Sandbox.connect(sandbox_id, api_key=E2B_API_KEY)

        # Update the HTML
        html = render_pitch_html(pitch)
        sbx.files.write("/home/user/index.html", html)

        host = sbx.get_host(3000)
        return {
            "sandbox_id": sandbox_id,
            "preview_url": f"https://{host}",
            "pitch_id": pitch_id,
            "updated": True,
        }

    except Exception:
        # Sandbox may have expired — create a new one
        _active_sandboxes.pop(pitch_id, None)
        return await create_preview_sandbox(pitch)


async def destroy_preview_sandbox(pitch_id: str) -> dict:
    """Kill a sandbox when done."""
    sandbox_id = _active_sandboxes.pop(pitch_id, None)
    if not sandbox_id or not E2B_API_KEY:
        return {"destroyed": False}

    try:
        sbx = Sandbox.connect(sandbox_id, api_key=E2B_API_KEY)
        sbx.kill()
        return {"destroyed": True, "sandbox_id": sandbox_id}
    except Exception:
        return {"destroyed": False}


def is_cloud_sandbox_available() -> bool:
    """Check if E2B cloud sandbox is configured."""
    return bool(E2B_API_KEY)

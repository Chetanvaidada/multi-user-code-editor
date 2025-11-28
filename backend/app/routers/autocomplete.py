from fastapi import APIRouter
from app.schemas.autocomplete import AutocompleteRequest, AutocompleteResponse

router = APIRouter(prefix="/autocomplete", tags=["autocomplete"])

def get_python_autocomplete(code: str, cursor_pos: int) -> str:
    """
    Generate mocked autocomplete suggestions for Python based on current context.
    Uses simple rule-based pattern matching.
    """
    # Get text before cursor
    before_cursor = code[:cursor_pos] if cursor_pos <= len(code) else code
    
    # Get current line
    lines = before_cursor.split('\n')
    current_line = lines[-1] if lines else ""
    
    # Calculate indentation level
    indent = len(current_line) - len(current_line.lstrip())
    indent_str = " " * indent
    next_indent = " " * (indent + 4)
    
    # Get trimmed line for pattern matching
    trimmed = current_line.strip()
    
    # Pattern matching for Python constructs
    
    # If statement (without colon)
    if trimmed.startswith("if ") and not trimmed.endswith(":"):
        return f":\n{next_indent}# implementation\n{indent_str}else:\n{next_indent}# implementation"
    
    # Elif statement (without colon)
    if trimmed.startswith("elif ") and not trimmed.endswith(":"):
        return f":\n{next_indent}# implementation"
    
    # Else statement
    if trimmed == "else":
        return f":\n{next_indent}# implementation"
    
    # For loop - suggest basic pattern
    if trimmed == "for":
        return f" item in items:\n{next_indent}# implementation"
    elif trimmed.startswith("for ") and " in " not in trimmed:
        return f" in items:\n{next_indent}# implementation"
    elif trimmed.startswith("for ") and " in " in trimmed and not trimmed.endswith(":"):
        return f":\n{next_indent}# implementation"
    
    # While loop
    if trimmed == "while":
        return f" condition:\n{next_indent}# implementation"
    elif trimmed.startswith("while ") and not trimmed.endswith(":"):
        return f":\n{next_indent}# implementation"
    
    # Function definition
    if trimmed == "def":
        return f" function_name():\n{next_indent}pass"
    elif trimmed.startswith("def ") and "(" not in trimmed:
        return f"():\n{next_indent}pass"
    elif trimmed.startswith("def ") and "(" in trimmed and not trimmed.endswith(":"):
        return f":\n{next_indent}pass"
    
    # Class definition
    if trimmed == "class":
        return f" ClassName:\n{next_indent}pass"
    elif trimmed.startswith("class ") and not trimmed.endswith(":"):
        return f":\n{next_indent}pass"
    
    # Try-except block
    if trimmed == "try":
        return f":\n{next_indent}pass\n{indent_str}except Exception as e:\n{next_indent}pass"
    elif trimmed.startswith("try") and trimmed.endswith(":"):
        # Already has colon, suggest except
        return f"\n{indent_str}except Exception as e:\n{next_indent}pass"
    
    # Except statement
    if trimmed == "except":
        return f" Exception as e:\n{next_indent}pass"
    elif trimmed.startswith("except ") and " as " not in trimmed:
        return f" as e:\n{next_indent}pass"
    elif trimmed.startswith("except ") and not trimmed.endswith(":"):
        return f":\n{next_indent}pass"
    
    # Finally statement
    if trimmed == "finally":
        return f":\n{next_indent}pass"
    
    # With statement
    if trimmed == "with":
        return f" open('file.txt') as f:\n{next_indent}pass"
    elif trimmed.startswith("with ") and " as " not in trimmed:
        return f" as var:\n{next_indent}pass"
    elif trimmed.startswith("with ") and not trimmed.endswith(":"):
        return f":\n{next_indent}pass"
    
    # Import suggestions
    if trimmed == "import":
        return " os"
    if trimmed == "from":
        return " module import function"
    
    # Common methods on dot
    if before_cursor.endswith("."):
        # Simple suggestion for common methods
        return "strip()"
    
    return ""


@router.post("", response_model=AutocompleteResponse)
async def autocomplete(req: AutocompleteRequest):
    """
    AI Autocomplete endpoint (mocked for Python).
    Provides intelligent code completion suggestions based on context.
    """
    suggestion = ""
    
    # Only provide suggestions for Python
    if req.language == "python":
        suggestion = get_python_autocomplete(req.code, req.cursorPosition)
    
    return AutocompleteResponse(suggestion=suggestion, replaceRange=None)



// --- Utility: Draggable Panel ---
function makeElementDraggable(elmnt, dragHandle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (dragHandle) {
        dragHandle.onmousedown = dragMouseDown;
        dragHandle.style.cursor = 'move'; // Visual cue
    } else {
        elmnt.onmousedown = dragMouseDown;
        elmnt.style.cursor = 'move';
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        elmnt.style.right = 'auto'; // Disable right positioning once moved
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// --- Utility: Simple Markdown Parser ---
function parseMarkdown(text) {
    if (!text) return '';
    let html = text;

    // Escape HTML first to prevent XSS (but allow our own tags later)
    html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Headers (### Header)
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic (*text*)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Blockquotes (> text)
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Bullet lists (- item)
    // Basic implementation: wrap list items in <li>, then wrap consecutive <li> in <ul>
    html = html.replace(/^\s*-\s+(.*)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>'); // Crude but works for simple blocks
    // Fix nested ULs (regex above might create multiple <ul> for consecutive lines)
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Line breaks (convert newlines to <br> if not in a block element)
    html = html.replace(/\n/g, '<br>');

    // Clean up <br> after block elements
    html = html.replace(/<\/h[1-3]><br>/g, '</h$1>');
    html = html.replace(/<\/ul><br>/g, '</ul>');
    html = html.replace(/<\/blockquote><br>/g, '</blockquote>');

    return html;
}

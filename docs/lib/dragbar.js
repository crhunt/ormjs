function activate_vdragbar(handle_class,wrapper_class,leftdiv) {

    var handler = document.querySelector(`.${handle_class}`);
    var wrapper = handler.closest(`.${wrapper_class}`);
    var boxA = wrapper.querySelector(`.${leftdiv}`);
    var isHandlerDragging = false;

    document.addEventListener('mousedown', function(e) {
        // If mousedown event is fired from .handler, toggle flag to true
        if (e.target === handler) {
            isHandlerDragging = true;
            boxA.style.flexShrink = 1;
        }
    });
    
    document.addEventListener('mousemove', function(e) {
        // Don't do anything if dragging flag is false
        if (!isHandlerDragging) {
            return false;
        }

        // Get offset
        var containerOffsetLeft = wrapper.offsetLeft;

        // Get x-coordinate of pointer relative to container
        var pointerRelativeXpos = e.clientX - containerOffsetLeft;

        // Arbitrary minimum width set on box A, otherwise its inner content will collapse to width of 0
        var boxAminWidth = 300;
        var boxAmaxWidth = document.body.clientWidth - boxAminWidth;

        // Resize box A
        // * 8px is the left/right spacing between .handler and its inner pseudo-element
        // * Set flex-grow to 0 to prevent it from growing
        var spc = (10 - 4)/2; // (handler width - handler before width)/2
        boxA.style.width = Math.min( boxAmaxWidth, Math.max(boxAminWidth, pointerRelativeXpos - spc) ) + 'px';
        boxA.style.flexGrow = 0;
    });

    document.addEventListener('mouseup', function(e) {
        // Turn off dragging flag when user mouse is up
        isHandlerDragging = false;
        boxA.style.flexShrink = 0;
    });
        
}
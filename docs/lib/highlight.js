function highlight_listener() {
    // Select the target node.
    var target = document.querySelector('#rel')

    // Create an observer instance.
    var observer = new MutationObserver(function(mutations) {
        Prism.highlightAll();
    });

    // Pass in the target node, as well as the observer options.
    observer.observe(target, {
        attributes:    true,
        childList:     true,
        characterData: true
    });
}
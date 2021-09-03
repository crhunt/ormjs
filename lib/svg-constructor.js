/*
    Constructing the svg and defining prototype objects
*/

function prototypes(svg) {

    // Create the svg and populate with prototype object for
    // entities.

    var defs = svg.append("defs");
    entity_prototype(defs);
}

window.onload = function() {

    //Create SVG element
    var svg = d3.select("#canvas")
                .append("svg")
                .attr("width", "90vw")
                .attr("height", "90vh");
    // Define prototype objects
    prototypes(svg);

    // Draw an initial entity
    draw_entity(svg,100,100);

    // Actions related to interaction with the svg
    svg.on("dblclick", (event) => {
        // Get mouse position
        var mouse = d3.pointer(event);
        // Create entity on doubleclick
        draw_entity(svg,mouse[0],mouse[1]);
    });
}
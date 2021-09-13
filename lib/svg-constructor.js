/*
    Constructing the svg and defining prototype objects
*/

var svg;

function prototypes() {

    // Create the svg and populate with prototype object for
    // entities.

    var defs = svg.append("defs");
    entity_prototype(defs);
    //relationships_prototype(defs);
}

window.onload = function() {

    //Create SVG element
    svg = d3.select("#canvas")
                .append("svg")
                .attr("width", "90vw")
                .attr("height", "90vh");
    // Define prototype objects
    prototypes();

    // Draw an initial entity
    draw_entity(100,100);
    updateSvgDownloadLink();

    // Actions related to interaction with the svg
    svg.on("dblclick", (event) => {
        // Get mouse position
        var mouse = d3.pointer(event);
        // Create entity on doubleclick
        draw_entity(mouse[0],mouse[1]);
    })
}
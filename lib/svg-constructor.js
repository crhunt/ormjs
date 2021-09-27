/*
    Constructing the svg and defining prototype objects
*/

var orm;
var svg;
var svgscale;

function prototypes() {

    // Not used

    // Create the svg and populate with prototype object for
    // entities.

    var defs = svg.append("defs");
    //entity_prototype(defs);
    //relationships_prototype(defs);
    //rolebox_prototype(defs);
}

function svg_actions(mysvg) {
    mysvg.on("dblclick", (event) => {
        // Get mouse position
        var mouse = d3.pointer(event);
        if (event.shiftKey) {
            // Create rolebox on shift+doubleclick
            draw_rolebox(mouse[0],mouse[1]);
        } else {
            // Create entity on doubleclick
            draw_entity(mouse[0],mouse[1]);
        }
    });
}

function set_viewbox(svgscale) {
    return "-" + svgscale/2 + ", -" + svgscale/2 +
           ", " + svgscale + ", " + svgscale;
}

window.onload = function() {

    initialize_globals();

    svgscale = 400;
    //Create SVG element
    svg = d3.select("#canvas")
                .append("svg")
                .attr("id","canvas-svg")
                .attr("width", "100%")
                .attr("height", "100%")
                //.attr("preserveAspectRatio","none")
                .attr("viewBox", () => set_viewbox(svgscale));

    // Define prototype objects
    //prototypes();

    // Actions related to interaction with the svg
    svg_actions(svg);

    // Draw an initial entity
    draw_entity(0,0);

    // Button actions
    d3.select("#downloadSvgButton")
      .on("click", download_svg);
    d3.select("#uploadSvgButton")
      .on("change", upload_svg, false);
    d3.select("#rel")
      .on("click", parse_orm);
    d3.select("#highlightNoParse")
      .property("checked",false)
      .on("change",set_highlighter);
}